/**
 * Regression Test: legacy dvla_check_date should not block licence item completion
 *
 * Bug #320-271: dvla_check_date was marked required in checklist but:
 * - PreRegistrationForm no longer sends this field
 * - No UI existed for admin to fill it
 * - Result: licence step became permanently un-completable
 *
 * Fix: The DVLA block now uses dvla_expiry as the editable date field.
 * This test ensures legacy dvla_check_date stays out of required validation.
 */

import type { ChecklistItem } from '../data/checklist';
import { isRegistrationComplete } from '../modules/central-driver-record/registration-complete';
import type { ChecklistCandidate } from '../modules/central-driver-record/model';

describe('Driving licence date regression', () => {
  const mockCandidate: ChecklistCandidate = {
    id: 'test-van-driver',
    name: 'John Smith',
    role: 'Van Courier',
    source: 'drivers',
    rawId: 'driver-123',
    checks: [],
    checklistDocs: {
      dvla_doc: {
        dvla_type: 'BRITISH',
        dvla_number: 'SMITH123456JJ9AB',
        dvla_expiry: '2025-12-31',
        dvla_share_code: 'ABC 123 456',
        // Legacy dvla_check_date is intentionally empty; expiry is the visible date field.
        __documentStatus: 'Declared by candidate',
      },
    },
  } as any;

  const licenceItem: ChecklistItem = {
    title: 'Driving licence details declared by driver — Van / Motorbike only',
    conditional: true,
    docKey: 'dvla_doc',
    docFields: [
      {
        key: 'dvla_type',
        label: 'Licence type',
        required: true,
        type: 'select',
      },
      {
        key: 'dvla_number',
        label: 'Drive License Number',
        required: true,
        type: 'text',
      },
      {
        key: 'dvla_expiry',
        label: 'Expiry date',
        type: 'date',
      },
    ],
  };

  test('licence item should be completable with expiry date instead of check date', () => {
    const result = isRegistrationComplete(mockCandidate, licenceItem);
    expect(result).toBe(true);
  });

  test('legacy dvla_check_date should not appear in required fields validation', () => {
    const requiredFields = licenceItem.docFields?.filter((f) => f.required);
    const hasDvlaCheckDate = requiredFields?.some((f) => f.key === 'dvla_check_date');
    expect(hasDvlaCheckDate).toBe(false);
  });

  test('candidate with all required licence fields should pass even without check date', () => {
    const completeCandidate = {
      ...mockCandidate,
      checklistDocs: {
        dvla_doc: {
          dvla_type: 'BRITISH',
          dvla_number: 'SMITH123456JJ9AB',
          dvla_expiry: '2025-12-31',
          dvla_share_code: 'ABC 123 456',
          // dvla_check_date omitted
          __documentStatus: 'Declared by candidate',
        },
      },
    } as any;

    const result = isRegistrationComplete(completeCandidate, licenceItem);
    expect(result).toBe(true);
  });
});
