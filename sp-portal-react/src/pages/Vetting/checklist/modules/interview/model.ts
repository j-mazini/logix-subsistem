export const PREP_ITEMS = [
  "Candidate's phone interview notes and application",
  'Company presentation materials/brochures',
  'Sample delivery documents (POD, exception forms)',
  'Basic map reading test materials',
  'Calculator for numeracy test',
  'Competency assessment forms',
  'Document collection checklist',
  'Contract draft for reference',
  'Company policies summary',
];

export const COMP_ITEMS = [
  { k: 'comm', label: 'Communication Skills', desc: ['Cannot communicate effectively', 'Struggles with clear communication', 'Adequate for customer interaction', 'Clear communication, minor issues', 'Articulate, confident, excellent English'] },
  { k: 'cust', label: 'Customer Service Orientation', desc: ['No customer service orientation', 'Limited understanding', 'Basic customer service awareness', 'Good understanding of customer service', 'Natural customer focus, great examples'] },
  { k: 'prob', label: 'Problem-Solving Ability', desc: ['Cannot solve basic problems', 'Struggles with complex problems', 'Basic problem-solving skills', 'Good analytical approach', 'Creative, logical, quick thinking'] },
  { k: 'time', label: 'Time Management & Organisation', desc: ['No time management ability', 'Poor organisational skills', 'Basic time management', 'Good organisational skills', 'Excellent planning and prioritisation'] },
  { k: 'rely', label: 'Reliability & Work Ethic', desc: ['Unreliable, poor work ethic', 'Some reliability concerns', 'Generally reliable', 'Reliable with good work attitude', 'Exceptional reliability, strong work ethic'] },
  { k: 'adap', label: 'Adaptability & Flexibility', desc: ['Cannot adapt to change', 'Struggles with change', 'Manages change adequately', 'Adapts well to change', 'Thrives on change, very flexible'] },
  { k: 'tech', label: 'Technical Aptitude', desc: ['Cannot use basic technology', 'Struggles with technology', 'Basic tech skills', 'Good with technology', 'Very tech-savvy, quick learner'] },
];

export const PRAC_ITEMS = [
  { k: 'map', label: 'Map Reading & Navigation', desc: ['Poor planning, major route issues', 'Below average', 'Good route with minor inefficiencies', 'Good route', 'Perfect route, excellent time estimation'] },
  { k: 'num', label: 'Numeracy & Calculations', desc: ['Multiple errors, struggles with basic maths', 'Below average', 'Most correct, some minor errors', 'Good accuracy', 'All correct, quick calculations'] },
  { k: 'doc', label: 'Document Handling', desc: ['Multiple errors, poor attention to detail', 'Below average', 'Good completion with minor omissions', 'Good attention to detail', 'Perfect completion, excellent attention to detail'] },
];

export const DOC_ITEMS = [
  'Valid ID / Passport — check expiry, verify identity',
  'UK Driving Licence — check categories, endorsements, expiry',
  'Driving Licence Share Code — note code for DVLA check',
  'Right to Work Documentation — verify work authorisation',
  'National Insurance Number — confirm format and validity',
  'DBS / CRB Certificate — must be clear, check date',
  'Proof of Address — must be within 3 months',
  'Professional References — contact details verified',
  'Emergency Contact Details — name, relationship, phone',
  'Medical Information — any conditions affecting driving',
  'Bank Details — for salary payments (if progressing)',
  'Start Date Availability — earliest possible start date',
];

export const REDFLAG_ITEMS = [
  'Inconsistencies in employment history',
  'Negative attitude toward previous employers',
  'Unrealistic salary expectations',
  'Inflexibility with working conditions',
  'Poor personal presentation',
  'Late arrival without valid reason',
  'Aggressive or inappropriate behaviour',
  'Cannot provide required documents',
  'Very poor English communication',
  'Cannot complete basic practical tests',
  'Shows no interest in customer service',
  'Appears unreliable or uncommitted',
  'Cannot work independently',
  'No understanding of job requirements',
];

export const NEXT_ITEMS = ['Send job offer', 'Schedule second interview', 'Send decline letter', 'Additional document collection required'];

export interface ChecklistInterview {
  date: string;
  startTime: string;
  interviewer: string;
  supervisorName: string;
  location: string;
  outcome: string;
  notes: string;
  strengths: string;
  development: string;
  candidateQuestions: string;
  overall: string;
  docNotes: string;
  redFlagNotes: string;
  decision: string;
  conditions: string;
  hrSig: string;
  supervisorSig: string;
  totalScore: number;
  prepChecks: boolean[];
  docChecks: boolean[];
  docExpiry: string[];
  redFlags: boolean[];
  nextSteps: boolean[];
  comp: Record<string, number>;
  prac: Record<string, number>;
  /** Token of the candidate's released online knowledge test (doc id in `assessments`). */
  assessmentToken: string;
}

export function defaultInterview(): ChecklistInterview {
  return {
    date: '',
    startTime: '',
    interviewer: '',
    supervisorName: '',
    location: '',
    outcome: '',
    notes: '',
    strengths: '',
    development: '',
    candidateQuestions: '',
    overall: '',
    docNotes: '',
    redFlagNotes: '',
    decision: '',
    conditions: '',
    hrSig: '',
    supervisorSig: '',
    totalScore: 0,
    prepChecks: Array(PREP_ITEMS.length).fill(false),
    docChecks: Array(DOC_ITEMS.length).fill(false),
    docExpiry: Array(DOC_ITEMS.length).fill(''),
    redFlags: Array(REDFLAG_ITEMS.length).fill(false),
    nextSteps: Array(NEXT_ITEMS.length).fill(false),
    comp: Object.fromEntries(COMP_ITEMS.map((item) => [item.k, 0])),
    prac: Object.fromEntries(PRAC_ITEMS.map((item) => [item.k, 0])),
    assessmentToken: '',
  };
}

export function mergeInterview(raw: unknown): ChecklistInterview {
  const base = defaultInterview();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<ChecklistInterview>;
  return {
    ...base,
    ...data,
    prepChecks: Array.isArray(data.prepChecks)
      ? [...data.prepChecks, ...Array(Math.max(0, base.prepChecks.length - data.prepChecks.length)).fill(false)]
      : base.prepChecks,
    docChecks: Array.isArray(data.docChecks)
      ? [...data.docChecks, ...Array(Math.max(0, base.docChecks.length - data.docChecks.length)).fill(false)]
      : base.docChecks,
    docExpiry: Array.isArray(data.docExpiry)
      ? [...data.docExpiry, ...Array(Math.max(0, base.docExpiry.length - data.docExpiry.length)).fill('')]
      : base.docExpiry,
    redFlags: Array.isArray(data.redFlags)
      ? [...data.redFlags, ...Array(Math.max(0, base.redFlags.length - data.redFlags.length)).fill(false)]
      : base.redFlags,
    nextSteps: Array.isArray(data.nextSteps)
      ? [...data.nextSteps, ...Array(Math.max(0, base.nextSteps.length - data.nextSteps.length)).fill(false)]
      : base.nextSteps,
    comp: { ...base.comp, ...(data.comp ?? {}) },
    prac: { ...base.prac, ...(data.prac ?? {}) },
  };
}

export function interviewScore(interview: ChecklistInterview) {
  const total =
    Object.values(interview.comp).reduce((sum, value) => sum + Number(value || 0), 0) +
    Object.values(interview.prac).reduce((sum, value) => sum + Number(value || 0), 0);
  return Number.isFinite(total) ? total : 0;
}

/** A comp/prac item counts as scored once it holds a 1-5 value (0 = not scored). */
export function hasInterviewScore(
  interview: ChecklistInterview | undefined,
  group: 'comp' | 'prac',
  key: string,
) {
  return Number(interview?.[group]?.[key] || 0) > 0;
}

/**
 * Gate behind the "Core competencies scored" checklist item: every one of the
 * 7 Core Competencies must carry a 1-5 score. Until then the item shows
 * "Complete the required registration fields before checking this item".
 */
export function hasCompleteCoreCompetencyScores(interview: ChecklistInterview | undefined) {
  return COMP_ITEMS.every((item) => hasInterviewScore(interview, 'comp', item.k));
}

/** Both the 7 competencies and the 3 practical items must be fully scored. */
export function hasCompleteInterviewScores(interview: ChecklistInterview | undefined) {
  return (
    hasCompleteCoreCompetencyScores(interview) &&
    PRAC_ITEMS.every((item) => hasInterviewScore(interview, 'prac', item.k))
  );
}

export function autoInterviewDecision(total: number, interview: ChecklistInterview) {
  if (total === 0) return { className: 'decisionNone', label: '- not yet assessed -' };
  const hasLow = [...Object.values(interview.comp), ...Object.values(interview.prac)].some(
    (value) => Number(value) > 0 && Number(value) <= 2,
  );
  if (total >= 38 && !hasLow) return { className: 'decisionHire', label: 'HIRE - Strong Candidate (38+ pts)' };
  if (total >= 32) return { className: 'decisionConditional', label: 'HIRE - Conditional (32-37 pts)' };
  if (total >= 28) return { className: 'decisionSecond', label: 'Second Interview Recommended (28-31 pts)' };
  return { className: 'decisionDecline', label: 'DECLINE (below 28 pts)' };
}
