// Driver knowledge assessment — question bank WITH correct answers + grading.
// IMPORTANT: import this only from the admin side. It must never be pulled into the
// public candidate bundle (the candidate page reads `questions` from Firestore, which
// are stripped of answers via `releaseQuestions()`).

import type { PublicQuestion, AssessmentScore } from './assessment-types';

export const ASSESSMENT_BANK_ID = 'driver-basics-v1';

export interface BankQuestion extends PublicQuestion {
  answer: number; // index into options
  explanation: string;
}

export interface AssessmentAnswerReview {
  id: string;
  category: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  wasAnswered: boolean;
}

export const QUESTION_BANK: BankQuestion[] = [
  // ── Highway Code ───────────────────────────────────────────────────────────
  {
    id: 'hc1',
    category: 'Highway Code',
    question: 'What is the national speed limit for a goods vehicle (up to 7.5t) on a single carriageway?',
    options: ['50 mph', '60 mph', '70 mph', '40 mph'],
    answer: 0,
    explanation: 'Goods vehicles up to 7.5t are limited to 50 mph on single carriageways under UK national speed limits.',
  },
  {
    id: 'hc2',
    category: 'Highway Code',
    question: 'When may you use a hand-held mobile phone while driving?',
    options: ['When stopped in traffic', 'Never — only hands-free is allowed', 'Only on motorways', 'When reading a map app'],
    answer: 1,
    explanation: 'Hand-held mobile phone use is not allowed while driving; only hands-free use is permitted when it is safe.',
  },
  {
    id: 'hc3',
    category: 'Highway Code',
    question: 'A pedestrian is waiting at a zebra crossing. You should:',
    options: ['Sound your horn', 'Speed up to pass before them', 'Slow down and prepare to stop', 'Flash your lights and continue'],
    answer: 2,
    explanation: 'Drivers must slow down and be ready to stop for pedestrians waiting to cross at a zebra crossing.',
  },
  {
    id: 'hc4',
    category: 'Highway Code',
    question: 'What does a solid white line along the centre of the road mean?',
    options: ['Overtake freely', 'Do not cross or straddle it unless it is safe and you need to', 'Parking is allowed', 'It marks a bus lane'],
    answer: 1,
    explanation: 'A solid white centre line means you must not cross or straddle it except in limited safe situations.',
  },

  // ── Numeracy ───────────────────────────────────────────────────────────────
  {
    id: 'nm1',
    category: 'Numeracy',
    question: 'A route has 24 parcels split evenly across 6 streets. How many parcels per street?',
    options: ['3', '4', '6', '8'],
    answer: 1,
    explanation: '24 parcels divided by 6 streets equals 4 parcels per street.',
  },
  {
    id: 'nm2',
    category: 'Numeracy',
    question: 'You start with 50 parcels and deliver 18 before lunch. How many remain?',
    options: ['22', '32', '28', '42'],
    answer: 1,
    explanation: '50 parcels minus 18 delivered parcels leaves 32 parcels remaining.',
  },
  {
    id: 'nm3',
    category: 'Numeracy',
    question: 'A van travels 90 miles in 2 hours. What is its average speed?',
    options: ['30 mph', '45 mph', '60 mph', '90 mph'],
    answer: 1,
    explanation: 'Average speed is distance divided by time, so 90 miles over 2 hours is 45 mph.',
  },

  // ── Map Reading & Route Planning ────────────────────────────────────────────
  {
    id: 'mp1',
    category: 'Map Reading',
    question: 'On a standard UK map, which direction is at the top?',
    options: ['North', 'South', 'East', 'West'],
    answer: 0,
    explanation: 'Standard UK maps are normally oriented with north at the top.',
  },
  {
    id: 'mp2',
    category: 'Map Reading',
    question: 'What is the best reason to plan a delivery route before setting off?',
    options: ['To use more fuel', 'To minimise distance and time', 'To avoid using the satnav', 'To deliver in random order'],
    answer: 1,
    explanation: 'Planning a route helps reduce unnecessary mileage, save time, and keep deliveries organised.',
  },

  // ── Customer Service ────────────────────────────────────────────────────────
  {
    id: 'cs1',
    category: 'Customer Service',
    question: 'A customer is not home for a delivery. The best first action is to:',
    options: ['Leave the parcel on the street', "Follow the company's safe-place / re-delivery procedure", 'Take the parcel back home with you', 'Throw it over the fence'],
    answer: 1,
    explanation: 'The correct action is to follow the company safe-place or re-delivery procedure so the parcel stays secure.',
  },
  {
    id: 'cs2',
    category: 'Customer Service',
    question: 'A customer is angry about a late delivery. The best response is to:',
    options: ['Argue back', 'Stay calm, apologise, and explain the next steps', 'Ignore them and walk away', 'Blame the traffic and leave'],
    answer: 1,
    explanation: 'A calm apology and clear next steps keeps the interaction professional and helps resolve the issue.',
  },
];

// Questions with the answer key removed — this is what gets written to Firestore at
// release time and shown to the candidate.
export function releaseQuestions(): PublicQuestion[] {
  return QUESTION_BANK.map(({ id, category, question, options }) => ({ id, category, question, options }));
}

// Grades the candidate's stored answers against the questions that were RELEASED
// with the assessment (the snapshot saved on the doc), not the live bank. Correct
// answers are looked up by question id, so adding/removing/reordering bank questions
// later never re-grades an already-released test incorrectly. Runs admin-side only.
export function gradeAssessment(
  questions: PublicQuestion[] | undefined | null,
  answers: Record<string, number> | undefined | null,
): AssessmentScore {
  const released = questions?.length ? questions : releaseQuestions();
  const a = answers ?? {};
  const bankById = new Map(QUESTION_BANK.map((q) => [q.id, q]));
  const byCategory: Record<string, { correct: number; total: number }> = {};
  let correct = 0;
  for (const q of released) {
    const cat = (byCategory[q.category] ??= { correct: 0, total: 0 });
    cat.total += 1;
    const correctIndex = bankById.get(q.id)?.answer;
    if (correctIndex !== undefined && a[q.id] === correctIndex) {
      correct += 1;
      cat.correct += 1;
    }
  }
  const total = released.length;
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0, byCategory };
}

export function reviewAssessmentAnswers(
  questions: PublicQuestion[] | undefined | null,
  answers: Record<string, number> | undefined | null,
): AssessmentAnswerReview[] {
  const releasedQuestions = questions?.length ? questions : releaseQuestions();
  const answerMap = answers ?? {};
  const bankById = new Map(QUESTION_BANK.map((q) => [q.id, q]));

  return releasedQuestions.map((released) => {
    const bankQuestion = bankById.get(released.id);
    const correctIndex = bankQuestion?.answer ?? -1;
    const selectedIndex = answerMap[released.id];
    const wasAnswered = typeof selectedIndex === 'number';
    const correctAnswer = correctIndex >= 0 ? (released.options[correctIndex] ?? bankQuestion?.options[correctIndex] ?? 'Unknown') : 'Unknown';
    const selectedAnswer = wasAnswered ? (released.options[selectedIndex] ?? 'Invalid answer') : 'Not answered';

    return {
      id: released.id,
      category: released.category,
      question: released.question,
      selectedAnswer,
      correctAnswer,
      explanation: bankQuestion?.explanation ?? `Correct answer: ${correctAnswer}.`,
      isCorrect: wasAnswered && selectedIndex === correctIndex,
      wasAnswered,
    };
  });
}
