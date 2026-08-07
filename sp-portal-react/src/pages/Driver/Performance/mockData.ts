/**
 * No backend in this Driver Portal — replaces the reference app's
 * useCurrentPerformanceData (real `/bff/daily-overview/list/...` fetch +
 * dataProcessor.processMonthData) with deterministic seeded mock data.
 *
 * Metric definitions/labels (Stops, SPOR-H, TW, SPR) and the day-skipping
 * rules (Sundays hidden entirely, future days shown as '--:--') are ported
 * 1:1 from the reference's dataProcessor.ts — that's the source of truth for
 * what this page displays. The PRNG + per-day generation mechanics are
 * adapted from src/pages/VendorPerformance/VendorPerformance.tsx, which
 * already proves out this exact domain (stops/hour, on-time %, routes) in
 * this codebase.
 */

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

/* ==================== shapes (ported from dataProcessor.ts's DayData) ==================== */
export interface DayData {
  day: number;
  dayOfWeek: number;
  route: string;
  stops: number | string;
  sporH: string;
  tw: string;
  spr: number | string;
}

export interface Averages {
  avgTw: string;
  avgSpr: string;
  avgSporH: string;
}

const NA_ROW = (day: number, dayOfWeek: number): DayData => ({
  day,
  dayOfWeek,
  route: '--:--',
  stops: '--:--',
  sporH: '--:--',
  tw: '--:--',
  spr: '--:--',
});

/** Route-code prefix derived from the driver's service partner name, e.g. "Swift Logistics" -> "SL". */
function routePrefixFromServicePartner(servicePartnerName: string): string {
  const initials = servicePartnerName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (initials || 'RT').slice(0, 2);
}

/**
 * Generates one calendar month of daily-performance rows for a driver,
 * mirroring dataProcessor.processMonthData: Sundays are skipped entirely,
 * days after "today" (or any day in a future month) render as '--:--', and
 * a small fraction of past weekdays are days-off (also '--:--') to exercise
 * the empty-state / averaging-skip logic.
 */
export function generateMonthData(
  driverId: number,
  servicePartnerName: string,
  year: number,
  month: number,
  today: Date,
): DayData[] {
  const data: DayData[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const isFutureMonth = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const routePrefix = routePrefixFromServicePartner(servicePartnerName);

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) continue; // Sundays: no row at all

    if (isFutureMonth || (isCurrentMonth && day > today.getDate())) {
      data.push(NA_ROW(day, dayOfWeek));
      continue;
    }

    const iso = formatDateISO(d);
    const rng = rngForSeed(`driver-perf-${driverId}-${iso}`);

    if (rng() < 0.12) {
      // ~12% of worked days are a day off — kept in the table to exercise the
      // '--:--' display + averaging-skip logic, same as the reference.
      data.push(NA_ROW(day, dayOfWeek));
      continue;
    }

    const routeNumber = 1 + Math.floor(rng() * 40);
    const route = `${routePrefix}${String(routeNumber).padStart(2, '0')}`;

    const workMinutes = 480 + Math.floor(rng() * 150); // 8h-10.5h
    const breakMinutes = 15 + Math.floor(rng() * 31); // 15-45 min
    const onRoadHours = Math.max(0, (workMinutes - breakMinutes) / 60);
    const totalStops = 70 + Math.floor(rng() * 90); // 70-160
    const sporH = onRoadHours > 0 ? (totalStops / onRoadHours).toFixed(1) : '0.0';

    const percentageOnTime = 0.55 + rng() * 0.45;
    const tw = `${(percentageOnTime * 100).toFixed(1)}%`;

    data.push({
      day,
      dayOfWeek,
      route,
      stops: totalStops,
      sporH,
      tw,
      // The reference's dataProcessor assigns SPR the same aggregate total-stops
      // value as `stops` (see calculateAverages/processMonthData) — kept 1:1.
      spr: totalStops,
    });
  }

  return data;
}

/** Ported 1:1 from dataProcessor.ts's calculateAverages. */
export function calculateAverages(data: DayData[]): Averages {
  let totalSporH = 0,
    countSporH = 0;
  let totalTw = 0,
    countTw = 0;
  let totalSpr = 0,
    countSpr = 0;

  data.forEach((d) => {
    const sprValue = d.spr === '--:--' ? NaN : typeof d.spr === 'number' ? d.spr : parseFloat(d.spr);
    const hasStops = !isNaN(sprValue) && sprValue > 0;
    if (!hasStops) return;

    totalSpr += sprValue;
    countSpr++;

    if (d.sporH !== '--:--') {
      const v = parseFloat(d.sporH);
      if (!isNaN(v)) {
        totalSporH += v;
        countSporH++;
      }
    }

    if (d.tw !== '--:--') {
      const v = parseFloat(d.tw);
      if (!isNaN(v)) {
        totalTw += v;
        countTw++;
      }
    }
  });

  if (countSporH === 0 && countTw === 0 && countSpr === 0 && data.length > 0) {
    return { avgSporH: '--:--', avgTw: '--:--', avgSpr: '--:--' };
  }

  const avgSporH = countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--';
  const avgTw = countTw > 0 ? (totalTw / countTw).toFixed(1) : '--:--';
  const avgSpr = countSpr > 0 ? Math.round(totalSpr / countSpr) : '--:--';

  return {
    avgTw: avgTw !== '--:--' ? avgTw + '%' : '--:--',
    avgSpr: avgSpr.toString(),
    avgSporH,
  };
}
