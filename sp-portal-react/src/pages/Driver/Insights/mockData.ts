import type { DailyPerformanceData } from './types';
import { formatDateISO } from './utils';

/**
 * No backend behind this page — the reference's `daily-performance-insight`
 * hit `bff/day-overview/{userId}/{date}?metrics=performance`. Here we stand
 * that endpoint up with deterministic seeded mock data so the same
 * driver+date always renders the same operation (same PRNG convention used
 * across the rest of this app, e.g. VendorPerformance.tsx / RequestsAdmin.tsx).
 */

/* ---------- deterministic PRNG helpers (same seed -> same data every render) ---------- */
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function minutesToTimeString(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${pad2(h)}:${pad2(mm)}:00`;
}

const DEPOTS = ['LSE', 'LCY', 'MSE'] as const;
const DEPOT_PREFIX: Record<(typeof DEPOTS)[number], string> = { LSE: 'LL', LCY: 'DY', MSE: 'MD' };

const VEHICLE_MODELS = ['Mercedes Sprinter Van', 'Ford Transit Van', 'Iveco Daily Cargo Van', 'Renault Master Van'];

const NOTES_POOL = [
  'Heavy traffic on the A406 delayed the morning collection.',
  'Vehicle inspection took longer than expected before departure.',
  'Customer requested a re-delivery window for stop 14.',
  'Road closure near the depot added ~20 minutes to the route.',
  '',
  '',
  '',
];

const DAY_OFF_NOTES = ['Day off - Rest day', 'Day off - Requested leave', 'Day off - Public holiday'];

function buildDayOffOperation(date: Date, rng: () => number): DailyPerformanceData {
  const iso = formatDateISO(date);
  const note = DAY_OFF_NOTES[Math.floor(rng() * DAY_OFF_NOTES.length)];
  return {
    operationId: 0,
    operationDate: iso,
    status: 'Day Off',
    note,
    dailyCash: { rate: 0, dailyServiceCharge: 0 },
    route: { routeId: 0, routeName: 'DAY OFF' },
    timeWindows: { percentageOnTime: 0 },
    deliveryDetails: {
      totalAfd: 0,
      paidStops: { pu: 0, ok: 0, hn: 0, pd: null },
      unpaidStops: { nr: 0, fp: 0, rd: 0, ba: 0, nh: 0, cm: 0, ca: 0 },
      departTime: null,
      arriveTime: null,
    },
    dailyMetrics: { totalStops: 0, sporh: 0, breakMinutes: 0 },
    isSpms: true,
  };
}

function buildWorkedOperation(driverUserId: number, date: Date, rng: () => number): DailyPerformanceData {
  const iso = formatDateISO(date);

  const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
  const routeNumber = 1 + Math.floor(rng() * 20);
  const routeName = `${DEPOT_PREFIX[depot]}${String(routeNumber).padStart(2, '0')}`;

  const departMinutes = 6 * 60 + Math.floor(rng() * 150); // 06:00-08:30
  const workMinutes = 420 + Math.floor(rng() * 180); // 7h-10h
  const breakMinutes = 15 + Math.floor(rng() * 31); // 15-45 min
  const arriveMinutes = departMinutes + workMinutes;

  const pu = 4 + Math.floor(rng() * 12);
  const ok = 20 + Math.floor(rng() * 60);
  const hn = Math.floor(rng() * 6);
  const pd = rng() < 0.5 ? Math.floor(rng() * 3) : null;

  const nr = Math.floor(rng() * 4);
  const fp = Math.floor(rng() * 3);
  const rd = Math.floor(rng() * 2);
  const ba = Math.floor(rng() * 2);
  const nh = Math.floor(rng() * 2);
  const cm = Math.floor(rng() * 3);
  const ca = Math.floor(rng() * 2);

  const totalStops = pu + ok + hn + (pd ?? 0) + nr + fp + rd + ba + nh + cm + ca;
  const percentageOnTime = 0.62 + rng() * 0.38; // 62%-100%

  const vehicleModel = VEHICLE_MODELS[Math.floor(rng() * VEHICLE_MODELS.length)];
  const plate = `${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(65 + Math.floor(rng() * 26))}${
    10 + Math.floor(rng() * 89)
  } ${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(
    65 + Math.floor(rng() * 26),
  )}`;

  const note = NOTES_POOL[Math.floor(rng() * NOTES_POOL.length)];
  const isSpms = rng() < 0.7;

  const totalFailedDeliveries = nr + fp + rd + ca + ba + nh + cm;
  const totalDeliveries = pu + ok + hn + (pd ?? 0) + totalFailedDeliveries;
  const totalAfd = totalDeliveries === 0 ? 0 : Math.round((totalFailedDeliveries / totalDeliveries) * 100);

  return {
    operationId: hashStringToSeed(`op-${driverUserId}-${iso}`)(),
    operationDate: iso,
    status: 'Completed',
    note,
    dailyCash: {
      rate: 120 + Math.floor(rng() * 40),
      dailyServiceCharge: 5 + Math.floor(rng() * 11),
    },
    route: { routeId: 1000 + routeNumber, routeName },
    timeWindows: { percentageOnTime },
    deliveryDetails: {
      totalAfd,
      paidStops: { pu, ok, hn, pd },
      unpaidStops: { nr, fp, rd, ba, nh, cm, ca },
      departTime: minutesToTimeString(departMinutes),
      arriveTime: minutesToTimeString(arriveMinutes),
    },
    dailyMetrics: { totalStops, sporh: 0, breakMinutes },
    vehicle: {
      vehicleId: 5000 + Math.floor(rng() * 900),
      vehicleModel,
      vehicleRegistrationPlate: plate,
    },
    isSpms,
  };
}

/**
 * Returns the (usually single-element) list of operations for a given driver
 * and calendar date. Empty array means "no data" — mirrors the reference's
 * 404/500 handling and matches how a future/not-yet-worked date would look.
 */
export function getPerformanceForDay(driverUserId: number, date: Date): DailyPerformanceData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() > today.getTime()) {
    return [];
  }

  const iso = formatDateISO(date);
  const rng = rngForSeed(`insights-${driverUserId}-${iso}`);
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const dayOffChance = isWeekend ? 0.85 : 0.06;

  if (rng() < dayOffChance) {
    return [buildDayOffOperation(date, rng)];
  }

  return [buildWorkedOperation(driverUserId, date, rng)];
}
