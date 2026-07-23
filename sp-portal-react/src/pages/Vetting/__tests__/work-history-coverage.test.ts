import type { ChecklistItem } from '../data/checklist';
import { isRegistrationComplete } from '../modules/central-driver-record/registration-complete';
import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import { calculateFiveYearCoverage } from '../modules/work-history/coverage';

const asOf = new Date(2026, 6, 7);

describe('work history coverage flags', () => {
  it('treats adjacent employment dates as continuous coverage', () => {
    const result = calculateFiveYearCoverage(
      [
        {
          company: 'A Ltd',
          role: 'Courier',
          start: '2021-07-07',
          end: '2023-12-31',
        },
        {
          company: 'B Ltd',
          role: 'Courier',
          start: '2024-01-01',
          end: '',
        },
      ],
      asOf,
    );

    expect(result.complete).toBe(true);
    expect(result.gapCount).toBe(0);
    expect(result.maxGapDays).toBe(0);
    expect(result.hasGapOver28Days).toBe(false);
  });

  it('keeps the 28-day gap flag without saying it blocks progression', () => {
    const result = calculateFiveYearCoverage(
      [
        {
          company: 'A Ltd',
          role: 'Courier',
          start: '2021-07-07',
          end: '2023-12-31',
        },
        {
          company: 'B Ltd',
          role: 'Courier',
          start: '2024-01-29',
          end: '',
        },
      ],
      asOf,
    );

    expect(result.complete).toBe(false);
    expect(result.maxGapDays).toBe(28);
    expect(result.hasGapOver28Days).toBe(true);
    expect(result.summary).toContain('5-year coverage flag');
    expect(result.summary).not.toContain('blocks progression');
  });

  it('flags a missing timeline as a gap across the review window', () => {
    const result = calculateFiveYearCoverage([], asOf);

    expect(result.complete).toBe(false);
    expect(result.gapCount).toBe(1);
    expect(result.maxGapDays).toBe(result.requiredDays);
    expect(result.hasGapOver28Days).toBe(true);
  });
});

describe('work history checklist completion', () => {
  const candidate = {
    id: 'candidate-1',
    rawId: 'candidate-1',
    name: 'Test Candidate',
    source: 'drivers',
    status: 'INTERVIEW',
    checklistDocs: {
      work_references: {
        employer_1_name: 'Recent Employer Ltd',
        employer_1_email: 'reference@example.com',
        employer_1_role: 'Courier',
        employer_1_start: '2026-06-01',
        employer_1_method: 'E-mail',
      },
    },
  } as unknown as ChecklistCandidate;

  it('does not use 5-year coverage as the work references completion check', () => {
    const item = {
      title: 'Work References recorded',
      docKey: 'work_references',
      docFields: [
        { key: 'employer_1_name', label: 'Company 1', type: 'text', required: true },
        { key: 'employer_1_email', label: 'Reference e-mail 1', type: 'text', required: true },
        { key: 'employer_1_role', label: 'Role 1', type: 'text', required: true },
        { key: 'employer_1_start', label: 'Start date 1', type: 'date', required: true },
        { key: 'employer_1_method', label: 'Reference method 1', type: 'select', required: true },
      ],
    } as ChecklistItem;

    expect(isRegistrationComplete(candidate, item)).toBe(true);
  });

  it('marks the 5-year history review present when records exist, even if flagged', () => {
    const item = {
      title: '5 years history reviewed',
      docKey: 'five_year_employment_history',
      docFields: [],
    } as unknown as ChecklistItem;

    expect(isRegistrationComplete(candidate, item)).toBe(true);
  });

  it('marks the 5-year history review present from driver-submitted work history', () => {
    const item = {
      title: '5 years history reviewed',
      docKey: 'five_year_employment_history',
      docFields: [],
    } as unknown as ChecklistItem;
    const candidateWithPortalHistory = {
      ...candidate,
      checklistDocs: {
        work_history: {
          entries: [
            {
              employer: 'Portal Employer Ltd',
              jobTitle: 'Courier',
              startDate: '2024-01',
              endDate: '',
            },
          ],
        },
      },
    } as unknown as ChecklistCandidate;

    expect(isRegistrationComplete(candidateWithPortalHistory, item)).toBe(true);
  });
});
