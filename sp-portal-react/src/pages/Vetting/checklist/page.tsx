'use client';

import { useAuth } from '../shims/AuthContext';
import { db } from '../shims/firebase';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '../shims/firestore';
import { useRouter } from '../shims/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminNavbar } from '../components/admin/AdminNavbar';
import { useAdminCandidate } from '../components/admin/AdminCandidateContext';
import { auth } from '../shims/firebase';
import { CaseRegistrationPanel, type CaseRegistrationField } from './components/CaseRegistrationPanel';
import { ExportActions } from './components/ExportActions';
import { ChecklistRow, type AdminWorkHistoryEntry } from './components/ChecklistRow';
import { InitialInfoReview } from './components/InitialInfoReview';
import { CHECKLIST_STEPS, type ChecklistItem } from './data/checklist';
import {
  completion,
  BRITISH_RTW_LABEL,
  isBritishCandidate,
  mapDriverDoc,
  mapLegacyVendorDoc,
  SUITABILITY_OPTIONS,
  type ChecklistCandidate,
  type DocFields,
} from './modules/central-driver-record/model';
import { isRegistrationComplete } from './modules/central-driver-record/registration-complete';
import { actorFrom, logCdrChanges } from './modules/central-driver-record/audit';
import { downloadApplicationForm } from './modules/application-form/generate';
import {
  NEXT_ITEMS,
  interviewScore,
  type ChecklistInterview,
} from './modules/interview/model';
import styles from './page.module.css';

// ─── page ─────────────────────────────────────────────────────────────────────

type AgeVerification = 'REJECTED' | 'PENDING_INSURER' | 'AUTO_CONFIRMED';

function workHistoryEntriesFromDocs(checklistDocs: DocFields): AdminWorkHistoryEntry[] {
  const workHistory = (checklistDocs as unknown as Record<string, unknown>).work_history;
  const entries =
    workHistory && typeof workHistory === 'object' && 'entries' in workHistory
      ? (workHistory as { entries?: unknown }).entries
      : null;

  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    const value = entry && typeof entry === 'object'
      ? (entry as Record<string, unknown>)
      : {};
    return {
      employer: String(value.employer ?? ''),
      companyContact: String(value.companyContact ?? ''),
      jobTitle: String(value.jobTitle ?? ''),
      startDate: String(value.startDate ?? ''),
      endDate: String(value.endDate ?? ''),
      reasonForLeaving: String(value.reasonForLeaving ?? ''),
    };
  });
}

function ageFromDob(dob: string) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function ageDecision(age: number | null, role?: string): AgeVerification | null {
  if (age === null) return null;
  if (age < 18) return 'REJECTED';
  if (role === 'Bicycle Courier') return 'AUTO_CONFIRMED';
  if (age < 25) return 'PENDING_INSURER';
  return 'AUTO_CONFIRMED';
}

function calcAgeGate(role: string, dob: string) {
  const verification = ageDecision(ageFromDob(dob), role);
  if (verification === 'REJECTED') return 'Rejected';
  if (verification) return 'Accepted';
  return '';
}

function ageVerificationLabel(dob: string, role?: string) {
  const verification = ageDecision(ageFromDob(dob), role);
  if (verification === 'AUTO_CONFIRMED') return 'Accepted - auto-confirmed (25+)';
  if (verification === 'PENDING_INSURER') return 'Accepted - pending insurer verification (18-24)';
  if (verification === 'REJECTED') return 'Rejected - under 18';
  return '';
}

function ageDocumentStatus(dob: string, role?: string) {
  const verification = ageDecision(ageFromDob(dob), role);
  if (verification === 'AUTO_CONFIRMED') return 'Received';
  if (verification === 'PENDING_INSURER') return 'Pending';
  if (verification === 'REJECTED') return 'Rejected';
  return '';
}

function normaliseFirstAccessEmailKey(email: string) {
  return email.trim().toLowerCase().replace(/[^a-z0-9._%+-@]/g, '_');
}

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function candidatePortalLoginUrl() {
  const configuredUrl = (import.meta.env?.VITE_VETTING_PORTAL_URL as string | undefined)?.trim();
  const runtimeUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : '';
  const baseUrl = (configuredUrl || runtimeUrl).replace(/\/+$/, '');
  if (!baseUrl) return '/vetting';
  return baseUrl.endsWith('/vetting') ? baseUrl : `${baseUrl}/vetting`;
}

function candidateApprovalMessage(candidate: ChecklistCandidate) {
  const firstName = candidate.name.trim().split(/\s+/)[0] || 'there';
  const temporaryPassword = candidate.firstAccessTemporaryPassword;
  const portalUrl = candidatePortalLoginUrl();
  const firstAccessBlock = temporaryPassword
    ? `
First access details:
Portal link: ${portalUrl}
Email: ${candidate.email}
Temporary password: ${temporaryPassword}

Please open the portal link above, choose "First access", enter the temporary password above, then create your own password.`
    : `
First access details:
Portal link: ${portalUrl}
Your recruiter will send your temporary first-access password after this step is approved.`;

  return `Hello ${firstName},

Great news — you have successfully passed the first stage of the BA Express recruitment process.

Your access to the BA Express Vetting Portal is now active. You can use the platform to track the progress of your vetting, view any outstanding steps and follow updates from our recruitment team.

Candidate reference: ${candidate.rawId}
${firstAccessBlock}

Please keep this reference number for future communication.

Best regards,
BA Express Recruitment Team`;
}

function interviewInvitationMessage(candidate: ChecklistCandidate) {
  const firstName = candidate.name.trim().split(/\s+/)[0] || 'there';
  const interview = candidate.checklistDocs.interview_record ?? {};
  const date = interview.int_date || '[Interview Date]';
  const start = interview.int_start_time || '[Start Time]';
  const end = interview.int_end_time || '[End Time]';
  const location = interview.int_location || '[Location]';
  const interviewer = interview.int_interviewer || '[Interviewer]';
  const supervisor = interview.int_supervisor || '[Supervisor]';

  return `Hello ${firstName},

Your BA Express interview has been scheduled with the details below:

Interview Date: ${date}
Start Time: ${start}
End Time: ${end}
Location: ${location}
Interviewer: ${interviewer}
Supervisor: ${supervisor}

Please arrive on time and bring any original documents requested by the recruitment team.

Best regards,
BA Express Recruitment Team`;
}

function finalApprovalMessage(candidate: ChecklistCandidate) {
  const firstName = candidate.name.trim().split(/\s+/)[0] || 'there';

  return `Hello ${firstName},

We are pleased to confirm that your BA Express application has been approved following the vetting and interview checks.

Our recruitment team will contact you with the next steps for onboarding, document completion and start arrangements.

Candidate reference: ${candidate.rawId}

Best regards,
BA Express Recruitment Team`;
}

function checklistMessageConfig(
  candidate: ChecklistCandidate,
  slot: NonNullable<ChecklistItem['messageSlot']>,
) {
  switch (slot) {
    case 'interview-invitation':
      return {
        label: 'Interview e-mail to share with candidate',
        message: interviewInvitationMessage(candidate),
      };
    case 'approval-email':
      return {
        label: 'Approval e-mail to share with candidate',
        message: finalApprovalMessage(candidate),
      };
    case 'candidate-confirmation':
    default:
      return {
        label: 'Message to share with candidate',
        message: candidateApprovalMessage(candidate),
      };
  }
}

function registeredChecklistValue(candidate: ChecklistCandidate, item: ChecklistItem) {
  const roleLabel = candidate.role.replace(/ Courier$/, '');

  if (item.docKey === 'application_form') {
    return candidate.checklistDocs.application_form?.signature_status
      ?? candidate.checklistDocs.application_form?.__documentStatus
      ?? '';
  }

  if (item.docKey === 'registration_baseline') {
    return roleLabel;
  }

  if (item.docKey === 'dvla_doc' && candidate.role === 'Bicycle Courier') {
    return 'Not required - Bike';
  }

  if (item.docKey === 'driving_history' && candidate.role === 'Bicycle Courier') {
    return 'Not required - Bike';
  }

  return '';
}

function registeredChecklistFields(
  candidate: ChecklistCandidate,
  item: ChecklistItem,
) {
  if (item.docKey === 'registration_baseline') {
    const age = ageFromDob(candidate.dob);
    const ageVerification = ageDecision(age, candidate.role);
    const ageValue =
      age === null
        ? ''
        : `${age} years old - ${calcAgeGate(candidate.role, candidate.dob)}${
            ageVerification === 'PENDING_INSURER'
              ? ' - pending insurer verification'
              : ''
          }`;

    return [
      { label: 'Name', value: candidate.name },
      { label: 'Phone', value: candidate.phone },
      { label: 'E-mail', value: candidate.email },
      { label: 'Nationality', value: candidate.nationality },
      { label: 'Role Type', value: candidate.role.replace(/ Courier$/, '') },
      { label: 'Date of Birth', value: candidate.dob },
      { label: 'UK Postcode', value: candidate.postcode },
      { label: 'Address', value: candidate.address },
      { label: 'National Insurance Number', value: candidate.nin },
      {
        label: 'Right to Work',
        value:
          candidate.checklistDocs.rtw_doc?.rtw_type ||
          candidate.checklistDocs.registration_baseline?.right_to_work ||
          (isBritishCandidate(candidate) ? BRITISH_RTW_LABEL : ''),
      },
      {
        label: 'DVLA Share Code',
        value:
          candidate.role === 'Bicycle Courier'
            ? 'Not required - Bike'
            : candidate.checklistDocs.dvla_doc?.dvla_share_code ||
              candidate.checklistDocs.registration_baseline?.dvla_share_code ||
              '',
      },
      ...(ageValue ? [{ label: 'Age gate', value: ageValue }] : []),
    ];
  }

  if (item.docKey === 'rtw_doc') {
    const rtw = candidate.checklistDocs.rtw_doc ?? {};
    const rtwType = rtw.rtw_type || (isBritishCandidate(candidate) ? BRITISH_RTW_LABEL : '');
    return [
      { label: 'Right to Work', value: rtwType },
      { label: 'Document number', value: rtw.rtw_number },
      { label: 'Expiry date', value: rtw.rtw_expiry },
      ...(rtw.rtw_check_date
        ? [{ label: 'RTW Check Date', value: rtw.rtw_check_date }]
        : []),
      ...(rtw.rtw_nationality
        ? [{ label: 'Nationality', value: rtw.rtw_nationality }]
        : []),
      ...(rtw.rtw_share_code
        ? [{ label: 'Share Code', value: rtw.rtw_share_code }]
        : []),
    ];
  }

  if (item.docKey === 'dvla_doc' && candidate.role !== 'Bicycle Courier') {
    const dvla = candidate.checklistDocs.dvla_doc ?? {};
    return [
      { label: 'Licence type', value: dvla.dvla_type },
      { label: 'Drive License Number', value: dvla.dvla_number },
      ...(dvla.dvla_expiry
        ? [{ label: 'Expiry date', value: dvla.dvla_expiry }]
        : []),
      ...(dvla.dvla_country
        ? [{ label: 'Country of issue', value: dvla.dvla_country }]
        : []),
      ...(dvla.dvla_share_code
        ? [{ label: 'DVLA Share Code', value: dvla.dvla_share_code }]
        : []),
    ];
  }

  return [];
}

function isStepReadyForApproval(
  candidate: ChecklistCandidate,
  stepIndex: number,
  startIndex: number,
) {
  const step = CHECKLIST_STEPS[stepIndex];
  if (!step) return false;

  return step.items.every((item, itemIndex) => {
    if (item.hidden) return true;
    if (!item.required) return true;
    return (
      Boolean(candidate.checks[startIndex + itemIndex]) &&
      isRegistrationComplete(candidate, item)
    );
  });
}

export default function AdminChecklistPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<ChecklistCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savingApproval, setSavingApproval] = useState<number | null>(null);
  const [rejectingApplication, setRejectingApplication] = useState(false);
  const [holdingApplication, setHoldingApplication] = useState(false);
  const [applicationHoldReason, setApplicationHoldReason] = useState('');
  const [savingAppReject, setSavingAppReject] = useState(false);
  const [savingAppHold, setSavingAppHold] = useState(false);
  const [savingWorkHistoryRelease, setSavingWorkHistoryRelease] = useState(false);
  const [copiedMessageSlot, setCopiedMessageSlot] = useState<string | null>(null);
  const [openStepBlocks, setOpenStepBlocks] = useState<Record<number, boolean>>({});

  // Step whose approval grants candidate portal access.
  const APPLICATION_GATE_STEP = 0;

  // local doc-field draft state — keyed by `${candidateId}::${docKey}::${fieldKey}`
  const [docDrafts, setDocDrafts] = useState<Record<string, string>>({});
  // case notes draft — keyed by candidateId
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  // internal rejection notes draft — keyed by candidateId
  const [rejectionNotesDrafts, setRejectionNotesDrafts] = useState<Record<string, string>>({});
  const [generatePasswordLoading, setGeneratePasswordLoading] = useState(false);
  const [generatedPasswordResult, setGeneratedPasswordResult] = useState<{
    email: string;
    temporaryPassword?: string;
    expiresAt?: string;
    message?: string;
  } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const candidateId = new URLSearchParams(window.location.search || (window.location.hash.split('?')[1] ?? '')).get('candidate');
    if (candidateId) setSelectedId(candidateId);
  }, []);

  // Reset reject-application form when selected candidate changes
  useEffect(() => {
    setRejectingApplication(false);
    setHoldingApplication(false);
    setApplicationHoldReason('');
    setCopiedMessageSlot(null);
    setOpenStepBlocks({});
    setGeneratedPasswordResult(null);
    setPasswordError(null);
  }, [selectedId]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace('/vetting');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    setDataLoading(true);
    let driversLoaded = false;
    let legacyLoaded = false;
    let driverRows: ChecklistCandidate[] = [];
    let legacyRows: ChecklistCandidate[] = [];

    const publish = () => {
      if (!driversLoaded || !legacyLoaded) return;
      const rows = [...driverRows, ...legacyRows].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setCandidates(rows);
      setSelectedId((current) => {
        if (current && rows.some((r) => r.id === current)) return current;
        return rows[0]?.id ?? null;
      });
      setDataError(null);
      setDataLoading(false);
    };

    const unsubDrivers = onSnapshot(
      collection(db, 'drivers'),
      (snap) => {
        driverRows = snap.docs.map((d) => mapDriverDoc(d.id, d.data()));
        driversLoaded = true;
        publish();
      },
      (err) => {
        driversLoaded = true;
        setDataError(`drivers: ${err.message}`);
        setDataLoading(false);
      },
    );

    const unsubLegacy = onSnapshot(
      collection(db, 'workspaces', 'ba-express-vetting', 'vendors'),
      (snap) => {
        legacyRows = snap.docs.map((d) => mapLegacyVendorDoc(d.id, d.data()));
        legacyLoaded = true;
        publish();
      },
      (err) => {
        legacyLoaded = true;
        setDataError(`legacy: ${err.message}`);
        setDataLoading(false);
      },
    );

    return () => {
      unsubDrivers();
      unsubLegacy();
    };
  }, [loading, isAuthenticated]);

  // ── derived (must come before callbacks that close over it) ───────────────

  const selected =
    candidates.find((c) => c.id === selectedId) ?? candidates[0] ?? null;

  // ── navbar applicant select sync ───────────────────────────────────────────

  const { selectedId: navCandidateId, setSelectedId: setNavCandidateId } = useAdminCandidate();

  // The navbar select drives which applicant this page shows.
  useEffect(() => {
    if (navCandidateId) setSelectedId(navCandidateId);
  }, [navCandidateId]);

  // Reflect the resolved candidate (e.g. default first row) back into the navbar.
  useEffect(() => {
    if (selected && selected.id !== navCandidateId) setNavCandidateId(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ── CDR audit log ──────────────────────────────────────────────────────────
  // Snapshot of the last-persisted Central Driver Record identity fields, used to
  // diff old → new on save so each field change is logged with who/when (node 2).
  const cdrSnapshotRef = useRef<Record<string, Record<string, string>>>({});
  const auditActor = useMemo(
    () => actorFrom(user ? { displayName: user.displayName, email: user.email } : null),
    [user],
  );
  const snapshotCdr = useCallback(
    (candidate: ChecklistCandidate): Record<string, string> => ({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      nin: candidate.nin,
      depot: candidate.depot,
      role: candidate.role,
      startDate: candidate.startDate,
      employment: candidate.employment,
      nationality: candidate.nationality,
      dob: candidate.dob,
      postcode: candidate.postcode,
      address: candidate.address,
      owner: candidate.owner,
      driveFolderUrl: candidate.driveFolderUrl,
    }),
    [],
  );

  // ── toggle checkbox ────────────────────────────────────────────────────────

  const handleToggleCheck = async (globalIndex: number) => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    if (selected.automatedChecks[globalIndex]) return;
    const item = CHECKLIST_STEPS.flatMap((step) => step.items)[globalIndex];
    if (!selected.checks[globalIndex] && item && !isRegistrationComplete(selected, item)) return;
    const nextChecks = [...selected.checks];
    nextChecks[globalIndex] = !nextChecks[globalIndex];
    setSavingIndex(globalIndex);
    setCandidates((cur) =>
      cur.map((c) => (c.id === selected.id ? { ...c, checks: nextChecks } : c)),
    );

    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          checklistChecks: nextChecks,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), {
          checks: nextChecks,
          updatedAt: Date.now(),
        });
      }
      setDataError(null);
    } catch (err) {
      setCandidates((cur) =>
        cur.map((c) => (c.id === selected.id ? { ...c, checks: selected.checks } : c)),
      );
      setDataError(err instanceof Error ? err.message : 'Unable to save checklist item.');
    } finally {
      setSavingIndex(null);
    }
  };

  // ── step approval gate ────────────────────────────────────────────────────

  const handleApproveStep = useCallback(async (stepIndex: number) => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    const startIndex = CHECKLIST_STEPS
      .slice(0, stepIndex)
      .reduce((total, step) => total + step.items.length, 0);
    void startIndex;
    setSavingApproval(stepIndex);
    let firstAccessTemporaryPassword = '';
    let firstAccessPayload: Record<string, unknown> | null = null;

    if (stepIndex === APPLICATION_GATE_STEP) {
      if (!selected.email) {
        setDataError('Candidate email is required before granting portal access.');
        setSavingApproval(null);
        return;
      }

      firstAccessTemporaryPassword = generateTemporaryPassword();
      const salt = crypto.randomUUID();
      firstAccessPayload = {
        email: selected.email.trim().toLowerCase(),
        candidateId: selected.rawId,
        candidateName: selected.name,
        source: selected.source,
        codeHash: await sha256(`${salt}:${firstAccessTemporaryPassword}`),
        salt,
        issuedAt: serverTimestamp(),
        expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
        consumedAt: null,
        issuedBy: user?.email ?? user?.displayName ?? 'Admin',
      };
    }

    const nextApprovals = [...selected.stepApprovals];
    nextApprovals[stepIndex] = true;
    const nextMeta = [...selected.stepApprovalMeta];
    nextMeta[stepIndex] = {
      approvedAt: Date.now(),
      approvedBy: user?.displayName ?? user?.email ?? 'Admin',
    };
    const nextRejections = [...selected.stepRejections];
    nextRejections[stepIndex] = false;
    const nextRejectionMeta = [...selected.stepRejectionMeta];
    nextRejectionMeta[stepIndex] = null;

    setCandidates((cur) =>
      cur.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              stepApprovals: nextApprovals,
              stepApprovalMeta: nextMeta,
              stepRejections: nextRejections,
              stepRejectionMeta: nextRejectionMeta,
              ...(firstAccessTemporaryPassword
                ? { firstAccessTemporaryPassword }
                : {}),
            }
          : c,
      ),
    );

    try {
      const payload: Record<string, unknown> = {
        stepApprovals: nextApprovals,
        stepApprovalMeta: nextMeta,
        stepRejections: nextRejections,
        stepRejectionMeta: nextRejectionMeta,
      };

      if (stepIndex === APPLICATION_GATE_STEP) {
        payload.accessGranted = true;
        payload.currentStatus = 'PRE_SCREEN_PENDING';
        payload.applicationOnHold = false;
        payload.applicationHoldReason = '';
        payload.firstAccessIssuedAt = serverTimestamp();
        payload.firstAccessEmail = selected.email.trim().toLowerCase();
      }

      if (firstAccessPayload) {
        await setDoc(
          doc(db, 'firstAccessCodes', normaliseFirstAccessEmailKey(selected.email)),
          firstAccessPayload,
          { merge: true },
        );
      }

      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(
          doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId),
          { ...payload, updatedAt: Date.now() },
        );
      }
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{
          field: `stepApprovals.${stepIndex}`,
          previousValue: selected.stepApprovals[stepIndex] ?? false,
          newValue: true,
          reason: CHECKLIST_STEPS[stepIndex]?.title,
        }],
        auditActor,
      );
      setDataError(null);
    } catch (err) {
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                stepApprovals: selected.stepApprovals,
                stepApprovalMeta: selected.stepApprovalMeta,
                stepRejections: selected.stepRejections,
                stepRejectionMeta: selected.stepRejectionMeta,
              }
            : c,
        ),
      );
      setDataError(err instanceof Error ? err.message : 'Unable to approve step.');
    } finally {
      setSavingApproval(null);
    }
  }, [selected, user, APPLICATION_GATE_STEP, auditActor]);

  const handleRejectStep = useCallback(async (stepIndex: number) => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    setSavingApproval(stepIndex);

    const nextApprovals = selected.stepApprovals.map((value, index) =>
      index >= stepIndex ? false : value,
    );
    const nextMeta = selected.stepApprovalMeta.map((value, index) =>
      index >= stepIndex ? null : value,
    );
    const nextRejections = [...selected.stepRejections];
    nextRejections[stepIndex] = true;
    const nextRejectionMeta = [...selected.stepRejectionMeta];
    nextRejectionMeta[stepIndex] = {
      rejectedAt: Date.now(),
      rejectedBy: user?.displayName ?? user?.email ?? 'Admin',
    };

    setCandidates((cur) =>
      cur.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              stepApprovals: nextApprovals,
              stepApprovalMeta: nextMeta,
              stepRejections: nextRejections,
              stepRejectionMeta: nextRejectionMeta,
            }
          : c,
      ),
    );

    try {
      const payload: Record<string, unknown> = {
        stepApprovals: nextApprovals,
        stepApprovalMeta: nextMeta,
        stepRejections: nextRejections,
        stepRejectionMeta: nextRejectionMeta,
      };

      if (stepIndex <= APPLICATION_GATE_STEP) {
        payload.accessGranted = false;
      }

      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(
          doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId),
          { ...payload, updatedAt: Date.now() },
        );
      }
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{
          field: `stepRejections.${stepIndex}`,
          previousValue: selected.stepRejections[stepIndex] ?? false,
          newValue: true,
          reason: CHECKLIST_STEPS[stepIndex]?.title,
        }],
        auditActor,
      );
      setDataError(null);
    } catch (err) {
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                stepApprovals: selected.stepApprovals,
                stepApprovalMeta: selected.stepApprovalMeta,
                stepRejections: selected.stepRejections,
                stepRejectionMeta: selected.stepRejectionMeta,
              }
            : c,
        ),
      );
      setDataError(err instanceof Error ? err.message : 'Unable to reject step.');
    } finally {
      setSavingApproval(null);
    }
  }, [selected, user, APPLICATION_GATE_STEP, auditActor]);

  const handleRejectApplication = useCallback(async () => {
    if (!selected) return;
    setSavingAppReject(true);
    const payload: Record<string, unknown> = {
      applicationRejected: true,
      applicationRejectionReason: '',
      applicationOnHold: false,
      applicationHoldReason: '',
      accessGranted: false,
      currentStatus: 'APPLICATION_REJECTED',
      status: 'REJECTED',
    };
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), { ...payload, updatedAt: Date.now() });
      }
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                applicationRejected: true,
                applicationRejectionReason: '',
                applicationOnHold: false,
                applicationHoldReason: '',
                status: 'APPLICATION_REJECTED',
              }
            : c,
        ),
      );
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{
          field: 'status',
          previousValue: selected.status,
          newValue: 'APPLICATION_REJECTED',
          reason: selected.applicationRejectionInternalNotes || undefined,
        }],
        auditActor,
      );
      setRejectingApplication(false);
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to reject application.');
    } finally {
      setSavingAppReject(false);
    }
  }, [selected, auditActor]);

  const handleHoldApplication = useCallback(async (reason: string) => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    setSavingAppHold(true);
    const payload: Record<string, unknown> = {
      applicationOnHold: true,
      applicationHoldReason: reason,
      applicationRejected: false,
      applicationRejectionReason: '',
      accessGranted: false,
      currentStatus: 'ON_HOLD',
      status: 'ON_HOLD',
    };
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), { ...payload, updatedAt: Date.now() });
      }
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                applicationOnHold: true,
                applicationHoldReason: reason,
                applicationRejected: false,
                applicationRejectionReason: '',
                status: 'ON_HOLD',
              }
            : c,
        ),
      );
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{ field: 'status', previousValue: selected.status, newValue: 'ON_HOLD', reason }],
        auditActor,
      );
      setHoldingApplication(false);
      setApplicationHoldReason('');
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to put application on hold.');
    } finally {
      setSavingAppHold(false);
    }
  }, [selected, auditActor]);

  const handleUndoHoldApplication = useCallback(async () => {
    if (!selected) return;
    setSavingAppHold(true);
    const payload: Record<string, unknown> = {
      applicationOnHold: false,
      applicationHoldReason: '',
      currentStatus: 'PRE_REGISTERED',
      status: 'PRE_REGISTERED',
    };
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), { ...payload, updatedAt: Date.now() });
      }
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? { ...c, applicationOnHold: false, applicationHoldReason: '', status: 'PRE_REGISTERED' }
            : c,
        ),
      );
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{ field: 'status', previousValue: selected.status, newValue: 'PRE_REGISTERED', reason: 'Hold removed' }],
        auditActor,
      );
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to remove hold.');
    } finally {
      setSavingAppHold(false);
    }
  }, [selected, auditActor]);

  const handleUndoRejectApplication = useCallback(async () => {
    if (!selected) return;
    setSavingAppReject(true);
    const payload: Record<string, unknown> = {
      applicationRejected: false,
      applicationRejectionReason: '',
      currentStatus: 'PRE_REGISTERED',
      status: 'PRE_REGISTERED',
    };
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), { ...payload, updatedAt: Date.now() });
      }
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? { ...c, applicationRejected: false, applicationRejectionReason: '', status: 'PRE_REGISTERED' }
            : c,
        ),
      );
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{ field: 'status', previousValue: selected.status, newValue: 'PRE_REGISTERED', reason: 'Rejection undone' }],
        auditActor,
      );
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to undo rejection.');
    } finally {
      setSavingAppReject(false);
    }
  }, [selected, auditActor]);

  const handleToggleWorkHistoryRelease = useCallback(async () => {
    if (!selected) return;
    setSavingWorkHistoryRelease(true);
    const isReleased = (selected.checklistDocs as Record<string, unknown>)?.work_history_released === true;
    const payload: Record<string, unknown> = {
      [`checklistDocs.work_history_released`]: !isReleased,
      updatedAt: serverTimestamp(),
    };
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), payload);
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), {
          ...payload,
          updatedAt: Date.now(),
        });
      }
      setCandidates((cur) =>
        cur.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                checklistDocs: {
                  ...c.checklistDocs,
                  work_history_released: !isReleased,
                } as unknown as DocFields,
              }
            : c,
        ),
      );
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to update work history access.');
    } finally {
      setSavingWorkHistoryRelease(false);
    }
  }, [selected]);

  // ── case registration / Central Driver Record ─────────────────────────────

  const handleCaseRegistrationChange = useCallback(
    (field: CaseRegistrationField, value: string) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      // Capture the persisted baseline the first time this record is edited,
      // so the blur handler can diff old → new for the audit log.
      if (!cdrSnapshotRef.current[selected.id]) {
        cdrSnapshotRef.current[selected.id] = snapshotCdr(selected);
      }
      setCandidates((cur) =>
        cur.map((c) => (c.id === selected.id ? { ...c, [field]: value } : c)),
      );
    },
    [selected, snapshotCdr],
  );

  const handleCaseRegistrationBlur = useCallback(async () => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    const inheritedDocs: DocFields = {
      ...selected.checklistDocs,
      role_type: {
        ...(selected.checklistDocs.role_type ?? {}),
        role_selected: selected.role,
        __documentStatus: selected.role ? 'Received' : '',
      },
      age_check: {
        ...(selected.checklistDocs.age_check ?? {}),
        age_gate_result: calcAgeGate(selected.role, selected.dob),
        age_years: ageFromDob(selected.dob) === null ? '' : String(ageFromDob(selected.dob)),
        age_verification: ageDecision(ageFromDob(selected.dob), selected.role) ?? '',
        age_verification_label: ageVerificationLabel(selected.dob, selected.role),
        __documentStatus: selected.dob && selected.role ? ageDocumentStatus(selected.dob, selected.role) : '',
      },
      registration_baseline: {
        ...(selected.checklistDocs.registration_baseline ?? {}),
        full_name: selected.name,
        phone: selected.phone,
        email: selected.email,
        nationality: selected.nationality,
        role_type: selected.role,
        date_of_birth: selected.dob,
        uk_postcode: selected.postcode,
        address: selected.address,
        national_insurance_number: selected.nin,
        right_to_work:
          selected.checklistDocs.rtw_doc?.rtw_type ||
          selected.checklistDocs.registration_baseline?.right_to_work ||
          (isBritishCandidate(selected) ? BRITISH_RTW_LABEL : ''),
        dvla_share_code:
          selected.role === 'Bicycle Courier'
            ? 'Not required'
            : selected.checklistDocs.dvla_doc?.dvla_share_code ||
              selected.checklistDocs.registration_baseline?.dvla_share_code ||
              '',
        __documentStatus: 'Received',
      },
    };
    const payload = {
      fullName: selected.name,
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
      nin: selected.nin,
      depot: selected.depot,
      role: selected.role,
      category: selected.category,
      startDate: selected.startDate,
      employment: selected.employment,
      nationality: selected.nationality,
      dob: selected.dob,
      postcode: selected.postcode,
      address: selected.address,
      owner: selected.owner,
      caseOwner: selected.owner,
      driveFolderUrl: selected.driveFolderUrl,
      checklistDocs: inheritedDocs,
    };

    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          ...payload,
          personalInfo: {
            fullName: selected.name,
            email: selected.email,
            phone: selected.phone,
            nationality: selected.nationality,
            dob: selected.dob,
            dateOfBirth: selected.dob,
            address: selected.address,
            postcode: selected.postcode,
            nin: selected.nin,
          },
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), {
          ...payload,
          updatedAt: Date.now(),
        });
      }
      // Audit each changed CDR identity field against the captured baseline.
      const baseline = cdrSnapshotRef.current[selected.id];
      if (baseline) {
        const current = snapshotCdr(selected);
        const changes = Object.keys(current).map((field) => ({
          field,
          previousValue: baseline[field] ?? '',
          newValue: current[field] ?? '',
        }));
        void logCdrChanges(selected.source, selected.rawId, changes, auditActor);
        cdrSnapshotRef.current[selected.id] = current;
      }
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to save case registration.');
    }
  }, [selected, snapshotCdr, auditActor]);

  // ── doc-field change ───────────────────────────────────────────────────────


  const handleDocFieldChange = useCallback(
    (docKey: string, fieldKey: string, value: string) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      setDocDrafts((prev) => ({
        ...prev,
        [`${selected.id}::${docKey}::${fieldKey}`]: value,
      }));
    },
    [selected],
  );

  const handleDocFieldBlur = useCallback(
    async (docKey: string, fieldKey: string, value: string) => {
      if (!selected) return;
      if (selected.applicationRejected) return;

      const nextDocFields = {
        ...(selected.checklistDocs[docKey] ?? {}),
        [fieldKey]: value,
      };
      if (
        docKey === 'uk_crc' &&
        fieldKey === 'dbs_document_status' &&
        value === 'With convictions'
      ) {
        nextDocFields.dbs_decision = 'Reproved';
        setDocDrafts((prev) => ({
          ...prev,
          [`${selected.id}::uk_crc::dbs_decision`]: 'Reproved',
        }));
      }

      // Merge into candidate's checklistDocs
      const nextDocs: DocFields = {
        ...selected.checklistDocs,
        [docKey]: nextDocFields,
      };

      setCandidates((cur) =>
        cur.map((c) => (c.id === selected.id ? { ...c, checklistDocs: nextDocs } : c)),
      );

      const previousValue = selected.checklistDocs[docKey]?.[fieldKey] ?? '';

      try {
        if (selected.source === 'drivers') {
          await updateDoc(doc(db, 'drivers', selected.rawId), {
            checklistDocs: nextDocs,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId), {
            checklistDocs: nextDocs,
            updatedAt: Date.now(),
          });
        }
        void logCdrChanges(
          selected.source,
          selected.rawId,
          [{ field: `checklistDocs.${docKey}.${fieldKey}`, previousValue, newValue: value }],
          auditActor,
        );
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Unable to save document field.');
      }
    },
    [selected, auditActor],
  );

  const getDocFieldValue = useCallback(
    (docKey: string, fieldKey: string): string => {
      if (!selected) return '';
      const draftKey = `${selected.id}::${docKey}::${fieldKey}`;
      if (draftKey in docDrafts) return docDrafts[draftKey];
      return selected.checklistDocs[docKey]?.[fieldKey] ?? '';
    },
    [selected, docDrafts],
  );

  // ── interview module ──────────────────────────────────────────────────────

  const persistInterview = useCallback(
    async (nextInterview: ChecklistInterview) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      const withScore = { ...nextInterview, totalScore: interviewScore(nextInterview) };

      setCandidates((cur) =>
        cur.map((c) => (c.id === selected.id ? { ...c, interview: withScore } : c)),
      );

      try {
        if (selected.source === 'drivers') {
          await updateDoc(doc(db, 'drivers', selected.rawId), {
            interview: withScore,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(
            doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId),
            { interview: withScore, updatedAt: Date.now() },
          );
        }
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Unable to save interview.');
      }
    },
    [selected],
  );

  const updateInterviewLocal = useCallback(
    (nextInterview: ChecklistInterview) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      const withScore = { ...nextInterview, totalScore: interviewScore(nextInterview) };
      setCandidates((cur) =>
        cur.map((c) => (c.id === selected.id ? { ...c, interview: withScore } : c)),
      );
    },
    [selected],
  );

  const handleInterviewTextChange = useCallback(
    (field: keyof ChecklistInterview, value: string) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      updateInterviewLocal({ ...selected.interview, [field]: value });
    },
    [selected, updateInterviewLocal],
  );

  const handleInterviewTextBlur = useCallback(async () => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    await persistInterview(selected.interview);
  }, [selected, persistInterview]);

  const handleInterviewCheck = useCallback(
    async (field: 'prepChecks' | 'docChecks' | 'redFlags', index: number, checked: boolean) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      const next = [...selected.interview[field]];
      next[index] = checked;
      await persistInterview({ ...selected.interview, [field]: next });
    },
    [selected, persistInterview],
  );

  const handleInterviewDocExpiry = useCallback(
    async (index: number, value: string) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      const next = [...selected.interview.docExpiry];
      next[index] = value;
      await persistInterview({ ...selected.interview, docExpiry: next });
    },
    [selected, persistInterview],
  );

  const handleInterviewScore = useCallback(
    async (group: 'comp' | 'prac', key: string, score: number) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      const current = selected.interview[group][key] ?? 0;
      await persistInterview({
        ...selected.interview,
        [group]: { ...selected.interview[group], [key]: current === score ? 0 : score },
      });
    },
    [selected, persistInterview],
  );

  const handleInterviewNextStep = useCallback(
    async (index: number, checked: boolean) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      const nextSteps = Array(NEXT_ITEMS.length).fill(false);
      if (checked) nextSteps[index] = true;
      await persistInterview({ ...selected.interview, nextSteps });
    },
    [selected, persistInterview],
  );
  void [handleInterviewTextChange, handleInterviewTextBlur, handleInterviewCheck, handleInterviewDocExpiry, handleInterviewNextStep];

  // ── case notes ─────────────────────────────────────────────────────────────

  const notesValue = selected
    ? (notesDrafts[selected.id] ?? selected.caseNotes)
    : '';

  const rejectionNotesValue = selected
    ? (rejectionNotesDrafts[selected.id] ?? selected.applicationRejectionInternalNotes)
    : '';

  const handleNotesChange = useCallback(
    (value: string) => {
      if (!selected) return;
      if (selected.applicationRejected) return;
      setNotesDrafts((prev) => ({ ...prev, [selected.id]: value }));
    },
    [selected],
  );

  const handleNotesBlur = useCallback(async () => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    const value = notesDrafts[selected.id] ?? selected.caseNotes;
    setCandidates((cur) =>
      cur.map((c) => (c.id === selected.id ? { ...c, caseNotes: value } : c)),
    );
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          caseNotes: value,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(
          doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId),
          { caseNotes: value, updatedAt: Date.now() },
        );
      }
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{ field: 'caseNotes', previousValue: selected.caseNotes, newValue: value }],
        auditActor,
      );
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to save notes.');
    }
  }, [selected, notesDrafts, auditActor]);

  const handleRejectionNotesChange = useCallback(
    (value: string) => {
      if (!selected) return;
      setRejectionNotesDrafts((prev) => ({ ...prev, [selected.id]: value }));
    },
    [selected],
  );

  const handleRejectionNotesBlur = useCallback(async () => {
    if (!selected) return;
    const value = rejectionNotesDrafts[selected.id] ?? selected.applicationRejectionInternalNotes;
    setCandidates((cur) =>
      cur.map((c) =>
        c.id === selected.id ? { ...c, applicationRejectionInternalNotes: value } : c,
      ),
    );
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          applicationRejectionInternalNotes: value,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(
          doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId),
          { applicationRejectionInternalNotes: value, updatedAt: Date.now() },
        );
      }
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{
          field: 'applicationRejectionInternalNotes',
          previousValue: selected.applicationRejectionInternalNotes,
          newValue: value,
        }],
        auditActor,
      );
      setDataError(null);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unable to save rejection notes.');
    }
  }, [selected, rejectionNotesDrafts, auditActor]);

  // ── suitability (internal assessment) ──────────────────────────────────────

  const handleSuitabilityChange = useCallback(async (value: string) => {
    if (!selected) return;
    if (selected.applicationRejected) return;
    // Toggle off when the already-selected option is clicked again.
    const next = selected.suitability === value ? '' : value;
    const previous = selected.suitability;
    setCandidates((cur) =>
      cur.map((c) => (c.id === selected.id ? { ...c, suitability: next } : c)),
    );
    try {
      if (selected.source === 'drivers') {
        await updateDoc(doc(db, 'drivers', selected.rawId), {
          suitability: next,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(
          doc(db, 'workspaces', 'ba-express-vetting', 'vendors', selected.rawId),
          { suitability: next, updatedAt: Date.now() },
        );
      }
      void logCdrChanges(
        selected.source,
        selected.rawId,
        [{ field: 'suitability', previousValue: previous, newValue: next }],
        auditActor,
      );
      setDataError(null);
    } catch (err) {
      setCandidates((cur) =>
        cur.map((c) => (c.id === selected.id ? { ...c, suitability: previous } : c)),
      );
      setDataError(err instanceof Error ? err.message : 'Unable to save suitability.');
    }
  }, [selected, auditActor]);

  const handleGeneratePassword = useCallback(async () => {
    if (!selected?.email) {
      setPasswordError('No email available');
      return;
    }

    setGeneratePasswordLoading(true);
    setPasswordError(null);
    setGeneratedPasswordResult(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const idToken = await currentUser.getIdToken();

      // Call API to send invitation email
      const response = await fetch('/api/admin/send-invitation-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: selected.email,
          candidateName: selected.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      setGeneratedPasswordResult({
        email: selected.email,
        message: `Invitation sent to ${selected.email}`,
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGeneratePasswordLoading(false);
    }
  }, [selected]);

  const progress = completion(selected);
  const applicationLocked = selected?.applicationRejected === true;

  const stepSummaries = useMemo(() => {
    if (!selected) return [];
    let offset = 0;
    return CHECKLIST_STEPS.map((step, idx) => {
      const start = offset;
      const end = start + step.items.length;
      offset = end;
      const checks = selected.checks.slice(start, end);
      const visibleItems = step.items.filter((item) => !item.hidden);
      const done = step.items.reduce(
        (total, item, itemIndex) => total + (!item.hidden && checks[itemIndex] ? 1 : 0),
        0,
      );
      const isApproved = selected.stepApprovals[idx] ?? false;
      const isRejected = selected.stepRejections[idx] ?? false;
      const previousRejected = idx > 0 && (selected.stepRejections[idx - 1] ?? false);
      const isLocked = idx > 0 && (!(selected.stepApprovals[idx - 1] ?? false) || previousRejected);
      const requiredDone = isStepReadyForApproval(selected, idx, start);
      return {
        idx,
        step,
        start,
        checks,
        done,
        total: visibleItems.length,
        percent: visibleItems.length ? Math.round((done / visibleItems.length) * 100) : 100,
        isApproved,
        isRejected,
        isLocked,
        requiredDone,
        approvalMeta: selected.stepApprovalMeta[idx] ?? null,
        rejectionMeta: selected.stepRejectionMeta[idx] ?? null,
      };
    });
  }, [selected]);

  const defaultOpenStepIndex = useMemo(() => {
    const availableStep = stepSummaries.find(
      ({ isLocked, isApproved, isRejected }) => !isLocked && !isApproved && !isRejected,
    );
    return availableStep?.idx ?? stepSummaries.find(({ isLocked }) => !isLocked)?.idx ?? 0;
  }, [stepSummaries]);

  const toggleStepBlock = useCallback((idx: number) => {
    setOpenStepBlocks((current) => {
      const isOpen = current[idx] ?? idx === defaultOpenStepIndex;
      return { ...current, [idx]: !isOpen };
    });
  }, [defaultOpenStepIndex]);

  // ── render ─────────────────────────────────────────────────────────────────

  if (loading || dataLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AdminNavbar />

      <main className={styles.content}>
        <div className={styles.eyebrow}>
          <div className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Compliance Workspace</span>
        </div>
        <h1 className={styles.title}>
          Admin <span className={styles.titleAccent}>Checklist</span>
        </h1>

        <section className={styles.statsGrid}>
          <StatCard label="Candidates" value={candidates.length} />
          <StatCard label="Items done" value={progress.done} variant="success" />
          <StatCard label="Open items" value={progress.total - progress.done} variant="danger" />
          <StatCard label="Progress" value={`${progress.percent}%`} />
        </section>

        {dataError && (
          <div className={styles.errorBanner}>Error: {dataError}</div>
        )}

        <div className={styles.workspace}>
          {/* ── checklist panel ── */}
          <section className={styles.checklistPanel}>
            {!selected ? (
              <div className={styles.emptyPanel}>No checklist data available yet.</div>
            ) : (
              <>
                <div className={styles.panelHeader}>
                  <div style={{ flex: 1 }}>
                    <p className={styles.panelKicker}>Selected candidate</p>
                    <h2 className={styles.panelTitle}>{selected.name}</h2>
                    <p className={styles.panelSub}>
                      {selected.email || 'No email'} · status {selected.status}
                    </p>
                    {generatedPasswordResult && (
                      <div className={styles.passwordResult}>
                        <small style={{ color: '#15803d', fontWeight: 600 }}>✓ {generatedPasswordResult.message}</small>
                        <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                          Check your email for the setup link
                        </small>
                      </div>
                    )}
                    {passwordError && (
                      <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                        Error: {passwordError}
                      </div>
                    )}
                  </div>
                  <div className={styles.panelActions}>
                    <button
                      type="button"
                      className={styles.generatePasswordBtn}
                      onClick={handleGeneratePassword}
                      disabled={generatePasswordLoading}
                      title="Generate temporary password for driver"
                    >
                      {generatePasswordLoading ? '...' : '🔑'}
                    </button>
                    <div className={styles.progressBadge}>
                      <span>{progress.percent}%</span>
                      <small>
                        {progress.done}/{progress.total}
                      </small>
                    </div>
                  </div>
                </div>

                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                {selected.applicationRejected && (
                  <>
                    <div className={styles.appRejectedBanner}>
                      <div className={styles.appRejectedBannerBody}>
                        <span className={styles.appRejectedBannerIcon}>✕</span>
                        <div>
                          <strong>Application rejected</strong>
                        </div>
                      </div>
                    </div>

                    {/* Candidate-facing email is generic by design: the internal rejection
                        reason is intentionally excluded (compliance). */}
                    <div className={styles.rejectionMessageBlock}>
                      <p className={styles.rejectionMessageLabel}>Email message to share with candidate:</p>
                      <div className={styles.rejectionMessageBox}>
                        <p className={styles.rejectionMessageGreeting}>Hello {selected.name.split(' ')[0]},</p>
                        <p className={styles.rejectionMessageBody}>
                          Thank you for applying to BA Express. We appreciate the time you took to submit your application.
                          After reviewing your application, we have decided not to move forward at this stage.
                        </p>
                        <p className={styles.rejectionMessageBody}>
                          We wish you the very best in your search and hope our paths may cross again in the future.
                        </p>
                        <p className={styles.rejectionMessageClosing}>Best regards,<br />BA Express Recruitment Team</p>
                      </div>
                      <button
                        type="button"
                        className={styles.copyMessageBtn}
                        onClick={() => {
                          const text = `Hello ${selected.name.split(' ')[0]},\n\nThank you for applying to BA Express. We appreciate the time you took to submit your application. After reviewing your application, we have decided not to move forward at this stage.\n\nWe wish you the very best in your search and hope our paths may cross again in the future.\n\nBest regards,\nBA Express Recruitment Team`;
                          navigator.clipboard.writeText(text);
                          alert('Message copied to clipboard');
                        }}
                      >
                        Copy message
                      </button>
                      <div className={styles.rejectionInternalNotesBlock}>
                        <label className={styles.rejectionInternalNotesLabel} htmlFor="rejectionInternalNotes">
                          Internal notes
                        </label>
                        <textarea
                          id="rejectionInternalNotes"
                          className={styles.rejectionInternalNotesTextarea}
                          value={rejectionNotesValue}
                          onChange={(e) => handleRejectionNotesChange(e.target.value)}
                          onBlur={handleRejectionNotesBlur}
                          placeholder="Internal reason, compliance notes, appeal context, or follow-up history. Not shown to the driver."
                          rows={4}
                        />
                      </div>
                    </div>
                  </>
                )}

                {selected.applicationOnHold && !selected.applicationRejected && (
                  <div className={styles.appHoldBanner}>
                    <div className={styles.appHoldBannerBody}>
                      <span className={styles.appHoldBannerIcon}>!</span>
                      <div>
                        <strong>Application on hold</strong>
                        {selected.applicationHoldReason && (
                          <p className={styles.appHoldBannerReason}>{selected.applicationHoldReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <CaseRegistrationPanel
                  candidate={selected}
                  onChange={handleCaseRegistrationChange}
                  onBlur={handleCaseRegistrationBlur}
                  readOnly={applicationLocked}
                />

                <ExportActions candidate={selected} />

                {/* ── suitability (internal assessment) ── */}
                <div className={styles.suitabilityBlock}>
                  <span className={styles.suitabilityLabel}>
                    Suitability <span className={styles.internalOnlyTag}>Internal</span>
                  </span>
                  <p className={styles.suitabilityHint}>
                    Internal assessment of whether the candidate should continue in the vetting
                    process. Not shared with the candidate.
                  </p>
                  <div className={styles.suitabilityOptions} role="group" aria-label="Suitability assessment">
                    {SUITABILITY_OPTIONS.map((option) => {
                      const active = selected.suitability === option;
                      const activeClass = active
                        ? option === 'Suitable'
                          ? styles.suitabilityOptionActiveSuitable
                          : option === 'Not Suitable'
                            ? styles.suitabilityOptionActiveNot
                            : styles.suitabilityOptionActiveReview
                        : '';
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={active}
                          className={`${styles.suitabilityOption} ${activeClass}`}
                          disabled={applicationLocked}
                          onClick={() => handleSuitabilityChange(option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── case notes ── */}
                <div className={styles.notesBlock}>
                  <label className={styles.notesLabel} htmlFor="caseNotes">
                    Case notes
                  </label>
                  <textarea
                    id="caseNotes"
                    className={styles.notesTextarea}
                    value={notesValue}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={handleNotesBlur}
                    disabled={applicationLocked}
                    placeholder="General observations, alerts, contact history, pending decisions..."
                    rows={5}
                  />
                </div>

                <div className={styles.steps}>
                  {stepSummaries.map(({ idx, step, start, checks, done, total, percent, isApproved, isRejected, isLocked, approvalMeta, rejectionMeta }) => {
                    const isExpanded = openStepBlocks[idx] ?? idx === defaultOpenStepIndex;
                    const stepPanelId = `checklist-step-panel-${idx + 1}`;
                    const indexedStepItems = step.items.map((item, itemIdx) => ({ item, itemIdx }));
                    const applicationFormItem = idx === APPLICATION_GATE_STEP
                      ? indexedStepItems.find(({ item }) => item.docKey === 'application_form')
                      : undefined;
                    const orderedStepItems = applicationFormItem
                      ? [
                          applicationFormItem,
                          ...indexedStepItems.filter((entry) => entry !== applicationFormItem),
                        ]
                      : indexedStepItems;

                    return (
                      <article
                        key={step.title}
                        className={`${styles.stepCard} ${isApproved ? styles.stepCardApproved : ''} ${isRejected ? styles.stepCardRejected : ''} ${isLocked ? styles.stepCardLocked : ''}`}
                      >
                        <button
                          type="button"
                          className={styles.stepHeaderButton}
                          aria-expanded={isExpanded}
                          aria-controls={stepPanelId}
                          onClick={() => toggleStepBlock(idx)}
                        >
                          <span className={styles.stepHeader}>
                            <span>
                              <span className={styles.stepIndex}>
                                Step {idx + 1}
                                {isApproved && <span className={styles.stepApprovedTag}>Approved</span>}
                                {isRejected && <span className={styles.stepRejectedTag}>Rejected</span>}
                                {isLocked && <span className={styles.stepLockedTag}>Locked</span>}
                              </span>
                              <span className={styles.stepTitle}>{step.title}</span>
                              <span className={styles.stepSub}>{step.subtitle}</span>
                              {step.sla && <span className={styles.slaBadge}>SLA: {step.sla}</span>}
                            </span>
                            <span className={styles.stepProgress}>
                              <span>{percent}%</span>
                              <small>{done}/{total}</small>
                            </span>
                          </span>
                          <span
                            className={`${styles.stepAccordionIcon} ${isExpanded ? styles.stepAccordionIconOpen : ''}`}
                            aria-hidden="true"
                          >
                            {isExpanded ? '-' : '+'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div id={stepPanelId} className={styles.stepBody}>
                            {isLocked ? (
                              <div className={styles.stepLockBanner}>
                                <span className={styles.lockGlyph}>🔒</span>
                                <div>
                                  <strong>Step locked</strong>
                                  <p>Step {idx} must be approved before this step is available.</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={styles.itemList}>
                                  {orderedStepItems.map(({ item, itemIdx }) => {
                                    if (item.hidden) return null;
                                    const checked = checks[itemIdx];
                                    const globalIndex = start + itemIdx;
                                    return (
                                      <Fragment key={item.title}>
                                        <ChecklistRow
                                          item={item}
                                          checked={checked}
                                          autoValidated={selected.automatedChecks[globalIndex]}
                                          registeredValue={registeredChecklistValue(selected, item)}
                                          registeredFields={registeredChecklistFields(selected, item)}
                                          registrationComplete={isRegistrationComplete(selected, item)}
                                          saving={savingIndex === globalIndex}
                                          interview={selected.interview}
                                          candidateName={selected.name}
                                          candidateRole={selected.role}
                                          workHistoryEntries={workHistoryEntriesFromDocs(selected.checklistDocs)}
                                          onToggle={() => handleToggleCheck(globalIndex)}
                                          onDocFieldChange={handleDocFieldChange}
                                          onDocFieldBlur={handleDocFieldBlur}
                                          getDocFieldValue={getDocFieldValue}
                                          onInterviewScore={handleInterviewScore}
                                          readOnly={applicationLocked}
                                          onRequiredDownload={
                                            item.requiredDownload
                                              ? () => downloadApplicationForm(selected)
                                              : undefined
                                          }
                                        />
                                        {item.messageSlot && (() => {
                                          const { label, message } = checklistMessageConfig(
                                            selected,
                                            item.messageSlot,
                                          );
                                          const copyKey = `${globalIndex}:${item.messageSlot}`;
                                          return (
                                            <div className={styles.confirmationMessageBlock}>
                                              <p className={styles.confirmationMessageLabel}>{label}</p>
                                              <div className={styles.confirmationMessageBox}>
                                                {message}
                                              </div>
                                              <button
                                                type="button"
                                                className={styles.copyConfirmationButton}
                                                onClick={async () => {
                                                  try {
                                                    await navigator.clipboard.writeText(message);
                                                    setCopiedMessageSlot(copyKey);
                                                  } catch {
                                                    setDataError('Unable to copy the checklist message.');
                                                  }
                                                }}
                                              >
                                                {copiedMessageSlot === copyKey ? '✓ Message copied' : 'Copy message'}
                                              </button>
                                            </div>
                                          );
                                        })()}
                                      </Fragment>
                                    );
                                  })}
                                </div>
                                {idx === 0 && <InitialInfoReview candidate={selected} />}
                                <div className={styles.stepApproveBar}>
                                  {isApproved ? (
                                    <div className={styles.stepActionStack}>
                                      <div className={styles.stepApprovedBadge}>
                                        <span className={styles.approvedCheck}>✓</span>
                                        <div>
                                          <strong>Approved</strong>
                                          {approvalMeta && (
                                            <span className={styles.approvedMeta}>
                                              {' '}by {approvalMeta.approvedBy} · {new Date(approvalMeta.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(approvalMeta.approvedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          )}
                                          {idx === APPLICATION_GATE_STEP && (
                                            <span className={styles.accessGrantedNote}> · Candidate portal access granted</span>
                                          )}
                                        </div>
                                      </div>
                                      <button type="button" className={styles.rejectBtn} disabled={applicationLocked || savingApproval === idx} onClick={() => handleRejectStep(idx)}>
                                        {savingApproval === idx ? 'Saving…' : `Reprove Step ${idx + 1}`}
                                      </button>
                                    </div>
                                  ) : isRejected ? (
                                    <div className={styles.stepActionStack}>
                                      <div className={styles.stepRejectedBadge}>
                                        <span className={styles.rejectedCross}>!</span>
                                        <div>
                                          <strong>Rejected</strong>
                                          {rejectionMeta && (
                                            <span className={styles.rejectedMeta}>
                                              {' '}by {rejectionMeta.rejectedBy} · {new Date(rejectionMeta.rejectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(rejectionMeta.rejectedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <button type="button" className={styles.approveBtn} disabled={applicationLocked || savingApproval === idx} onClick={() => handleApproveStep(idx)}>
                                        {savingApproval === idx ? 'Saving…' : idx === APPLICATION_GATE_STEP ? `Approve Step ${idx + 1} — grant candidate portal access` : `Approve Step ${idx + 1} — unlock next step`}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className={styles.stepActionButtons}>
                                      <button type="button" className={styles.rejectBtn} disabled={applicationLocked || savingApproval === idx} onClick={() => handleRejectStep(idx)}>
                                        {savingApproval === idx ? 'Saving…' : `Reprove Step ${idx + 1}`}
                                      </button>
                                      <button type="button" className={styles.approveBtn} disabled={applicationLocked || savingApproval === idx} onClick={() => handleApproveStep(idx)}>
                                        {savingApproval === idx ? 'Saving…' : idx === APPLICATION_GATE_STEP ? `Approve Step ${idx + 1} — grant candidate portal access` : `Approve Step ${idx + 1} — unlock next step`}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ── Floating application status buttons ── */}
        {selected && (
          <div className={styles.applyStatusFabGroup}>
            {!selected.applicationRejected && !selected.applicationOnHold && (
              <button
                type="button"
                className={styles.holdApplyFab}
                onClick={() => setHoldingApplication(true)}
                title="Put this application on hold"
              >
                Hold Apply
              </button>
            )}
            {selected.applicationOnHold && !selected.applicationRejected && (
              <button
                type="button"
                className={styles.holdApplyFabUndo}
                onClick={handleUndoHoldApplication}
                disabled={savingAppHold}
                title="Remove hold"
              >
                {savingAppHold ? '...' : 'On Hold'}
              </button>
            )}
            {!selected.applicationRejected && (
              <button
                type="button"
                className={`${styles.releaseWorkHistoryFab} ${(selected.checklistDocs as Record<string, unknown>)?.work_history_released ? styles.releaseWorkHistoryFabActive : ''}`}
                onClick={handleToggleWorkHistoryRelease}
                disabled={savingWorkHistoryRelease}
                title={(selected.checklistDocs as Record<string, unknown>)?.work_history_released ? 'Lock work history form' : 'Release work history form to driver'}
              >
                {savingWorkHistoryRelease
                  ? '…'
                  : (selected.checklistDocs as Record<string, unknown>)?.work_history_released
                    ? 'History Released'
                    : 'Release History'}
              </button>
            )}
            {!selected.applicationRejected && (
              <button
                type="button"
                className={styles.rejectApplyFab}
                onClick={() => setRejectingApplication(true)}
                title="Reject this application"
              >
                Reject Apply
              </button>
            )}
          </div>
        )}
        {selected && selected.applicationRejected && (
          <button
            type="button"
            className={styles.rejectApplyFabUndo}
            onClick={handleUndoRejectApplication}
            disabled={savingAppReject}
            title="Undo rejection"
          >
            {savingAppReject ? '…' : 'Undo'}
          </button>
        )}

        {/* ── Reject Apply modal ── */}
        {rejectingApplication && selected && (
          <div
            className={styles.rejectModalBackdrop}
            onClick={() => setRejectingApplication(false)}
          >
            <div
              className={styles.rejectModal}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-modal-title"
            >
              <div className={styles.rejectModalIcon}>✕</div>
              <h3 id="reject-modal-title" className={styles.rejectModalTitle}>
                Reject this application?
              </h3>
              <p className={styles.rejectModalWarning}>
                This will block <strong>{selected.name}</strong> from continuing the application.
                The rejection email message will be shown on the candidate page for you to copy and send.
                This action can be undone.
              </p>
              <div className={styles.rejectModalActions}>
                <button
                  type="button"
                  className={styles.appRejectCancelBtn}
                  onClick={() => setRejectingApplication(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.appRejectConfirmBtn}
                  disabled={savingAppReject}
                  onClick={handleRejectApplication}
                >
                  {savingAppReject ? 'Saving…' : 'Confirm rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Hold Apply modal ── */}
        {holdingApplication && selected && (
          <div
            className={styles.rejectModalBackdrop}
            onClick={() => { setHoldingApplication(false); setApplicationHoldReason(''); }}
          >
            <div
              className={styles.rejectModal}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="hold-modal-title"
            >
              <div className={styles.holdModalIcon}>!</div>
              <h3 id="hold-modal-title" className={styles.rejectModalTitle}>
                Put application on hold?
              </h3>
              <p className={styles.rejectModalWarning}>
                This will pause <strong>{selected.name}</strong>'s application and show the reason
                below in My Vetting.
              </p>
              <label className={styles.holdModalLabel} htmlFor="holdReason">
                Reason <span className={styles.holdModalRequired}>(shown to driver)</span>
              </label>
              <textarea
                id="holdReason"
                className={styles.appHoldReasonInput}
                rows={4}
                placeholder="e.g. We need an updated proof of address before continuing your application."
                value={applicationHoldReason}
                onChange={(e) => setApplicationHoldReason(e.target.value)}
                autoFocus
              />
              <div className={styles.rejectModalActions}>
                <button
                  type="button"
                  className={styles.appRejectCancelBtn}
                  onClick={() => { setHoldingApplication(false); setApplicationHoldReason(''); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.appHoldConfirmBtn}
                  disabled={!applicationHoldReason.trim() || savingAppHold}
                  onClick={() => handleHoldApplication(applicationHoldReason.trim())}
                >
                  {savingAppHold ? 'Saving...' : 'Confirm hold'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number | string;
  variant?: 'danger' | 'success';
}) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p
        className={`${styles.statValue} ${
          variant === 'danger'
            ? styles.statDanger
            : variant === 'success'
              ? styles.statSuccess
              : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
