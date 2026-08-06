// Ported 1:1 from the Next.js source's utils/format.ts.
import type { Deduction } from '../../../data/servicePartnerInvoicesData';

/** Formats a numeric amount as GBP currency (e.g. £1,234.50). Tolerates numeric strings. */
export function formatGbp(amount: number): string {
  const parsed = Number(amount);
  const value = Number.isFinite(parsed) ? parsed : 0;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Returns a human-readable month/year label (e.g. "May 2026"). 1-based month. */
export function monthYearLabel(month: number, year: number): string {
  const date = new Date(year, Math.max(0, month - 1), 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Strips the time/timezone from an ISO date string, returning only YYYY-MM-DD. */
export function formatItemDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return dateStr.substring(0, 10);
}

/** Renders the period label from a MMYYYY date stamp (e.g. "May 2026"). */
export function parsePeriodLabel(dateStr: string): string {
  if (/^\d{6}$/.test(dateStr)) {
    const mm = parseInt(dateStr.slice(0, 2), 10) - 1;
    const yyyy = parseInt(dateStr.slice(2), 10);
    return new Date(yyyy, mm, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** Formats invoice number to SP-INV-XXXX format. */
export function formatInvoiceNumber(invoiceNumber?: string | null): string {
  if (!invoiceNumber) return '';
  const numericMatch = invoiceNumber.match(/\d+/);
  if (!numericMatch) return invoiceNumber;
  return `SP-INV-${numericMatch[0]}`;
}

interface DeductionReferenceInput {
  service_partner_deduction_id?: number | null;
  deduction_amount?: number | null;
  reimbursements_amount?: number | null;
}

/** Standard invoice/reference number for Service Partner Invoices: SP 000{ID}. */
export function formatDeductionReference(input: DeductionReferenceInput): string {
  const id = input.service_partner_deduction_id;
  if (!id) return '—';
  return `SP 000${id}`;
}

export function deductionTotals(deductions: Deduction[]): { deductions: number; reimbursements: number } {
  return {
    deductions: deductions.reduce((sum, d) => sum + d.deduction_amount, 0),
    reimbursements: deductions.reduce((sum, d) => sum + d.reimbursements_amount, 0),
  };
}
