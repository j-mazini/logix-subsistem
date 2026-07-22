// Pure data/logic helpers ported 1:1 from sp-portal/daily-financial-insights/script.js's
// DailyFinancialInsightsApp class (deterministic PRNG-seeded mock rows, £ calculations,
// formatters). Kept as plain functions/constants so the page component can hold the
// per-day row cache as React state instead of class-instance fields.

/* ---------- deterministic PRNG helpers (kept in sync across renders:
   changing filters/period back and forth won't reshuffle already-seen data) ---------- */
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

export function rngForSeed(seedStr: string): () => number {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

/** £ currency, 2 decimals — mirrors utils.ts formatCurrency(). */
export function formatCurrency(value: number): string {
  return `£${(Number(value) || 0).toFixed(2)}`;
}

/** Parse a YYYY-MM-DD string as a local Date (no timezone shift). */
export function parseLocalDate(dateStr: string): Date {
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateISO: string, delta: number): string {
  const d = parseLocalDate(dateISO);
  d.setDate(d.getDate() + delta);
  return formatDateISO(d);
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '--';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatDateLong(dateStr?: string | null): string {
  if (!dateStr) return '--';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ==================== payment mode metadata ==================== */
export const PAYMENT_MODES = [
  { value: 'DR', label: 'DR' },
  { value: 'FSR', label: 'FSR' },
  { value: 'VSR', label: 'VSR' },
  { value: 'SP_VSR', label: 'SP_VSR' },
  { value: '1', label: 'DAF' },
  { value: '7', label: 'Hourly Rate' },
  { value: 'OFF', label: 'OFF' },
];
export const PAYMENT_MODE_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label]));
export const REQUIRED_RATE_MODES = new Set(['DR', 'FSR', '7']);
export const FLAT_RATE_MODES = new Set(['DR', '1']); // rate is a flat £ value, not £/stop

export interface Row {
  operationId: string;
  date: string;
  depot: string;
  vrm: string;
  courier: string;
  route: string;
  paymentMode: string;
  rate: number;
  stops: number;
  sort: number;
  adhoc: number;
  extras: number;
  notes: string;
  adhocServiceId: number | null;
}

/**
 * Row total — mirrors utils.ts calculateRow():
 * DR & DAF (cost model 1): rate + sort + adhoc + extras
 * FSR / VSR / SP_VSR / Hourly: rate * stops + sort + adhoc + extras
 * OFF: no operation, so no financials.
 */
export function calculateRow(row: Row): { total: number; avgPerStop: number } {
  if (row.paymentMode === 'OFF') return { total: 0, avgPerStop: 0 };
  const rate = row.rate || 0;
  const stops = row.stops || 0;
  const sort = row.sort || 0;
  const adhoc = row.adhoc || 0;
  const extras = row.extras || 0;
  const total = FLAT_RATE_MODES.has(row.paymentMode) ? rate + sort + adhoc + extras : rate * stops + sort + adhoc + extras;
  const avgPerStop = stops > 0 ? total / stops : 0;
  return { total, avgPerStop };
}

/** Total Paid Stops column — mirrors utils.ts calculateTotalPaidStops(). */
export function calculateTotalPaidStops(row: Row): number {
  if (row.paymentMode === 'OFF') return 0;
  if (FLAT_RATE_MODES.has(row.paymentMode)) return row.stops || 0;
  return (row.stops || 0) + (row.rate || 0);
}

export const MOCK_NOTES = [
  'Vehicle arrived late.',
  'Extra stop confirmed by depot.',
  'Route completed early.',
  'Traffic delay reported.',
  'Customer redelivery required.',
];

/* ==================== MASTER (mock) DATA ==================== */
export const DEPOTS = ['LCY', 'LSE', 'MSE', 'BAOP'];

export const ROUTES_BY_DEPOT: Record<string, string[]> = Object.fromEntries(
  DEPOTS.map((dep) => [dep, Array.from({ length: 4 }, (_, i) => `${dep}${i + 1}`)]),
);
export const ALL_ROUTES = DEPOTS.flatMap((dep) => ROUTES_BY_DEPOT[dep]);

const FIRST_NAMES = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
const LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
export const VENDORS = Array.from({ length: 12 }, (_, i) => ({
  userId: 2000 + i,
  fullName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
}));

function buildVehicles() {
  const rng = rngForSeed('dfi-vehicles-v1');
  return Array.from({ length: 16 }, (_, i) => {
    const letters = String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26));
    const nums = String(10 + Math.floor(rng() * 89));
    const tail =
      String.fromCharCode(65 + Math.floor(rng() * 26)) +
      String.fromCharCode(65 + Math.floor(rng() * 26)) +
      String.fromCharCode(65 + Math.floor(rng() * 26));
    return { vehicleId: 3000 + i, registrationPlates: `${letters}${nums} ${tail}` };
  });
}
export const VEHICLES = buildVehicles();

export const ADHOC_SERVICES = [
  { adhocServiceId: 1, adhocName: 'Extra Stop', adhocVendorPayment: 12 },
  { adhocServiceId: 2, adhocName: 'Redelivery', adhocVendorPayment: 9 },
  { adhocServiceId: 3, adhocName: 'Recovery', adhocVendorPayment: 24 },
  { adhocServiceId: 4, adhocName: 'Additional Collection', adhocVendorPayment: 15 },
  { adhocServiceId: 5, adhocName: 'Out of Hours Run', adhocVendorPayment: 32 },
];

/** Deterministic 15-40 mock rows for a given day — same seed always yields the same rows. */
export function generateRowsForDate(dateISO: string): Row[] {
  const rng = rngForSeed(`dfi-day-${dateISO}`);
  const count = 15 + Math.floor(rng() * 26); // 15-40 rows/day
  const rows: Row[] = [];

  for (let i = 0; i < count; i++) {
    const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
    const vendor = VENDORS[Math.floor(rng() * VENDORS.length)];
    const vehicle = VEHICLES[Math.floor(rng() * VEHICLES.length)];
    const route = ROUTES_BY_DEPOT[depot][Math.floor(rng() * ROUTES_BY_DEPOT[depot].length)];

    const roll = rng();
    let paymentMode: string;
    if (roll < 0.3) paymentMode = 'FSR';
    else if (roll < 0.5) paymentMode = 'VSR';
    else if (roll < 0.65) paymentMode = 'SP_VSR';
    else if (roll < 0.8) paymentMode = 'DR';
    else if (roll < 0.9) paymentMode = '1';
    else if (roll < 0.95) paymentMode = '7';
    else paymentMode = 'OFF';

    let rate = 0,
      stops = 0,
      sort = 0,
      extras = 0,
      adhoc = 0,
      adhocServiceId: number | null = null;

    if (paymentMode !== 'OFF') {
      if (paymentMode === 'DR' || paymentMode === '1') {
        rate = Math.round((100 + rng() * 80) * 100) / 100;
        stops = 60 + Math.floor(rng() * 100);
      } else if (paymentMode === '7') {
        rate = Math.round((12 + rng() * 6) * 100) / 100;
        stops = 6 + Math.floor(rng() * 5); // hours worked
      } else {
        // FSR / VSR / SP_VSR — rate is £/stop
        rate = Math.round((1.0 + rng() * 1.3) * 100) / 100;
        stops = 60 + Math.floor(rng() * 100);
      }

      sort = rng() < 0.6 ? Math.round(rng() * 32 * 100) / 100 : 0;
      extras = rng() < 0.3 ? Math.round((2 + rng() * 14) * 100) / 100 : 0;

      if (rng() < 0.2) {
        const svc = ADHOC_SERVICES[Math.floor(rng() * ADHOC_SERVICES.length)];
        adhocServiceId = svc.adhocServiceId;
        adhoc = svc.adhocVendorPayment;
      }
    }

    const notes = rng() < 0.25 ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '';

    rows.push({
      operationId: `${dateISO}-${i}`,
      date: dateISO,
      depot,
      vrm: vehicle.registrationPlates,
      courier: vendor.fullName,
      route,
      paymentMode,
      rate,
      stops,
      sort,
      adhoc,
      extras,
      notes,
      adhocServiceId,
    });
  }
  return rows;
}

export type SortField =
  | 'date'
  | 'vrm'
  | 'courier'
  | 'route'
  | 'paymentMode'
  | 'rate'
  | 'stops'
  | 'totalPaidStops'
  | 'sort'
  | 'adhoc'
  | 'extras'
  | 'total'
  | 'avgPerStop';

export const NUMERIC_SORT_FIELDS = new Set(['rate', 'stops', 'sort', 'adhoc', 'extras', 'total', 'avgPerStop', 'totalPaidStops']);

export function applySort(rows: Row[], sortField: SortField, sortDirection: 'asc' | 'desc'): Row[] {
  const dir = sortDirection === 'asc' ? 1 : -1;
  const valueFor = (row: Row, f: SortField): string | number => {
    if (f === 'total' || f === 'avgPerStop') return calculateRow(row)[f];
    if (f === 'totalPaidStops') return calculateTotalPaidStops(row);
    return row[f as keyof Row] as string | number;
  };
  return [...rows].sort((a, b) => {
    if (sortField === 'date') {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      if (da !== db) return dir * (da - db);
      return dir * (a.route || '').localeCompare(b.route || '');
    }
    if (NUMERIC_SORT_FIELDS.has(sortField)) {
      return dir * (((valueFor(a, sortField) as number) || 0) - ((valueFor(b, sortField) as number) || 0));
    }
    const av = String(valueFor(a, sortField) ?? '').toLowerCase();
    const bv = String(valueFor(b, sortField) ?? '').toLowerCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/** Mirrors dataProcessor.ts calculatePageTotals(). */
export function calculatePageTotals(rows: Row[]): { total: number; avg: number; count: number } {
  let total = 0;
  let totalStops = 0;
  rows.forEach((row) => {
    total += calculateRow(row).total || 0;
    totalStops += row.stops || 0;
  });
  const avg = totalStops > 0 ? total / totalStops : 0;
  return {
    total: Math.round(total * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    count: rows.length,
  };
}
