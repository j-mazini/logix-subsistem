'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
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

function parseLocalDate(dateStr: string) {
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}
function formatDateISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function addDaysISO(dateISO: string, delta: number) {
  const d = parseLocalDate(dateISO);
  d.setDate(d.getDate() + delta);
  return formatDateISO(d);
}
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
  if (!monthName) return '';
  return `${day} ${monthName} ${year}`;
}
function formatDateLong(dateStr?: string) {
  if (!dateStr) return '--';
  return parseLocalDate(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') return value % 1 === 0 ? value.toString() : value.toFixed(2);
  return value.toString();
}
function getTWClass(twValue: number | null | undefined) {
  if (twValue === null || twValue === undefined) return 'dor-tw-none';
  const percentage = twValue * 100;
  if (percentage >= 90 && percentage <= 100) return 'dor-tw-green';
  if (percentage >= 80 && percentage < 90) return 'dor-tw-amber';
  if (percentage < 80) return 'dor-tw-red';
  return 'dor-tw-none';
}
function formatTW(twValue: number) {
  return `${(twValue * 100).toFixed(2)}%`;
}
function isFlexRoute(route?: string) {
  return route ? route.toUpperCase().includes('FLEX') : false;
}
function timeToMinutes(timeStr?: string | null) {
  if (!timeStr) return null;
  const time = String(timeStr).trim().toUpperCase();
  const match24h = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) return parseInt(match24h[1], 10) * 60 + parseInt(match24h[2], 10);
  return null;
}
function breakToMinutes(breakValue?: string | null) {
  if (!breakValue) return null;
  const breakStr = String(breakValue).trim().toLowerCase();
  const matchTime = breakStr.match(/^(\d+):(\d+)$/);
  if (matchTime) return parseInt(matchTime[1], 10) * 60 + parseInt(matchTime[2], 10);
  return null;
}
function extractLoop(route?: string) {
  if (!route) return '';
  const cleaned = route.replace(/^Flex\s+/i, '');
  const match = cleaned.match(/^([A-Z]{2}\d+)/);
  return match ? match[1] : '';
}

const DEPOT_SORT_HOURS: Record<string, number> = { LSE: 2 + 45 / 60, LCY: 2, MSE: 1 + 45 / 60 };
const VENDOR_EXTRA_HOURS = 15 / 60;

function hasSortY(routeSort: number | string | null | undefined) {
  if (routeSort == null) return false;
  if (typeof routeSort === 'string') return routeSort.toLowerCase() === 'y' || parseFloat(routeSort) > 0;
  return Number(routeSort) > 0;
}
function parseWorkedHoursToDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) || value < 0 ? 0 : value;
  const s = String(value).trim();
  if (!s) return 0;
  const parsed = parseFloat(s);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}
function calculateSortHoursForRow(routeSort: number, depositName?: string) {
  if (routeSort <= 0) return 0;
  const normalized = (depositName || '').trim().toUpperCase();
  if (normalized !== 'LSE' && normalized !== 'LCY' && normalized !== 'MSE') return 0;
  return DEPOT_SORT_HOURS[normalized] ?? 0;
}
function calculateWorkHoursWithSort(workHours: number | null | undefined, routeSort: number, depositName?: string) {
  const base = Math.max(0, parseWorkedHoursToDecimal(workHours));
  return base + calculateSortHoursForRow(routeSort, depositName);
}
function formatDecimalHoursAsHMM(hours: number | null | undefined) {
  if (hours == null || hours <= 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}
function calculateTotalWorkHoursIncludingSort(rows: Row[]) {
  let workHoursWithSortTotal = 0;
  for (const row of rows) workHoursWithSortTotal += calculateWorkHoursWithSort(row.workHours, row.routeSort, row.depot);
  const byDate = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Set());
    if (row.vendor) byDate.get(row.date)!.add(row.vendor);
  }
  let vendorExtraTotal = 0;
  for (const vendors of byDate.values()) vendorExtraTotal += vendors.size * VENDOR_EXTRA_HOURS;
  return workHoursWithSortTotal + vendorExtraTotal;
}

const MOCK_NOTES = ['Vehicle arrived late.', 'Extra stop confirmed by depot.', 'Route completed early.', 'Traffic delay reported.', 'Customer redelivery required.', 'Vehicle breakdown, replacement dispatched.'];
const PAGE_SIZES = [10, 25, 50, 100, 500];

interface Row {
  date: string; route: string; vendor: string; vrn: string; tw: number | null; depart: string | null; arrive: string | null;
  workHours: number | null; stops: number; note: string; depot: string; breakTime: string | null; loop: string | null;
  routeSort: number; isSpms: boolean; workHoursWithSort?: number;
}

const DEPOTS = ['LSE', 'LCY', 'MSE', 'BHX', 'NNL'];
const LOOPS_BY_DEPOT: Record<string, string[]> = { LSE: ['LS1', 'LS2', 'LS3', 'LL3'], LCY: ['LC1', 'LC2', 'LC3', 'LL4'], MSE: ['MS1', 'MS2', 'MS3', 'MS4'], BHX: ['BH1', 'BH2', 'BH3'], NNL: ['NN1', 'NN2', 'NN3'] };
const FIRST_NAMES = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz', 'Sophie', 'Lukas'];
const LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy', 'Adebayo', 'Cohen'];
const VENDORS = Array.from({ length: 16 }, (_, i) => `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`);

function buildVrns() {
  const rng = rngForSeed('dor-vehicles-v1');
  return Array.from({ length: 18 }, () => {
    const letters = String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26));
    const nums = String(10 + Math.floor(rng() * 89));
    const tail = String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26));
    return `${letters}${nums} ${tail}`;
  });
}
const VRNS = buildVrns();

function generateRowsForDate(dateISO: string): Row[] {
  const rng = rngForSeed(`dor-day-${dateISO}`);
  const dow = parseLocalDate(dateISO).getDay();
  if (dow === 0) return [];

  const count = 20 + Math.floor(rng() * 41);
  const rows: Row[] = [];

  for (let i = 0; i < count; i++) {
    if (rng() < 0.04) {
      rows.push({ date: dateISO, route: 'OFF', vendor: VENDORS[Math.floor(rng() * VENDORS.length)], vrn: '---', tw: null, depart: null, arrive: null, workHours: null, stops: 0, note: rng() < 0.4 ? 'Scheduled day off.' : '', depot: 'OFF', breakTime: null, loop: null, routeSort: 0, isSpms: true });
      continue;
    }

    const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
    const loop = LOOPS_BY_DEPOT[depot][Math.floor(rng() * LOOPS_BY_DEPOT[depot].length)];
    const isFlex = rng() < 0.18;
    const route = isFlex ? `${loop} FLEX` : loop;
    const vendor = VENDORS[Math.floor(rng() * VENDORS.length)];
    const vrn = VRNS[Math.floor(rng() * VRNS.length)];
    const tw = rng() < 0.05 ? null : Math.min(1, Math.max(0, 0.7 + rng() * 0.32));
    const departMinutes = 300 + Math.floor(rng() * 240);
    const workHours = Math.round((7 + rng() * 6) * 100) / 100;
    const arriveMinutes = Math.min(1439, departMinutes + Math.round(workHours * 60));
    const depart = `${String(Math.floor(departMinutes / 60)).padStart(2, '0')}:${String(departMinutes % 60).padStart(2, '0')}`;
    const arrive = `${String(Math.floor(arriveMinutes / 60)).padStart(2, '0')}:${String(arriveMinutes % 60).padStart(2, '0')}`;
    const breakMinutes = rng() < 0.2 ? 15 + Math.floor(rng() * 14) : 30 + Math.floor(rng() * 31);
    const breakTime = `${Math.floor(breakMinutes / 60)}:${String(breakMinutes % 60).padStart(2, '0')}`;
    const stops = 40 + Math.floor(rng() * 120);
    const routeSort = rng() < 0.5 ? 1 : 0;
    const isSpms = rng() < 0.9;
    const note = rng() < 0.22 ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '';

    rows.push({ date: dateISO, route, vendor, vrn, tw, depart, arrive, workHours, stops, note, depot, breakTime, loop, routeSort, isSpms });
  }
  return rows;
}

type SortField = 'date' | 'route' | 'vendor' | 'vrn' | 'tw' | 'depart' | 'arrive' | 'breakTime' | 'workHours' | 'stops';
const COLUMNS: { key: SortField | null; label: string }[] = [
  { key: 'date', label: 'Date' }, { key: 'route', label: 'Route' }, { key: 'vendor', label: 'Vendor' }, { key: 'vrn', label: 'VRN' },
  { key: 'tw', label: 'TW (%)' }, { key: 'depart', label: 'Depart' }, { key: 'arrive', label: 'Arrive' }, { key: 'breakTime', label: 'Break' },
  { key: 'workHours', label: 'Work Hours' }, { key: 'stops', label: 'Stops' }, { key: null, label: 'Note' },
];

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }
let toastSeq = 0;

export default function DailyOperationsReportsPage() {
  useBodyClass('dor-page has-beam-sidebar');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const today = useMemo(() => formatDateISO(new Date()), []);
  const [dateFrom, setDateFrom] = useState(() => addDaysISO(today, -6));
  const [dateTo, setDateTo] = useState(today);
  const [depotFilter, setDepotFilter] = useState('All');
  const [loopFilter, setLoopFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [vendorModal, setVendorModal] = useState<string | null>(null);
  const [openWhPopover, setOpenWhPopover] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const rowsByDate = useRef(new Map<string, Row[]>());

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    setTableLoading(true);
    const t = setTimeout(() => setTableLoading(false), 200);
    return () => clearTimeout(t);
  }, [dateFrom, dateTo]);
  useEffect(() => {
    setItemsPerPage(dateTo && dateTo.trim() ? 50 : 500);
    setCurrentPage(1);
  }, [dateFrom, dateTo]);

  function getRowsForDate(dateISO: string): Row[] {
    if (!rowsByDate.current.has(dateISO)) rowsByDate.current.set(dateISO, generateRowsForDate(dateISO));
    return rowsByDate.current.get(dateISO)!;
  }
  function getRowsInRange(): Row[] {
    if (!dateFrom) return [];
    const from = dateFrom;
    const to = dateTo && dateTo >= dateFrom ? dateTo : dateFrom;
    const rows: Row[] = [];
    let cursor = from;
    let guard = 0;
    while (cursor <= to && guard < 400) {
      rows.push(...getRowsForDate(cursor));
      cursor = addDaysISO(cursor, 1);
      guard++;
    }
    return rows;
  }

  const toggleRows = useMemo(() => {
    let rows = getRowsInRange();
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((r) => (r.route || '').toLowerCase().includes(term) || (r.vrn || '').toLowerCase().includes(term) || (r.vendor || '').toLowerCase().includes(term));
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, search]);

  const uniqueDepots = useMemo(() => Array.from(new Set(toggleRows.map((r) => r.depot).filter((d) => d && d !== 'BAOP' && d !== 'GEN'))).sort(), [toggleRows]);
  const loopSourceRows = depotFilter !== 'All' && depotFilter !== 'Off' ? toggleRows.filter((r) => (r.depot || '').toUpperCase() === depotFilter.toUpperCase()) : toggleRows;
  const uniqueLoops = useMemo(() => Array.from(new Set(loopSourceRows.map((r) => r.loop || extractLoop(r.route)).filter(Boolean))).sort(), [loopSourceRows]);

  function applySort(rows: Row[]): Row[] {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av: string | number | null = sortField === 'workHours' ? (a.workHoursWithSort ?? null) : (a[sortField] as string | number | null);
      let bv: string | number | null = sortField === 'workHours' ? (b.workHoursWithSort ?? null) : (b[sortField] as string | number | null);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sortField === 'date') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else if (sortField === 'tw' || sortField === 'stops' || sortField === 'workHours') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else {
        av = String(av).toLowerCase().trim();
        bv = String(bv).toLowerCase().trim();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const filteredRows = useMemo(() => {
    let rows = getRowsInRange();
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((r) => (r.route || '').toLowerCase().includes(term) || (r.vrn || '').toLowerCase().includes(term) || (r.vendor || '').toLowerCase().includes(term));
    }
    if (depotFilter !== 'All') {
      if (depotFilter === 'Off') rows = rows.filter((r) => (r.depot || '').trim().toUpperCase() === 'OFF');
      else {
        const fd = depotFilter.trim().toUpperCase();
        rows = rows.filter((r) => {
          const rd = (r.depot || '').trim().toUpperCase();
          return rd === fd || rd.includes(fd) || fd.includes(rd);
        });
      }
    }
    if (loopFilter !== 'All') rows = rows.filter((r) => (r.loop || extractLoop(r.route)) === loopFilter);
    rows = rows.map((r) => ({ ...r, workHoursWithSort: calculateWorkHoursWithSort(r.workHours, r.routeSort, r.depot) }));
    return applySort(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, search, depotFilter, loopFilter, sortField, sortDirection]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const start = (effectivePage - 1) * itemsPerPage;
  const pageRows = filteredRows.slice(start, start + itemsPerPage);

  const totalStops = filteredRows.reduce((sum, r) => sum + (r.stops || 0), 0);
  const totalWorkHoursIncludingSort = calculateTotalWorkHoursIncludingSort(filteredRows);
  const uniqueRoutes = new Set(filteredRows.map((r) => r.route).filter(Boolean)).size;

  function handleSort(key: SortField) {
    if (sortField === key) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }

  function handleClearFilters() {
    setDateFrom(addDaysISO(today, -6));
    setDateTo(today);
    setDepotFilter('All');
    setLoopFilter('All');
    setSearch('');
    setCurrentPage(1);
  }

  function weekFilenameSuffix() {
    const from = (dateFrom || dateTo || '').replace(/-/g, '');
    const to = (dateTo || dateFrom || '').replace(/-/g, '');
    return from === to ? from : `${from}-to-${to}`;
  }

  function exportXlsx() {
    const rows = filteredRows;
    if (rows.length === 0) return;
    const sheetRows = rows.map((r) => ({
      Date: formatDateDisplay(r.date),
      Route: isFlexRoute(r.route) && !r.route.trim().toUpperCase().startsWith('FLEX') ? `Flex ${r.route}` : r.route,
      Vendor: r.vendor, VRN: r.vrn,
      'TW (%)': r.tw !== null && r.tw !== undefined ? formatTW(r.tw) : '---',
      Depart: formatValue(r.depart), Arrive: r.arrive || '---', Break: formatValue(r.breakTime),
      'Work Hours': formatDecimalHoursAsHMM(r.workHoursWithSort), Stops: formatValue(r.stops), Note: r.note || '', Depot: r.depot,
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operations Insights');
    XLSX.writeFile(workbook, `daily-operations-reports-${weekFilenameSuffix()}.xlsx`);
    showToast(`Exported ${rows.length} row(s) to XLSX.`, 'success');
  }

  function exportPdf() {
    const rows = filteredRows;
    if (rows.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      showToast('Please allow pop-ups to export PDF.', 'error');
      return;
    }
    const bodyRows = rows.map((r) => {
      const routeDisplay = isFlexRoute(r.route) && !r.route.trim().toUpperCase().startsWith('FLEX') ? `Flex ${r.route}` : r.route;
      return `<tr><td>${formatDateDisplay(r.date)}</td><td>${routeDisplay}</td><td>${r.vendor}</td><td>${r.vrn}</td><td class="amount">${r.tw !== null && r.tw !== undefined ? formatTW(r.tw) : '---'}</td><td>${formatValue(r.depart)}</td><td>${r.arrive || '---'}</td><td>${formatValue(r.breakTime)}</td><td class="amount">${formatDecimalHoursAsHMM(r.workHoursWithSort)}</td><td class="amount">${formatValue(r.stops)}</td><td>${r.note || ''}</td></tr>`;
    }).join('');
    const periodLabel = dateFrom && dateTo && dateFrom !== dateTo ? `Period: ${formatDateLong(dateFrom)} – ${formatDateLong(dateTo)}` : `Date: ${formatDateLong(dateFrom || dateTo)}`;
    printWindow.document.write(`<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8" /><title>Operations Insights — ${periodLabel}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:24px}h1{font-size:18px;margin:0 0 4px}p.subtitle{font-size:12px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:5px 6px;text-align:left}th{background:#f1f5f9;text-transform:uppercase;font-size:8px;letter-spacing:.04em}td.amount,th.amount{text-align:right}@media print{body{padding:0}}</style></head><body><h1>Operations Insights</h1><p class="subtitle">${periodLabel} · ${rows.length} record(s)</p><table><thead><tr><th>Date</th><th>Route</th><th>Vendor</th><th>VRN</th><th class="amount">TW (%)</th><th>Depart</th><th>Arrive</th><th>Break</th><th class="amount">Work Hours</th><th class="amount">Stops</th><th>Note</th></tr></thead><tbody>${bodyRows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
    showToast(`Print dialog opened for ${rows.length} row(s).`, 'info');
  }

  const vendorRows = vendorModal ? filteredRows.filter((r) => r.vendor === vendorModal) : [];
  const vendorTotalStops = vendorRows.reduce((sum, r) => sum + (r.stops || 0), 0);
  const vendorTotalWorkHours = vendorRows.reduce((sum, r) => sum + calculateWorkHoursWithSort(r.workHours, r.routeSort, r.depot), 0);

  const headerSubtitle = dateFrom && dateTo && dateFrom !== dateTo ? `Period: ${formatDateLong(dateFrom)} – ${formatDateLong(dateTo)}` : `Date: ${formatDateLong(dateFrom || dateTo)}`;

  const pageNumbers: number[] = [];
  const windowSize = Math.min(totalPages, 10);
  let startPage: number;
  if (totalPages <= 10) startPage = 1;
  else if (effectivePage <= 5) startPage = 1;
  else if (effectivePage >= totalPages - 4) startPage = totalPages - 9;
  else startPage = effectivePage - 5;
  for (let i = 0; i < windowSize; i++) pageNumbers.push(startPage + i);
  const from = totalItems === 0 ? 0 : (effectivePage - 1) * itemsPerPage + 1;
  const to = Math.min(effectivePage * itemsPerPage, totalItems);

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading operations insights…</p>
      </div>

      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <main className="dor-container container-fluid px-3 px-lg-4 py-4">
          <header className="page-header-section">
            <div className="page-header-welcome-text">
              <h1 className="page-header-title">Operations Insights</h1>
              <p className="page-header-date"><i className="bi bi-bar-chart" /><span>{headerSubtitle}</span></p>
            </div>
            <div className="dor-metrics">
              {[
                { label: 'Total Records', value: filteredRows.length },
                { label: 'Total Stops', value: totalStops },
                { label: 'Routes', value: uniqueRoutes },
                { label: 'Total Hours (incl. sort)', value: formatDecimalHoursAsHMM(totalWorkHoursIncludingSort) },
              ].map((m) => (
                <div className="dor-metric-card" key={m.label}>
                  <p className="dor-metric-label">{m.label}</p>
                  <p className="dor-metric-value">{m.value}</p>
                </div>
              ))}
            </div>
          </header>

          <div className="filters-bar">
            <div>
              <label className="filters-label">Period</label>
              <div className="dor-period-group">
                <input type="date" className="date-nav-input" aria-label="Period from" value={dateFrom} onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  setDateFrom(value);
                  if (dateTo && dateTo < value) setDateTo(value);
                }} />
                <span className="dor-period-sep">to</span>
                <input type="date" className="date-nav-input" aria-label="Period to" value={dateTo} onChange={(e) => {
                  const value = e.target.value;
                  setDateTo(value);
                  if (value && dateFrom && value < dateFrom) setDateFrom(value);
                }} />
              </div>
            </div>
            <div className="search-wrap dor-search-wrap">
              <label className="filters-label">Search (Route, Vehicle, Vendor)</label>
              <div className="search-input-wrap">
                <i className="bi bi-search" />
                <input type="text" className="form-control" placeholder="Route, vehicle, vendor…" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>
            <div className="dor-actions">
              <button type="button" className="styled-button styled-button--outline" onClick={handleClearFilters}><i className="bi bi-x-circle" /> Clear</button>
              <button type="button" className="styled-button styled-button--outline" onClick={exportXlsx}><i className="bi bi-file-earmark-excel" /> Export XLSX</button>
              <button type="button" className="styled-button styled-button--outline" onClick={exportPdf}><i className="bi bi-file-earmark-pdf" /> Export PDF</button>
            </div>
          </div>

          <div className="dor-toggles-bar">
            <div className="dor-toggle-group">
              <span className="dor-toggle-label">Depot</span>
              <div className="dor-chip-row">
                <button type="button" className={`dor-chip${depotFilter === 'All' ? ' active' : ''}`} onClick={() => { setDepotFilter('All'); setLoopFilter('All'); setCurrentPage(1); }}>All</button>
                <button type="button" className={`dor-chip${depotFilter === 'Off' ? ' active' : ''}`} onClick={() => { setDepotFilter('Off'); setLoopFilter('All'); setCurrentPage(1); }}>Off</button>
                {uniqueDepots.filter((d) => d.toUpperCase() !== 'OFF').map((d) => (
                  <button key={d} type="button" className={`dor-chip${depotFilter === d ? ' active' : ''}`} onClick={() => { setDepotFilter(d); setLoopFilter('All'); setCurrentPage(1); }}>{d}</button>
                ))}
              </div>
            </div>
            <div className="dor-toggle-group">
              <span className="dor-toggle-label">Loop</span>
              <div className="dor-chip-row">
                <button type="button" className={`dor-chip${loopFilter === 'All' ? ' active' : ''}`} onClick={() => { setLoopFilter('All'); setCurrentPage(1); }}>All</button>
                {uniqueLoops.map((l) => (
                  <button key={l} type="button" className={`dor-chip${loopFilter === l ? ' active' : ''}`} onClick={() => { setLoopFilter(l); setCurrentPage(1); }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="dor-table-card">
            <div className="dor-table-scroll">
              <table className="dor-table" id="reportsTable">
                <thead id="reportsTableHead">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col.label} className={col.key ? 'dor-vendor-th' : 'dor-no-sort'} style={col.key ? { cursor: 'pointer' } : undefined} onClick={col.key ? () => handleSort(col.key as SortField) : undefined}>
                        {col.label}
                        {col.key && sortField === col.key && <span className="sort-ind"><i className={`bi bi-arrow-${sortDirection === 'asc' ? 'down' : 'up'}`} /></span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody id="reportsTableBody">
                  {tableLoading ? (
                    <tr><td colSpan={11} className="dor-table-message">Loading…</td></tr>
                  ) : filteredRows.length === 0 ? (
                    <tr><td colSpan={11} className="dor-table-message">{search.trim() !== '' || depotFilter !== 'All' || loopFilter !== 'All' ? 'No records found for the selected filters.' : 'No operations for the selected period.'}</td></tr>
                  ) : (
                    pageRows.map((row, idx) => {
                      const flexPrefixed = isFlexRoute(row.route) && !row.route.trim().toUpperCase().startsWith('FLEX');
                      const routeDisplay = flexPrefixed ? `Flex ${row.route}` : row.route;
                      const sortYes = hasSortY(row.routeSort);
                      const twClass = getTWClass(row.tw);
                      const twText = row.tw !== null && row.tw !== undefined ? formatTW(row.tw) : '---';
                      const breakMinutes = breakToMinutes(row.breakTime);
                      const breakClass = breakMinutes !== null && breakMinutes < 30 ? 'dor-break-red' : '';
                      let arriveClass = '';
                      if (row.arrive) {
                        const arriveMinutes = timeToMinutes(row.arrive);
                        const loop = row.loop || extractLoop(row.route);
                        const isFlex = isFlexRoute(row.route);
                        if (arriveMinutes !== null && !isFlex) {
                          if ((row.depot === 'MSE' || row.depot === 'LCY') && arriveMinutes < 1020) arriveClass = 'dor-arrive-red';
                          if ((loop === 'LL3' || loop === 'LL4') && arriveMinutes < 1080) arriveClass = 'dor-arrive-red';
                        }
                      }
                      const whDisplay = row.workHoursWithSort != null ? formatDecimalHoursAsHMM(row.workHoursWithSort) : row.workHours != null ? formatValue(row.workHours) : null;
                      const whHours = row.workHoursWithSort ?? parseWorkedHoursToDecimal(row.workHours);
                      const whClass = whHours < 10 ? 'dor-workhours-red' : whHours > 10 ? 'dor-workhours-green' : '';
                      const sortNote = sortYes ? `Sort: Yes (${DEPOT_SORT_HOURS[row.depot] != null ? row.depot + ' +' + formatDecimalHoursAsHMM(DEPOT_SORT_HOURS[row.depot]) : 'no depot bonus'})` : 'Sort: No';
                      const whTooltip = `Depart: ${row.depart ?? '---'} · Arrive: ${row.arrive ?? '---'} · ${sortNote}`;
                      const rowKey = `${row.date}-${row.vrn}-${idx}`;
                      return (
                        <tr key={rowKey}>
                          <td data-label="Date">{formatDateDisplay(row.date)}</td>
                          <td data-label="Route">
                            <span className="dor-route-cell">
                              <span className={`dor-route-dot ${sortYes ? 'dor-route-dot--yes' : 'dor-route-dot--no'}`} title={sortYes ? 'Sort: Yes' : 'Sort: No'} />
                              <span className="dor-route-name">{routeDisplay}</span>
                            </span>
                          </td>
                          <td data-label="Vendor" className="dor-vendor-cell">
                            <button type="button" className="dor-vendor-link" title={`View all records for ${row.vendor}`} onClick={() => setVendorModal(row.vendor)}>{row.vendor}</button>
                          </td>
                          <td data-label="VRN"><span className="dor-vrn-plate">{row.vrn}</span></td>
                          <td data-label="TW (%)"><span className={twClass}>{twText}</span></td>
                          <td data-label="Depart">{formatValue(row.depart)}</td>
                          <td data-label="Arrive"><span className={arriveClass}>{row.arrive ? row.arrive : '---'}</span></td>
                          <td data-label="Break"><span className={breakClass}>{formatValue(row.breakTime)}</span></td>
                          <td data-label="Work Hours">
                            {whDisplay == null ? <span title={whTooltip}>---</span> : (
                              <span className="dor-workhours-wrap">
                                <span className={`dor-workhours-value ${whClass}`} title={whTooltip} onClick={() => setOpenWhPopover(openWhPopover === idx ? null : idx)} style={{ cursor: 'pointer' }}>{whDisplay}</span>
                              </span>
                            )}
                          </td>
                          <td data-label="Stops" className={row.isSpms === false ? 'dor-stops-highlight' : ''}>{formatValue(row.stops)}</td>
                          <td data-label="Note">{row.note && row.note.trim() !== '' && row.note !== '-' ? <span className="dor-note-icon" title={row.note}>!</span> : ''}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {!tableLoading && filteredRows.length > 0 && (
                  <tfoot id="reportsTableFoot">
                    <tr className="dor-totals-row">
                      <td colSpan={8} className="dor-totals-label">Total Work Hours (incl. sort)</td>
                      <td colSpan={1}>{formatDecimalHoursAsHMM(totalWorkHoursIncludingSort)}</td>
                      <td colSpan={2}></td>
                    </tr>
                    <tr className="dor-totals-row">
                      <td colSpan={9} className="dor-totals-label">Total Stops</td>
                      <td colSpan={1}>{totalStops}</td>
                      <td colSpan={1}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {!tableLoading && filteredRows.length > 0 && (
              <div className="dor-pagination-bar" id="paginationBar">
                <div className="dor-pagination-info">Showing <strong>{from}</strong>-<strong>{to}</strong> of <strong>{totalItems}</strong></div>
                <div className="dor-pagination-controls">
                  <div className="dor-per-page-group">
                    <label>Items per page:</label>
                    <select className="dor-per-page-select" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                      {PAGE_SIZES.map((size) => <option value={size} key={size}>{size}</option>)}
                    </select>
                  </div>
                  <nav aria-label="Pagination">
                    <ul className="dor-page-list">
                      <li><button type="button" className="dor-page-btn" disabled={effectivePage === 1} onClick={() => setCurrentPage(effectivePage - 1)}>Previous</button></li>
                      {pageNumbers.map((p) => (
                        <li key={p}><button type="button" className={`dor-page-btn${p === effectivePage ? ' active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button></li>
                      ))}
                      <li><button type="button" className="dor-page-btn" disabled={effectivePage === totalPages} onClick={() => setCurrentPage(effectivePage + 1)}>Next</button></li>
                    </ul>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Vendor Details Modal */}
      {vendorModal && (
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setVendorModal(null); }}>
          <div className="dom-modal dor-vendor-modal">
            <div className="dom-modal-header">
              <div>
                <h2 className="dom-modal-title">Vendor Details: {vendorModal}</h2>
                <p className="dor-vendor-modal-subtitle">{vendorRows.length} record{vendorRows.length !== 1 ? 's' : ''} found</p>
              </div>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={() => setVendorModal(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="dom-modal-body">
              <div className="dor-vendor-summary">
                <div className="dor-summary-card dor-summary-card--blue">
                  <p className="dor-summary-label">Total Records</p>
                  <p className="dor-summary-value">{vendorRows.length}</p>
                </div>
                <div className="dor-summary-card dor-summary-card--green">
                  <p className="dor-summary-label">Total Stops</p>
                  <p className="dor-summary-value">{vendorTotalStops}</p>
                </div>
                <div className="dor-summary-card dor-summary-card--purple">
                  <p className="dor-summary-label">Total Work Hours</p>
                  <p className="dor-summary-value">{formatDecimalHoursAsHMM(vendorTotalWorkHours)}</p>
                </div>
              </div>
              <div className="dor-vendor-cards">
                {vendorRows.length === 0 ? (
                  <p className="dor-table-message">No records found for this vendor.</p>
                ) : (
                  vendorRows.map((row, idx) => {
                    const flexPrefixed = isFlexRoute(row.route) && !row.route.trim().toUpperCase().startsWith('FLEX');
                    const routeDisplay = flexPrefixed ? `Flex ${row.route}` : row.route;
                    const sortYes = hasSortY(row.routeSort);
                    return (
                      <div className="dor-vendor-card" key={`${row.date}-${row.vrn}-${idx}`}>
                        <div className="dor-vendor-card-row dor-vendor-card-header"><span className="dor-vendor-card-key">Date</span><span className="dor-vendor-card-val">{formatDateDisplay(row.date)}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Route</span><span className="dor-vendor-card-val"><span className={`dor-route-dot ${sortYes ? 'dor-route-dot--yes' : 'dor-route-dot--no'}`} style={{ marginRight: 4, display: 'inline-block' }} />{routeDisplay}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">VRN</span><span className="dor-vendor-card-val">{row.vrn}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Depot</span><span className="dor-vendor-card-val">{row.depot || '---'}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Depart</span><span className="dor-vendor-card-val">{formatValue(row.depart)}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Arrive</span><span className="dor-vendor-card-val">{row.arrive ? row.arrive : '---'}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Break</span><span className="dor-vendor-card-val">{formatValue(row.breakTime)}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">TW (%)</span><span className={`dor-vendor-card-val ${getTWClass(row.tw)}`}>{row.tw !== null && row.tw !== undefined ? formatTW(row.tw) : '---'}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Work Hours</span><span className="dor-vendor-card-val">{formatDecimalHoursAsHMM(calculateWorkHoursWithSort(row.workHours, row.routeSort, row.depot))}</span></div>
                        <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Stops</span><span className="dor-vendor-card-val">{formatValue(row.stops)}</span></div>
                        {row.note && <div className="dor-vendor-card-row"><span className="dor-vendor-card-key">Note</span><span className="dor-vendor-card-val" title={row.note}><span className="dor-note-icon">!</span></span></div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => {
          const icon = t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
          return (
            <div className={`app-toast ${t.type}`} key={t.id}>
              <i className={`bi ${icon}`} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
