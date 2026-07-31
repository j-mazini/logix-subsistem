import { format } from 'date-fns';
import { DailyPerformanceData } from '../types';

/**
 * Mock stand-in for the Next.js source's `/bff/day-overview/*` endpoint.
 * Deterministic per date (same seeding approach as the other driver pages'
 * mocks) so re-selecting a day always shows the same numbers. Sundays are
 * generated as a day off, mirroring the source's day-off branch.
 */

const ROUTES = ['R101', 'R204', 'R318', 'R422', 'R507', 'R619'];
const VEHICLES = [
  { vehicleId: 1, vehicleModel: 'Ford Transit', vehicleRegistrationPlate: 'AT19 XLR' },
  { vehicleId: 2, vehicleModel: 'Mercedes Sprinter', vehicleRegistrationPlate: 'AT21 KPL' },
  { vehicleId: 3, vehicleModel: 'Cargo Bike', vehicleRegistrationPlate: 'AT-CB-04' },
];

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

export function generateDailyPerformance(date: Date): DailyPerformanceData[] {
  const dateKey = format(date, 'yyyy-MM-dd');

  if (date.getDay() === 0) {
    return [{
      operationId: hashSeed(dateKey) >>> 8,
      operationDate: dateKey,
      status: 'Day Off',
      note: 'Day off - Folga',
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
    }];
  }

  const rand = seededRandom(hashSeed(dateKey));

  const totalStops = 55 + Math.floor(rand() * 65);
  const nr = Math.floor(rand() * 4);
  const fp = Math.floor(rand() * 3);
  const ba = Math.floor(rand() * 2);
  const nh = Math.floor(rand() * 2);
  const cm = Math.floor(rand() * 2);
  const failedTotal = nr + fp + ba + nh + cm;
  const paidTotal = Math.max(0, totalStops - failedTotal);

  const departHour = 6 + Math.floor(rand() * 2);
  const departMinute = Math.floor(rand() * 60);
  const workedMinutes = 390 + Math.floor(rand() * 210);
  const breakMinutes = 30;
  const arriveTotalMinutes = departHour * 60 + departMinute + workedMinutes + breakMinutes;
  const arriveHour = Math.floor(arriveTotalMinutes / 60) % 24;
  const arriveMinute = arriveTotalMinutes % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return [{
    operationId: hashSeed(dateKey) >>> 8,
    operationDate: dateKey,
    status: 'Completed',
    note: rand() > 0.75 ? 'Delivered with minor delay due to traffic on the ring road.' : '',
    dailyCash: { rate: 1.3, dailyServiceCharge: 0 },
    route: { routeId: hashSeed(dateKey) >>> 4, routeName: ROUTES[Math.floor(rand() * ROUTES.length)] },
    timeWindows: { percentageOnTime: 0.72 + rand() * 0.26 },
    deliveryDetails: {
      totalAfd: failedTotal,
      paidStops: {
        pu: Math.floor(paidTotal * 0.4),
        ok: Math.floor(paidTotal * 0.45),
        hn: Math.floor(paidTotal * 0.1),
        pd: Math.floor(paidTotal * 0.05),
      },
      unpaidStops: { nr, fp, rd: 0, ba, nh, cm, ca: 0 },
      departTime: `${pad(departHour)}:${pad(departMinute)}:00`,
      arriveTime: `${pad(arriveHour)}:${pad(arriveMinute)}:00`,
    },
    dailyMetrics: {
      totalStops,
      sporh: totalStops / (workedMinutes / 60),
      breakMinutes,
    },
    vehicle: VEHICLES[Math.floor(rand() * VEHICLES.length)],
    isSpms: rand() > 0.3,
  }];
}
