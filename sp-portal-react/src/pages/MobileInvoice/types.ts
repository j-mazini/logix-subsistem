export interface Invoice {
  invoiceId: number;
  invoiceNumber: string;
  userCode: string;
  courier: string;
  invoiceCreatedOn: string;
  totalPayment: number;
  referenceDate: string;
}

export interface GroupedInvoices {
  [key: string]: Invoice[];
}
