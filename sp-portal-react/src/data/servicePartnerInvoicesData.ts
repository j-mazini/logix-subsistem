// Mock data + local "CRUD" for the Service Partner Invoices page. Ported
// from the Next.js source's useServicePartners/useServicePartnerInvoicesTable/
// useServicePartnerDeductions hooks (all backed by a real BFF). This SPA has
// no backend, so a deterministic, seeded dataset is built at module scope
// (same hashStringToSeed/mulberry32/rngForSeed pattern used in
// AdhocInvoiceManagement.tsx and financialInvoicesData.ts) and mutated via a
// module-level store for deductions/invoices "create/update/delete".
//
// NOTE: the porting brief pointed at src/data/financialInvoicesData.ts's
// SERVICE_PARTNERS as the canonical shape to align with, and at
// src/pages/FinancialInvoices/ as the closest sibling feature — neither
// exists in this worktree (this branch predates that page), so the partner
// list below is self-contained instead of importing it. Field names mirror
// what financialInvoicesData.ts's ServicePartner would export
// (servicePartnerId/partnerName) plus this page's own billing fields.
const BASE_SERVICE_PARTNERS = [
  { servicePartnerId: 1, partnerName: 'Swift Logistics' },
  { servicePartnerId: 2, partnerName: 'Kent Express' },
  { servicePartnerId: 3, partnerName: 'Medway Movers' },
];

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
  companyId: number;
  companyName: string;
  address: string | null;
  phone: string | null;
  vatNumber: string | null;
  dailyServiceCharge: number;
  reimbursement: number;
}

export interface InvoiceItem {
  operationId: number;
  routeName: string;
  note: string | null;
  totalStops: number;
  amount: number;
  date: string;
}

export interface Deduction {
  service_partner_deduction_id: number;
  service_partner_id: number;
  service_partner_name: string;
  company_id: number;
  reference_number: string;
  description: string;
  deduction_amount: number;
  reimbursements_amount: number;
  incident_date: string | null;
  entry_date: string | null;
  /** Set once a deduction has been folded into a generated invoice — mirrors the API's "paid" flag. */
  service_partner_invoice_id: number | null;
}

export interface Invoice {
  servicePartnerInvoiceId: number;
  servicePartnerId: number;
  servicePartnerName: string;
  companyName: string;
  /** MMYYYY, mirrors the Next.js DTO's `date` stamp. */
  date: string;
  invoiceNumber: string;
  itens: InvoiceItem[];
  deductions: Deduction[];
  amountTotal: number;
  totalDeductions: number;
  totalReimbursements: number;
  totalVat: number;
  netTotal: number;
  servicePartnerAddress: string | null;
  servicePartnerPhone: string | null;
  servicePartnerVatNumber: string | null;
}

const ADDRESSES = ['12 Riverside Way, Maidstone', '4 Orchard Business Park, Ashford', '88 Dockside Road, Chatham'];
const PHONES = ['01622 555 010', '01233 555 044', '01634 555 091'];
const VAT_NUMBERS: (string | null)[] = ['GB123456789', 'GB987654321', null];

export const SERVICE_PARTNERS: ServicePartner[] = BASE_SERVICE_PARTNERS.map((sp, i) => ({
  servicePartnerId: sp.servicePartnerId,
  partnerName: sp.partnerName,
  companyId: 100 + sp.servicePartnerId,
  companyName: sp.partnerName,
  address: ADDRESSES[i % ADDRESSES.length],
  phone: PHONES[i % PHONES.length],
  vatNumber: VAT_NUMBERS[i % VAT_NUMBERS.length],
  dailyServiceCharge: 2.5 + i * 0.5,
  reimbursement: 1 + i * 0.25,
}));

const ROUTE_NAMES = ['ME14-01', 'ME14-02', 'TN23-05', 'CT1-11', 'ME7-03', 'DA1-08', 'ME15-06', 'TN24-02'];
const NOTES: (string | null)[] = [null, 'Weekend cover', 'Extra loop', 'Holiday cover', null, 'Peak surcharge route'];

function periodKey(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}${year}`;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function generateItemsForPartner(sp: ServicePartner, month: number, year: number): InvoiceItem[] {
  const rng = rngForSeed(`sp-invoice-items-${sp.servicePartnerId}-${year}-${month}`);
  const count = 4 + Math.floor(rng() * 8);
  const dim = daysInMonth(month, year);
  const items: InvoiceItem[] = [];
  for (let i = 0; i < count; i++) {
    const day = 1 + Math.floor(rng() * dim);
    const totalStops = 20 + Math.floor(rng() * 60);
    const amount = Math.round(totalStops * (7.5 + rng() * 3) * 100) / 100;
    items.push({
      operationId: Number(`${year}${String(month).padStart(2, '0')}${sp.servicePartnerId}${String(i).padStart(2, '0')}`),
      routeName: ROUTE_NAMES[Math.floor(rng() * ROUTE_NAMES.length)],
      note: NOTES[Math.floor(rng() * NOTES.length)],
      totalStops,
      amount,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

let nextDeductionId = 1;
let deductionStore: Deduction[] = (() => {
  const rng = rngForSeed('sp-deductions-seed-v1');
  const out: Deduction[] = [];
  const now = new Date();
  SERVICE_PARTNERS.forEach((sp) => {
    if (rng() < 0.4) return;
    const id = nextDeductionId++;
    const isReimbursement = rng() < 0.35;
    out.push({
      service_partner_deduction_id: id,
      service_partner_id: sp.servicePartnerId,
      service_partner_name: sp.partnerName,
      company_id: sp.companyId,
      reference_number: `SP 000${id}`,
      description: isReimbursement ? 'Congestion charge reimbursement' : 'Damaged parcel deduction',
      deduction_amount: isReimbursement ? 0 : Math.round((15 + rng() * 60) * 100) / 100,
      reimbursements_amount: isReimbursement ? Math.round((5 + rng() * 20) * 100) / 100 : 0,
      incident_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-0${1 + Math.floor(rng() * 8)}`,
      entry_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-1${Math.floor(rng() * 8)}`,
      service_partner_invoice_id: null,
    });
  });
  return out;
})();

let invoiceStore: Invoice[] = [];
let nextInvoiceId = 1;

export function getServicePartners(): ServicePartner[] {
  return SERVICE_PARTNERS;
}

export function getServicePartner(id: number): ServicePartner | undefined {
  return SERVICE_PARTNERS.find((sp) => sp.servicePartnerId === id);
}

export function getDeductions(month?: number, year?: number, servicePartnerId?: number): Deduction[] {
  return deductionStore.filter((d) => {
    if (servicePartnerId && d.service_partner_id !== servicePartnerId) return false;
    if (month && year) {
      const key = periodKey(month, year);
      // Unattached deductions belong to every period until invoiced; attached
      // ones belong only to the period of the invoice they were folded into.
      if (d.service_partner_invoice_id) {
        const invoice = invoiceStore.find((inv) => inv.servicePartnerInvoiceId === d.service_partner_invoice_id);
        return invoice?.date === key;
      }
    }
    return true;
  });
}

export function createDeduction(
  input: Omit<Deduction, 'service_partner_deduction_id' | 'service_partner_name' | 'service_partner_invoice_id'>,
): Deduction {
  const sp = getServicePartner(input.service_partner_id);
  const created: Deduction = {
    ...input,
    service_partner_deduction_id: nextDeductionId++,
    service_partner_name: sp?.partnerName ?? '',
    service_partner_invoice_id: null,
  };
  deductionStore = [created, ...deductionStore];
  return created;
}

export function updateDeduction(id: number, patch: Partial<Deduction>): void {
  deductionStore = deductionStore.map((d) => (d.service_partner_deduction_id === id ? { ...d, ...patch } : d));
}

export function deleteDeduction(id: number): void {
  deductionStore = deductionStore.filter((d) => d.service_partner_deduction_id !== id);
}

function computeInvoiceForPartner(sp: ServicePartner, month: number, year: number): Invoice | null {
  const itens = generateItemsForPartner(sp, month, year);
  const unattached = deductionStore.filter((d) => d.service_partner_id === sp.servicePartnerId && !d.service_partner_invoice_id);
  const amountTotal = Math.round(itens.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const totalDeductions = Math.round(unattached.reduce((s, d) => s + d.deduction_amount, 0) * 100) / 100;
  const totalReimbursements = Math.round(unattached.reduce((s, d) => s + d.reimbursements_amount, 0) * 100) / 100;
  if (itens.length === 0 && unattached.length === 0) return null;
  const base = amountTotal - totalDeductions + totalReimbursements;
  const totalVat = sp.vatNumber ? Math.round(base * 0.2 * 100) / 100 : 0;
  const netTotal = Math.round((base + totalVat) * 100) / 100;
  return {
    servicePartnerInvoiceId: -1,
    servicePartnerId: sp.servicePartnerId,
    servicePartnerName: sp.partnerName,
    companyName: sp.companyName,
    date: periodKey(month, year),
    invoiceNumber: '',
    itens,
    deductions: unattached,
    amountTotal,
    totalDeductions,
    totalReimbursements,
    totalVat,
    netTotal,
    servicePartnerAddress: sp.address,
    servicePartnerPhone: sp.phone,
    servicePartnerVatNumber: sp.vatNumber,
  };
}

/** Preview (not persisted) of what generating an invoice for this partner/period would produce. */
export function previewInvoice(servicePartnerId: number, month: number, year: number): Invoice | null {
  const sp = getServicePartner(servicePartnerId);
  if (!sp) return null;
  return computeInvoiceForPartner(sp, month, year);
}

export function getInvoicesForMonth(month: number, year: number, servicePartnerId?: number): Invoice[] {
  const key = periodKey(month, year);
  return invoiceStore.filter((inv) => inv.date === key && (!servicePartnerId || inv.servicePartnerId === servicePartnerId));
}

export function getInvoiceById(id: number): Invoice | undefined {
  return invoiceStore.find((inv) => inv.servicePartnerInvoiceId === id);
}

/** Service partners that do not yet have a generated invoice for the given period. */
export function getUninvoicedPartners(month: number, year: number): ServicePartner[] {
  const key = periodKey(month, year);
  const invoicedIds = new Set(invoiceStore.filter((inv) => inv.date === key).map((inv) => inv.servicePartnerId));
  return SERVICE_PARTNERS.filter((sp) => !invoicedIds.has(sp.servicePartnerId));
}

export interface GenerateResult {
  created: number;
  failed: number;
  errors: { service_partner_id: number; error: string }[];
}

export function generateInvoices(servicePartnerIds: number[], month: number, year: number): GenerateResult {
  const result: GenerateResult = { created: 0, failed: 0, errors: [] };
  servicePartnerIds.forEach((id) => {
    const sp = getServicePartner(id);
    if (!sp) {
      result.failed++;
      result.errors.push({ service_partner_id: id, error: 'Service partner not found' });
      return;
    }
    const computed = computeInvoiceForPartner(sp, month, year);
    if (!computed) {
      result.failed++;
      result.errors.push({ service_partner_id: id, error: 'No billable stops or deductions found for this period' });
      return;
    }
    const invoiceId = nextInvoiceId++;
    const attachedDeductionIds = new Set(computed.deductions.map((d) => d.service_partner_deduction_id));
    deductionStore = deductionStore.map((d) =>
      attachedDeductionIds.has(d.service_partner_deduction_id) ? { ...d, service_partner_invoice_id: invoiceId } : d,
    );
    const invoice: Invoice = {
      ...computed,
      servicePartnerInvoiceId: invoiceId,
      invoiceNumber: String(invoiceId),
      deductions: computed.deductions.map((d) => ({ ...d, service_partner_invoice_id: invoiceId })),
    };
    invoiceStore = [invoice, ...invoiceStore];
    result.created++;
  });
  return result;
}
