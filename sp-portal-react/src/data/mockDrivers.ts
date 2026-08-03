/**
 * Shared mock driver roster, used wherever a page needs to reference a
 * driver by userId (Deductions, Trace & Queries). Extracted from
 * DeductionsDisbursementsRecharges so both pages resolve the same driver
 * identity for the same userId.
 */

export interface MockDriver {
  userId: number;
  fullName: string;
}

const DRIVER_NAMES = [
  'John Smith', 'Maria Santos', 'James Wilson', 'Ana Ferreira', 'Michael Brown',
  'Sofia Rodrigues', 'Carlos Silva', 'Emily Clarke', 'Pedro Oliveira', 'Laura Bennett',
  'Lucas Pereira', 'Grace Thompson',
];

export const MOCK_DRIVERS: MockDriver[] = DRIVER_NAMES.map((fullName, i) => ({ userId: i + 1, fullName }));
