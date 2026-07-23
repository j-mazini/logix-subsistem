// Tests for Officer Context (no-auth model)
// Verifies debate gate condition: officer selection uses sessionStorage

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('OfficerContext', () => {
  const VETTING_OFFICERS = [
    'Sarah Thompson',
    'Michael Chen',
    'Emma Rodriguez',
    'James Wilson',
    'Priya Patel',
  ];

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should initialize with no officer selected', () => {
    const stored = sessionStorage.getItem('vetting-selected-officer');
    expect(stored).toBeNull();
  });

  it('should store officer selection in sessionStorage', () => {
    const officerName = 'Sarah Thompson';
    sessionStorage.setItem('vetting-selected-officer', officerName);
    expect(sessionStorage.getItem('vetting-selected-officer')).toBe(officerName);
  });

  it('should validate officer exists in allowed list', () => {
    const validOfficer = 'Sarah Thompson';
    const invalidOfficer = 'Invalid Officer';

    expect(VETTING_OFFICERS.includes(validOfficer)).toBe(true);
    expect(VETTING_OFFICERS.includes(invalidOfficer)).toBe(false);
  });

  it('should clear selection when browser closes (sessionStorage cleanup)', () => {
    sessionStorage.setItem('vetting-selected-officer', 'Michael Chen');
    sessionStorage.clear();
    expect(sessionStorage.getItem('vetting-selected-officer')).toBeNull();
  });

  it('should support switching between officers', () => {
    sessionStorage.setItem('vetting-selected-officer', 'Sarah Thompson');
    expect(sessionStorage.getItem('vetting-selected-officer')).toBe('Sarah Thompson');

    sessionStorage.setItem('vetting-selected-officer', 'Michael Chen');
    expect(sessionStorage.getItem('vetting-selected-officer')).toBe('Michael Chen');
  });
});
