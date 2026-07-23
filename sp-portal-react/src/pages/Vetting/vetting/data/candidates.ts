import type { DocumentData } from '../../shims/firestore';

export const STAGES = [
  'Application',
  'Pre-screen',
  'Interview',
  'Suitability',
  'Documents',
  'Vetting checks',
  'DHL submission',
  'Van hire',
  'Training',
  'Active',
  'On hold',
  'Rejected',
] as const;

export type Stage = (typeof STAGES)[number];

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: Stage;
  submittedAt: string;
  daysInStage: number;
  slaBreached: boolean;
  source: 'drivers' | 'legacy-vendors';
}

export const STATUS_TO_STAGE: Record<string, Stage> = {
  PRE_REGISTERED: 'Application',
  PRE_SCREEN_IN_PROGRESS: 'Pre-screen',
  PRE_SCREEN_PENDING: 'Pre-screen',
  PRE_SCREEN_PASSED: 'Interview',
  INTERVIEW_SCHEDULED: 'Interview',
  INTERVIEW_IN_PROGRESS: 'Interview',
  INTERVIEW_PASSED: 'Suitability',
  SUITABILITY_APPROVED: 'Suitability',
  DOCUMENTS_REQUESTED: 'Documents',
  DOCUMENTS_SUBMITTED: 'Documents',
  VETTING_IN_PROGRESS: 'Vetting checks',
  VRA_REQUIRED: 'Vetting checks',
  VRA_APPROVED: 'Vetting checks',
  DHL_SUBMITTED: 'DHL submission',
  DHL_APPROVED: 'Van hire',
  VAN_HIRE_IN_PROGRESS: 'Van hire',
  TRAINING_IN_PROGRESS: 'Training',
  APPROVED: 'Active',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  REJECTED: 'Rejected',
};

// Stages that are not actively progressing through the SLA pipeline:
// terminal outcomes (Active/Rejected) and the temporary pause (On hold).
const NON_SLA_STAGES: readonly Stage[] = ['Active', 'On hold', 'Rejected'];

function isNonSlaStage(stage: Stage): boolean {
  return NON_SLA_STAGES.includes(stage);
}

function toDate(value: unknown): Date {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function toStage(status: unknown): Stage {
  if (typeof status !== 'string') return 'Application';
  return STATUS_TO_STAGE[status] ?? 'Application';
}

export function mapDriverDoc(id: string, data: DocumentData): Candidate {
  const personalInfo = data.personalInfo ?? {};
  const createdAt = toDate(data.createdAt);
  const stageChangedAt = toDate(data.statusUpdatedAt ?? data.updatedAt ?? data.createdAt);
  const daysInStage = Math.max(
    0,
    Math.floor((Date.now() - stageChangedAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const stage = toStage(data.currentStatus ?? data.status);

  return {
    id,
    name: personalInfo.fullName ?? data.fullName ?? data.name ?? 'Unnamed candidate',
    email: personalInfo.email ?? data.email ?? '',
    phone: personalInfo.phone ?? data.phone ?? '',
    stage,
    submittedAt: createdAt.toISOString(),
    daysInStage: isNonSlaStage(stage) ? 0 : daysInStage,
    slaBreached: !isNonSlaStage(stage) && daysInStage >= 5,
    source: 'drivers',
  };
}

function legacyStage(data: DocumentData): Stage {
  if (data.status === 'approved') return 'Active';
  if (data.status === 'REJECTED' || data.status === 'rejected') return 'Rejected';
  if (
    data.applicationOnHold === true ||
    data.currentStatus === 'ON_HOLD' ||
    data.status === 'ON_HOLD' ||
    data.status === 'on_hold' ||
    data.status === 'hold'
  ) return 'On hold';

  const checks = Array.isArray(data.checks) ? data.checks : [];
  const completed = checks.filter(Boolean).length;
  const interview = data.interview ?? {};

  if (completed >= 50) return 'Active';
  if (completed >= 44) return 'Training';
  if (completed >= 39) return 'Van hire';
  if (completed >= 32) return 'DHL submission';
  if (completed >= 25) return 'Vetting checks';
  if (completed >= 18) return 'Documents';
  if (interview.date || interview.outcome || interview.decision) return 'Interview';
  if (completed >= 8) return 'Pre-screen';
  return 'Application';
}

export function mapLegacyVendorDoc(id: string, data: DocumentData): Candidate {
  const createdAt = toDate(data.createdAt);
  const stageChangedAt = toDate(data.updatedAt ?? data.createdAt);
  const daysInStage = Math.max(
    0,
    Math.floor((Date.now() - stageChangedAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const stage = legacyStage(data);

  return {
    id: `legacy-${id}`,
    name: data.name ?? data.fullName ?? 'Unnamed candidate',
    email: data.email ?? data.createdBy?.email ?? data.updatedBy?.email ?? '',
    phone: data.phone ?? '',
    stage,
    submittedAt: createdAt.toISOString(),
    daysInStage: isNonSlaStage(stage) ? 0 : daysInStage,
    slaBreached: !isNonSlaStage(stage) && daysInStage >= 5,
    source: 'legacy-vendors',
  };
}
