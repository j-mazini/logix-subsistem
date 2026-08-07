import { MOCK_DRIVER } from '../data/driverMockData';
import type { Invoice, InvoiceLineItem } from './types';

/**
 * No backend in this project — the reference's `useMobileInvoices` hook calls a
 * real `useInvoicesByUserLast12` query. Here we generate deterministic
 * "last 12 months" mock invoices instead, using the same seeded-PRNG pattern
 * used by RequestsAdmin.tsx / VendorPerformance.tsx elsewhere in this app.
 */
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

/** Builds the last 12 reference months (oldest first), anchored to "today". */
function last12Months(): { year: number; month: number }[] {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0');
}

/** Deterministically generates the current driver's mocked invoices for the last 12 months. */
export function generateMockInvoices(): Invoice[] {
  const rng = rngForSeed(`driver-invoices-v1-${MOCK_DRIVER.userId}`);
  const months = last12Months();
  const userCode = `DRV${MOCK_DRIVER.userId}`;

  return months.map(({ year, month }, index) => {
    // Reference date: 1st of the following month (invoices settle a month behind).
    const referenceDate = new Date(year, month + 1, 1).toISOString();
    // Invoice created a few days into the reference month.
    const createdOn = new Date(year, month + 1, 3 + Math.floor(rng() * 4)).toISOString();
    const totalPayment = Math.round((1600 + rng() * 1300) * 100) / 100;
    const invoiceNumber = `${year}${pad(month + 1)}-${pad(index + 1, 3)}`;

    return {
      invoiceId: 500000 + MOCK_DRIVER.userId * 100 + index,
      invoiceNumber,
      userCode,
      courier: MOCK_DRIVER.fullName,
      invoiceCreatedOn: createdOn,
      totalPayment,
      referenceDate,
    };
  });
}

/** Deterministically generates the breakdown line items shown in an invoice's detail view. */
export function generateInvoiceLineItems(invoice: Invoice): InvoiceLineItem[] {
  const rng = rngForSeed(`driver-invoice-lines-v1-${invoice.invoiceId}`);
  const rowCount = 4 + Math.floor(rng() * 4);
  const descriptions = ['Route delivery run', 'Weekend collection round', 'Express same-day drop', 'Standard delivery route', 'Overflow support shift'];
  const base = new Date(invoice.referenceDate);

  const rows: InvoiceLineItem[] = [];
  let runningTotal = 0;

  for (let i = 0; i < rowCount; i++) {
    const day = 1 + Math.floor(rng() * 27);
    const date = new Date(base.getFullYear(), base.getMonth() - 1, day).toISOString();
    const stops = 20 + Math.floor(rng() * 60);
    const rate = Math.round((90 + rng() * 60) * 100) / 100;
    const extra = Math.round(rng() * 25 * 100) / 100;
    const total = Math.round((rate + extra) * 100) / 100;
    runningTotal += total;

    rows.push({
      date,
      description: descriptions[i % descriptions.length],
      stops,
      rate,
      extra,
      total,
    });
  }

  // Scale rows so their sum matches the invoice total exactly (keeps the modal's
  // "total" line consistent with the amount shown on the list row).
  const scale = runningTotal > 0 ? invoice.totalPayment / runningTotal : 1;
  return rows.map((row) => ({
    ...row,
    rate: Math.round(row.rate * scale * 100) / 100,
    extra: Math.round(row.extra * scale * 100) / 100,
    total: Math.round(row.total * scale * 100) / 100,
  }));
}
