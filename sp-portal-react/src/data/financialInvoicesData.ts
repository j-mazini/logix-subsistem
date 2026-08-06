// Mock data + local "CRUD" for the Financial Invoices page. Ported from the
// Next.js source's React Query hooks (useInvoicesByMonth/useInvoicesLast12/
// useServicePartners/fetchVendors), which all hit a real backend. This SPA
// has none, so we build one deterministic, seeded 12-month invoice dataset
// at module scope (same hashStringToSeed/mulberry32 pattern used in
// AdhocInvoiceManagement.tsx) and mutate a module-level array for "create".

function hashStringToSeed(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

export interface ServicePartner {
  servicePartnerId: number;
  partnerName: string;
}

export interface InvoiceVendor {
  userId: number;
  fullName: string;
  servicePartnerId: number;
}

export interface Invoice {
  invoiceId: number;
  invoiceNumber: string;
  courier: string;
  invoiceCreatedOn: string;
  totalPayment: number;
  referenceDate: string;
  totalStops?: number;
  servicePartnerName?: string;
  userId?: number;
}

export type SortField = 'invoiceNumber' | 'courier' | 'referenceDate' | 'invoiceCreatedOn' | 'totalPayment' | 'totalStops';
export type SortDirection = 'asc' | 'desc' | null;

export interface MonthOption {
  value: string;
  label: string;
  date: Date;
}

export const SERVICE_PARTNERS: ServicePartner[] = [
  { servicePartnerId: 1, partnerName: 'Swift Logistics' },
  { servicePartnerId: 2, partnerName: 'Kent Express' },
  { servicePartnerId: 3, partnerName: 'Medway Movers' },
];

const FIRST_NAMES = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca'];
const LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski'];

export const INVOICE_VENDORS: InvoiceVendor[] = (() => {
  return Array.from({ length: 10 }, (_, i) => ({
    userId: 2000 + i,
    fullName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
    servicePartnerId: SERVICE_PARTNERS[i % SERVICE_PARTNERS.length].servicePartnerId,
  }));
})();

function spName(spId: number): string {
  return SERVICE_PARTNERS.find((sp) => sp.servicePartnerId === spId)?.partnerName ?? '';
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateInvoicesForMonth(year: number, month: number): Invoice[] {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const rng = rngForSeed(`financial-invoices-${key}`);
  const invoices: Invoice[] = [];
  INVOICE_VENDORS.forEach((vendor, i) => {
    // Not every vendor invoices every month.
    if (rng() < 0.15) return;
    const day = 1 + Math.floor(rng() * 26);
    const referenceDate = formatDateISO(new Date(year, month - 1, day));
    const createdDay = Math.min(day + 1 + Math.floor(rng() * 3), 28);
    const invoiceCreatedOn = formatDateISO(new Date(year, month - 1, createdDay));
    const totalStops = 20 + Math.floor(rng() * 180);
    const totalPayment = Math.round((totalStops * (8 + rng() * 6)) * 100) / 100;
    const invoiceId = Number(`${year}${String(month).padStart(2, '0')}${String(vendor.userId).slice(-3)}`);
    invoices.push({
      invoiceId,
      invoiceNumber: `INV-${key}-${String(i + 1).padStart(3, '0')}`,
      courier: vendor.fullName,
      invoiceCreatedOn,
      totalPayment,
      referenceDate,
      totalStops,
      servicePartnerName: spName(vendor.servicePartnerId),
      userId: vendor.userId,
    });
  });
  return invoices;
}

/** Rolling last-12-months (current month + previous 11), oldest first is not required. */
function buildInitialInvoices(): Invoice[] {
  const now = new Date();
  const all: Invoice[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    all.push(...generateInvoicesForMonth(d.getFullYear(), d.getMonth() + 1));
  }
  return all;
}

// Module-level mutable store — mimics a tiny local "backend" so New/Multiple
// Invoice modals can append and have the list re-render immediately.
let invoiceStore: Invoice[] = buildInitialInvoices();
let nextManualId = 900000;

export function getAllInvoices(): Invoice[] {
  return invoiceStore;
}

export function addInvoice(invoice: Omit<Invoice, 'invoiceId'>): Invoice {
  const created: Invoice = { ...invoice, invoiceId: nextManualId++ };
  invoiceStore = [created, ...invoiceStore];
  return created;
}

export function addInvoices(invoices: Array<Omit<Invoice, 'invoiceId'>>): Invoice[] {
  const created = invoices.map((inv) => ({ ...inv, invoiceId: nextManualId++ }));
  invoiceStore = [...created, ...invoiceStore];
  return created;
}

/** true if an invoice already exists for this vendor + period (YYYY-MM). */
export function invoiceExistsForPeriod(courier: string, periodYYYYMM: string): boolean {
  return invoiceStore.some((inv) => inv.courier === courier && inv.referenceDate.slice(0, 7) === periodYYYYMM);
}

export function formatCurrency(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (n == null || Number.isNaN(n)) return '0.00';
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Rolling last-12-months option list, newest first, never showing future periods. */
export function getAvailableMonths(): MonthOption[] {
  const now = new Date();
  const options: MonthOption[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, date: d });
  }
  return options;
}
