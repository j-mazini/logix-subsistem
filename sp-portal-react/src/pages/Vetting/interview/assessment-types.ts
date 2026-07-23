// Shared assessment types — NO correct answers live here, so this module is safe to
// import into the public candidate bundle. The answer key + grading live in
// `assessment-bank.ts`, which is imported only by the admin side.

export type AssessmentStatus = 'released' | 'in_progress' | 'completed';

export interface PublicQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
}

export interface AssessmentScore {
  correct: number;
  total: number;
  percent: number;
  byCategory: Record<string, { correct: number; total: number }>;
}

export interface AssessmentDoc {
  token: string;
  driver: { id: string; source: 'drivers' | 'legacy-vendors' };
  candidateName: string;
  bankId: string;
  questions: PublicQuestion[];
  totalQuestions: number;
  status: AssessmentStatus;
  answers: Record<string, number>;
  currentIndex: number;
  releasedAt?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  // NB: the score is never stored on this doc — it is candidate-readable via the
  // capability token, so storing it would leak the result. Graded live admin-side.
}

// Capability token used as the unguessable public URL segment (/assessment/[token]).
// This token IS the access-control boundary, so it must come from a CSPRNG.
export function newAssessmentToken(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '');
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('No secure random source (crypto) available to mint an assessment token');
}

export function answeredCount(answers: Record<string, number> | undefined | null): number {
  return answers ? Object.keys(answers).length : 0;
}
