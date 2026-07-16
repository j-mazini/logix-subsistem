'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BeamSidebar } from '../components/BeamSidebar';
import { useBodyClass } from '../components/useBodyClass';
import './style.css';

/* ---------- deterministic PRNG (ported verbatim) ---------- */
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

function formatDateISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function minutesToTimeString(mins: number) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(Math.floor(m % 60))}`;
}

interface StopsBreakdown {
  paidStops: { pu: number; ok: number; hn: number; pd?: number };
  unpaidStops: { nr: number; fp: number; rd: number; ca: number; ba: number; nh: number; cm: number };
  departTime: string | null;
  arriveTime: string | null;
}
interface Operation {
  deliveryDetails: StopsBreakdown;
  dailyMetrics: { breakMinutes: number };
}

function calculateSPR(operation: Operation) {
  const { paidStops, unpaidStops } = operation.deliveryDetails;
  const totalPaidStops = paidStops.pu + paidStops.ok + paidStops.hn + (paidStops.pd || 0);
  const totalUnpaidStops = unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;
  return totalPaidStops + totalUnpaidStops;
}
function calculateSPORH(operation: Operation) {
  const { departTime, arriveTime } = operation.deliveryDetails;
  if (!departTime || !arriveTime) return 0;
  const departMinutes = parseInt(departTime.split(':')[0], 10) * 60 + parseInt(departTime.split(':')[1], 10);
  const arriveMinutes = parseInt(arriveTime.split(':')[0], 10) * 60 + parseInt(arriveTime.split(':')[1], 10);
  if (isNaN(departMinutes) || isNaN(arriveMinutes)) return 0;
  let workTimeMinutes = arriveMinutes - departMinutes;
  if (workTimeMinutes < 0) workTimeMinutes += 24 * 60;
  const effectiveWorkMinutes = workTimeMinutes - (operation.dailyMetrics.breakMinutes || 0);
  if (effectiveWorkMinutes <= 0) return 0;
  return (calculateSPR(operation) / effectiveWorkMinutes) * 60;
}
function calculateAFD(operation: Operation) {
  const { unpaidStops } = operation.deliveryDetails;
  const totalFailedDeliveries = unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;
  const spr = calculateSPR(operation);
  const totalDeliveries = spr + totalFailedDeliveries;
  if (totalDeliveries === 0) return 0;
  const percentage = (totalFailedDeliveries / totalDeliveries) * 100;
  const decimalPart = percentage - Math.floor(percentage);
  const decimalAsInt = Math.round(decimalPart * 100);
  return decimalAsInt <= 10 ? Math.floor(percentage) : Math.ceil(percentage);
}
function getTimeWindowClass(percentage: number) {
  if (percentage >= 90 && percentage <= 100) return 'success';
  if (percentage >= 80 && percentage < 90) return 'warning';
  if (percentage >= 70 && percentage < 80) return 'orange';
  if (percentage < 60) return 'danger';
  return 'neutral';
}

const MONTH_NAMES_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatMonthYear(year: number, month: number) {
  return `${MONTH_NAMES_LONG[month] || 'Unknown'} ${year}`;
}
function formatMonthYearShort(year: number, month: number) {
  return `${MONTH_NAMES_SHORT[month] || '???'}/${year}`;
}

interface DayRow {
  day: number; dayOfWeek: number; route: string;
  pu: number; ok: number; hn: number; pd: number; nr: number; fp: number; ba: number; nh: number; cm: number; ca: number;
  spr: number | 'N/A'; sporH: string; tw: string;
  workedHours: string | null; departTime: string | null; arriveTime: string | null;
}
interface Averages { avgTw: string; avgSpr: string; avgSporH: string; avgAfd: string }

function calculateAverages(monthData: DayRow[]): Averages {
  if (!monthData || monthData.length === 0) return { avgTw: '--:--', avgSpr: '--:--', avgSporH: '--:--', avgAfd: '--:--' };
  let totalSporH = 0, countSporH = 0, totalTw = 0, countTw = 0, totalSpr = 0, countSpr = 0, totalAfd = 0, countAfd = 0;

  monthData.forEach((d) => {
    if (d.sporH !== 'N/A' && d.sporH !== '0.0' && d.sporH !== '--:--') {
      const v = parseFloat(d.sporH);
      if (!isNaN(v) && v > 0) { totalSporH += v; countSporH++; }
    }
    if (d.tw !== 'N/A' && d.tw !== '0.0%' && d.tw !== '--:--') {
      const v = parseFloat(String(d.tw).replace('%', ''));
      if (!isNaN(v) && v > 0) { totalTw += v; countTw++; }
    }
    if (d.spr !== 'N/A') {
      const v = typeof d.spr === 'number' ? d.spr : parseFloat(d.spr);
      if (!isNaN(v)) { totalSpr += v; countSpr++; }
    }
    if (d.spr !== 'N/A') {
      const op: Operation = {
        deliveryDetails: {
          paidStops: { pu: d.pu ?? 0, ok: d.ok ?? 0, hn: d.hn ?? 0, pd: d.pd ?? 0 },
          unpaidStops: { nr: d.nr ?? 0, fp: d.fp ?? 0, rd: 0, ba: d.ba ?? 0, nh: d.nh ?? 0, cm: d.cm ?? 0, ca: 0 },
          departTime: null, arriveTime: null,
        },
        dailyMetrics: { breakMinutes: 0 },
      };
      const afdValue = calculateAFD(op);
      if (!isNaN(afdValue) && afdValue >= 0) { totalAfd += afdValue; countAfd++; }
    }
  });

  const avgSporH = countSporH > 0 ? (totalSporH / countSporH).toFixed(1) : '--:--';
  const avgTw = countTw > 0 ? (totalTw / countTw).toFixed(1) : '--:--';
  const avgSpr = countSpr > 0 ? Math.round(totalSpr / countSpr) : '--:--';
  const avgAfd = countAfd > 0 ? Math.round(totalAfd / countAfd) : '--:--';

  return {
    avgTw: avgTw !== '--:--' ? avgTw + '%' : '--:--',
    avgSpr: String(avgSpr),
    avgSporH,
    avgAfd: avgAfd !== '--:--' ? avgAfd + '%' : '--:--',
  };
}

function aggregateAverages(list: Averages[]): Averages {
  let totalTw = 0, countTw = 0, totalSpr = 0, countSpr = 0, totalSporH = 0, countSporH = 0, totalAfd = 0, countAfd = 0;
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

function parsePct(s: string) {
  if (!s || s === '--:--' || s === 'N/A') return 0;
  const n = parseFloat(String(s).replace('%', '').replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function parseNum(s: string) {
  if (!s || s === '--:--' || s === 'N/A') return 0;
  const n = parseFloat(String(s).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function barColorTw(value: string) {
  const p = parsePct(value);
  if (p === 0 && (value === '--:--' || value === 'N/A')) return '#9CA3AF';
  if (p >= 90) return '#22c55e';
  if (p >= 80) return '#eab308';
  return '#ef4444';
}
function barColorSporH(value: string) {
  const v = parseNum(value);
  if (v === 0 && (value === '--:--' || value === 'N/A')) return '#9CA3AF';
  return v >= 18 ? '#22c55e' : '#ef4444';
}
function barColorNeutral(value: string) {
  if (!value || value === '--:--' || value === 'N/A') return '#9CA3AF';
  return '#6366f1';
}
function pctTw(v: string) { return Math.min(100, parsePct(v)); }
function pctSpr(v: string) { return Math.min(100, (parseNum(v) / 200) * 100); }
function pctSporH(v: string) { return Math.min(100, (parseNum(v) / 20) * 100); }
function pctAfd(v: string) { return Math.min(100, parsePct(v)); }

interface KpiCard {
  key: string; label: string; sublabel: string; value: string; icon: string;
  barPercent: number; barColor: string; isNA: boolean; valueClass: string; chartType: string;
}
function buildKpiCards(stats: Averages, shortLabels: boolean): KpiCard[] {
  return [
    { key: 'tw', label: shortLabels ? 'TW' : 'Avg TW', sublabel: 'Time window', value: stats.avgTw, icon: 'bi-clock', barPercent: pctTw(stats.avgTw), barColor: barColorTw(stats.avgTw), isNA: !stats.avgTw || stats.avgTw === '--:--', valueClass: '', chartType: 'Gauge' },
    { key: 'spr', label: shortLabels ? 'SPR' : 'Avg SPR', sublabel: 'Stops per route', value: stats.avgSpr, icon: 'bi-signpost-split', barPercent: pctSpr(stats.avgSpr), barColor: barColorNeutral(stats.avgSpr), isNA: !stats.avgSpr || stats.avgSpr === '--:--', valueClass: '', chartType: 'Thermometer' },
    { key: 'sporH', label: shortLabels ? 'SPOR-H' : 'Avg SPOR-H', sublabel: 'Stops per hour', value: stats.avgSporH, icon: 'bi-speedometer2', barPercent: pctSporH(stats.avgSporH), barColor: barColorSporH(stats.avgSporH), isNA: !stats.avgSporH || stats.avgSporH === '--:--', valueClass: '', chartType: 'Clock' },
    { key: 'afd', label: shortLabels ? 'AFD' : 'Avg AFD', sublabel: 'Attempted failed deliveries', value: stats.avgAfd, icon: 'bi-exclamation-triangle', barPercent: pctAfd(stats.avgAfd), barColor: barColorNeutral(stats.avgAfd), isNA: !stats.avgAfd || stats.avgAfd === '--:--', valueClass: 'vp-kpi-afd', chartType: 'Gauge' },
  ];
}

const DEPOT_PREFIX: Record<string, string> = { LSE: 'LL', LCY: 'DY', MSE: 'MD' };
const DEPOTS = Object.keys(DEPOT_PREFIX);
const FIRST_NAMES = ['James', 'Olivia', 'Daniel', 'Sophia', 'Marcus', 'Amelia', 'Ryan', 'Grace', 'Liam', 'Isabella', 'Noah', 'Chloe', 'Ethan', 'Freya'];
const LAST_NAMES = ['Carter', 'Bennett', 'Hughes', 'Morgan', 'Reid', 'Foster', 'Walsh', 'Whitfield', 'Doyle', 'Nolan', 'Sinclair', 'Pearce', 'Osei', 'Vance'];
const SERVICE_PARTNERS = [
  { id: 1, name: 'Acme Logistics Ltd' },
  { id: 2, name: 'Swift Carriers UK' },
  { id: 3, name: 'Northline Express' },
];
const VENDOR_COUNT = 12;

interface Vendor { id: number; firstName: string; lastName: string; email: string; servicePartnerId: number }
interface MonthKey { year: number; month: number }

function generateMonthData(vendorId: number, year: number, month: number): DayRow[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: DayRow[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const iso = formatDateISO(d);
    const rng = rngForSeed(`vp-day-${vendorId}-${iso}`);

    if (rng() < 0.12) {
      data.push({ day, dayOfWeek: dow, route: 'N/A', pu: 0, ok: 0, hn: 0, pd: 0, nr: 0, fp: 0, ba: 0, nh: 0, cm: 0, ca: 0, spr: 'N/A', sporH: 'N/A', tw: 'N/A', workedHours: null, departTime: null, arriveTime: null });
      continue;
    }

    const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
    const routeNumber = 1 + Math.floor(rng() * 20);
    const routeName = `${DEPOT_PREFIX[depot]}${String(routeNumber).padStart(2, '0')}`;

    const departMinutes = 6 * 60 + Math.floor(rng() * 150);
    const workMinutes = 480 + Math.floor(rng() * 150);
    const breakMinutes = 15 + Math.floor(rng() * 31);
    const arriveMinutes = departMinutes + workMinutes;
    const departTime = minutesToTimeString(departMinutes);
    const arriveTime = minutesToTimeString(arriveMinutes);

    const totalStops = 70 + Math.floor(rng() * 90);
    const failedRatio = rng() * 0.12;
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
    const operation: Operation = {
      deliveryDetails: { paidStops: { pu, ok, hn, pd }, unpaidStops: { nr, fp, rd: 0, ba, nh, cm, ca }, departTime, arriveTime },
      dailyMetrics: { breakMinutes },
    };

    const spr = calculateSPR(operation);
    const sporH = calculateSPORH(operation).toFixed(1);
    const tw = (percentageOnTime * 100).toFixed(1) + '%';
    const workedHours = ((arriveMinutes - departMinutes - breakMinutes) / 60).toFixed(2);

    data.push({ day, dayOfWeek: dow, route: routeName, pu, ok, hn, pd, nr, fp, ba, nh, cm, ca, spr, sporH, tw, workedHours, departTime, arriveTime });
  }
  return data;
}

export default function VendorPerformancePage() {
  useBodyClass('vp-page has-beam-sidebar');

  const [loading, setLoading] = useState(true);
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [detailYear, setDetailYear] = useState<number | null>(null);
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const [kpiView, setKpiView] = useState<'summary' | 'charts'>('summary');
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const periodYear = today.getFullYear();
  const periodMonth = today.getMonth();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const vendors: Vendor[] = useMemo(() => Array.from({ length: VENDOR_COUNT }, (_, i) => {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const sp = SERVICE_PARTNERS[i % SERVICE_PARTNERS.length];
    return { id: i + 1, firstName, lastName, email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`, servicePartnerId: sp.id };
  }), []);

  const vendorMonths = useMemo(() => {
    const map = new Map<number, MonthKey[]>();
    vendors.forEach((v) => {
      const rng = rngForSeed(`vp-months-${v.id}`);
      const allMonths: MonthKey[] = [];
      for (let i = -11; i <= 0; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        allMonths.push({ year: d.getFullYear(), month: d.getMonth() });
      }
      const count = 3 + Math.floor(rng() * 6);
      const pool = allMonths.slice();
      const picked: MonthKey[] = [];
      for (let k = 0; k < count && pool.length > 0; k++) {
        const idx = Math.floor(rng() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
      }
      picked.sort((a, b) => a.year - b.year || a.month - b.month);
      map.set(v.id, picked);
    });
    return map;
  }, [vendors, today]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setComboOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function getFilteredVendors(spId: string) {
    if (!spId) return vendors;
    return vendors.filter((v) => String(v.servicePartnerId) === spId);
  }

  function computeGeneralStats(year: number, month: number, spId: string) {
    const list = getFilteredVendors(spId);
    let vendorsWithData = 0;
    const perVendorAverages: Averages[] = [];
    list.forEach((v) => {
      const months = vendorMonths.get(v.id) || [];
      if (months.some((m) => m.year === year && m.month === month)) {
        vendorsWithData++;
        perVendorAverages.push(calculateAverages(generateMonthData(v.id, year, month)));
      }
    });
    return { totalVendors: vendorsWithData, ...aggregateAverages(perVendorAverages) };
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

  function handleClearFilters() {
    setSelectedServicePartnerId('');
    setSelectedVendorId(null);
    setDetailYear(null);
    setDetailMonth(null);
    setVendorSearchTerm('');
    setKpiView('summary');
  }

  const filteredComboVendors = useMemo(
    () => getFilteredVendors(selectedServicePartnerId).slice().sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { sensitivity: 'base' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendors, selectedServicePartnerId],
  );

  const comboListVendors = useMemo(() => {
    const term = vendorSearchTerm.trim().toLowerCase();
    if (!term) return filteredComboVendors;
    return filteredComboVendors.filter((v) => `${v.firstName} ${v.lastName}`.toLowerCase().includes(term));
  }, [filteredComboVendors, vendorSearchTerm]);

  const selectedVendorObj = vendors.find((v) => v.id === selectedVendorId);
  const searchInputValue = searchFocused ? vendorSearchTerm : selectedVendorObj ? `${selectedVendorObj.firstName} ${selectedVendorObj.lastName}` : '';

  const headerLabel = selectedVendorId != null && detailYear != null ? formatMonthYear(detailYear, detailMonth!) : formatMonthYear(periodYear, periodMonth);
  const headerCount = getFilteredVendors(selectedServicePartnerId).length;

  function KpiToggle() {
    return (
      <div className="vp-kpi-toggle" role="group" aria-label="KPI view">
        <button type="button" className={`vp-kpi-toggle-btn${kpiView === 'summary' ? ' is-active' : ''}`} onClick={() => setKpiView('summary')}>Summary</button>
        <button type="button" className={`vp-kpi-toggle-btn${kpiView === 'charts' ? ' is-active' : ''}`} onClick={() => setKpiView('charts')}>Charts</button>
      </div>
    );
  }

  function KpiSummary({ stats, shortLabels }: { stats: Averages; shortLabels: boolean }) {
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
            <div className="vp-kpi-tile-bar"><div className="vp-kpi-tile-bar-fill" style={{ width: `${c.barPercent}%`, background: c.barColor }} /></div>
          </div>
        ))}
      </div>
    );
  }

  function KpiCharts({ stats, shortLabels }: { stats: Averages; shortLabels: boolean }) {
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
            <div className="vp-chart-gauge"><div className="vp-chart-gauge-fill" style={{ width: `${c.barPercent}%`, background: c.barColor }} /></div>
            <p className="vp-chart-type">{c.chartType}</p>
          </div>
        ))}
      </div>
    );
  }

  function DailyTable({ monthData }: { monthData: DayRow[] }) {
    const daysWithData = monthData.filter((d) => !(d.route === 'N/A' && d.spr === 'N/A' && d.sporH === 'N/A' && d.tw === 'N/A'));
    if (daysWithData.length === 0) {
      return <table className="vp-table"><tbody><tr><td colSpan={16} className="vp-table-message">No data available for this month.</td></tr></tbody></table>;
    }
    const rows = daysWithData.slice().reverse();
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <table className="vp-table">
        <thead>
          <tr>
            <th>Day</th><th>Route</th>
            <th title="Not Received">NR</th><th title="Failed Pick">FP</th><th title="Business Address">BA</th>
            <th title="Not Home">NH</th><th title="Customer">CM</th><th title="Closed on Arrival">CA</th>
            <th title="Pick Up">PU</th><th title="OK">OK</th><th title="Home Not">HN</th><th title="Paid">PD</th>
            <th>SPR</th><th>SPOR-H</th><th>TW</th><th>AFD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const dayName = WEEKDAYS[d.dayOfWeek];
            const isSaturday = d.dayOfWeek === 6;
            const routeClass = d.route === 'N/A' ? 'vp-cell-muted' : '';
            const displayRoute = d.route === 'N/A' ? '--:--' : d.route;
            const sprIsNA = d.spr === 'N/A' || d.spr === 0;
            const displaySpr = sprIsNA ? '--:--' : d.spr;
            const sporHIsNA = d.sporH === 'N/A' || d.sporH === '0.0';
            const displaySporH = sporHIsNA ? '--:--' : d.sporH;
            const twIsNA = d.tw === 'N/A' || d.tw === '0.0%';
            const displayTw = twIsNA ? '--:--' : d.tw;
            const twBand = twIsNA ? 'neutral' : getTimeWindowClass(parseFloat(d.tw));

            let displayAfd = '--:--';
            let afdClass = 'vp-cell-muted';
            if (!sprIsNA) {
              const op: Operation = {
                deliveryDetails: { paidStops: { pu: d.pu, ok: d.ok, hn: d.hn, pd: d.pd }, unpaidStops: { nr: d.nr, fp: d.fp, rd: 0, ba: d.ba, nh: d.nh, cm: d.cm, ca: d.ca }, departTime: null, arriveTime: null },
                dailyMetrics: { breakMinutes: 0 },
              };
              const afdValue = calculateAFD(op);
              if (!isNaN(afdValue) && afdValue >= 0) {
                displayAfd = `${afdValue}%`;
                afdClass = 'vp-cell-afd';
              }
            }

            return (
              <tr key={d.day}>
                <td><strong className="vp-day-num">{String(d.day).padStart(2, '0')}</strong><span className={`vp-day-pill${isSaturday ? ' is-sat' : ''}`}>{dayName}</span></td>
                <td className={routeClass}>{displayRoute}</td>
                <td>{d.nr}</td><td>{d.fp}</td><td>{d.ba}</td><td>{d.nh}</td><td>{d.cm}</td><td>{d.ca}</td>
                <td>{d.pu}</td><td>{d.ok}</td><td>{d.hn}</td><td>{d.pd}</td>
                <td className={sprIsNA ? 'vp-cell-muted' : ''}>{String(displaySpr)}</td>
                <td className={sporHIsNA ? 'vp-cell-muted' : ''}>{displaySporH}</td>
                <td className={`vp-tw-${twBand}`}>{displayTw}</td>
                <td className={afdClass}>{displayAfd}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  function DetailContent() {
    if (selectedVendorId == null) {
      const stats = computeGeneralStats(periodYear, periodMonth, selectedServicePartnerId);
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
              <KpiToggle />
            </div>
            {kpiView === 'summary' ? <KpiSummary stats={stats} shortLabels={false} /> : <KpiCharts stats={stats} shortLabels={false} />}
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

    const months = vendorMonths.get(selectedVendorId) || [];
    if (months.length === 0) {
      return (
        <div className="vp-empty-state">
          <p className="vp-empty-title">No records for this vendor</p>
          <p className="vp-empty-sub">This vendor has no performance data in the last 12 months.</p>
        </div>
      );
    }

    const vendor = vendors.find((v) => v.id === selectedVendorId)!;
    const year = detailYear!;
    const month = detailMonth!;
    const monthData = generateMonthData(vendor.id, year, month);
    const stats = calculateAverages(monthData);
    const monthLabel = formatMonthYear(year, month);

    return (
      <div className="vp-detail-stack">
        <div className="vp-carousel-wrapper">
          <div className="vp-carousel-scroll" role="listbox" aria-label="Select a month">
            {months.map((m) => {
              const active = m.year === year && m.month === month;
              return (
                <button key={`${m.year}-${m.month}`} type="button" role="option" aria-selected={active} className={`vp-month-chip${active ? ' is-active' : ''}`} onClick={() => { setDetailYear(m.year); setDetailMonth(m.month); }}>
                  {formatMonthYearShort(m.year, m.month)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="vp-card">
          <div className="vp-card-header">
            <h2 className="vp-card-title">{vendor.firstName} {vendor.lastName} &ndash; {monthLabel} Performance</h2>
            <KpiToggle />
          </div>
          {kpiView === 'summary' ? <KpiSummary stats={stats} shortLabels /> : <KpiCharts stats={stats} shortLabels />}
        </div>
        <div className="vp-card vp-table-card">
          <div className="vp-card-header vp-card-header--bar"><h2 className="vp-card-title">Daily Breakdown</h2></div>
          <div className="vp-table-scroll">
            <DailyTable monthData={monthData} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading vendor performance…</p>
      </div>

      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <main className="vp-container container-fluid px-3 px-lg-4 py-4">
          <header className="page-header-section">
            <div className="page-header-welcome-text">
              <h1 className="page-header-title">Vendor Performance</h1>
              <p className="page-header-date"><i className="bi bi-speedometer" /><span>{headerLabel}</span></p>
            </div>
            <div className="vp-header-metric">
              <p className="vp-header-metric-label">Vendors</p>
              <p className="vp-header-metric-value">{headerCount}</p>
            </div>
          </header>

          <div className="filters-bar">
            <div>
              <label className="filters-label">Service Partner</label>
              <select className="form-select filter-select" value={selectedServicePartnerId} onChange={(e) => {
                const spId = e.target.value;
                setSelectedServicePartnerId(spId);
                const filtered = getFilteredVendors(spId);
                if (selectedVendorId && !filtered.some((v) => v.id === selectedVendorId)) {
                  setSelectedVendorId(null);
                  setDetailYear(null);
                  setDetailMonth(null);
                }
              }}>
                <option value="">All Service Partners</option>
                {SERVICE_PARTNERS.map((sp) => <option value={sp.id} key={sp.id}>{sp.name}</option>)}
              </select>
            </div>
            <div className="vp-combo-wrap search-wrap" ref={comboRef}>
              <label className="filters-label">Vendor</label>
              <div className="vp-combo">
                <div className="search-input-wrap">
                  <i className="bi bi-search" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Select a vendor"
                    autoComplete="off"
                    value={searchInputValue}
                    onFocus={() => { setSearchFocused(true); setVendorSearchTerm(''); setComboOpen(true); }}
                    onChange={(e) => { setVendorSearchTerm(e.target.value); setComboOpen(true); }}
                  />
                  {selectedVendorId != null && (
                    <button type="button" className="vp-combo-clear" aria-label="Clear vendor selection" onClick={() => { handleVendorChange(null); setComboOpen(false); setSearchFocused(false); }}>
                      <i className="bi bi-x-circle-fill" />
                    </button>
                  )}
                </div>
                {comboOpen && (
                  <div className="vp-combo-list">
                    {comboListVendors.length === 0 ? (
                      <div className="vp-combo-empty">No vendors found</div>
                    ) : (
                      comboListVendors.map((v) => (
                        <button key={v.id} type="button" className={`vp-combo-option${v.id === selectedVendorId ? ' is-selected' : ''}`} onClick={() => { handleVendorChange(v.id); setComboOpen(false); setSearchFocused(false); }}>
                          {v.firstName} {v.lastName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="dfi-actions">
              <button type="button" className="styled-button styled-button--outline" onClick={handleClearFilters}>
                <i className="bi bi-x-circle" /> Clear
              </button>
            </div>
          </div>

          <div id="vpDetailContent">
            <DetailContent />
          </div>
        </main>
      </div>

      <div className="toast-container" id="toastContainer" />
    </div>
  );
}
