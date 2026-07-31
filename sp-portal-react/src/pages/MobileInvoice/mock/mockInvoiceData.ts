import { Invoice } from '../types';

/**
 * Mock stand-in for the Next.js source's invoice endpoints
 * (`useInvoicesByUserLast12` + `/bff/invoices/:id/details`). Deterministic per
 * invoiceId (encoded as YYYYMM) so the list and the detail modal always agree.
 */

const ROUTES = ['R101', 'R204', 'R318', 'R422', 'R507', 'R619'];

export interface InvoiceLineItem {
  date: string;
  route: string;
  total: number;
}

export interface InvoiceDetailData {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  totalStops: number;
  hasVat: boolean;
  details: InvoiceLineItem[];
  deductions: {
    trafficPenalty: number;
    prePayment: number;
    other: number;
    liquidationDamage: number;
    fixDamage: number;
  };
  company: {
    companyName: string;
    companyStreet: string;
    companyEmail: string;
    companyVatNumber: string;
  };
  vendor: {
    name: string;
    vendorCode: string;
    vendorEmail: string;
  };
}

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return function next() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toInvoiceId(year: number, month: number): number {
  return year * 100 + (month + 1);
}

export function generateInvoiceList(): Invoice[] {
  const today = new Date();
  const invoices: Invoice[] = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const invoiceId = toInvoiceId(year, month);
    const rand = seededRandom(invoiceId);

    const lastDay = new Date(year, month + 1, 0);
    const daysWorked = 16 + Math.floor(rand() * 8);
    const totalPayment = daysWorked * (95 + rand() * 40);

    invoices.push({
      invoiceId,
      invoiceNumber: `${year}${pad(month + 1)}-AT01`,
      userCode: 'AT01',
      courier: 'Sam Carter',
      invoiceCreatedOn: lastDay.toISOString(),
      totalPayment: Math.round(totalPayment * 100) / 100,
      referenceDate: lastDay.toISOString(),
    });
  }

  return invoices;
}

export function generateInvoiceDetails(invoiceId: number): InvoiceDetailData {
  const year = Math.floor(invoiceId / 100);
  const month = (invoiceId % 100) - 1;
  const rand = seededRandom(invoiceId);

  const lastDay = new Date(year, month + 1, 0);
  const dueDate = new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 15);

  const daysWorked = 16 + Math.floor(rand() * 8);
  const details: InvoiceLineItem[] = [];
  for (let i = 0; i < daysWorked; i++) {
    const day = 1 + Math.floor(rand() * new Date(year, month + 1, 0).getDate());
    const date = new Date(year, month, day);
    details.push({
      date: date.toISOString(),
      route: ROUTES[Math.floor(rand() * ROUTES.length)],
      total: Math.round((85 + rand() * 50) * 100) / 100,
    });
  }
  details.sort((a, b) => a.date.localeCompare(b.date));

  const totalStops = details.length * (55 + Math.floor(rand() * 30));

  const hasDeduction = rand() > 0.55;
  const deductions = {
    trafficPenalty: hasDeduction && rand() > 0.5 ? Math.round(rand() * 40 * 100) / 100 : 0,
    prePayment: hasDeduction && rand() > 0.5 ? Math.round(rand() * 60 * 100) / 100 : 0,
    other: hasDeduction && rand() > 0.6 ? Math.round(rand() * 25 * 100) / 100 : 0,
    liquidationDamage: 0,
    fixDamage: hasDeduction && rand() > 0.7 ? Math.round(rand() * 90 * 100) / 100 : 0,
  };

  return {
    invoiceId,
    invoiceNumber: `${year}${pad(month + 1)}-AT01`,
    invoiceDate: lastDay.toISOString(),
    dueDate: dueDate.toISOString(),
    paymentTerms: 'Net 15',
    totalStops,
    hasVat: true,
    details,
    deductions,
    company: {
      companyName: 'DHL Service Partner Network',
      companyStreet: '1 Whitehall Road, London',
      companyEmail: 'accounts@dhl-network.example',
      companyVatNumber: 'GB123456789',
    },
    vendor: {
      name: 'Atlas Transport',
      vendorCode: 'AT01',
      vendorEmail: 'billing@atlas-transport.example',
    },
  };
}
