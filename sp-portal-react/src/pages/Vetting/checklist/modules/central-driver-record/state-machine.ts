import type { ChecklistCandidate } from './model';
import type { AutoRejectFailure } from './auto-reject';
import { runAutoReject } from './auto-reject';

/**
 * Vetting case state machine — Vetting Pipeline §1.
 *
 * Single source of truth for `CaseStatus` transitions. Every status change must
 * go through `evaluateTransition` / `commitTransition` so that:
 *   1. only permitted forward transitions are allowed;
 *   2. the non-waivable auto-reject guards (§9) are enforced — if any gate fires,
 *      the ONLY permitted destination is REJECTED;
 *   3. the change is audited (the caller wires `logCdrChanges` via `recordAudit`).
 *
 * This module is intentionally framework-free (no Firestore import) so it is
 * trivially testable. Persistence and audit are injected by the caller
 * (`page.tsx` already owns `updateDoc` + `logCdrChanges`).
 */

export const CASE_STATUSES = [
  'INTAKE',
  'DBS_CHECK',
  'REFERENCE_VERIFICATION',
  'TIMELINE_REVIEW',
  'ON_HOLD',
  'RISK_ASSESSMENT',
  'APPROVED',
  'REJECTED',
  'HANDED_TO_DHL',
  'DHL_PENDING',
  'DHL_APPROVED',
  'DHL_REJECTED',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

/** Legacy / free-form status strings persisted today → canonical CaseStatus. */
const LEGACY_STATUS_MAP: Record<string, CaseStatus> = {
  PRE_REGISTERED: 'INTAKE',
  APPLICATION_REJECTED: 'REJECTED',
  active: 'DHL_APPROVED', // legacy vendors already onboarded
};

export function normaliseStatus(raw: string | null | undefined): CaseStatus {
  if (!raw) return 'INTAKE';
  if (LEGACY_STATUS_MAP[raw]) return LEGACY_STATUS_MAP[raw];
  return (CASE_STATUSES as readonly string[]).includes(raw) ? (raw as CaseStatus) : 'INTAKE';
}

/**
 * Allowed forward transitions per §1. REJECTED, DHL_APPROVED and DHL_REJECTED
 * are terminal. ON_HOLD can return to any active review state (undo a hold).
 */
export const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  INTAKE: ['DBS_CHECK', 'ON_HOLD', 'REJECTED'],
  DBS_CHECK: ['REFERENCE_VERIFICATION', 'RISK_ASSESSMENT', 'ON_HOLD', 'REJECTED'],
  REFERENCE_VERIFICATION: ['TIMELINE_REVIEW', 'ON_HOLD', 'REJECTED'],
  TIMELINE_REVIEW: ['APPROVED', 'RISK_ASSESSMENT', 'ON_HOLD', 'REJECTED'],
  RISK_ASSESSMENT: ['APPROVED', 'ON_HOLD', 'REJECTED'],
  ON_HOLD: ['INTAKE', 'DBS_CHECK', 'REFERENCE_VERIFICATION', 'TIMELINE_REVIEW', 'RISK_ASSESSMENT', 'REJECTED'],
  APPROVED: ['HANDED_TO_DHL', 'REJECTED'],
  HANDED_TO_DHL: ['DHL_PENDING', 'DHL_REJECTED'],
  DHL_PENDING: ['DHL_APPROVED', 'DHL_REJECTED'],
  DHL_APPROVED: [],
  DHL_REJECTED: [],
  REJECTED: [],
};

export type TransitionBlock = 'INVALID_TRANSITION' | 'AUTO_REJECT';

export interface TransitionDecision {
  allowed: boolean;
  from: CaseStatus;
  to: CaseStatus;
  blockedReason?: TransitionBlock;
  /** Populated when blockedReason === 'AUTO_REJECT'. */
  autoRejectFailures?: AutoRejectFailure[];
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return from !== to && (TRANSITIONS[from]?.includes(to) ?? false);
}

/**
 * Pure decision: is this transition allowed for this candidate right now?
 * Enforces the §9 auto-reject guards — if any gate fires, only REJECTED is allowed.
 */
export function evaluateTransition(candidate: ChecklistCandidate, to: CaseStatus): TransitionDecision {
  const from = normaliseStatus(candidate.status);

  if (!canTransition(from, to)) {
    return { allowed: false, from, to, blockedReason: 'INVALID_TRANSITION' };
  }

  const failures = runAutoReject(candidate);
  if (failures.length > 0 && to !== 'REJECTED') {
    return { allowed: false, from, to, blockedReason: 'AUTO_REJECT', autoRejectFailures: failures };
  }

  return { allowed: true, from, to };
}

export interface TransitionHandlers {
  /** Persist the new status (e.g. Firestore updateDoc on drivers/{id}). */
  persist: (status: CaseStatus) => Promise<void>;
  /** Record the audit entry (wire to logCdrChanges in the caller). */
  recordAudit: (change: {
    field: 'status';
    previousValue: CaseStatus;
    newValue: CaseStatus;
    reason?: string;
  }) => Promise<void> | void;
}

/**
 * Commit a transition: evaluate, then (if allowed) persist and audit.
 * Returns the decision; when not allowed nothing is persisted or audited.
 */
export async function commitTransition(
  candidate: ChecklistCandidate,
  to: CaseStatus,
  handlers: TransitionHandlers,
  reason?: string,
): Promise<TransitionDecision> {
  const decision = evaluateTransition(candidate, to);
  if (!decision.allowed) return decision;

  await handlers.persist(to);
  await handlers.recordAudit({
    field: 'status',
    previousValue: decision.from,
    newValue: to,
    reason,
  });

  return decision;
}
