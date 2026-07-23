import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import '../../styles/legacy/vendor-performance.css';

/* =====================================================
   Vendor Performance — ported 1:1 from
   sp-portal/vendor-performance/script.js (vanilla JS, class-based,
   deterministic mock/simulated data, no backend / no window.DHL_MOCK_DATA).
   Metric formulas ported 1:1 from lib/performance-utils.ts (via script.js).
   Averaging logic ported 1:1 from PerformanceDetailView.tsx (via script.js).
   ===================================================== */

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
  return `${pad2(h)}:${pad2(mm)}`;
}

/* ==================== performance-utils.ts port ==================== */
interface OperationLike {
  deliveryDetails: {
    paidStops: { pu: number; ok: number; hn: number; pd?: number };
    unpaidStops: { nr: number; fp: number; rd: number; ca: number; ba: number; nh: number; cm: number };
    departTime: string | null;
    arriveTime: string | null;
  };
  dailyMetrics: { breakMinutes?: number };
}

/** SPR (Stops Per Route) = total paid stops + total unpaid stops. */
function calculateSPR(operation: OperationLike): number {
  const paidStops = operation.deliveryDetails.paidStops;
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalPaidStops = paidStops.pu + paidStops.ok + paidStops.hn + (paidStops.pd || 0);
  const totalUnpaidStops =
    unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  return totalPaidStops + totalUnpaidStops;
}

/** SPOR-H (Stops Per Hour). */
function calculateSPORH(operation: OperationLike): number {
  const departTime = operation.deliveryDetails.departTime;
  const arriveTime = operation.deliveryDetails.arriveTime;

  if (!departTime || !arriveTime) return 0;

  const departTimeMinutes = parseInt(departTime.split(':')[0], 10) * 60 + parseInt(departTime.split(':')[1], 10);
  const arriveTimeMinutes = parseInt(arriveTime.split(':')[0], 10) * 60 + parseInt(arriveTime.split(':')[1], 10);

  if (isNaN(departTimeMinutes) || isNaN(arriveTimeMinutes)) return 0;

  let workTimeMinutes = arriveTimeMinutes - departTimeMinutes;
  if (workTimeMinutes < 0) workTimeMinutes += 24 * 60;

  const breakMinutes = operation.dailyMetrics.breakMinutes || 0;
  const effectiveWorkMinutes = workTimeMinutes - breakMinutes;

  if (effectiveWorkMinutes <= 0) return 0;

  const totalStops = calculateSPR(operation);
  return (totalStops / effectiveWorkMinutes) * 60;
}

/** AFD (Attempted Failed Deliveries) percentage, with custom rounding rules. */
function calculateAFD(operation: OperationLike): number {
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalFailedDeliveries =
    unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  const spr = calculateSPR(operation);
  const totalDeliveries = spr + totalFailedDeliveries;

  if (totalDeliveries === 0) return 0;

  const percentage = (totalFailedDeliveries / totalDeliveries) * 100;

  const decimalPart = percentage - Math.floor(percentage);
  const decimalAsInt = Math.round(decimalPart * 100);

  if (decimalAsInt <= 10) {
    return Math.floor(percentage);
  } else {
    return Math.ceil(percentage);
  }
}

/** TW color band, ported from daily-operations-reports's utils.ts getTWColorClass. */
function getTimeWindowClass(percentage: number): 'success' | 'warning' | 'orange' | 'danger' | 'neutral' {
  if (percentage >= 90 && percentage <= 100) return 'success';
  if (percentage >= 80 && percentage < 90) return 'warning';
  if (percentage >= 70 && percentage < 80) return 'orange';
  if (percentage < 60) return 'danger';
  return 'neutral';
}

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES_LONG[month] || 'Unknown'} ${year}`;
}
function formatMonthYearShort(year: number, month: number): string {
  return `${MONTH_NAMES_SHORT[month] || '???'}/${year}`;
}

/* ==================== day record + averages ==================== */
interface DayRecord {
  day: number;
  dayOfWeek: number;
  route: string;
  pu: number;
  ok: number;
  hn: number;
  pd: number;
  nr: number;
  fp: number;
  ba: number;
  nh: number;
  cm: number;
  ca: number;
  spr: number | 'N/A';
  sporH: string | 'N/A';
  tw: string | 'N/A';
  workedHours: string | null;
  departTime: string | null;
  arriveTime: string | null;
}

interface Averages {
  avgTw: string;
  avgSpr: string;
  avgSporH: string;
  avgAfd: string;
}

/* ==================== calculateAverages — 1:1 port of PerformanceDetailView.tsx useMemo ==================== */
/** Averages a month's daily rows, skipping 'N/A'/'--:--'/zero placeholder values, same as the source app. */
function calculateAverages(monthData: DayRecord[]): Averages {
  if (!monthData || monthData.length === 0) {
    return { avgTw: '--:--', avgSpr: '--:--', avgSporH: '--:--', avgAfd: '--:--' };
  }
  let totalSporH = 0, countSporH = 0;
  let totalTw = 0, countTw = 0;
  let totalSpr = 0, countSpr = 0;
  let totalAfd = 0, countAfd = 0;

  monthData.forEach((d) => {
    if (d.sporH !== 'N/A' && d.sporH !== '0.0' && d.sporH !== '--:--') {
      const v = parseFloat(String(d.sporH));
      if (!isNaN(v) && v > 0) { totalSporH += v; countSporH++; }
    }
    if (d.tw !== 'N/A' && d.tw !== '0.0%' && d.tw !== '--:--') {
      const v = parseFloat(String(d.tw).replace('%', ''));
      if (!isNaN(v) && v > 0) { totalTw += v; countTw++; }
    }
    if (d.spr !== 'N/A' && (d.spr as unknown) !== '--:--') {
      const v = typeof d.spr === 'number' ? d.spr : parseFloat(String(d.spr));
      if (!isNaN(v)) { totalSpr += v; countSpr++; }
    }
    if (d.spr !== 'N/A' && (d.spr as unknown) !== '--:--') {
      try {
        const op: OperationLike = {
          deliveryDetails: {
            paidStops: { pu: d.pu ?? 0, ok: d.ok ?? 0, hn: d.hn ?? 0, pd: d.pd ?? 0 },
            unpaidStops: { nr: d.nr ?? 0, fp: d.fp ?? 0, rd: 0, ba: d.ba ?? 0, nh: d.nh ?? 0, cm: d.cm ?? 0, ca: 0 },
            departTime: null,
            arriveTime: null,
          },
          dailyMetrics: { breakMinutes: 0 },
        };
        const afdValue = calculateAFD(op);
        if (!isNaN(afdValue) && afdValue >= 0) { totalAfd += afdValue; countAfd++; }
      } catch {
        /* ignore */
      }
    }
  });

  const avgSporH = countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--';
  const avgTw = countTw > 0 ? (totalTw / countTw).toFixed(1) : '--:--';
  const avgSpr = countSpr > 0 ? Math.round(totalSpr / countSpr) : '--:--';
  const avgAfd = countAfd > 0 ? Math.round(totalAfd / countAfd) : '--:--';

  return {
    avgTw: avgTw !== '--:--' ? avgTw + '%' : '--:--',
    avgSpr: avgSpr.toString(),
    avgSporH,
    avgAfd: avgAfd !== '--:--' ? avgAfd + '%' : '--:--',
  };
}

/** Averages a set of per-vendor averages (used for the "General" / all-vendors overview). */
function aggregateAverages(list: Averages[]): Averages {
  let totalTw = 0, countTw = 0;
  let totalSpr = 0, countSpr = 0;
  let totalSporH = 0, countSporH = 0;
  let totalAfd = 0, countAfd = 0;

  list.forEach((a) => {
    if (a.avgTw !== '--:--') { totalTw += parseFloat(a.avgTw); countTw++; }
    if (a.avgSpr !== '--:--') { totalSpr += parseFloat(a.avgSpr); countSpr++; }
    if (a.avgSporH !== '--:--') { totalSporH += parseFloat(a.avgSporH); countSporH++; }
    if (a.avgAfd !== '--:--') { totalAfd += parseFloat(a.avgAfd); countAfd++; }
  });

  return {
    avgTw: countTw > 0 ? (totalTw / countTw).toFixed(1) + '%' : '--:--',
    avgSpr: countSpr > 0 ? String(Math.round(totalSpr / countSpr)) : '--:--',
    avgSporH: countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--',
    avgAfd: countAfd > 0 ? Math.round(totalAfd / countAfd) + '%' : '--:--',
  };
}

/* ==================== KpiDashboardAlt.tsx port (tile helpers) ==================== */
function parsePct(s: string | undefined): number {
  if (!s || s === '--:--' || s === 'N/A') return 0;
  const n = parseFloat(String(s).replace('%', '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function parseNum(s: string | undefined): number {
  if (!s || s === '--:--' || s === 'N/A') return 0;
  const n = parseFloat(String(s).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function barColorTw(value: string): string {
  const p = parsePct(value);
  if (p === 0 && (value === '--:--' || value === 'N/A')) return '#9CA3AF';
  if (p >= 90) return '#22c55e';
  if (p >= 80) return '#eab308';
  return '#ef4444';
}
function barColorSporH(value: string): string {
  const v = parseNum(value);
  if (v === 0 && (value === '--:--' || value === 'N/A')) return '#9CA3AF';
  return v >= 18 ? '#22c55e' : '#ef4444';
}
function barColorNeutral(value: string): string {
  if (!value || value === '--:--' || value === 'N/A') return '#9CA3AF';
  return '#6366f1';
}
function pctTw(v: string): number { return Math.min(100, parsePct(v)); }
function pctSpr(v: string): number { return Math.min(100, (parseNum(v) / 200) * 100); }
function pctSporH(v: string): number { return Math.min(100, (parseNum(v) / 20) * 100); }
function pctAfd(v: string): number { return Math.min(100, parsePct(v)); }

interface KpiCard {
  key: string;
  label: string;
  sublabel: string;
  value: string;
  icon: string;
  barPercent: number;
  barColor: string;
  isNA: boolean;
  valueClass: string;
  chartType: string;
}

function buildKpiCards(stats: Averages, shortLabels: boolean): KpiCard[] {
  return [
    {
      key: 'tw', label: shortLabels ? 'TW' : 'Avg TW', sublabel: 'Time window', value: stats.avgTw,
      icon: 'bi-clock', barPercent: pctTw(stats.avgTw), barColor: barColorTw(stats.avgTw),
      isNA: !stats.avgTw || stats.avgTw === '--:--', valueClass: '', chartType: 'Gauge',
    },
    {
      key: 'spr', label: shortLabels ? 'SPR' : 'Avg SPR', sublabel: 'Stops per route', value: stats.avgSpr,
      icon: 'bi-signpost-split', barPercent: pctSpr(stats.avgSpr), barColor: barColorNeutral(stats.avgSpr),
      isNA: !stats.avgSpr || stats.avgSpr === '--:--', valueClass: '', chartType: 'Thermometer',
    },
    {
      key: 'sporH', label: shortLabels ? 'SPOR-H' : 'Avg SPOR-H', sublabel: 'Stops per hour', value: stats.avgSporH,
      icon: 'bi-speedometer2', barPercent: pctSporH(stats.avgSporH), barColor: barColorSporH(stats.avgSporH),
      isNA: !stats.avgSporH || stats.avgSporH === '--:--', valueClass: '', chartType: 'Clock',
    },
    {
      key: 'afd', label: shortLabels ? 'AFD' : 'Avg AFD', sublabel: 'Attempted failed deliveries', value: stats.avgAfd,
      icon: 'bi-exclamation-triangle', barPercent: pctAfd(stats.avgAfd), barColor: barColorNeutral(stats.avgAfd),
      isNA: !stats.avgAfd || stats.avgAfd === '--:--', valueClass: 'vp-kpi-afd', chartType: 'Gauge',
    },
  ];
}

/* ==================== MOCK DATA ==================== */
const DEPOT_PREFIX: Record<string, string> = { LSE: 'LL', LCY: 'DY', MSE: 'MD' };
const DEPOTS = Object.keys(DEPOT_PREFIX);

const FIRST_NAMES = ['James', 'Olivia', 'Daniel', 'Sophia', 'Marcus', 'Amelia', 'Ryan', 'Grace', 'Liam', 'Isabella', 'Noah', 'Chloe', 'Ethan', 'Freya'];
const LAST_NAMES = ['Carter', 'Bennett', 'Hughes', 'Morgan', 'Reid', 'Foster', 'Walsh', 'Whitfield', 'Doyle', 'Nolan', 'Sinclair', 'Pearce', 'Osei', 'Vance'];

interface ServicePartner { id: number; name: string; }
const SERVICE_PARTNERS: ServicePartner[] = [
  { id: 1, name: 'Acme Logistics Ltd' },
  { id: 2, name: 'Swift Carriers UK' },
  { id: 3, name: 'Northline Express' },
];

const VENDOR_COUNT = 12;

interface Vendor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  servicePartnerId: number;
}

interface MonthKey { year: number; month: number; }

interface MasterData {
  vendors: Vendor[];
  vendorMonths: Map<number, MonthKey[]>;
}

function buildMasterData(today: Date): MasterData {
  const vendors: Vendor[] = Array.from({ length: VENDOR_COUNT }, (_, i) => {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const sp = SERVICE_PARTNERS[i % SERVICE_PARTNERS.length];
    return {
      id: i + 1,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      servicePartnerId: sp.id,
    };
  });

  // Only months that actually have data appear in each vendor's carousel —
  // mirrors useAvailableMonthsForVendor (real API); here it's 3-8 random months
  // out of the trailing 12-month window.
  const vendorMonths = new Map<number, MonthKey[]>();
  vendors.forEach((v) => {
    const rng = rngForSeed(`vp-months-${v.id}`);
    const allMonths: MonthKey[] = [];
    for (let i = -11; i <= 0; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      allMonths.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    const count = 3 + Math.floor(rng() * 6); // 3-8 months
    const pool = allMonths.slice();
    const picked: MonthKey[] = [];
    for (let k = 0; k < count && pool.length > 0; k++) {
      const idx = Math.floor(rng() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    picked.sort((a, b) => a.year - b.year || a.month - b.month);
    vendorMonths.set(v.id, picked);
  });

  return { vendors, vendorMonths };
}

/** Generates weekday daily-performance rows for a vendor/month (stop-code fields ported from daily-operations-reports's mock generator). */
function generateMonthData(vendorId: number, year: number, month: number): DayRecord[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: DayRecord[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // weekends: no operation

    const iso = formatDateISO(d);
    const rng = rngForSeed(`vp-day-${vendorId}-${iso}`);

    if (rng() < 0.12) {
      // ~12% of weekdays are a day off — kept in the table to exercise the
      // '--:--' / N/A display + averaging-skip logic.
      data.push({
        day, dayOfWeek: dow, route: 'N/A',
        pu: 0, ok: 0, hn: 0, pd: 0, nr: 0, fp: 0, ba: 0, nh: 0, cm: 0, ca: 0,
        spr: 'N/A', sporH: 'N/A', tw: 'N/A',
        workedHours: null, departTime: null, arriveTime: null,
      });
      continue;
    }

    const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
    const routeNumber = 1 + Math.floor(rng() * 20);
    const routeName = `${DEPOT_PREFIX[depot]}${String(routeNumber).padStart(2, '0')}`;

    const departMinutes = 6 * 60 + Math.floor(rng() * 150); // 06:00-08:30
    const workMinutes = 480 + Math.floor(rng() * 150); // 8h-10.5h
    const breakMinutes = 15 + Math.floor(rng() * 31); // 15-45 min
    const arriveMinutes = departMinutes + workMinutes;
    const departTime = minutesToTimeString(departMinutes);
    const arriveTime = minutesToTimeString(arriveMinutes);

    const totalStops = 70 + Math.floor(rng() * 90); // 70-160
    const failedRatio = rng() * 0.12; // up to 12% failed
    const failedCount = Math.round(totalStops * failedRatio);
    const paidCount = totalStops - failedCount;

    const pu = Math.floor(paidCount * (0.35 + rng() * 0.15));
    const ok = Math.floor(paidCount * (0.3 + rng() * 0.15));
    const hn = Math.max(0, paidCount - pu - ok - Math.floor(paidCount * 0.05));
    const pd = Math.max(0, paidCount - pu - ok - hn);

    let remainingFailed = failedCount;
    const nr = Math.min(remainingFailed, Math.floor(failedCount * 0.25)); remainingFailed -= nr;
    const fp = Math.min(remainingFailed, Math.floor(failedCount * 0.2)); remainingFailed -= fp;
    const ba = Math.min(remainingFailed, Math.floor(failedCount * 0.15)); remainingFailed -= ba;
    const nh = Math.min(remainingFailed, Math.floor(failedCount * 0.2)); remainingFailed -= nh;
    const cm = Math.min(remainingFailed, Math.floor(failedCount * 0.1)); remainingFailed -= cm;
    const ca = Math.max(0, remainingFailed);

    const percentageOnTime = 0.55 + rng() * 0.45;

    const operation: OperationLike = {
      deliveryDetails: {
        paidStops: { pu, ok, hn, pd },
        unpaidStops: { nr, fp, rd: 0, ba, nh, cm, ca },
        departTime, arriveTime,
      },
      dailyMetrics: { breakMinutes },
    };

    const spr = calculateSPR(operation);
    const sporH = calculateSPORH(operation).toFixed(1);
    const tw = (percentageOnTime * 100).toFixed(1) + '%';
    const workedHours = ((arriveMinutes - departMinutes - breakMinutes) / 60).toFixed(2);

    data.push({
      day, dayOfWeek: dow, route: routeName,
      pu, ok, hn, pd, nr, fp, ba, nh, cm, ca,
      spr, sporH, tw, workedHours, departTime, arriveTime,
    });
  }

  return data;
}

function getFilteredVendors(vendors: Vendor[], servicePartnerId: string): Vendor[] {
  if (!servicePartnerId) return vendors;
  return vendors.filter((v) => String(v.servicePartnerId) === String(servicePartnerId));
}

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; hiding: boolean; }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function VendorPerformance() {
  // `today` fixed once at mount, mirroring the static app's constructor-time `new Date()`.
  const todayRef = useRef(new Date());
  const today = todayRef.current;
  const periodYear = today.getFullYear();
  const periodMonth = today.getMonth();

  const { vendors, vendorMonths } = useMemo(() => buildMasterData(today), [today]);
  const monthDataCacheRef = useRef(new Map<string, DayRecord[]>());

  function getVendorMonthData(vendorId: number, year: number, month: number): DayRecord[] {
    const key = `${vendorId}-${year}-${month}`;
    const cache = monthDataCacheRef.current;
    if (!cache.has(key)) {
      cache.set(key, generateMonthData(vendorId, year, month));
    }
    return cache.get(key)!;
  }

  const [loading, setLoading] = useState(true);
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [detailYear, setDetailYear] = useState<number | null>(null);
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const [kpiView, setKpiView] = useState<'summary' | 'charts'>('summary');
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  const comboRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Close the vendor combo list when clicking outside it (mirrors document click listener).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Keep the active month chip scrolled into view, same as renderDetail()'s scrollIntoView call.
  useEffect(() => {
    const carousel = carouselRef.current;
    const active = carousel?.querySelector('.is-active');
    if (active) active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }, [selectedVendorId, detailYear, detailMonth]);

  function showToast(message: string, type: Toast['type'] = 'info') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, hiding: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, hiding: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 320);
    }, 3200);
  }

  function handleServicePartnerChange(value: string) {
    setSelectedServicePartnerId(value);
    const filtered = getFilteredVendors(vendors, value);
    if (selectedVendorId != null && !filtered.some((v) => v.id === selectedVendorId)) {
      setSelectedVendorId(null);
      setDetailYear(null);
      setDetailMonth(null);
    }
  }

  function handleVendorChange(vendorId: number | null) {
    setSelectedVendorId(vendorId);
    setKpiView('summary');
    if (vendorId) {
      const months = vendorMonths.get(vendorId) || [];
      if (months.length > 0) {
        const last = months[months.length - 1];
        setDetailYear(last.year);
        setDetailMonth(last.month);
      } else {
        setDetailYear(null);
        setDetailMonth(null);
      }
    } else {
      setDetailYear(null);
      setDetailMonth(null);
    }
  }

  function handleMonthSelect(year: number, month: number) {
    setDetailYear(year);
    setDetailMonth(month);
  }

  function handleClearFilters() {
    setSelectedServicePartnerId('');
    setSelectedVendorId(null);
    setDetailYear(null);
    setDetailMonth(null);
    setVendorSearchTerm('');
    setKpiView('summary');
    setComboOpen(false);
    showToast('Filters cleared', 'info');
  }

  const filteredVendorCount = getFilteredVendors(vendors, selectedServicePartnerId).length;
  const headerLabel = selectedVendorId != null && detailYear != null
    ? formatMonthYear(detailYear, detailMonth as number)
    : formatMonthYear(periodYear, periodMonth);

  const filteredComboVendors = useMemo(
    () =>
      getFilteredVendors(vendors, selectedServicePartnerId)
        .slice()
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { sensitivity: 'base' })),
    [vendors, selectedServicePartnerId],
  );

  const comboVendors = useMemo(() => {
    const term = vendorSearchTerm.trim().toLowerCase();
    if (!term) return filteredComboVendors;
    return filteredComboVendors.filter((v) => `${v.firstName} ${v.lastName}`.toLowerCase().includes(term));
  }, [filteredComboVendors, vendorSearchTerm]);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) || null;
  const vendorInputValue = inputFocused ? vendorSearchTerm : selectedVendor ? `${selectedVendor.firstName} ${selectedVendor.lastName}` : '';

  function renderKpiToggle() {
    return (
      <div className="vp-kpi-toggle" role="group" aria-label="KPI view">
        <button
          type="button"
          className={`vp-kpi-toggle-btn${kpiView === 'summary' ? ' is-active' : ''}`}
          onClick={() => setKpiView('summary')}
        >
          Summary
        </button>
        <button
          type="button"
          className={`vp-kpi-toggle-btn${kpiView === 'charts' ? ' is-active' : ''}`}
          onClick={() => setKpiView('charts')}
        >
          Charts
        </button>
      </div>
    );
  }

  function renderKpiSummary(stats: Averages, shortLabels: boolean) {
    const cards = buildKpiCards(stats, shortLabels);
    return (
      <div className="vp-kpi-grid" role="region" aria-label="KPIs summary">
        {cards.map((c) => (
          <div className="vp-kpi-tile" key={c.key}>
            <div className="vp-kpi-tile-header">
              <span className="vp-kpi-tile-icon"><i className={`bi ${c.icon}`} /></span>
              <span className="vp-kpi-tile-label">{c.label}</span>
            </div>
            <p className={`vp-kpi-tile-value ${c.valueClass}`}>{c.isNA ? '–' : c.value}</p>
            <p className="vp-kpi-tile-sub">{c.sublabel}</p>
            <div className="vp-kpi-tile-bar">
              <div className="vp-kpi-tile-bar-fill" style={{ width: `${c.barPercent}%`, background: c.barColor }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Simplified stand-in for AnimatedMetricChart's gauge/thermometer/clock visuals:
     a labelled progress bar per metric with a caption naming the original chart type. */
  function renderKpiCharts(stats: Averages, shortLabels: boolean) {
    const cards = buildKpiCards(stats, shortLabels);
    return (
      <div className="vp-chart-grid">
        {cards.map((c) => (
          <div className="vp-chart-card" key={c.key}>
            <div className="vp-chart-card-header">
              <span className="vp-chart-icon"><i className={`bi ${c.icon}`} /></span>
              <span className="vp-chart-label">{c.label}</span>
            </div>
            <p className={`vp-chart-value ${c.valueClass}`}>{c.isNA ? '–' : c.value}</p>
            <div className="vp-chart-gauge">
              <div className="vp-chart-gauge-fill" style={{ width: `${c.barPercent}%`, background: c.barColor }} />
            </div>
            <p className="vp-chart-type">{c.chartType}</p>
          </div>
        ))}
      </div>
    );
  }

  function renderTableRow(d: DayRecord, idx: number) {
    const dayName = WEEKDAYS[d.dayOfWeek];
    const isSaturday = d.dayOfWeek === 6;
    const routeClass = d.route === 'N/A' ? 'vp-cell-muted' : '';
    const displayRoute = d.route === 'N/A' ? '--:--' : d.route;

    const sprIsNA = d.spr === 'N/A' || (d.spr as unknown) === '--:--' || d.spr === 0 || (d.spr as unknown) === '0';
    const displaySpr = sprIsNA ? '--:--' : d.spr;

    const sporHIsNA = d.sporH === 'N/A' || d.sporH === '--:--' || d.sporH === '0.0';
    const displaySporH = sporHIsNA ? '--:--' : d.sporH;

    const twIsNA = d.tw === 'N/A' || d.tw === '--:--' || d.tw === '0.0%';
    const displayTw = twIsNA ? '--:--' : d.tw;
    const twBand = twIsNA ? 'neutral' : getTimeWindowClass(parseFloat(String(d.tw)));

    let displayAfd = '--:--';
    let afdClass = 'vp-cell-muted';
    if (!sprIsNA) {
      const op: OperationLike = {
        deliveryDetails: {
          paidStops: { pu: d.pu ?? 0, ok: d.ok ?? 0, hn: d.hn ?? 0, pd: d.pd ?? 0 },
          unpaidStops: { nr: d.nr ?? 0, fp: d.fp ?? 0, rd: 0, ba: d.ba ?? 0, nh: d.nh ?? 0, cm: d.cm ?? 0, ca: d.ca ?? 0 },
          departTime: null, arriveTime: null,
        },
        dailyMetrics: { breakMinutes: 0 },
      };
      const afdValue = calculateAFD(op);
      if (!isNaN(afdValue) && afdValue >= 0) {
        displayAfd = `${afdValue}%`;
        afdClass = 'vp-cell-afd';
      }
    }

    return (
      <tr key={`${d.day}-${idx}`}>
        <td>
          <strong className="vp-day-num">{String(d.day).padStart(2, '0')}</strong>
          <span className={`vp-day-pill${isSaturday ? ' is-sat' : ''}`}>{dayName}</span>
        </td>
        <td className={routeClass}>{displayRoute}</td>
        <td>{d.nr ?? 0}</td>
        <td>{d.fp ?? 0}</td>
        <td>{d.ba ?? 0}</td>
        <td>{d.nh ?? 0}</td>
        <td>{d.cm ?? 0}</td>
        <td>{d.ca ?? 0}</td>
        <td>{d.pu ?? 0}</td>
        <td>{d.ok ?? 0}</td>
        <td>{d.hn ?? 0}</td>
        <td>{d.pd ?? 0}</td>
        <td className={sprIsNA ? 'vp-cell-muted' : ''}>{String(displaySpr)}</td>
        <td className={sporHIsNA ? 'vp-cell-muted' : ''}>{displaySporH}</td>
        <td className={`vp-tw-${twBand}`}>{displayTw}</td>
        <td className={afdClass}>{displayAfd}</td>
      </tr>
    );
  }

  function renderDailyTable(monthData: DayRecord[]) {
    const daysWithData = monthData.filter(
      (d) => !(d.route === 'N/A' && d.spr === 'N/A' && d.sporH === 'N/A' && d.tw === 'N/A'),
    );

    if (daysWithData.length === 0) {
      return (
        <table className="vp-table">
          <tbody>
            <tr><td colSpan={16} className="vp-table-message">No data available for this month.</td></tr>
          </tbody>
        </table>
      );
    }

    const rows = daysWithData.slice().reverse();

    return (
      <table className="vp-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Route</th>
            <th title="Not Received">NR</th>
            <th title="Failed Pick">FP</th>
            <th title="Business Address">BA</th>
            <th title="Not Home">NH</th>
            <th title="Customer">CM</th>
            <th title="Closed on Arrival">CA</th>
            <th title="Pick Up">PU</th>
            <th title="OK">OK</th>
            <th title="Home Not">HN</th>
            <th title="Paid">PD</th>
            <th>SPR</th>
            <th>SPOR-H</th>
            <th>TW</th>
            <th>AFD</th>
          </tr>
        </thead>
        <tbody>{rows.map((d, idx) => renderTableRow(d, idx))}</tbody>
      </table>
    );
  }

  function renderEmptyState(title: string, subtitle: string) {
    return (
      <div className="vp-empty-state">
        <p className="vp-empty-title">{title}</p>
        <p className="vp-empty-sub">{subtitle}</p>
      </div>
    );
  }

  function renderGeneralView() {
    const filteredVendorsForStats = getFilteredVendors(vendors, selectedServicePartnerId);
    let vendorsWithData = 0;
    const perVendorAverages: Averages[] = [];
    filteredVendorsForStats.forEach((v) => {
      const months = vendorMonths.get(v.id) || [];
      const has = months.some((m) => m.year === periodYear && m.month === periodMonth);
      if (has) {
        vendorsWithData++;
        const data = getVendorMonthData(v.id, periodYear, periodMonth);
        perVendorAverages.push(calculateAverages(data));
      }
    });
    const stats: Averages & { totalVendors: number } = { totalVendors: vendorsWithData, ...aggregateAverages(perVendorAverages) };
    const monthLabel = formatMonthYear(periodYear, periodMonth);

    return (
      <div className="vp-detail-stack">
        <div className="vp-month-chip-row">
          <span className="vp-month-chip is-active">{monthLabel}</span>
        </div>
        <div className="vp-card">
          <div className="vp-card-header">
            <div>
              <h2 className="vp-card-title">{monthLabel} &ndash; Overview (all vendors)</h2>
              <p className="vp-card-sub">{stats.totalVendors} vendor{stats.totalVendors === 1 ? '' : 's'} with data</p>
            </div>
            {renderKpiToggle()}
          </div>
          {kpiView === 'summary' ? renderKpiSummary(stats, false) : renderKpiCharts(stats, false)}
        </div>
        <div className="vp-card vp-table-card">
          <div className="vp-card-header vp-card-header--bar"><h2 className="vp-card-title">Daily Breakdown</h2></div>
          <div className="vp-empty-inline">
            <p>Select a vendor above to see daily breakdown by day.</p>
          </div>
        </div>
      </div>
    );
  }

  function renderDetailView(months: MonthKey[]) {
    const vendor = selectedVendor!;
    const year = detailYear as number;
    const month = detailMonth as number;
    const monthData = getVendorMonthData(vendor.id, year, month);
    const stats = calculateAverages(monthData);
    const monthLabel = formatMonthYear(year, month);

    return (
      <div className="vp-detail-stack">
        <div className="vp-carousel-wrapper">
          <div className="vp-carousel-scroll" id="vpMonthCarousel" ref={carouselRef} role="listbox" aria-label="Select a month">
            {months.map((m) => {
              const active = m.year === year && m.month === month;
              return (
                <button
                  type="button"
                  key={`${m.year}-${m.month}`}
                  role="option"
                  aria-selected={active}
                  className={`vp-month-chip${active ? ' is-active' : ''}`}
                  onClick={() => handleMonthSelect(m.year, m.month)}
                >
                  {formatMonthYearShort(m.year, m.month)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="vp-card">
          <div className="vp-card-header">
            <h2 className="vp-card-title">{vendor.firstName} {vendor.lastName} &ndash; {monthLabel} Performance</h2>
            {renderKpiToggle()}
          </div>
          {kpiView === 'summary' ? renderKpiSummary(stats, true) : renderKpiCharts(stats, true)}
        </div>
        <div className="vp-card vp-table-card">
          <div className="vp-card-header vp-card-header--bar"><h2 className="vp-card-title">Daily Breakdown</h2></div>
          <div className="vp-table-scroll">
            {renderDailyTable(monthData)}
          </div>
        </div>
      </div>
    );
  }

  function renderDetail() {
    if (selectedVendorId == null) {
      return renderGeneralView();
    }
    const months = vendorMonths.get(selectedVendorId) || [];
    if (months.length === 0) {
      return renderEmptyState('No records for this vendor', 'This vendor has no performance data in the last 12 months.');
    }
    return renderDetailView(months);
  }

  return (
    <PortalLayout pageClassName="vp-page" mainClassName="vp-container container-fluid px-3 px-lg-4 py-4" title="Vendor Performance">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading vendor performance…</p>
      </div>

      {/* ============ PAGE INFO (kept from the original header; not part of the standardized pattern) ============ */}
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date"><i className="bi bi-speedometer" /><span id="vpHeaderSubtitle">{headerLabel}</span></p>
        </div>
        <div className="vp-header-metric" id="vpHeaderMetric">
          <p className="vp-header-metric-label">Vendors</p>
          <p className="vp-header-metric-value" id="vpHeaderMetricValue">{filteredVendorCount}</p>
        </div>
      </div>

      {/* ============ FILTERS ============ */}
      <div className="filters-bar" data-animate="fade-in-up">
        <div>
          <label className="filters-label" htmlFor="servicePartnerSelect">Service Partner</label>
          <select
            className="form-select filter-select"
            id="servicePartnerSelect"
            value={selectedServicePartnerId}
            onChange={(e) => handleServicePartnerChange(e.target.value)}
          >
            <option value="">All Service Partners</option>
            {SERVICE_PARTNERS.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
        </div>
        <div className="vp-combo-wrap search-wrap">
          <label className="filters-label" htmlFor="vendorSearchInput">Vendor</label>
          <div className="vp-combo" id="vendorCombo" ref={comboRef}>
            <div className="search-input-wrap">
              <i className="bi bi-search" />
              <input
                type="text"
                id="vendorSearchInput"
                className="form-control"
                placeholder="Select a vendor"
                autoComplete="off"
                value={vendorInputValue}
                onFocus={() => {
                  setInputFocused(true);
                  setVendorSearchTerm('');
                  setComboOpen(true);
                }}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => {
                  setVendorSearchTerm(e.target.value);
                  setComboOpen(true);
                }}
              />
              {!!selectedVendorId && (
                <button
                  type="button"
                  className="vp-combo-clear"
                  id="vendorComboClear"
                  aria-label="Clear vendor selection"
                  onClick={() => {
                    handleVendorChange(null);
                    setComboOpen(false);
                  }}
                >
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>
            {comboOpen && (
              <div className="vp-combo-list" id="vendorComboList">
                {comboVendors.length === 0 ? (
                  <div className="vp-combo-empty">No vendors found</div>
                ) : (
                  comboVendors.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className={`vp-combo-option${v.id === selectedVendorId ? ' is-selected' : ''}`}
                      data-vendor-id={v.id}
                      onClick={() => {
                        handleVendorChange(v.id);
                        setComboOpen(false);
                      }}
                    >
                      {v.firstName} {v.lastName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="dfi-actions">
          <button type="button" className="styled-button styled-button--outline" id="btnClearFilters" onClick={handleClearFilters}>
            <i className="bi bi-x-circle" /> Clear
          </button>
        </div>
      </div>

      {/* ============ DETAIL CONTENT ============ */}
      <div id="vpDetailContent">{renderDetail()}</div>

      {/* Toast Container */}
      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => {
          const icon = t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
          return (
            <div key={t.id} className={`app-toast ${t.type}${t.hiding ? ' hiding' : ''}`}>
              <i className={`bi ${icon}`} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </PortalLayout>
  );
}
