import type { ChecklistCandidate } from './model';

/**
 * Auto-reject rule engine — Vetting Pipeline §9 (non-waivable gates).
 *
 * Each gate is a pure function over the CDR (`ChecklistCandidate.checklistDocs`)
 * that returns a failure when an explicit, evidenced violation is present, or
 * `null` when the gate is satisfied OR not yet evaluable. Gates NEVER fire on
 * merely-empty fields ("not yet checked") — only on concrete negative evidence —
 * so they cannot false-reject a case that is still in progress.
 *
 * The engine is consumed by the state machine (`evaluateTransition`) as a guard,
 * and can also be run on-demand to explain why a case is blocked in the UI.
 *
 * Two gates depend on structures not yet built (see ALTERACOES_VETTING_PIPELINE.md):
 *   - GAP_NO_EVIDENCE: full month-by-month gap detection awaits the gap engine
 *     (Lacuna 4). Here it fires only on an explicit failed VRA outcome.
 *   - REFERENCE_INVALID: awaits the structured EmployerReference entity (Lacuna 3).
 */

export type AutoRejectCode =
  | 'GAP_NO_EVIDENCE' //               C4 — gap ≥28d without documentary evidence
  | 'ABROAD_NO_INTL_CRC' //           C5 — 6+ months abroad without International CRC
  | 'DBS_INVALID' //                  B2–B4 — wrong source / digital-only / >10 weeks
  | 'RTW_UNRESOLVED' //               A4 — Right to Work not authorised / rejected
  | 'DOC_INCONSISTENCY' //            C6 — identity/data mismatch across documents
  | 'HMRC_MISSING' //                 non-PAYE without HMRC (SA302 / UTR) evidence
  | 'REFERENCE_INVALID' //            D5 — reference without signature / source / date
  | 'NO_INTERVIEW_OR_DECLARATION'; // no interview pass / suitability declaration

export interface AutoRejectFailure {
  code: AutoRejectCode;
  /** Human-readable reason, suitable for the audit reason and the UI. */
  reason: string;
  /** Dot-path to the CDR field that evidences the failure. */
  evidenceRef: string;
}

const DBS_VALID_SOURCES = new Set(['DBS (England/Wales)', 'Disclosure Scotland', 'NI DBS']);
const DBS_WINDOW_DAYS = 70; // 10 weeks

/** Read a doc-field value, trimmed. Returns '' when absent. */
function field(candidate: ChecklistCandidate, docKey: string, fieldKey: string): string {
  return (candidate.checklistDocs[docKey]?.[fieldKey] ?? '').trim();
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

type Gate = (candidate: ChecklistCandidate) => AutoRejectFailure | null;

// ── B2–B4: DBS source / hard-copy window ─────────────────────────────────────
const gateDbsInvalid: Gate = (c) => {
  const source = field(c, 'uk_crc', 'crc_type') || field(c, 'uk_crc_window', 'crcSource');
  if (source && !DBS_VALID_SOURCES.has(source)) {
    return {
      code: 'DBS_INVALID',
      reason: `DBS source not accepted: "${source}"`,
      evidenceRef: 'uk_crc.crc_type',
    };
  }

  const issueRaw = field(c, 'uk_crc', 'crc_issue_date') || field(c, 'uk_crc_window', 'crcIssue');
  const issue = parseDate(issueRaw);
  if (issue) {
    const reference = parseDate(c.startDate) ?? new Date();
    const age = daysBetween(issue, reference);
    if (age > DBS_WINDOW_DAYS) {
      return {
        code: 'DBS_INVALID',
        reason: `DBS issued ${age} days before start (max ${DBS_WINDOW_DAYS} / 10 weeks)`,
        evidenceRef: 'uk_crc.crc_issue_date',
      };
    }
  }
  return null;
};

// ── A4: Right to Work unresolved ─────────────────────────────────────────────
const gateRtwUnresolved: Gate = (c) => {
  if (field(c, 'rtw_doc', 'rtw_review_status') === 'Rejected') {
    return { code: 'RTW_UNRESOLVED', reason: 'RTW review rejected', evidenceRef: 'rtw_doc.rtw_review_status' };
  }
  if (field(c, 'rtw_prescreen', 'rtw_status') === 'Not Authorised — hard reject') {
    return { code: 'RTW_UNRESOLVED', reason: 'RTW not authorised', evidenceRef: 'rtw_prescreen.rtw_status' };
  }
  return null;
};

// ── HMRC missing for non-PAYE ────────────────────────────────────────────────
const NON_PAYE = /self|ltd|limited|partnership|cis|sole/i;
const gateHmrcMissing: Gate = (c) => {
  const employment = c.employment ?? '';
  if (employment && NON_PAYE.test(employment) && !field(c, 'hmrc_evidence', 'hmrc_ref')) {
    return {
      code: 'HMRC_MISSING',
      reason: `Non-PAYE employment ("${employment}") without HMRC evidence`,
      evidenceRef: 'hmrc_evidence.hmrc_ref',
    };
  }
  return null;
};

// ── C5: 6+ months abroad without International CRC ────────────────────────────
const gateAbroadNoIntlCrc: Gate = (c) => {
  const eligibility = field(c, 'dbs_preliminary', 'dbs_eligibility');
  const intl = field(c, 'intl_crc', 'intl_crc_countries');
  const needsIntl = eligibility === 'Ineligible — refer to international CRC';
  const intlProvided = intl && !/^n\/?a$/i.test(intl);
  if (needsIntl && !intlProvided) {
    return {
      code: 'ABROAD_NO_INTL_CRC',
      reason: 'Overseas history requires International CRC; none provided',
      evidenceRef: 'intl_crc.intl_crc_countries',
    };
  }
  return null;
};

// ── C6: identity / data inconsistency across documents ───────────────────────
const gateDocInconsistency: Gate = (c) => {
  if (field(c, 'identity_check', 'identity_result') === 'Fail (< 70% — hard reject)') {
    return {
      code: 'DOC_INCONSISTENCY',
      reason: 'Identity verification failed (<70% confidence)',
      evidenceRef: 'identity_check.identity_result',
    };
  }
  return null;
};

// ── C4: gap ≥28d without evidence (partial — full detection awaits gap engine) ─
const gateGapNoEvidence: Gate = (c) => {
  if (field(c, 'vra_form', 'vra_outcome') === 'Not acceptable — reject') {
    return {
      code: 'GAP_NO_EVIDENCE',
      reason: 'VRA outcome: gap not mitigated (not acceptable)',
      evidenceRef: 'vra_form.vra_outcome',
    };
  }
  return null;
};

// ── checklist: no interview pass / no signed suitability declaration ──────────
const gateNoInterviewOrDeclaration: Gate = (c) => {
  if (field(c, 'interview_record', 'int_outcome') === 'Fail') {
    return {
      code: 'NO_INTERVIEW_OR_DECLARATION',
      reason: 'Interview outcome: Fail',
      evidenceRef: 'interview_record.int_outcome',
    };
  }
  if (c.suitability === 'Not Suitable') {
    return {
      code: 'NO_INTERVIEW_OR_DECLARATION',
      reason: 'Suitability assessment: Not Suitable',
      evidenceRef: 'suitability',
    };
  }
  return null;
};

// ── D5: invalid reference — TODO(Lacuna 3): structured EmployerReference ──────
const gateReferenceInvalid: Gate = () => null;

/** All §9 gates, in matrix order. */
export const GATES: Gate[] = [
  gateGapNoEvidence,
  gateAbroadNoIntlCrc,
  gateDbsInvalid,
  gateRtwUnresolved,
  gateDocInconsistency,
  gateHmrcMissing,
  gateReferenceInvalid,
  gateNoInterviewOrDeclaration,
];

/**
 * Run every non-waivable gate and return all triggered failures.
 * An empty array means no auto-reject condition is currently evidenced.
 */
export function runAutoReject(candidate: ChecklistCandidate): AutoRejectFailure[] {
  return GATES.map((gate) => gate(candidate)).filter((f): f is AutoRejectFailure => f !== null);
}
