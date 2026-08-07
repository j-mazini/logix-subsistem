/**
 * Types for the Driver Portal Invoices tab.
 * Ported from logix-sphere-frontend-nextjs's app/(private)/mobile-invoice/types.ts.
 * Dropped `TokenPayload`/`InvoiceApiResponse` — this project has no backend or
 * JWT auth session; invoices are generated as deterministic mock data instead
 * (see mockData.ts) already in the shape of `Invoice` below.
 */
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

/** A single mocked line item shown inside the invoice detail view. */
export interface InvoiceLineItem {
  date: string;
  description: string;
  stops: number;
  rate: number;
  extra: number;
  total: number;
}
