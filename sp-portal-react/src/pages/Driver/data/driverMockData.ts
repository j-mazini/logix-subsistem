/**
 * Mocked data for the Driver Portal — no backend involved. Shapes mirror
 * the admin-side equivalents (RequestsAdmin's VendorRequest, Invoices' deduction
 * records) so the driver-facing views stay consistent with the rest of the app.
 */

export interface MockDriver {
  userId: number;
  fullName: string;
  vendorTypeId: number;
  servicePartnerId: number;
  servicePartnerName: string;
}

export const MOCK_DRIVER: MockDriver = {
  userId: 1042,
  fullName: 'Carlos Mendes',
  vendorTypeId: 1,
  servicePartnerId: 1,
  servicePartnerName: 'Swift Logistics',
};

/* ==================== Requests / History ==================== */

export type RequestType = 'DayOff' | 'HolyDay' | 'PrePayment';

export interface DriverRequest {
  vendorRequestId: number;
  requestType: RequestType;
  status: string;
  startDate: string | null;
  endDate: string | null;
  prePaymentValue: number | null;
  reason: string;
  notes: string;
  createdAt: string;
  updatedAt: string | null;
}

export function getRequestTypeLabel(requestType: RequestType): string {
  if (requestType === 'DayOff') return 'Day Off';
  if (requestType === 'HolyDay') return 'Holiday';
  if (requestType === 'PrePayment') return 'Pre-Payment';
  return requestType;
}

export function getStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected' || s === 'reproved') return 'rejected';
  return 'pending';
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const SEED_REQUESTS: DriverRequest[] = [
  {
    vendorRequestId: 9001,
    requestType: 'DayOff',
    status: 'approved',
    startDate: '2026-07-14',
    endDate: null,
    prePaymentValue: null,
    reason: 'Personal matters',
    notes: '',
    createdAt: '2026-07-01T09:12:00.000Z',
    updatedAt: '2026-07-02T11:00:00.000Z',
  },
  {
    vendorRequestId: 9002,
    requestType: 'PrePayment',
    status: 'rejected',
    startDate: null,
    endDate: null,
    prePaymentValue: 180,
    reason: 'Vehicle repair costs',
    notes: 'Please review urgently',
    createdAt: '2026-06-20T14:32:00.000Z',
    updatedAt: '2026-06-21T08:15:00.000Z',
  },
  {
    vendorRequestId: 9003,
    requestType: 'HolyDay',
    status: 'pending',
    startDate: '2026-08-10',
    endDate: '2026-08-17',
    prePaymentValue: null,
    reason: 'Annual leave',
    notes: '',
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: null,
  },
];

/* ==================== Invoices ==================== */

export interface DriverInvoice {
  id: string;
  period: string;
  amount: number;
  status: 'Invoiced' | 'Scheduled for Payment' | 'Paid';
  payDate: string | null;
}

export const MOCK_INVOICES: DriverInvoice[] = [
  { id: 'INV-2026007', period: 'Jul 2026', amount: 2140.5, status: 'Invoiced', payDate: null },
  { id: 'INV-2026006', period: 'Jun 2026', amount: 1985.2, status: 'Scheduled for Payment', payDate: '2026-07-17' },
  { id: 'INV-2026005', period: 'May 2026', amount: 2230.75, status: 'Paid', payDate: '2026-06-17' },
  { id: 'INV-2026004', period: 'Apr 2026', amount: 1876.4, status: 'Paid', payDate: '2026-05-17' },
];

/* ==================== Deductions ==================== */

export type DeductionCategory = 'Repairs & Damages' | 'Traffic Penalties' | 'Pre-Payments' | 'Liquidation Damages' | 'Other';

export const DED_CATEGORIES: DeductionCategory[] = ['Repairs & Damages', 'Traffic Penalties', 'Pre-Payments', 'Liquidation Damages', 'Other'];

export interface DriverDeduction {
  ref: string;
  amount: number;
  desc: string;
  inst: number;
  paid: number;
  cat: DeductionCategory;
  month: string; // 'YYYY-MM'
}

export const MOCK_DEDUCTIONS: DriverDeduction[] = [
  { ref: 'RPD-CMENDES-050726-002', amount: 295.0, desc: 'Rear bumper repair', inst: 3, paid: 1, cat: 'Repairs & Damages', month: '2026-07' },
  { ref: 'PRP-CMENDES-030726-001', amount: 850.0, desc: 'Fuel card advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2026-07' },
  { ref: 'TRF-CMENDES-090726-001', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2026-07' },
  { ref: 'OTH-CMENDES-140726-001', amount: 55.0, desc: 'ID card replacement', inst: 1, paid: 1, cat: 'Other', month: '2026-07' },
  { ref: 'RPD-CMENDES-100626-004', amount: 350.0, desc: 'Side mirror repair', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2026-06' },
  { ref: 'LQD-CMENDES-180626-002', amount: 460.0, desc: 'Route abandonment penalty', inst: 1, paid: 1, cat: 'Liquidation Damages', month: '2026-06' },
  { ref: 'PRP-CMENDES-220626-003', amount: 500.0, desc: 'Uniform advance', inst: 1, paid: 1, cat: 'Pre-Payments', month: '2026-06' },
];

export const gbp = (v: number) => '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
