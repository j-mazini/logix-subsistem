/**
 * Interview 1-5 scoring — Core Competencies + Practical.
 *
 * Covers the scoring engine that populates the "Core competencies scored"
 * checklist item:
 *   - interviewScore()               → totals 7 comp + 3 prac items (max 50)
 *   - autoInterviewDecision()        → band + low-score (<=2) hire block
 *   - hasCompleteCoreCompetencyScores() → the gate behind the
 *     "Complete the required registration fields before checking this item"
 *     message (all 7 competencies must be scored 1-5).
 */

import {
  COMP_ITEMS,
  PRAC_ITEMS,
  defaultInterview,
  interviewScore,
  autoInterviewDecision,
  hasInterviewScore,
  hasCompleteCoreCompetencyScores,
  hasCompleteInterviewScores,
  type ChecklistInterview,
} from '../modules/interview/model';

/** Build an interview with every comp and prac item set to `value` (1-5). */
function scoredInterview(value: number, overrides: Partial<ChecklistInterview> = {}): ChecklistInterview {
  const base = defaultInterview();
  return {
    ...base,
    comp: Object.fromEntries(COMP_ITEMS.map((item) => [item.k, value])),
    prac: Object.fromEntries(PRAC_ITEMS.map((item) => [item.k, value])),
    ...overrides,
  };
}

describe('interviewScore', () => {
  it('is 0 for a fresh interview (nothing scored)', () => {
    expect(interviewScore(defaultInterview())).toBe(0);
  });

  it('sums all 7 competency + 3 practical items (max 50 at all 5s)', () => {
    expect(interviewScore(scoredInterview(5))).toBe(50);
  });

  it('sums to the minimum non-zero total at all 1s (10 items)', () => {
    expect(interviewScore(scoredInterview(1))).toBe(10);
  });

  it('adds partial comp + prac scores correctly', () => {
    const iv = defaultInterview();
    iv.comp[COMP_ITEMS[0].k] = 4; // 4
    iv.comp[COMP_ITEMS[1].k] = 3; // +3
    iv.prac[PRAC_ITEMS[0].k] = 5; // +5
    expect(interviewScore(iv)).toBe(12);
  });

  it('coerces non-numeric / missing scores to 0 instead of NaN', () => {
    const iv = defaultInterview();
    // Simulate legacy/corrupt data that slipped past typing.
    (iv.comp as Record<string, unknown>)[COMP_ITEMS[0].k] = undefined;
    (iv.comp as Record<string, unknown>)[COMP_ITEMS[1].k] = '3';
    expect(interviewScore(iv)).toBe(3);
  });
});

describe('autoInterviewDecision', () => {
  it('reports "not yet assessed" when total is 0', () => {
    const iv = defaultInterview();
    expect(autoInterviewDecision(interviewScore(iv), iv).className).toBe('decisionNone');
  });

  it('declines below 28 points', () => {
    const iv = scoredInterview(0, {
      comp: Object.fromEntries(COMP_ITEMS.map((item, i) => [item.k, i === 0 ? 3 : 0])),
    });
    const total = interviewScore(iv);
    expect(total).toBeLessThan(28);
    expect(autoInterviewDecision(total, iv).className).toBe('decisionDecline');
  });

  it('recommends a second interview in the 28-31 band', () => {
    // All 3s → 30 points, no score <=2.
    const iv = scoredInterview(3);
    expect(interviewScore(iv)).toBe(30);
    expect(autoInterviewDecision(30, iv).className).toBe('decisionSecond');
  });

  it('is conditional in the 32-37 band', () => {
    const iv = scoredInterview(3);
    iv.comp[COMP_ITEMS[0].k] = 5;
    iv.comp[COMP_ITEMS[1].k] = 5;
    iv.prac[PRAC_ITEMS[0].k] = 5; // 30 + 6 = 36
    expect(interviewScore(iv)).toBe(36);
    expect(autoInterviewDecision(36, iv).className).toBe('decisionConditional');
  });

  it('is a strong HIRE at 38+ with no low scores', () => {
    const iv = scoredInterview(4); // 40, all 4s
    expect(interviewScore(iv)).toBe(40);
    expect(autoInterviewDecision(40, iv).className).toBe('decisionHire');
  });

  it('blocks a strong HIRE when any single competency is <=2, even at 38+', () => {
    const iv = scoredInterview(5); // 50
    iv.comp[COMP_ITEMS[0].k] = 2; // one weak area → 47, hasLow
    const total = interviewScore(iv);
    expect(total).toBeGreaterThanOrEqual(38);
    // Falls through to the conditional band rather than the strong-hire band.
    expect(autoInterviewDecision(total, iv).className).toBe('decisionConditional');
  });
});

describe('hasCompleteCoreCompetencyScores (registration gate)', () => {
  it('is false for a fresh interview — blocks checking "Core competencies scored"', () => {
    expect(hasCompleteCoreCompetencyScores(defaultInterview())).toBe(false);
  });

  it('is false when even one competency is left unscored', () => {
    const iv = scoredInterview(3);
    iv.comp[COMP_ITEMS[COMP_ITEMS.length - 1].k] = 0; // last one missing
    expect(hasCompleteCoreCompetencyScores(iv)).toBe(false);
  });

  it('is true once every competency has a 1-5 score', () => {
    const iv = scoredInterview(1);
    expect(hasCompleteCoreCompetencyScores(iv)).toBe(true);
  });

  it('ignores practical items — only the 7 competencies gate this item', () => {
    const iv = scoredInterview(3);
    // Wipe all practical scores; competencies remain complete.
    iv.prac = Object.fromEntries(PRAC_ITEMS.map((item) => [item.k, 0]));
    expect(hasCompleteCoreCompetencyScores(iv)).toBe(true);
  });

  it('is undefined-safe (no interview yet)', () => {
    expect(hasCompleteCoreCompetencyScores(undefined)).toBe(false);
  });
});

describe('hasInterviewScore / hasCompleteInterviewScores', () => {
  it('treats a 0 (or missing) score as not scored', () => {
    const iv = defaultInterview();
    expect(hasInterviewScore(iv, 'comp', COMP_ITEMS[0].k)).toBe(false);
    iv.comp[COMP_ITEMS[0].k] = 1;
    expect(hasInterviewScore(iv, 'comp', COMP_ITEMS[0].k)).toBe(true);
  });

  it('requires BOTH competencies and practical items to be fully scored', () => {
    const iv = scoredInterview(3);
    expect(hasCompleteInterviewScores(iv)).toBe(true);
    iv.prac[PRAC_ITEMS[0].k] = 0;
    expect(hasCompleteInterviewScores(iv)).toBe(false);
  });
});
