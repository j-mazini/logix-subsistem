import { DailyEarning, DailyOverview, MonthOverview, Operation, Vehicle } from '../types';

/**
 * Mock stand-in for the Next.js source's `/bff/daily-overview/*` endpoints.
 * This subsystem has no backend, so month/day data is generated
 * deterministically from the date instead of fetched — same seed always
 * produces the same numbers, so the month list and the day drill-down agree.
 */

const ROUTES = ['R101', 'R204', 'R318', 'R422', 'R507', 'R619'];
const VEHICLES: Vehicle[] = [
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

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function toDateName(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function isWorkedDay(rand: () => number, dayOfWeek: number): boolean {
  // Sundays off; ~85% chance of working any other day.
  if (dayOfWeek === 0) return false;
  return rand() < 0.85;
}

function buildOperation(dateKey: string, rand: () => number): Operation {
  const totalStops = 60 + Math.floor(rand() * 60);
  const totalPaidStops = totalStops - Math.floor(rand() * 4);
  const rate = 1.1 + rand() * 0.6;
  const extra = Math.round(rand() * 15 * 100) / 100;
  const adhocSort = Math.round(rand() * 10 * 100) / 100;
  const routeSort = Math.round(rand() * 8 * 100) / 100;
  const base = totalPaidStops * rate;
  const amountTotal = (base + extra + adhocSort + routeSort).toFixed(2);
  const workedHours = (7 + rand() * 3).toFixed(2);
  const vehicle = VEHICLES[Math.floor(rand() * VEHICLES.length)];

  return {
    operationId: hashSeed(dateKey) >>> 8,
    routeId: hashSeed(dateKey) >>> 4,
    routeName: ROUTES[Math.floor(rand() * ROUTES.length)],
    amountTotal,
    totalStops,
    totalPaidStops,
    totalUnpaidStops: totalStops - totalPaidStops,
    departTime: '06:30:00',
    arriveTime: '15:45:00',
    workedHours,
    breakMinutes: 30,
    extra,
    adhocSort,
    routeSort,
    rate: Math.round(rate * 100) / 100,
    operationCostModel: 1,
    costModelName: 'Standard',
    status: 'Completed',
    vehicle,
  };
}

export function generateMonthOverview(year: number, month: number): MonthOverview {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyEarnings: DailyEarning[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, month, day);
    const dayOfWeek = new Date(year, month, day).getDay();
    const rand = seededRandom(hashSeed(dateKey));

    if (!isWorkedDay(rand, dayOfWeek)) continue;

    const operation = buildOperation(dateKey, rand);

    dailyEarnings.push({
      date: dateKey,
      dateName: toDateName(year, month, day),
      amount: operation.amountTotal,
      operations: [operation],
    });
  }

  const total = dailyEarnings.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const totalPaidStops = dailyEarnings.reduce(
    (sum, d) => sum + (d.operations?.[0]?.totalPaidStops || 0),
    0
  );
  const daysWorked = dailyEarnings.length;

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

export function generateDayOperations(date: string, dateName: string): DailyOverview[] {
  const rand = seededRandom(hashSeed(date));
  const operation = buildOperation(date, rand);

  const paidStops = {
    pu: Math.floor(operation.totalPaidStops * 0.4),
    ok: Math.floor(operation.totalPaidStops * 0.45),
    hn: Math.floor(operation.totalPaidStops * 0.1),
    pd: Math.floor(operation.totalPaidStops * 0.05),
  };

  const overview: DailyOverview = {
    ...operation,
    dateName,
    paidStops,
    unpaidStops: {
      nr: Math.max(0, operation.totalUnpaidStops - 2),
      fp: 1,
      rd: 1,
      ba: 0,
      nh: 0,
      cm: 0,
    },
    isSpms: rand() > 0.5,
    note: rand() > 0.7 ? 'Delivered with minor delay due to traffic on the ring road.' : undefined,
  };

  return [overview];
}
