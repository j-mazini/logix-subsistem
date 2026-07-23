import type { ChecklistItem } from '../../data/checklist';
import { isValidUkPhone } from '../../../utils/ukPhone';
import { extractEmploymentRecords } from '../work-history/coverage';
import {
  hasCompleteCoreCompetencyScores,
  hasCompleteInterviewScores,
} from '../interview/model';
import {
  BRITISH_RTW_LABEL,
  isBritishCandidate,
  rtwRequiresShareCode,
  type ChecklistCandidate,
} from './model';

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

function ageDecision(age: number | null, role?: string) {
  if (age === null) return null;
  if (age < 18) return 'REJECTED';
  if (role === 'Bicycle Courier') return 'AUTO_CONFIRMED';
  if (age < 25) return 'PENDING_INSURER';
  return 'AUTO_CONFIRMED';
}

function isValidFullName(value: string) {
  return value.trim().split(/\s+/).length >= 2;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUkPostcode(value: string) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(value.trim());
}

function isValidNin(value: string) {
  return /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i.test(value.replace(/\s/g, ''));
}

// British/Irish RTW does not require a share code; online RTW routes do.
const RTW_DOC_KEYS = ['rtw_doc', 'rtw_prescreen'];

export function isRegistrationComplete(candidate: ChecklistCandidate, item: ChecklistItem) {
  if (!item.docKey) return true;
  if ((candidate.automatedChecks?.length ?? 0) && item.docKey === 'role_type') return true;
  if (RTW_DOC_KEYS.includes(item.docKey) && isBritishCandidate(candidate)) return true;
  if (item.docKey === 'dvla_doc' && candidate.role === 'Bicycle Courier') return true;
  if (item.docKey === 'driving_history' && candidate.role === 'Bicycle Courier') return true;

  if (item.docKey === 'registration_baseline') {
    const rtw = candidate.checklistDocs.rtw_doc ?? {};
    const dvla = candidate.checklistDocs.dvla_doc ?? {};
    const rtwType =
      rtw.rtw_type ||
      candidate.checklistDocs.registration_baseline?.right_to_work ||
      (isBritishCandidate(candidate) ? BRITISH_RTW_LABEL : '');
    const rtwComplete = Boolean(
      rtwType.trim() &&
        (!rtwRequiresShareCode(rtwType) || rtw.rtw_share_code?.trim()),
    );
    const dvlaComplete =
      candidate.role === 'Bicycle Courier' ||
      Boolean(
        dvla.dvla_share_code?.trim() ||
          candidate.checklistDocs.registration_baseline?.dvla_share_code?.trim(),
      );
    const verification = ageDecision(ageFromDob(candidate.dob), candidate.role);

    return (
      ['Van Courier', 'Motorbike Courier', 'Bicycle Courier'].includes(candidate.role) &&
      verification !== 'REJECTED' &&
      isValidFullName(candidate.name) &&
      isValidUkPhone(candidate.phone) &&
      isValidEmail(candidate.email) &&
      isValidUkPostcode(candidate.postcode) &&
      Boolean(candidate.address.trim()) &&
      isValidNin(candidate.nin) &&
      rtwComplete &&
      dvlaComplete
    );
  }

  if (item.docKey === 'competency_scores') {
    return hasCompleteCoreCompetencyScores(candidate.interview);
  }

  if (item.docKey === 'practical_tests') {
    return Boolean(candidate.interview?.assessmentToken) ||
      hasCompleteInterviewScores(candidate.interview);
  }

  const registration = candidate.checklistDocs[item.docKey] ?? {};
  if (item.docKey === 'five_year_employment_history') {
    const workReferences = candidate.checklistDocs.work_references ?? {};
    const referenceRecords = extractEmploymentRecords(workReferences).filter(
      (record) => record.company || record.role || record.start || record.end,
    );
    const workHistory = (candidate.checklistDocs as unknown as Record<string, unknown>).work_history;
    const submittedEntries =
      workHistory && typeof workHistory === 'object' && 'entries' in workHistory
        ? (workHistory as { entries?: unknown }).entries
        : null;
    const submittedCount = Array.isArray(submittedEntries)
      ? submittedEntries.filter((entry) => {
          const value = entry && typeof entry === 'object'
            ? (entry as Record<string, unknown>)
            : {};
          return value.employer || value.jobTitle || value.startDate || value.endDate;
        }).length
      : 0;
    return referenceRecords.length > 0 || submittedCount > 0;
  }

  if (item.docKey === 'reference_workflow') {
    const workReferences = candidate.checklistDocs.work_references ?? {};
    const legacyHistory = candidate.checklistDocs.five_year_employment_history ?? {};
    const legacyRecords = extractEmploymentRecords(workReferences).filter(
      (record) => record.company || record.role || record.start || record.end,
    );
    const workHistory = (candidate.checklistDocs as unknown as Record<string, unknown>).work_history;
    const submittedEntries =
      workHistory && typeof workHistory === 'object' && 'entries' in workHistory
        ? (workHistory as { entries?: unknown }).entries
        : null;
    const submittedRecords = Array.isArray(submittedEntries)
      ? submittedEntries.filter((entry) => {
          const value = entry && typeof entry === 'object'
            ? (entry as Record<string, unknown>)
            : {};
          return value.employer || value.jobTitle || value.startDate || value.endDate;
        })
      : [];
    const records = [...submittedRecords, ...legacyRecords];
    if (!records.length) return false;
    return records.every((_, index) => {
      const slot = index + 1;
      const emailStatus =
        registration[`employer_${slot}_email_status`] ??
        legacyHistory[`employer_${slot}_email_status`] ??
        '';
      const outcome =
        registration[`employer_${slot}_outcome`] ??
        legacyHistory[`employer_${slot}_outcome`] ??
        '';
      return Boolean(emailStatus.trim() && outcome.trim());
    });
  }

  const requiredFields = item.docFields?.filter((field) => field.required) ?? [];
  const requiredFieldsComplete = requiredFields.every((field) => {
    const value = registration[field.key]?.trim();
    if (!value) return false;
    if (field.key !== 'dvla_check_date') return true;

    const checkDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(checkDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oldestValidDate = new Date(today);
    oldestValidDate.setFullYear(oldestValidDate.getFullYear() - 1);
    return checkDate <= today && checkDate >= oldestValidDate;
  });

  if (
    item.docKey === 'rtw_doc' &&
    rtwRequiresShareCode(registration.rtw_type) &&
    !registration.rtw_share_code?.trim()
  ) {
    return false;
  }

  if (!item.docTypes?.length || item.documentRegistration === false) {
    return requiredFieldsComplete;
  }

  const validStatuses = ['Received', 'Verified original', 'Not applicable'];
  return (
    requiredFieldsComplete &&
    validStatuses.includes(registration.__documentStatus ?? '')
  );
}
