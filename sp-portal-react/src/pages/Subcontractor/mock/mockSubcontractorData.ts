import { format } from 'date-fns';
import { DayOverviewResponse } from '../types';

/**
 * Mock stand-in for the Next.js source's `/bff/day-overview/:userId/:date`
 * endpoint. Deterministic per date (same seeding approach as the other driver
 * pages' mocks) so re-selecting a day always shows the same numbers.
 */

const ROUTES = ['D101', 'L204', 'M318', 'D422', 'L507', 'M619'];

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return function next() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return h;
}

export function generateSubcontractorDay(date: Date): DayOverviewResponse[] {
  const dateKey = format(date, 'yyyy-MM-dd');
  const rand = seededRandom(hashSeed(dateKey));

  // Sundays and ~12% of other days are unworked (empty array => "no data" state).
  if (date.getDay() === 0 || rand() < 0.12) {
    return [];
  }

  const totalStops = 55 + Math.floor(rand() * 55);
  const nr = Math.floor(rand() * 4);
  const fp = Math.floor(rand() * 3);
  const ba = Math.floor(rand() * 2);
  const nh = Math.floor(rand() * 2);
  const cm = Math.floor(rand() * 2);
  const failedTotal = nr + fp + ba + nh + cm;
  const paidTotal = Math.max(0, totalStops - failedTotal);

  const routeName = ROUTES[Math.floor(rand() * ROUTES.length)];
  const initialHour = routeName.charAt(0) === 'L' ? 6 : 7;
  const initialMinute = routeName.charAt(0) === 'L' ? 45 : routeName.charAt(0) === 'M' ? 45 : 30;
  const workedMinutes = 390 + Math.floor(rand() * 210);
  const breakMinutes = 30;
  const arriveTotalMinutes = initialHour * 60 + initialMinute + workedMinutes + breakMinutes;
  const arriveHour = Math.floor(arriveTotalMinutes / 60) % 24;
  const arriveMinute = arriveTotalMinutes % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const rate = 1.2 + rand() * 0.5;
  const extra = Math.round(rand() * 15 * 100) / 100;
  const adhocSort = Math.round(rand() * 10 * 100) / 100;
  const routeSort = Math.round(rand() * 8 * 100) / 100;
  const totalPaidStops = Math.round(paidTotal * rate * 100) / 100;
  const total = Math.round((totalPaidStops + extra + adhocSort + routeSort) * 100) / 100;

  const operation: DayOverviewResponse = {
    operationId: hashSeed(dateKey) >>> 8,
    operationDate: dateKey,
    status: 'Completed',
    note: rand() > 0.75 ? 'Delivered with minor delay due to traffic on the ring road.' : null,
    dailyCash: {
      rate,
      extra,
      adhocSort,
      routeSort,
    },
    route: {
      routeId: hashSeed(dateKey) >>> 4,
      routeName,
    },
    timeWindows: {
      percentageOnTime: 0.72 + rand() * 0.26,
    },
    deliveryDetails: {
      totalAfd: failedTotal,
      paidStops: {
        pu: Math.floor(paidTotal * 0.4),
        ok: Math.floor(paidTotal * 0.45),
        hn: Math.floor(paidTotal * 0.1),
        pd: Math.floor(paidTotal * 0.05),
      },
      unpaidStops: { nr, fp, rd: 0, ba, nh, cm },
      departTime: `${pad(initialHour)}:${pad(initialMinute)}:00`,
      arriveTime: `${pad(arriveHour)}:${pad(arriveMinute)}:00`,
    },
    dailyMetrics: {
      totalStops,
      sporh: totalStops / (workedMinutes / 60),
      breakMinutes,
    },
    total,
    totalPaidStops,
    avgPerStops: paidTotal > 0 ? total / paidTotal : 0,
    isSpms: rand() > 0.3,
  };

  return [operation];
}
