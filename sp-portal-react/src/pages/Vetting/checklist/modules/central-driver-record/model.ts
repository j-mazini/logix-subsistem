import type { DocumentData } from 'firebase/firestore';
import { CHECKLIST_STEPS, TOTAL_CHECKLIST_ITEMS } from '../../data/checklist';
import { mergeInterview, type ChecklistInterview } from '../interview/model';
import { isValidUkPhone } from '@/utils/ukPhone';

export type DocFields = Record<string, Record<string, string>>;

const REMOVED_LEGACY_STEP_INDICES = new Set([3, 4]);
const REMOVED_LEGACY_CHECK_INDICES = new Set([11, 12]);
const REMOVED_PRESCREEN_STEP_INDEX = 6;
const REMOVED_PRESCREEN_CHECK_START = 13;
const REMOVED_PRESCREEN_CHECK_COUNT = 17;

function withInserted<T>(value: T[], inserts: Array<{ index: number; value: T }>) {
  const next = [...value];
  inserts
    .slice()
    .sort((a, b) => a.index - b.index)
    .forEach((insert) => next.splice(insert.index, 0, insert.value));
  return next;
}

function withoutIndex<T>(value: T[], indexToRemove: number) {
  return value.filter((_, index) => index !== indexToRemove);
}

function withoutRange<T>(value: T[], start: number, count: number) {
  const end = start + count;
  return value.filter((_, index) => index < start || index >= end);
}

function removeLegacyStepSlots<T>(value: T[], targetLength: number) {
  if (value.length === targetLength + 1) {
    return withoutIndex(value, REMOVED_PRESCREEN_STEP_INDEX);
  }
  if (value.length > targetLength + 1) {
    return value.filter(
      (_, index) =>
        !REMOVED_LEGACY_STEP_INDICES.has(index) &&
        index !== REMOVED_PRESCREEN_STEP_INDEX + REMOVED_LEGACY_STEP_INDICES.size,
    );
  }
  return value;
}

function removeLegacyCheckSlots<T>(value: T[], targetLength: number) {
  if (value.length === targetLength + REMOVED_PRESCREEN_CHECK_COUNT) {
    return withoutRange(
      value,
      REMOVED_PRESCREEN_CHECK_START,
      REMOVED_PRESCREEN_CHECK_COUNT,
    );
  }
  if (value.length > targetLength + REMOVED_PRESCREEN_CHECK_COUNT) {
    return value.filter((_, index) => {
      if (REMOVED_LEGACY_CHECK_INDICES.has(index)) return false;
      const prescreenStart =
        REMOVED_PRESCREEN_CHECK_START + REMOVED_LEGACY_CHECK_INDICES.size;
      return (
        index < prescreenStart ||
        index >= prescreenStart + REMOVED_PRESCREEN_CHECK_COUNT
      );
    });
  }
  return value;
}

export interface StepApprovalMeta {
  approvedAt: number;
  approvedBy: string;
}

export interface StepRejectionMeta {
  rejectedAt: number;
  rejectedBy: string;
}

export interface ChecklistCandidate {
  id: string;
  rawId: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  nin: string;
  depot: string;
  role: string;
  category: string;
  startDate: string;
  employment: string;
  nationality: string;
  dob: string;
  address: string;
  owner: string;
  driveFolderUrl: string;
  source: 'drivers' | 'legacy-vendors';
  checks: boolean[];
  automatedChecks: boolean[];
  checklistDocs: DocFields;
  interview: ChecklistInterview;
  caseNotes: string;
  /** Internal-only suitability assessment: '' | 'Suitable' | 'Not Suitable' | 'Requires Review'. */
  suitability: string;
  status: string;
  updatedAt: string;
  stepApprovals: boolean[];
  stepApprovalMeta: Array<StepApprovalMeta | null>;
  stepRejections: boolean[];
  stepRejectionMeta: Array<StepRejectionMeta | null>;
  applicationRejected: boolean;
  applicationRejectionReason: string;
  applicationRejectionInternalNotes: string;
  applicationOnHold: boolean;
  applicationHoldReason: string;
  firstAccessTemporaryPassword?: string;
}

function normaliseStepFlags(value: unknown): boolean[] {
  const len = CHECKLIST_STEPS.length;
  if (!Array.isArray(value)) return Array(len).fill(false);
  const source = value.length > len ? removeLegacyStepSlots(value, len) : value;
  const migrated = source.length === len - 2
    ? withInserted(source.map(Boolean), [
        { index: 0, value: false },
        { index: 4, value: false },
      ])
    : source.map(Boolean);
  const arr = migrated.slice(0, len);
  while (arr.length < len) arr.push(false);
  return arr;
}

function normaliseApprovalMeta(value: unknown): Array<StepApprovalMeta | null> {
  const len = CHECKLIST_STEPS.length;
  if (!Array.isArray(value)) return Array(len).fill(null);
  const source = value.length > len ? removeLegacyStepSlots(value, len) : value;
  const mapped = source.map((item) =>
    item && typeof item === 'object' && 'approvedAt' in item
      ? (item as StepApprovalMeta)
      : null,
  );
  const migrated = mapped.length === len - 2
    ? withInserted(mapped, [
        { index: 0, value: null },
        { index: 4, value: null },
      ])
    : mapped;
  const arr = migrated.slice(0, len);
  while (arr.length < len) arr.push(null);
  return arr;
}

function normaliseRejectionMeta(value: unknown): Array<StepRejectionMeta | null> {
  const len = CHECKLIST_STEPS.length;
  if (!Array.isArray(value)) return Array(len).fill(null);
  const source = value.length > len ? removeLegacyStepSlots(value, len) : value;
  const mapped = source.map((item) =>
    item && typeof item === 'object' && 'rejectedAt' in item
      ? (item as StepRejectionMeta)
      : null,
  );
  const migrated = mapped.length === len - 2
    ? withInserted(mapped, [
        { index: 0, value: null },
        { index: 4, value: null },
      ])
    : mapped;
  const arr = migrated.slice(0, len);
  while (arr.length < len) arr.push(null);
  return arr;
}

export const SUITABILITY_OPTIONS = ['Suitable', 'Not Suitable', 'Requires Review'] as const;
export type Suitability = (typeof SUITABILITY_OPTIONS)[number];

function normaliseSuitability(value: unknown): string {
  return typeof value === 'string' && (SUITABILITY_OPTIONS as readonly string[]).includes(value)
    ? value
    : '';
}

export function toDate(value: unknown): Date {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return (value as { toDate(): Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function ageFromDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function ageGateResult(_role: string, dob: string) {
  const age = ageFromDate(dob);
  if (age === null) return '';
  if (age < 18) return 'Rejected';
  return 'Accepted';
}

function ageVerification(dob: string, role?: string) {
  const age = ageFromDate(dob);
  if (age === null) return null;
  if (age < 18) return 'REJECTED';
  if (role === 'Bicycle Courier') return 'AUTO_CONFIRMED';
  if (age < 25) return 'PENDING_INSURER';
  return 'AUTO_CONFIRMED';
}

function ageDocumentStatus(dob: string, role?: string) {
  const verification = ageVerification(dob, role);
  if (verification === 'AUTO_CONFIRMED') return 'Received';
  if (verification === 'PENDING_INSURER') return 'Pending';
  if (verification === 'REJECTED') return 'Rejected';
  return '';
}

function ageVerificationLabel(dob: string, role?: string) {
  const verification = ageVerification(dob, role);
  if (verification === 'AUTO_CONFIRMED') return 'Accepted - auto-confirmed (25+)';
  if (verification === 'PENDING_INSURER') return 'Accepted - pending insurer verification (18-24)';
  if (verification === 'REJECTED') return 'Rejected - under 18';
  return '';
}

function mergeInheritedStepOneDocs(existingDocs: DocFields, role: string, dob: string): DocFields {
  const result = ageGateResult(role, dob);
  const age = ageFromDate(dob);
  return {
    ...existingDocs,
    role_type: {
      ...(existingDocs.role_type ?? {}),
      role_selected: role,
      __documentStatus: role ? 'Received' : '',
    },
    age_check: {
      ...(existingDocs.age_check ?? {}),
      age_gate_result: result,
      age_years: age === null ? '' : String(age),
      age_verification: ageVerification(dob, role) ?? '',
      age_verification_label: ageVerificationLabel(dob, role),
      __documentStatus: result ? ageDocumentStatus(dob, role) : '',
    },
  };
}

function normaliseChecks(value: unknown) {
  const source = Array.isArray(value)
    ? value.length > TOTAL_CHECKLIST_ITEMS
      ? removeLegacyCheckSlots(value, TOTAL_CHECKLIST_ITEMS)
      : value
    : null;
  const mapped = source ? source.map(Boolean) : null;
  const migrated = mapped && mapped.length === TOTAL_CHECKLIST_ITEMS - 2
    ? withInserted(mapped, [
        { index: 0, value: false },
        { index: 12, value: false },
      ])
    : mapped;
  const checks = migrated
    ? migrated.slice(0, TOTAL_CHECKLIST_ITEMS)
    : Array(TOTAL_CHECKLIST_ITEMS).fill(false);
  while (checks.length < TOTAL_CHECKLIST_ITEMS) checks.push(false);
  return checks;
}

function isValidFullName(value: unknown) {
  return typeof value === 'string' && value.trim().split(/\s+/).length >= 2;
}

function isValidEmail(value: unknown) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUkPostcode(value: unknown) {
  return typeof value === 'string' && /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(value.trim());
}

function isValidNin(value: unknown) {
  return (
    typeof value === 'string' &&
    /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i.test(value.replace(/\s/g, ''))
  );
}

function checklistIndexByDocKey(docKey: string) {
  return CHECKLIST_STEPS.flatMap((step) => step.items).findIndex(
    (item) => item.docKey === docKey,
  );
}

function inferAutomaticDriverChecks(data: DocumentData) {
  const personalInfo = data.personalInfo ?? {};
  const rtw = data.rtw ?? {};
  const dvla = data.dvla ?? {};
  const signature = data.signature ?? {};
  const docs = (data.checklistDocs as DocFields) ?? {};
  const applicationForm = docs.application_form ?? {};
  const checks = Array(TOTAL_CHECKLIST_ITEMS).fill(false);
  const setDocKeyCheck = (docKey: string, value: boolean) => {
    const index = checklistIndexByDocKey(docKey);
    if (index >= 0) checks[index] = value;
  };
  const role = data.role ?? data.proposedRole ?? '';
  const dob = personalInfo.dateOfBirth ?? personalInfo.dob ?? data.dob ?? data.dateOfBirth ?? '';
  const fullName = personalInfo.fullName ?? data.fullName;
  const email = personalInfo.email ?? data.email;
  const phone =
    personalInfo.phone ??
    personalInfo.phoneNumber ??
    personalInfo.mobile ??
    data.phone ??
    data.phoneNumber ??
    data.mobile ??
    data.mobilePhone;
  const address = personalInfo.address ?? data.address;
  const postcode = personalInfo.postcode ?? data.postcode;
  const nin = personalInfo.nin ?? data.nin;
  const nationality =
    personalInfo.nationality ??
    data.nationality ??
    docs.registration_baseline?.nationality;
  const rtwType = mapRtwType(rtw.documentType) || docs.rtw_doc?.rtw_type || '';
  const rtwNumber = rtw.documentNumber ?? docs.rtw_doc?.rtw_number;
  const rtwShareCode = rtw.shareCode ?? docs.rtw_doc?.rtw_share_code;
  const rtwComplete = Boolean(
    typeof rtwType === 'string' &&
      rtwType.trim() &&
      (isBritishIrishRtwType(rtwType) ||
        (typeof rtwNumber === 'string' && rtwNumber.trim())) &&
      (!rtwRequiresShareCode(rtwType) ||
        (typeof rtwShareCode === 'string' && rtwShareCode.trim())),
  );
  const dvlaType = mapDvlaType(dvla.type) || mapDvlaType(docs.dvla_doc?.dvla_type) || '';
  const dvlaNumber = dvla.number ?? docs.dvla_doc?.dvla_number;
  const dvlaShareCode = dvla.shareCode ?? docs.dvla_doc?.dvla_share_code;
  const dvlaCountry = dvla.country ?? docs.dvla_doc?.dvla_country;
  const dvlaComplete = role === 'Bicycle Courier' || Boolean(
    typeof dvlaType === 'string' &&
      dvlaType.trim() &&
      typeof dvlaNumber === 'string' &&
      dvlaNumber.trim() &&
      (dvlaType === 'EU'
        ? typeof dvlaCountry === 'string' && dvlaCountry.trim()
        : typeof dvlaShareCode === 'string' && dvlaShareCode.trim()),
  );

  setDocKeyCheck(
    'registration_baseline',
    ['Van Courier', 'Motorbike Courier', 'Bicycle Courier'].includes(role) &&
      ageVerification(dob, role) !== 'REJECTED' &&
      isValidFullName(fullName) &&
      isValidUkPhone(phone) &&
      isValidEmail(email) &&
      Boolean(typeof nationality === 'string' && nationality.trim()) &&
      Boolean(typeof address === 'string' && address.trim()) &&
      isValidUkPostcode(postcode) &&
      isValidNin(nin) &&
      rtwComplete &&
      dvlaComplete,
  );
  setDocKeyCheck('rtw_doc', isBritishDriverData(data)); // British/Irish does not require an RTW share code
  setDocKeyCheck('dvla_doc', role === 'Bicycle Courier');
  setDocKeyCheck('driving_history', role === 'Bicycle Courier');
  setDocKeyCheck(
    'application_form',
    signature.status === 'SIGNED' ||
      applicationForm.signature_status === 'Signed' ||
      applicationForm.__documentStatus === 'Signed',
  );

  return checks;
}

export function inferDriverChecks(data: DocumentData) {
  const checks = normaliseChecks(data.checklistChecks);
  const automatic = inferAutomaticDriverChecks(data);
  automatic.forEach((isValid, index) => {
    if (isValid) checks[index] = true;
  });

  return checks;
}

function mapRtwType(value: unknown) {
  if (value === 'BRITISH_PASSPORT') return BRITISH_RTW_LABEL;
  if (value === 'EU_PASSPORT_SHARE_CODE') return 'Passport + Online Share Code';
  if (value === 'SPONSOR_VISA') return 'Visa / eVisa + Online Share Code';
  return typeof value === 'string' ? value : '';
}

function mapDvlaType(value: unknown) {
  if (typeof value !== 'string') return '';
  const normalisedValue = value.trim().toUpperCase();
  if (normalisedValue === 'BRITISH') return 'UK Drive License';
  if (value === 'EU') return 'EU';
  return value;
}

export const BRITISH_RTW_LABEL = 'British/Irish';
const LEGACY_BRITISH_RTW_LABEL = 'British or Irish Passport';
const BRITISH_NATIONALITY_VALUES = [
  'british',
  'irish',
  'uk',
  'united kingdom',
  'gb',
  'great britain',
];

export function isBritishNationality(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    BRITISH_NATIONALITY_VALUES.includes(value.trim().toLowerCase())
  );
}

export function isBritishIrishRtwType(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalised = value.trim().toLowerCase();
  return (
    normalised === 'british/irish' ||
    normalised === LEGACY_BRITISH_RTW_LABEL.toLowerCase() ||
    normalised === 'british or irish' ||
    normalised === 'british passport' ||
    normalised === 'irish passport' ||
    normalised === 'british_passport'
  );
}

export function rtwRequiresShareCode(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (isBritishIrishRtwType(value)) return false;
  return value.trim().toLowerCase() !== 'not applicable';
}

// Detects a British driver from the raw Firestore document. Nationality is the
// primary signal, but the registration form expresses British-ness through the
// British-passport RTW route (no standalone nationality field is collected), so
// that route is also treated as British.
function isBritishDriverData(data: DocumentData): boolean {
  const personalInfo = data.personalInfo ?? {};
  const rtw = data.rtw ?? {};
  const docs = (data.checklistDocs as DocFields) ?? {};
  return (
    isBritishNationality(personalInfo.nationality) ||
    isBritishNationality(data.nationality) ||
    isBritishNationality(rtw.nationality) ||
    isBritishIrishRtwType(rtw.documentType) ||
    isBritishIrishRtwType(mapRtwType(rtw.documentType)) ||
    isBritishIrishRtwType(docs.rtw_doc?.rtw_type)
  );
}

// Candidate-level equivalent for the already-mapped ChecklistCandidate used by
// the admin checklist UI.
export function isBritishCandidate(
  candidate: Pick<ChecklistCandidate, 'nationality' | 'checklistDocs'>,
): boolean {
  return (
    isBritishNationality(candidate.nationality) ||
    isBritishIrishRtwType(candidate.checklistDocs?.rtw_doc?.rtw_type)
  );
}

function mergePreRegistrationDocs(data: DocumentData, role: string, dob: string) {
  const personalInfo = data.personalInfo ?? {};
  const rtw = data.rtw ?? {};
  const dvla = data.dvla ?? {};
  const signature = data.signature ?? {};
  const inherited = mergeInheritedStepOneDocs((data.checklistDocs as DocFields) ?? {}, role, dob);
  const isBicycle = role === 'Bicycle Courier';
  const isBritish = isBritishDriverData(data);
  const rtwType = mapRtwType(rtw.documentType) || inherited.rtw_doc?.rtw_type || (isBritish ? BRITISH_RTW_LABEL : '');
  const dvlaShareCode = isBicycle
    ? 'Not required'
    : dvla.shareCode ?? inherited.dvla_doc?.dvla_share_code ?? '';
  const signatureStatus = signature.status === 'SIGNED'
    ? 'Signed'
    : signature.status === 'SENT'
      ? 'Sent for signature'
      : signature.status === 'FAILED'
        ? 'Signature failed'
        : inherited.application_form?.signature_status || inherited.application_form?.__documentStatus || 'Awaiting signature';
  const signerName =
    signature.signerName ??
    inherited.application_form?.signer_name ??
    personalInfo.fullName ??
    data.fullName ??
    '';
  const signatureText =
    signature.signatureText ??
    signature.typedSignature ??
    inherited.application_form?.signature_text ??
    signerName;

  return {
    ...inherited,
    registration_baseline: {
      ...(inherited.registration_baseline ?? {}),
      full_name: personalInfo.fullName ?? data.fullName ?? inherited.registration_baseline?.full_name ?? '',
      phone: personalInfo.phone ?? data.phone ?? inherited.registration_baseline?.phone ?? '',
      email: personalInfo.email ?? data.email ?? inherited.registration_baseline?.email ?? '',
      nationality: personalInfo.nationality ?? data.nationality ?? inherited.registration_baseline?.nationality ?? '',
      role_type: role || inherited.registration_baseline?.role_type || '',
      date_of_birth: dob || inherited.registration_baseline?.date_of_birth || '',
      uk_postcode: personalInfo.postcode ?? data.postcode ?? inherited.registration_baseline?.uk_postcode ?? '',
      address: personalInfo.address ?? data.address ?? inherited.registration_baseline?.address ?? '',
      national_insurance_number: personalInfo.nin ?? data.nin ?? inherited.registration_baseline?.national_insurance_number ?? '',
      right_to_work: rtwType || inherited.registration_baseline?.right_to_work || '',
      dvla_share_code: dvlaShareCode || inherited.registration_baseline?.dvla_share_code || '',
      __documentStatus: 'Received',
    },
    application_form: {
      ...(inherited.application_form ?? {}),
      signature_status: signatureStatus,
      signed_at: signature.completedAt ?? inherited.application_form?.signed_at ?? '',
      signer_name: signerName,
      signer_email: signature.signerEmail ?? personalInfo.email ?? data.email ?? inherited.application_form?.signer_email ?? '',
      signature_text: signatureText,
      __documentStatus: signatureStatus,
    },
    nin_doc: {
      ...(inherited.nin_doc ?? {}),
      nin_number: personalInfo.nin ?? data.nin ?? inherited.nin_doc?.nin_number ?? '',
      __documentStatus:
        personalInfo.nin || data.nin
          ? 'Received'
          : inherited.nin_doc?.__documentStatus ?? '',
    },
    rtw_doc: {
      ...(inherited.rtw_doc ?? {}),
      rtw_type: rtwType,
      rtw_number: rtw.documentNumber ?? inherited.rtw_doc?.rtw_number ?? '',
      rtw_expiry: rtw.expirationDate ?? inherited.rtw_doc?.rtw_expiry ?? '',
      rtw_check_date: rtw.checkDate ?? inherited.rtw_doc?.rtw_check_date ?? '',
      rtw_nationality: rtw.nationality ?? inherited.rtw_doc?.rtw_nationality ?? (isBritish ? 'British' : ''),
      rtw_share_code: rtw.shareCode ?? inherited.rtw_doc?.rtw_share_code ?? '',
      __documentStatus: rtw.documentNumber
        ? 'Declared by candidate'
        : inherited.rtw_doc?.__documentStatus ?? '',
    },
    dvla_doc: {
      ...(inherited.dvla_doc ?? {}),
      dvla_type: mapDvlaType(dvla.type) || mapDvlaType(inherited.dvla_doc?.dvla_type) || '',
      dvla_number: dvla.number ?? inherited.dvla_doc?.dvla_number ?? '',
      dvla_expiry: dvla.expirationDate ?? inherited.dvla_doc?.dvla_expiry ?? '',
      dvla_check_date: dvla.checkDate ?? inherited.dvla_doc?.dvla_check_date ?? '',
      dvla_country: dvla.country ?? inherited.dvla_doc?.dvla_country ?? '',
      dvla_share_code: dvlaShareCode,
      years_of_experience:
        typeof dvla.yearsOfExperience === 'number'
          ? String(dvla.yearsOfExperience)
          : dvla.yearsOfExperience ?? inherited.dvla_doc?.years_of_experience ?? '',
      __documentStatus: isBicycle
        ? 'Not applicable'
        : dvla.number
          ? 'Declared by candidate'
          : inherited.dvla_doc?.__documentStatus ?? '',
    },
    driving_history: {
      ...(inherited.driving_history ?? {}),
      __documentStatus: isBicycle
        ? 'Not applicable'
        : inherited.driving_history?.__documentStatus ?? '',
    },
  };
}

export function mapDriverDoc(id: string, data: DocumentData): ChecklistCandidate {
  const personalInfo = data.personalInfo ?? {};
  const role = data.role ?? data.proposedRole ?? '';
  const dob = personalInfo.dateOfBirth ?? personalInfo.dob ?? data.dob ?? data.dateOfBirth ?? '';
  const checklistDocs = mergePreRegistrationDocs(data, role, dob);
  const automatedChecks = inferAutomaticDriverChecks(data);
  return {
    id: `driver-${id}`,
    rawId: id,
    name: personalInfo.fullName ?? data.fullName ?? 'Unnamed candidate',
    email: personalInfo.email ?? data.email ?? '',
    phone:
      personalInfo.phone ??
      personalInfo.phoneNumber ??
      personalInfo.mobile ??
      data.phone ??
      data.phoneNumber ??
      data.mobile ??
      data.mobilePhone ??
      '',
    postcode: personalInfo.postcode ?? data.postcode ?? '',
    nin: personalInfo.nin ?? data.nin ?? '',
    depot: data.depot ?? data.serviceCentre ?? '',
    role,
    category: typeof data.category === 'string' ? data.category : '',
    startDate: data.startDate ?? data.proposedStartDate ?? '',
    employment: data.employment ?? data.employmentStatus ?? '',
    nationality: personalInfo.nationality ?? data.nationality ?? '',
    dob,
    address: personalInfo.address ?? data.address ?? '',
    owner: data.owner ?? data.caseOwner ?? '',
    driveFolderUrl: data.driveFolderUrl ?? data.googleDriveFolder ?? '',
    source: 'drivers',
    checks: inferDriverChecks(data),
    automatedChecks,
    checklistDocs,
    interview: mergeInterview(data.interview),
    caseNotes: typeof data.caseNotes === 'string' ? data.caseNotes : '',
    suitability: normaliseSuitability(data.suitability),
    status: data.currentStatus ?? data.status ?? 'PRE_REGISTERED',
    updatedAt: toDate(data.updatedAt ?? data.createdAt).toISOString(),
    stepApprovals: normaliseStepFlags(data.stepApprovals),
    stepApprovalMeta: normaliseApprovalMeta(data.stepApprovalMeta),
    stepRejections: normaliseStepFlags(data.stepRejections),
    stepRejectionMeta: normaliseRejectionMeta(data.stepRejectionMeta),
    applicationRejected: data.applicationRejected === true,
    applicationRejectionReason: typeof data.applicationRejectionReason === 'string' ? data.applicationRejectionReason : '',
    applicationRejectionInternalNotes: typeof data.applicationRejectionInternalNotes === 'string' ? data.applicationRejectionInternalNotes : '',
    applicationOnHold: data.applicationOnHold === true,
    applicationHoldReason: typeof data.applicationHoldReason === 'string' ? data.applicationHoldReason : '',
  };
}

export function mapLegacyVendorDoc(id: string, data: DocumentData): ChecklistCandidate {
  const checks = normaliseChecks(data.checks);
  const role = data.role ?? data.proposedRole ?? '';
  const dob = data.dob ?? data.dateOfBirth ?? '';
  const checklistDocs = {
    ...mergeInheritedStepOneDocs((data.checklistDocs as DocFields) ?? {}, role, dob),
    application_form: {
      ...(((data.checklistDocs as DocFields) ?? {}).application_form ?? {}),
      signature_status: ((data.checklistDocs as DocFields) ?? {}).application_form?.signature_status ?? '',
      __documentStatus: ((data.checklistDocs as DocFields) ?? {}).application_form?.__documentStatus ?? '',
    },
  };
  return {
    id: `legacy-${id}`,
    rawId: id,
    name: data.name ?? data.fullName ?? 'Unnamed candidate',
    email: data.email ?? data.createdBy?.email ?? '',
    phone:
      data.phone ??
      data.phoneNumber ??
      data.mobile ??
      data.mobilePhone ??
      data.personalInfo?.phone ??
      data.personalInfo?.phoneNumber ??
      data.personalInfo?.mobile ??
      '',
    postcode: data.postcode ?? data.personalInfo?.postcode ?? '',
    nin: data.nin ?? data.personalInfo?.nin ?? '',
    depot: data.depot ?? data.serviceCentre ?? '',
    role,
    category: typeof data.category === 'string' ? data.category : 'Legacy Vendor',
    startDate: data.startDate ?? data.proposedStartDate ?? '',
    employment: data.employment ?? data.employmentStatus ?? '',
    nationality: data.nationality ?? '',
    dob,
    address: data.address ?? '',
    owner: data.owner ?? data.caseOwner ?? '',
    driveFolderUrl: data.driveFolderUrl ?? data.googleDriveFolder ?? '',
    source: 'legacy-vendors',
    checks,
    automatedChecks: Array(TOTAL_CHECKLIST_ITEMS).fill(false),
    checklistDocs,
    interview: mergeInterview(data.interview),
    caseNotes: typeof data.caseNotes === 'string' ? data.caseNotes : '',
    suitability: normaliseSuitability(data.suitability),
    status: data.status ?? 'active',
    updatedAt: toDate(data.updatedAt ?? data.createdAt).toISOString(),
    stepApprovals: normaliseStepFlags(data.stepApprovals),
    stepApprovalMeta: normaliseApprovalMeta(data.stepApprovalMeta),
    stepRejections: normaliseStepFlags(data.stepRejections),
    stepRejectionMeta: normaliseRejectionMeta(data.stepRejectionMeta),
    applicationRejected: data.applicationRejected === true,
    applicationRejectionReason: typeof data.applicationRejectionReason === 'string' ? data.applicationRejectionReason : '',
    applicationRejectionInternalNotes: typeof data.applicationRejectionInternalNotes === 'string' ? data.applicationRejectionInternalNotes : '',
    applicationOnHold: data.applicationOnHold === true,
    applicationHoldReason: typeof data.applicationHoldReason === 'string' ? data.applicationHoldReason : '',
  };
}

export function completion(candidate: ChecklistCandidate | null) {
  if (!candidate) return { done: 0, total: TOTAL_CHECKLIST_ITEMS, percent: 0 };
  const done = candidate.checks.filter(Boolean).length;
  return {
    done,
    total: TOTAL_CHECKLIST_ITEMS,
    percent: Math.round((done / TOTAL_CHECKLIST_ITEMS) * 100),
  };
}
