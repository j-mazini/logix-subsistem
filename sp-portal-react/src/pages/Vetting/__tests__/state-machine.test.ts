/**
 * Vetting Pipeline §1 — case state machine.
 * Covers status normalisation, valid/invalid transitions, the non-waivable
 * auto-reject guard, and commitTransition persist+audit side effects.
 */

import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import {
  canTransition,
  commitTransition,
  evaluateTransition,
  normaliseStatus,
} from '../modules/central-driver-record/state-machine';

function candidate(partial: Partial<ChecklistCandidate>): ChecklistCandidate {
  return {
    id: 'c1',
    rawId: 'driver-1',
    name: 'Test Driver',
    source: 'drivers',
    status: 'INTAKE',
    employment: 'PAYE',
    suitability: '',
    startDate: '',
    checklistDocs: {},
    ...partial,
  } as ChecklistCandidate;
}

describe('normaliseStatus', () => {
  it('maps legacy strings to canonical CaseStatus', () => {
    expect(normaliseStatus('PRE_REGISTERED')).toBe('INTAKE');
    expect(normaliseStatus('APPLICATION_REJECTED')).toBe('REJECTED');
    expect(normaliseStatus('active')).toBe('DHL_APPROVED');
  });

  it('passes through valid statuses and defaults unknowns to INTAKE', () => {
    expect(normaliseStatus('DBS_CHECK')).toBe('DBS_CHECK');
    expect(normaliseStatus('')).toBe('INTAKE');
    expect(normaliseStatus('NONSENSE')).toBe('INTAKE');
    expect(normaliseStatus(undefined)).toBe('INTAKE');
  });
});

describe('canTransition', () => {
  it('allows permitted forward transitions', () => {
    expect(canTransition('INTAKE', 'DBS_CHECK')).toBe(true);
    expect(canTransition('APPROVED', 'HANDED_TO_DHL')).toBe(true);
  });

  it('rejects illegal transitions, self-loops and terminal exits', () => {
    expect(canTransition('INTAKE', 'APPROVED')).toBe(false);
    expect(canTransition('INTAKE', 'INTAKE')).toBe(false);
    expect(canTransition('REJECTED', 'INTAKE')).toBe(false);
    expect(canTransition('DHL_APPROVED', 'DHL_PENDING')).toBe(false);
  });
});

describe('evaluateTransition', () => {
  it('allows a clean valid transition', () => {
    const d = evaluateTransition(candidate({ status: 'INTAKE' }), 'DBS_CHECK');
    expect(d.allowed).toBe(true);
    expect(d.from).toBe('INTAKE');
  });

  it('normalises legacy status before deciding', () => {
    const d = evaluateTransition(candidate({ status: 'PRE_REGISTERED' }), 'DBS_CHECK');
    expect(d.allowed).toBe(true);
    expect(d.from).toBe('INTAKE');
  });

  it('blocks an invalid transition', () => {
    const d = evaluateTransition(candidate({ status: 'INTAKE' }), 'APPROVED');
    expect(d.allowed).toBe(false);
    expect(d.blockedReason).toBe('INVALID_TRANSITION');
  });

  it('blocks any non-REJECTED destination when an auto-reject gate fires', () => {
    const c = candidate({
      status: 'INTAKE',
      checklistDocs: { rtw_doc: { rtw_review_status: 'Rejected' } },
    });
    const d = evaluateTransition(c, 'DBS_CHECK');
    expect(d.allowed).toBe(false);
    expect(d.blockedReason).toBe('AUTO_REJECT');
    expect(d.autoRejectFailures?.[0].code).toBe('RTW_UNRESOLVED');
  });

  it('still allows REJECTED when a gate has fired', () => {
    const c = candidate({
      status: 'INTAKE',
      checklistDocs: { rtw_doc: { rtw_review_status: 'Rejected' } },
    });
    expect(evaluateTransition(c, 'REJECTED').allowed).toBe(true);
  });
});

describe('commitTransition', () => {
  it('persists and audits an allowed transition', async () => {
    const persist = jest.fn().mockResolvedValue(undefined);
    const recordAudit = jest.fn().mockResolvedValue(undefined);

    const d = await commitTransition(
      candidate({ status: 'INTAKE' }),
      'DBS_CHECK',
      { persist, recordAudit },
      'looks good',
    );

    expect(d.allowed).toBe(true);
    expect(persist).toHaveBeenCalledWith('DBS_CHECK');
    expect(recordAudit).toHaveBeenCalledWith({
      field: 'status',
      previousValue: 'INTAKE',
      newValue: 'DBS_CHECK',
      reason: 'looks good',
    });
  });

  it('does not persist or audit a blocked transition', async () => {
    const persist = jest.fn();
    const recordAudit = jest.fn();

    const d = await commitTransition(candidate({ status: 'INTAKE' }), 'APPROVED', {
      persist,
      recordAudit,
    });

    expect(d.allowed).toBe(false);
    expect(persist).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
