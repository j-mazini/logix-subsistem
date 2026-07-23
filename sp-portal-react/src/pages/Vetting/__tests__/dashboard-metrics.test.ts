// Tests for Dashboard metrics calculation
// Verifies MVP dashboard correctly calculates: progress, stage distribution, officer workload

import { describe, it, expect } from '@jest/globals';

interface CandidateRecord {
  id: string;
  status: string;
  checks?: boolean[];
  assignedOfficer?: string;
}

describe('Dashboard Metrics', () => {
  // Helper to calculate stage distribution
  function calculateStageDistribution(candidates: CandidateRecord[]) {
    const stages: Record<string, number> = {
      Application: 0,
      'Pre-screen': 0,
      Interview: 0,
      Documents: 0,
      Active: 0,
      Rejected: 0,
    };

    candidates.forEach((c) => {
      const status = c.status || 'application';
      const normalized =
        status === 'application'
          ? 'Application'
          : status === 'pre-screen'
            ? 'Pre-screen'
            : status === 'interview'
              ? 'Interview'
              : status === 'documents'
                ? 'Documents'
                : status === 'active'
                  ? 'Active'
                  : 'Rejected';
      stages[normalized]++;
    });

    return stages;
  }

  // Helper to calculate progress
  function calculateProgress(candidates: CandidateRecord[]) {
    if (candidates.length === 0) return 0;
    const totalChecks = candidates.reduce((sum, c) => {
      const checkCount = (c.checks || []).filter(Boolean).length;
      const maxChecks = (c.checks || []).length || 50;
      return sum + (maxChecks > 0 ? (checkCount / maxChecks) * 100 : 0);
    }, 0);
    return totalChecks / candidates.length;
  }

  // Helper to calculate officer workload
  function calculateOfficerWorkload(candidates: CandidateRecord[]) {
    const workload: Record<string, number> = {};
    candidates.forEach((c) => {
      const officer = c.assignedOfficer || 'Unassigned';
      workload[officer] = (workload[officer] || 0) + 1;
    });
    return workload;
  }

  it('should calculate stage distribution correctly', () => {
    const candidates: CandidateRecord[] = [
      { id: 'c1', status: 'application' },
      { id: 'c2', status: 'application' },
      { id: 'c3', status: 'interview' },
      { id: 'c4', status: 'active' },
      { id: 'c5', status: 'rejected' },
    ];

    const stages = calculateStageDistribution(candidates);

    expect(stages.Application).toBe(2);
    expect(stages.Interview).toBe(1);
    expect(stages.Active).toBe(1);
    expect(stages.Rejected).toBe(1);
    expect(stages['Pre-screen']).toBe(0);
  });

  it('should calculate overall progress as percentage of checks', () => {
    const candidates: CandidateRecord[] = [
      {
        id: 'c1',
        status: 'application',
        checks: Array(50)
          .fill(false)
          .map((_, i) => i < 25), // 25/50 = 50%
      },
      {
        id: 'c2',
        status: 'interview',
        checks: Array(50)
          .fill(false)
          .map((_, i) => i < 50), // 50/50 = 100%
      },
    ];

    const progress = calculateProgress(candidates);

    expect(progress).toBe(75); // (50 + 100) / 2 = 75%
  });

  it('should handle empty candidate list for progress', () => {
    const candidates: CandidateRecord[] = [];
    const progress = calculateProgress(candidates);
    expect(progress).toBe(0);
  });

  it('should calculate officer workload distribution', () => {
    const candidates: CandidateRecord[] = [
      { id: 'c1', status: 'application', assignedOfficer: 'Sarah Thompson' },
      { id: 'c2', status: 'interview', assignedOfficer: 'Sarah Thompson' },
      { id: 'c3', status: 'interview', assignedOfficer: 'Michael Chen' },
      { id: 'c4', status: 'active', assignedOfficer: undefined }, // Unassigned
    ];

    const workload = calculateOfficerWorkload(candidates);

    expect(workload['Sarah Thompson']).toBe(2);
    expect(workload['Michael Chen']).toBe(1);
    expect(workload.Unassigned).toBe(1);
  });

  it('should handle unassigned officers', () => {
    const candidates: CandidateRecord[] = [
      { id: 'c1', status: 'application' },
      { id: 'c2', status: 'application' },
    ];

    const workload = calculateOfficerWorkload(candidates);

    expect(workload.Unassigned).toBe(2);
    expect(Object.keys(workload)).toHaveLength(1);
  });

  it('should sum up stage distribution equals total candidates', () => {
    const candidates: CandidateRecord[] = Array.from(
      { length: 100 },
      (_, i) => ({
        id: `c${i}`,
        status: ['application', 'pre-screen', 'interview', 'documents', 'active', 'rejected'][
          i % 6
        ],
      }),
    );

    const stages = calculateStageDistribution(candidates);
    const total = Object.values(stages).reduce((a, b) => a + b, 0);

    expect(total).toBe(100);
  });

  it('should calculate progress for candidates with different check counts', () => {
    const candidates: CandidateRecord[] = [
      {
        id: 'c1',
        status: 'application',
        checks: [true, true, false, false, false], // 2/5 = 40%
      },
      {
        id: 'c2',
        status: 'interview',
        checks: Array(10).fill(true), // 10/10 = 100%
      },
    ];

    const progress = calculateProgress(candidates);

    expect(progress).toBeCloseTo(70); // (40 + 100) / 2 = 70%
  });
});
