import { DailyOverview, MonthOverview } from '../dataProcessor';

/**
 * Mock stand-in for the Next.js source's `/bff/daily-overview/list/*` endpoint.
 * Same seeding approach as CurrentMonth's mock: deterministic per (year, month, day)
 * so re-selecting a month always shows the same numbers.
 */

const ROUTES = ['R101', 'R204', 'R318', 'R422', 'R507', 'R619'];

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

function isWorkedDay(rand: () => number, dayOfWeek: number): boolean {
  if (dayOfWeek === 0) return false;
  return rand() < 0.85;
}

function buildOperation(dateKey: string, dateName: string, rand: () => number): DailyOverview {
  const totalStops = 55 + Math.floor(rand() * 65);
  const totalPaidStops = totalStops - Math.floor(rand() * 4);
  const workedHours = 6.5 + rand() * 3.5;
  const percentageOnTime = 72 + rand() * 26;

  return {
    operationId: hashSeed(dateKey) >>> 8,
    routeId: hashSeed(dateKey) >>> 4,
    routeName: ROUTES[Math.floor(rand() * ROUTES.length)],
    amountTotal: (totalPaidStops * 1.3).toFixed(2),
    totalStops,
    totalPaidStops,
    totalUnpaidStops: totalStops - totalPaidStops,
    departTime: '06:30:00',
    arriveTime: '15:45:00',
    workedHours,
    breakMinutes: 30,
    extra: 0,
    adhocSort: 0,
    routeSort: 0,
    rate: 1.3,
    operationCostModel: 1,
    costModelName: 'Standard',
    status: 'Completed',
    dateName,
    percentageOnTime,
    sporh: totalStops / workedHours,
  };
}

export function generatePerformanceMonthOverview(year: number, month: number): MonthOverview {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyEarnings: MonthOverview['dailyEarnings'] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, month, day);
    const dayOfWeek = new Date(year, month, day).getDay();
    const rand = seededRandom(hashSeed(dateKey));

    if (!isWorkedDay(rand, dayOfWeek)) continue;

    const dateName = new Date(year, month, day).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    const operation = buildOperation(dateKey, dateName, rand);

    dailyEarnings.push({
      date: dateKey,
      dateName,
      amount: operation.amountTotal,
      operations: [operation],
    });
  }

  const daysWorked = dailyEarnings.length;
  const total = dailyEarnings.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const monthName = new Date(year, month, 1).toLocaleString('en-GB', { month: 'long' });

  return {
    currentMonth: {
      name: monthName,
      daysWorked,
      totalAmount: total.toFixed(2),
      averagePerDay: daysWorked > 0 ? (total / daysWorked).toFixed(2) : '0.00',
    },
    dailyEarnings,
  };
}
