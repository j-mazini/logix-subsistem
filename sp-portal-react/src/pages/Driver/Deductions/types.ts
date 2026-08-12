/**
 * Ported from logix-sphere-frontend-nextjs's app/(private)/deductions/types.ts.
 * Shape kept 1:1 with the reference so utils.ts (grouping/summing logic) and
 * the mock data generator can stay a near-verbatim port too.
 */
export interface DeductionItem {
  deductionId: number;
  description: string;
  amount: string;
  date: string;
  deductionType:
    | 'FIX_DAMAGE'
    | 'OTHER'
    | 'LIQUIDATION_DAMAGE'
    | 'PRE_PAYMENT'
    | 'TRAFFIC_PENALTY';
  totalInstallments?: number;
  currentInstallment?: number;
  uniqueId?: string;
  invoiceId: number | null;
  referenceNumber: string;
  totalAmount?: string;
  userId?: number | null;
}

export interface MonthItem {
  label: string;
  year: number;
  month: number;
  key: string;
  date: Date;
  isSelected: boolean;
}
