export interface DeductionItem {
  deductionId: number;
  description: string;
  amount: string;
  date: string;
  deductionType:
    | "FIX_DAMAGE"
    | "OTHER"
    | "LIQUIDATION_DAMAGE"
    | "PRE_PAYMENT"
    | "TRAFFIC_PENALTY";
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
}
