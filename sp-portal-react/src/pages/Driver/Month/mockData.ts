// Deterministic seeded mock data for the Month page — no backend involved.
// The reference app's useCurrentMonthData/useDayDetails hooks called
// `/bff/daily-overview/list/:userId/:month/:year` and
// `/bff/daily-overview/:userId/:year/:month/:day`; here we generate the same
// shapes locally, keyed by (userId, ISO date) so a given day always produces
// the same operation whether it's read from the month list or the day-detail
// drill-down.
import type { DailyEarning, DailyOverview, MonthOverview, Operation, PaidStops, UnpaidStops, Vehicle } from './types';

/* ---------- deterministic PRNG helpers (same seed -> same data every render) ---------- */
function hashStringToSeed(str: string): () => number {
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
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string): () => number {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function minutesToTimeString(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${pad2(h)}:${pad2(mm)}:00`;
}

const VEHICLES: Vehicle[] = [
  { vehicleId: 501, vehicleModel: 'Ford Transit Custom', vehicleRegistrationPlate: 'LX21 FKD' },
  { vehicleId: 502, vehicleModel: 'Mercedes Sprinter', vehicleRegistrationPlate: 'LX22 MPS' },
];

const DEPOT_PREFIXES = ['LTN', 'MAN', 'BHX'];
const COST_MODELS = ['Standard Per Stop', 'Fixed Route Rate'];
const NOTES = [
  'Traffic delay reported near depot exit.',
  'Extra parcel drop requested by dispatch.',
  'Vehicle handover at midday for scheduled maintenance.',
];

interface DaySeed {
  operationId: number;
  routeId: number;
  routeName: string;
  amountTotal: number;
  totalStops: number;
  totalPaidStops: number;
  totalUnpaidStops: number;
  departTime: string;
  arriveTime: string;
  workedHours: string;
  breakMinutes: number;
  extra: number;
  adhocSort: number;
  routeSort: number;
  rate: number;
  operationCostModel: number;
  costModelName: string;
  status: string;
  vehicle: Vehicle;
  paidStops: PaidStops;
  unpaidStops: UnpaidStops;
  isSpms: boolean;
  note?: string;
}

/** Generates (or returns null for a day off / weekend) the single operation worked on a given ISO date. */
function generateDaySeed(userId: number, dateISO: string): DaySeed | null {
  const date = new Date(`${dateISO}T00:00:00`);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return null; // weekends off

  const rng = rngForSeed(`driver-month-op-${userId}-${dateISO}`);
  if (rng() < 0.08) return null; // occasional weekday off

  const vehicle = VEHICLES[Math.floor(rng() * VEHICLES.length)];
  const depot = DEPOT_PREFIXES[Math.floor(rng() * DEPOT_PREFIXES.length)];
  const routeNumber = 1 + Math.floor(rng() * 24);
  const routeId = 1000 + routeNumber * 3 + Math.floor(rng() * 50);
  const routeName = `${depot}${String(routeNumber).padStart(2, '0')}`;

  const departMinutes = 6 * 60 + Math.floor(rng() * 120); // 06:00-08:00
  const breakMinutes = 15 + Math.floor(rng() * 31); // 15-45 min
  const workMinutes = 420 + Math.floor(rng() * 180); // 7h-10h
  const arriveMinutes = departMinutes + workMinutes + breakMinutes;
  const departTime = minutesToTimeString(departMinutes);
  const arriveTime = minutesToTimeString(arriveMinutes);
  const workedHours = (workMinutes / 60).toFixed(2);

  const totalStops = 60 + Math.floor(rng() * 80); // 60-140
  const failedRatio = rng() * 0.12; // up to 12% failed
  const failedCount = Math.round(totalStops * failedRatio);
  const paidCount = totalStops - failedCount;

  const pu = Math.floor(paidCount * (0.35 + rng() * 0.15));
  const ok = Math.floor(paidCount * (0.3 + rng() * 0.15));
  const hn = Math.max(0, Math.floor(paidCount * 0.05));
  const pd = Math.max(0, paidCount - pu - ok - hn);
  const totalPaidStops = pu + ok + hn + pd;

  let remainingFailed = failedCount;
  const nr = Math.min(remainingFailed, Math.floor(failedCount * 0.3));
  remainingFailed -= nr;
  const fp = Math.min(remainingFailed, Math.floor(failedCount * 0.25));
  remainingFailed -= fp;
  const ba = Math.min(remainingFailed, Math.floor(failedCount * 0.2));
  remainingFailed -= ba;
  const nh = Math.min(remainingFailed, Math.floor(failedCount * 0.15));
  remainingFailed -= nh;
  const cm = Math.max(0, remainingFailed);
  const totalUnpaidStops = nr + fp + ba + nh + cm;

  const rate = Math.round((1.35 + rng() * 0.5) * 100) / 100; // per-stop base rate
  const adhocSort = rng() < 0.3 ? Math.round((5 + rng() * 20) * 100) / 100 : 0;
  const routeSort = rng() < 0.2 ? Math.round((3 + rng() * 10) * 100) / 100 : 0;
  const extra = rng() < 0.15 ? Math.round((5 + rng() * 15) * 100) / 100 : 0;

  const baseAmount = totalPaidStops * rate;
  const amountTotal = Math.round((baseAmount + adhocSort + routeSort + extra) * 100) / 100;

  const costModelIndex = Math.floor(rng() * COST_MODELS.length);
  const isSpms = rng() < 0.4;
  const note = rng() < 0.15 ? NOTES[Math.floor(rng() * NOTES.length)] : undefined;

  return {
    operationId: Math.floor(rng() * 900000) + 100000,
    routeId,
    routeName,
    amountTotal,
    totalStops,
    totalPaidStops,
    totalUnpaidStops,
    departTime,
    arriveTime,
    workedHours,
    breakMinutes,
    extra,
    adhocSort,
    routeSort,
    rate,
    operationCostModel: costModelIndex + 1,
    costModelName: COST_MODELS[costModelIndex],
    status: 'Completed',
    vehicle,
    paidStops: { pu, ok, hn, pd },
    unpaidStops: { nr, fp, rd: 0, ba, nh, cm },
    isSpms,
    note,
  };
}

function seedToOperation(seed: DaySeed): Operation {
  return {
    operationId: seed.operationId,
    routeId: seed.routeId,
    routeName: seed.routeName,
    amountTotal: seed.amountTotal.toFixed(2),
    totalStops: seed.totalStops,
    totalPaidStops: seed.totalPaidStops,
    totalUnpaidStops: seed.totalUnpaidStops,
    departTime: seed.departTime,
    arriveTime: seed.arriveTime,
    workedHours: seed.workedHours,
    breakMinutes: seed.breakMinutes,
    extra: seed.extra,
    adhocSort: seed.adhocSort,
    routeSort: seed.routeSort,
    rate: seed.rate,
    operationCostModel: seed.operationCostModel,
    costModelName: seed.costModelName,
    status: seed.status,
    vehicle: seed.vehicle,
  };
}

function seedToDailyOverview(seed: DaySeed, dateName: string): DailyOverview {
  return {
    ...seedToOperation(seed),
    dateName,
    paidStops: seed.paidStops,
    unpaidStops: seed.unpaidStops,
    isSpms: seed.isSpms,
    note: seed.note,
  };
}

function formatDateName(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

/**
 * Builds the month overview shown on the page (SummaryCard/InfoGrid/EarningsList).
 * Returns null for months after "today" (haven't happened yet — mirrors the
 * reference's 404-on-not-found behaviour) or months with zero worked days.
 */
export function buildMonthOverview(userId: number, year: number, month: number, today: Date): MonthOverview | null {
  const requestedMonthStart = new Date(year, month, 1);
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  if (requestedMonthStart.getTime() > todayMonthStart.getTime()) return null;

  const isCurrentMonth = requestedMonthStart.getTime() === todayMonthStart.getTime();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

  const dailyEarnings: DailyEarning[] = [];
  let total = 0;
  let totalPaidStops = 0;

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const iso = formatDateISO(date);
    const seed = generateDaySeed(userId, iso);
    if (!seed) continue;

    total += seed.amountTotal;
    totalPaidStops += seed.totalPaidStops;
    dailyEarnings.push({
      date: iso,
      dateName: formatDateName(date),
      amount: seed.amountTotal.toFixed(2),
      operations: [seedToOperation(seed)],
    });
  }

  const daysWorked = dailyEarnings.length;
  if (daysWorked === 0) return null;

  const monthName = new Date(year, month, 1).toLocaleString('en-GB', { month: 'long' });

  return {
    currentMonth: {
      name: monthName,
      daysWorked,
      totalPaidStops,
      total: Math.round(total * 100) / 100,
      avgPerStops: totalPaidStops > 0 ? Math.round((total / totalPaidStops) * 100) / 100 : 0,
      averagePerDay: daysWorked > 0 ? Math.round((total / daysWorked) * 100) / 100 : 0,
    },
    dailyEarnings,
  };
}

/** Builds the day-detail operations list (OperationCard array) for a clicked date. */
export function buildDayDetails(userId: number, dateISO: string, dateName: string): DailyOverview[] {
  const seed = generateDaySeed(userId, dateISO);
  if (!seed) return [];
  return [seedToDailyOverview(seed, dateName)];
}
