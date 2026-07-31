import { DeductionItem } from '../types';

/**
 * Mock stand-in for the Next.js source's `/bff/deductions/:userId/:month/:year`
 * endpoint. The real endpoint is month-scoped but returns every installment of
 * a deduction plan that has at least one installment due that month (so the
 * client can render "2 of 4" progress even though only one is due now) — this
 * static pool mirrors that by filtering on read, in `getDeductionsForMonth`.
 */
const MOCK_DEDUCTIONS_POOL: DeductionItem[] = [
  {
    deductionId: 1,
    deductionType: 'FIX_DAMAGE',
    referenceNumber: 'DED-2026-0001',
    description: 'Rear bumper damage repair',
    date: '2026-06-18',
    amount: '85.00',
    invoiceId: 5001,
  },
  {
    deductionId: 2,
    deductionType: 'OTHER',
    referenceNumber: 'DED-2026-0002',
    description: 'Uniform replacement',
    date: '2026-07-05',
    amount: '25.00',
    invoiceId: 5002,
  },
  {
    deductionId: 3,
    deductionType: 'LIQUIDATION_DAMAGE',
    referenceNumber: 'DED-2026-0003',
    description: 'Vehicle liquidation damage',
    date: '2026-05-12',
    amount: '150.00',
    invoiceId: 5003,
  },
  // Advance payment recovery, spread over 4 monthly installments.
  {
    deductionId: 4,
    deductionType: 'PRE_PAYMENT',
    referenceNumber: 'DED-2026-0004',
    description: 'Advance payment recovery',
    date: '2026-06-01',
    amount: '50.00',
    invoiceId: 5004,
  },
  {
    deductionId: 4,
    deductionType: 'PRE_PAYMENT',
    referenceNumber: 'DED-2026-0004',
    description: 'Advance payment recovery',
    date: '2026-07-01',
    amount: '50.00',
    invoiceId: 5004,
  },
  {
    deductionId: 4,
    deductionType: 'PRE_PAYMENT',
    referenceNumber: 'DED-2026-0004',
    description: 'Advance payment recovery',
    date: '2026-08-01',
    amount: '50.00',
    invoiceId: 5004,
  },
  {
    deductionId: 4,
    deductionType: 'PRE_PAYMENT',
    referenceNumber: 'DED-2026-0004',
    description: 'Advance payment recovery',
    date: '2026-09-01',
    amount: '50.00',
    invoiceId: 5004,
  },
  // Traffic penalty repayment, spread over 3 monthly installments.
  {
    deductionId: 5,
    deductionType: 'TRAFFIC_PENALTY',
    referenceNumber: 'DED-2026-0005',
    description: 'Traffic penalty repayment',
    date: '2026-07-15',
    amount: '40.00',
    invoiceId: 5005,
  },
  {
    deductionId: 5,
    deductionType: 'TRAFFIC_PENALTY',
    referenceNumber: 'DED-2026-0005',
    description: 'Traffic penalty repayment',
    date: '2026-08-15',
    amount: '40.00',
    invoiceId: 5005,
  },
  {
    deductionId: 5,
    deductionType: 'TRAFFIC_PENALTY',
    referenceNumber: 'DED-2026-0005',
    description: 'Traffic penalty repayment',
    date: '2026-09-15',
    amount: '40.00',
    invoiceId: 5005,
  },
];

export function getDeductionsForMonth(year: number, month: number): DeductionItem[] {
  const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;

  const matchingKeys = new Set<string>();
  MOCK_DEDUCTIONS_POOL.forEach((item) => {
    const d = new Date(item.date);
    const itemMonthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (itemMonthYear === monthYear) {
      matchingKeys.add(`${item.deductionType}-${item.deductionId}`);
    }
  });

  return MOCK_DEDUCTIONS_POOL.filter((item) => matchingKeys.has(`${item.deductionType}-${item.deductionId}`));
}
