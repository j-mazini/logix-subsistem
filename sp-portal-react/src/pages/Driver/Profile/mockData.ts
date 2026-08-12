import { format } from 'date-fns';
import type { DayOverviewResponse } from './types';
import { SEED_REQUESTS } from '../data/driverMockData';

/**
 * No backend here — the reference app's useSubcontractorData hook called
 * `${NEXT_PUBLIC_API_URL}/bff/day-overview/{userId}/{date}`. We replace that
 * with deterministic seeded mock data so the same driver + date always
 * renders the same "day overview", matching the seeded-mock convention used
 * across this codebase (see RequestsAdmin.tsx / VendorPerformance.tsx).
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

const ROUTES_STANDARD = ['D1', 'D2', 'D3', 'D4', 'D12', 'L1', 'L2', 'L3', 'M1', 'M2', 'M3'];
const ROUTES_NO_STOPS = ['B1', 'B2', 'S1', 'S2', 'O1'];

const NOTE_POOL = [
  'Traffic delay on A406 - arrived 20 min late to depot.',
  'Vehicle inspection required before route start.',
  'Customer requested redelivery for parcel #4471.',
  'Heavy rain slowed drop-offs in the afternoon.',
  'Covered an extra zone for a colleague on leave.',
];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.floor(totalMinutes % 60);
  return `${pad2(h)}:${pad2(m)}:00`;
}

function findApprovedDayOff(dateStr: string): boolean {
  return SEED_REQUESTS.some(
    (r) => r.requestType === 'DayOff' && r.status === 'approved' && r.startDate === dateStr
  );
}

let operationIdCounter = 900000;

/** Builds the (0 or 1 element) list of operations for a single calendar day, mirroring
 *  the shape the BFF's /day-overview endpoint used to return. */
export function generateDayOverview(date: Date, userId: number, fullName: string): DayOverviewResponse[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  const rng = rngForSeed(`driver-profile-${userId}-${dateStr}`);
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;

  // Future dates: no data yet, same as a real backend that only has data up to today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  if (compareDate.getTime() > today.getTime()) {
    return [];
  }

  const approvedDayOff = findApprovedDayOff(dateStr);
  const randomDayOffRoll = rng();
  const isDayOffDay = approvedDayOff || (isWeekend ? randomDayOffRoll < 0.72 : randomDayOffRoll < 0.06);

  operationIdCounter += 1;
  const operationId = operationIdCounter;

  if (isDayOffDay) {
    return [
      {
        operationId,
        userId,
        fullName,
        operationDate: dateStr,
        status: 'Day Off',
        note: approvedDayOff ? 'Approved day off request.' : null,
        dailyCash: { rate: null, dailyServiceCharge: 0, extra: 0, adhocSort: 0, routeSort: 0 },
        route: { routeId: 0, routeName: 'DAY OFF' },
        timeWindows: { percentageOnTime: 0 },
        deliveryDetails: {
          totalAfd: 0,
          paidStops: { pu: 0, ok: 0, hn: 0, pd: 0 },
          unpaidStops: { nr: 0, fp: 0, rd: 0, ba: 0, nh: 0, cm: 0, ca: 0 },
          departTime: null,
          arriveTime: null,
        },
        dailyMetrics: { totalStops: 0, sporh: 0, breakMinutes: 0 },
        avgPerStops: 0,
        total: 0,
        totalPaidStops: 0,
        isSpms: true,
      },
    ];
  }

  const pool = isWeekend ? ROUTES_NO_STOPS : rng() < 0.85 ? ROUTES_STANDARD : ROUTES_NO_STOPS;
  const routeName = pool[Math.floor(rng() * pool.length)];
  const firstChar = routeName.charAt(0);

  const startMinutes =
    firstChar === 'D' ? 7 * 60 + 30 : firstChar === 'L' ? 6 * 60 + 45 : firstChar === 'M' ? 7 * 60 + 45 : 7 * 60 + 30;

  const totalStops = firstChar === 'B' || firstChar === 'S' || firstChar === 'O'
    ? Math.floor(40 + rng() * 30)
    : Math.floor(70 + rng() * 70);

  const breakMinutes = Math.floor(20 + rng() * 30);
  const workedMinutes = Math.floor(totalStops * (3.6 + rng() * 1.4)) + breakMinutes;
  const departTime = minutesToTime(startMinutes);
  const arriveTime = minutesToTime(startMinutes + workedMinutes);

  const pu = Math.floor(totalStops * (0.55 + rng() * 0.15));
  const ok = Math.floor(totalStops * (0.15 + rng() * 0.1));
  const hn = Math.floor(totalStops * (0.05 + rng() * 0.08));
  const pd = Math.floor(totalStops * (0.03 + rng() * 0.05));
  const nr = Math.floor(rng() * 4);
  const fp = Math.floor(rng() * 3);
  const rd = Math.floor(rng() * 2);
  const ba = Math.floor(rng() * 2);
  const nh = Math.floor(rng() * 3);
  const cm = Math.floor(rng() * 2);

  const baseRatePerStop = 1.15 + rng() * 0.35;
  const totalPaidStops = Math.round((pu + ok + hn + pd) * baseRatePerStop * 100) / 100;
  const adhocExtra = rng() < 0.6 ? Math.round(rng() * 35 * 100) / 100 : 0;
  const total = Math.round((totalPaidStops + adhocExtra) * 100) / 100;

  const isSpms = rng() < 0.82;
  const hasNote = rng() < 0.3;
  const note = hasNote ? NOTE_POOL[Math.floor(rng() * NOTE_POOL.length)] : null;

  return [
    {
      operationId,
      userId,
      fullName,
      operationDate: dateStr,
      status: 'Completed',
      note,
      dailyCash: {
        rate: baseRatePerStop,
        dailyServiceCharge: 0,
        extra: adhocExtra,
        adhocSort: 0,
        routeSort: 0,
      },
      route: { routeId: Math.floor(rng() * 900) + 100, routeName },
      timeWindows: { percentageOnTime: Math.round((70 + rng() * 30) * 10) / 10 },
      deliveryDetails: {
        totalAfd: totalStops,
        paidStops: { pu, ok, hn, pd },
        unpaidStops: { nr, fp, rd, ba, nh, cm, ca: 0 },
        departTime,
        arriveTime,
      },
      dailyMetrics: { totalStops, sporh: Math.round((totalStops / (workedMinutes / 60)) * 10) / 10, breakMinutes },
      avgPerStops: totalStops > 0 ? Math.round((total / totalStops) * 100) / 100 : 0,
      total,
      totalPaidStops,
      isSpms,
    },
  ];
}
