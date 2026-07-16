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

function formatCurrency(value: number) {
  return `£${(Number(value) || 0).toFixed(2)}`;
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
function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return '--';
  return parseLocalDate(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function formatDateLong(dateStr?: string) {
  if (!dateStr) return '--';
  return parseLocalDate(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAYMENT_MODES = [
  { value: 'DR', label: 'DR' },
  { value: 'FSR', label: 'FSR' },
  { value: 'VSR', label: 'VSR' },
  { value: 'SP_VSR', label: 'SP_VSR' },
  { value: '1', label: 'DAF' },
  { value: '7', label: 'Hourly Rate' },
  { value: 'OFF', label: 'OFF' },
];
const PAYMENT_MODE_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label]));
const REQUIRED_RATE_MODES = new Set(['DR', 'FSR', '7']);
const FLAT_RATE_MODES = new Set(['DR', '1']);

interface Row {
  operationId: string; date: string; depot: string; vrm: string; courier: string; route: string;
  paymentMode: string; rate: number; stops: number; sort: number; adhoc: number; extras: number; notes: string;
  adhocServiceId: number | null;
}

function calculateRow(row: Row) {
  if (row.paymentMode === 'OFF') return { total: 0, avgPerStop: 0 };
  const { rate = 0, stops = 0, sort = 0, adhoc = 0, extras = 0 } = row;
  const total = FLAT_RATE_MODES.has(row.paymentMode) ? rate + sort + adhoc + extras : rate * stops + sort + adhoc + extras;
  const avgPerStop = stops > 0 ? total / stops : 0;
  return { total, avgPerStop };
}
function calculateTotalPaidStops(row: Row) {
  if (row.paymentMode === 'OFF') return 0;
  if (FLAT_RATE_MODES.has(row.paymentMode)) return row.stops || 0;
  return (row.stops || 0) + (row.rate || 0);
}

const MOCK_NOTES = ['Vehicle arrived late.', 'Extra stop confirmed by depot.', 'Route completed early.', 'Traffic delay reported.', 'Customer redelivery required.'];

const DEPOTS = ['LCY', 'LSE', 'MSE', 'BAOP'];
const ROUTES_BY_DEPOT: Record<string, string[]> = Object.fromEntries(DEPOTS.map((dep) => [dep, Array.from({ length: 4 }, (_, i) => `${dep}${i + 1}`)]));
const ALL_ROUTES = DEPOTS.flatMap((dep) => ROUTES_BY_DEPOT[dep]);
const FIRST_NAMES = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
const LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
const VENDORS = Array.from({ length: 12 }, (_, i) => ({ userId: 2000 + i, fullName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}` }));

function buildVehicles() {
  const rng = rngForSeed('dfi-vehicles-v1');
  return Array.from({ length: 16 }, (_, i) => {
    const letters = String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26));
    const nums = String(10 + Math.floor(rng() * 89));
    const tail = String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26));
    return { vehicleId: 3000 + i, registrationPlates: `${letters}${nums} ${tail}` };
  });
}
const VEHICLES = buildVehicles();

const ADHOC_SERVICES = [
  { adhocServiceId: 1, adhocName: 'Extra Stop', adhocVendorPayment: 12 },
  { adhocServiceId: 2, adhocName: 'Redelivery', adhocVendorPayment: 9 },
  { adhocServiceId: 3, adhocName: 'Recovery', adhocVendorPayment: 24 },
  { adhocServiceId: 4, adhocName: 'Additional Collection', adhocVendorPayment: 15 },
  { adhocServiceId: 5, adhocName: 'Out of Hours Run', adhocVendorPayment: 32 },
];

function generateRowsForDate(dateISO: string): Row[] {
  const rng = rngForSeed(`dfi-day-${dateISO}`);
  const count = 15 + Math.floor(rng() * 26);
  const rows: Row[] = [];

  for (let i = 0; i < count; i++) {
    const depot = DEPOTS[Math.floor(rng() * DEPOTS.length)];
    const vendor = VENDORS[Math.floor(rng() * VENDORS.length)];
    const vehicle = VEHICLES[Math.floor(rng() * VEHICLES.length)];
    const route = ROUTES_BY_DEPOT[depot][Math.floor(rng() * ROUTES_BY_DEPOT[depot].length)];

    const roll = rng();
    let paymentMode: string;
    if (roll < 0.3) paymentMode = 'FSR';
    else if (roll < 0.5) paymentMode = 'VSR';
    else if (roll < 0.65) paymentMode = 'SP_VSR';
    else if (roll < 0.8) paymentMode = 'DR';
    else if (roll < 0.9) paymentMode = '1';
    else if (roll < 0.95) paymentMode = '7';
    else paymentMode = 'OFF';

    let rate = 0, stops = 0, sort = 0, extras = 0, adhoc = 0, adhocServiceId: number | null = null;

    if (paymentMode !== 'OFF') {
      if (paymentMode === 'DR' || paymentMode === '1') {
        rate = Math.round((100 + rng() * 80) * 100) / 100;
        stops = 60 + Math.floor(rng() * 100);
      } else if (paymentMode === '7') {
        rate = Math.round((12 + rng() * 6) * 100) / 100;
        stops = 6 + Math.floor(rng() * 5);
      } else {
        rate = Math.round((1.0 + rng() * 1.3) * 100) / 100;
        stops = 60 + Math.floor(rng() * 100);
      }
      sort = rng() < 0.6 ? Math.round(rng() * 32 * 100) / 100 : 0;
      extras = rng() < 0.3 ? Math.round((2 + rng() * 14) * 100) / 100 : 0;
      if (rng() < 0.2) {
        const svc = ADHOC_SERVICES[Math.floor(rng() * ADHOC_SERVICES.length)];
        adhocServiceId = svc.adhocServiceId;
        adhoc = svc.adhocVendorPayment;
      }
    }

    const notes = rng() < 0.25 ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '';

    rows.push({ operationId: `${dateISO}-${i}`, date: dateISO, depot, vrm: vehicle.registrationPlates, courier: vendor.fullName, route, paymentMode, rate, stops, sort, adhoc, extras, notes, adhocServiceId });
  }
  return rows;
}

type SortField = 'date' | 'vrm' | 'courier' | 'route' | 'paymentMode' | 'rate' | 'stops' | 'totalPaidStops' | 'sort' | 'adhoc' | 'extras' | 'total' | 'avgPerStop';
const NUMERIC_FIELDS = new Set(['rate', 'stops', 'sort', 'adhoc', 'extras', 'total', 'avgPerStop', 'totalPaidStops']);

const COLUMNS: { key: SortField | null; label: string }[] = [
  { key: 'date', label: 'Date' }, { key: 'vrm', label: 'VRN' }, { key: 'courier', label: 'Vendor' }, { key: 'route', label: 'Route' },
  { key: 'paymentMode', label: 'Payment' }, { key: 'rate', label: 'Rate' }, { key: 'stops', label: 'Stops' }, { key: 'totalPaidStops', label: 'Total Paid' },
  { key: 'sort', label: 'Route Sort' }, { key: 'adhoc', label: 'AD-HOC SERVICE' }, { key: 'extras', label: 'Extras' }, { key: null, label: 'Notes' },
  { key: 'total', label: 'Total' }, { key: 'avgPerStop', label: 'Avg/Stop' }, { key: null, label: 'Actions' },
];

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }
let toastSeq = 0;

interface FormData {
  date: string; depot: string; vrm: string; vendor: string; route: string; paymentMode: string;
  rate: string; stops: string; sort: string; adhoc: string; extras: string; notes: string; adhocServiceId: string;
}
function emptyFormData(): FormData {
  return { date: formatDateISO(new Date()), depot: '', vrm: '', vendor: '', route: '', paymentMode: '', rate: '', stops: '', sort: '', adhoc: '0', extras: '', notes: '', adhocServiceId: '' };
}

export default function DailyFinancialInsightsPage() {
  useBodyClass('dfi-page has-beam-sidebar');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const today = useMemo(() => formatDateISO(new Date()), []);
  const [dateFrom, setDateFrom] = useState(() => addDaysISO(today, -6));
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('All');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, forceRender] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Add New Register');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  function applySort(rows: Row[]): Row[] {
    const dir = sortDirection === 'asc' ? 1 : -1;
    const valueFor = (row: Row, f: SortField): string | number => {
      if (f === 'total' || f === 'avgPerStop') return calculateRow(row)[f];
      if (f === 'totalPaidStops') return calculateTotalPaidStops(row);
      return row[f as keyof Row] as string | number;
    };
    return [...rows].sort((a, b) => {
      if (sortField === 'date') {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (da !== db) return dir * (da - db);
        return dir * (a.route || '').localeCompare(b.route || '');
      }
      if (NUMERIC_FIELDS.has(sortField)) return dir * (((valueFor(a, sortField) as number) || 0) - ((valueFor(b, sortField) as number) || 0));
      const av = String(valueFor(a, sortField) ?? '').toLowerCase();
      const bv = String(valueFor(b, sortField) ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const filteredRows = useMemo(() => {
    let rows = getRowsInRange();
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter((r) => (r.route || '').toLowerCase().includes(term) || (r.vrm || '').toLowerCase().includes(term) || (r.courier || '').toLowerCase().includes(term));
    }
    if (payment !== 'All') rows = rows.filter((r) => r.paymentMode === payment);
    return applySort(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, search, payment, sortField, sortDirection]);

  function calculatePageTotals(rows: Row[]) {
    let total = 0, totalStops = 0;
    rows.forEach((row) => {
      total += calculateRow(row).total || 0;
      totalStops += row.stops || 0;
    });
    const avg = totalStops > 0 ? total / totalStops : 0;
    return { total: Math.round(total * 100) / 100, avg: Math.round(avg * 100) / 100, count: rows.length };
  }

  const totals = calculatePageTotals(filteredRows);
  const uniqueRoutes = new Set(filteredRows.map((r) => r.route).filter(Boolean)).size;
  const uniqueVendors = new Set(filteredRows.map((r) => r.courier).filter(Boolean)).size;

  function handleSort(key: SortField) {
    if (sortField === key) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(key);
      setSortDirection('asc');
    }
  }

  function handleClearFilters() {
    setDateFrom(addDaysISO(today, -6));
    setDateTo(today);
    setSearch('');
    setPayment('All');
  }

  function findRowById(operationId: string): Row | null {
    for (const rows of rowsByDate.current.values()) {
      const found = rows.find((r) => r.operationId === operationId);
      if (found) return found;
    }
    return null;
  }

  function openCreateModal() {
    setEditingId(null);
    setFormErrors({});
    setFormError('');
    setFormData({ ...emptyFormData(), date: dateTo || today });
    setModalTitle('Add New Register');
    setModalOpen(true);
  }

  function openEditModal(operationId: string) {
    const row = findRowById(operationId);
    if (!row) return;
    setEditingId(operationId);
    setFormErrors({});
    setFormError('');
    setFormData({
      date: row.date, depot: row.depot, vrm: row.vrm, vendor: row.courier, route: row.route, paymentMode: row.paymentMode,
      rate: row.rate ? String(row.rate) : '', stops: row.stops ? String(row.stops) : '', sort: row.sort ? String(row.sort) : '',
      adhoc: row.adhoc ? String(row.adhoc) : '0', extras: row.extras ? String(row.extras) : '', notes: row.notes || '',
      adhocServiceId: row.adhocServiceId != null ? String(row.adhocServiceId) : '',
    });
    setModalTitle('Edit Register');
    setModalOpen(true);
  }

  function validateForm(fd: FormData) {
    const errors: Record<string, string> = {};
    if (!fd.date) errors.date = 'Date is required.';
    if (!fd.vendor) errors.vendor = 'Vendor is required.';
    if (!fd.depot) errors.depot = 'Depot is required.';
    if (!fd.vrm) errors.vrm = 'VRN is required.';
    if (!fd.route) errors.route = 'Route is required.';
    if (!fd.paymentMode) errors.paymentMode = 'Payment mode is required.';
    const isOff = fd.paymentMode === 'OFF';
    const hasAdhocService = Boolean(fd.adhocServiceId);
    if (!isOff && !hasAdhocService && REQUIRED_RATE_MODES.has(fd.paymentMode) && !fd.rate) errors.rate = 'Rate is required for this payment mode.';
    return errors;
  }

  function saveOperation(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setFormError('');

    const fd = formData;
    const isOff = fd.paymentMode === 'OFF';
    const num = (v: string) => (v === '' || v == null ? 0 : parseFloat(String(v).replace(',', '.')) || 0);

    const newRow: Row = {
      operationId: editingId || `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: fd.date, depot: fd.depot, vrm: fd.vrm, courier: fd.vendor, route: fd.route, paymentMode: fd.paymentMode,
      rate: isOff ? 0 : num(fd.rate), stops: isOff ? 0 : num(fd.stops), sort: isOff ? 0 : num(fd.sort),
      adhoc: isOff ? 0 : num(fd.adhoc), extras: isOff ? 0 : num(fd.extras), notes: fd.notes || '',
      adhocServiceId: isOff || !fd.adhocServiceId ? null : Number(fd.adhocServiceId),
    };

    if (editingId) {
      for (const [dateKey, rows] of rowsByDate.current.entries()) {
        const idx = rows.findIndex((r) => r.operationId === editingId);
        if (idx !== -1) {
          rows.splice(idx, 1);
          if (rows.length === 0) rowsByDate.current.delete(dateKey);
          break;
        }
      }
      getRowsForDate(newRow.date).push(newRow);
      showToast('Register updated successfully!', 'success');
    } else {
      getRowsForDate(newRow.date).push(newRow);
      showToast('Register added successfully!', 'success');
    }

    setModalOpen(false);
    forceRender((n) => n + 1);
  }

  function confirmDelete() {
    if (!deleteId) return;
    let removed = false;
    for (const [dateKey, rows] of rowsByDate.current.entries()) {
      const idx = rows.findIndex((r) => r.operationId === deleteId);
      if (idx !== -1) {
        rows.splice(idx, 1);
        if (rows.length === 0) rowsByDate.current.delete(dateKey);
        removed = true;
        break;
      }
    }
    setDeleteId(null);
    if (removed) {
      showToast('Register deleted successfully.', 'success');
      forceRender((n) => n + 1);
    } else {
      showToast('Could not delete register. Please try again.', 'error');
    }
  }

  const deleteRow = deleteId ? findRowById(deleteId) : null;
  const headerSubtitle = dateFrom && dateTo && dateFrom !== dateTo ? `Period: ${formatDateLong(dateFrom)} - ${formatDateLong(dateTo)}` : `Date: ${formatDateLong(dateFrom || dateTo)}`;

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading daily financial insights…</p>
      </div>

      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <main className="dfi-container container-fluid px-3 px-lg-4 py-4">
          <header className="page-header-section">
            <div className="page-header-welcome-text">
              <h1 className="page-header-title">Daily Financial Insights</h1>
              <p className="page-header-date"><i className="bi bi-graph-up" /><span>{headerSubtitle}</span></p>
            </div>
            <div className="dfi-metrics">
              {[
                { label: 'Total Records', value: filteredRows.length },
                { label: 'Total Amount', value: formatCurrency(totals.total) },
                { label: 'Routes', value: uniqueRoutes },
                { label: 'Vendors', value: uniqueVendors },
              ].map((m) => (
                <div className="dfi-metric-card" key={m.label}>
                  <p className="dfi-metric-label">{m.label}</p>
                  <p className="dfi-metric-value">{m.value}</p>
                </div>
              ))}
            </div>
          </header>

          <div className="filters-bar">
            <div>
              <label className="filters-label">Period</label>
              <div className="dfi-period-group">
                <input type="date" className="date-nav-input" aria-label="Period from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value || dateFrom)} />
                <span className="dfi-period-sep">to</span>
                <input type="date" className="date-nav-input" aria-label="Period to" value={dateTo} onChange={(e) => setDateTo(e.target.value || dateTo)} />
              </div>
            </div>
            <div className="search-wrap dfi-search-wrap">
              <label className="filters-label">Search (Route, Vehicle, Vendor)</label>
              <div className="search-input-wrap">
                <i className="bi bi-search" />
                <input type="text" className="form-control" placeholder="Route, vehicle, vendor…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="filters-label">Payment Mode</label>
              <select className="form-select filter-select" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="All">All</option>
                {PAYMENT_MODES.map((m) => <option value={m.value} key={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="dfi-actions">
              <button type="button" className="styled-button styled-button--outline" onClick={handleClearFilters}>
                <i className="bi bi-x-circle" /> Clear
              </button>
              <button type="button" className="styled-button styled-button--primary" onClick={openCreateModal}>
                <i className="bi bi-plus-circle" /> New
              </button>
            </div>
          </div>

          <div className="dfi-table-card">
            <div className="dfi-table-scroll">
              <table className="dfi-table" id="insightsTable">
                <thead id="insightsTableHead">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col.label} className={col.key ? undefined : 'dfi-no-sort'} style={col.key ? { cursor: 'pointer' } : undefined} onClick={col.key ? () => handleSort(col.key as SortField) : undefined}>
                        {col.label}
                        {col.key && sortField === col.key && <span className="sort-ind"><i className={`bi bi-arrow-${sortDirection === 'asc' ? 'down' : 'up'}`} /></span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody id="insightsTableBody">
                  {tableLoading ? (
                    <tr><td colSpan={15} className="dfi-table-message">Loading…</td></tr>
                  ) : filteredRows.length === 0 ? (
                    <tr><td colSpan={15} className="dfi-table-message">{search.trim() !== '' || payment !== 'All' ? 'No results for the current filters.' : 'No registers for the selected period.'}</td></tr>
                  ) : (
                    filteredRows.map((row) => {
                      const isOff = row.paymentMode === 'OFF';
                      const { total, avgPerStop } = calculateRow(row);
                      const totalPaidStops = calculateTotalPaidStops(row);
                      const pmLabel = PAYMENT_MODE_LABEL[row.paymentMode] || row.paymentMode;
                      const rateDisplay = isOff ? '-' : FLAT_RATE_MODES.has(row.paymentMode) ? formatCurrency(row.rate) : `£${(row.rate || 0).toFixed(2)}/stop`;
                      const extrasDisplay = isOff || row.paymentMode === '7' ? '-' : row.extras ? formatCurrency(row.extras) : '-';
                      return (
                        <tr key={row.operationId}>
                          <td data-label="Date">{formatDateDisplay(row.date)}</td>
                          <td data-label="VRN">{row.vrm}</td>
                          <td data-label="Vendor" className="dfi-vendor-cell">{row.courier}</td>
                          <td data-label="Route" className="dfi-route-cell">{row.route}</td>
                          <td data-label="Payment"><span className={`dfi-pm-badge dfi-pm-${row.paymentMode}`}>{pmLabel}</span></td>
                          <td data-label="Rate">{rateDisplay}</td>
                          <td data-label="Stops">{isOff ? '-' : row.stops}</td>
                          <td data-label="Total Paid">{isOff ? '-' : totalPaidStops.toFixed(2)}</td>
                          <td data-label="Route Sort">{isOff || !row.sort ? '-' : formatCurrency(row.sort)}</td>
                          <td data-label="AD-HOC SERVICE">{isOff || !row.adhoc ? '-' : formatCurrency(row.adhoc)}</td>
                          <td data-label="Extras">{extrasDisplay}</td>
                          <td data-label="Notes">{isOff || !row.notes ? '-' : <span className="dfi-notes-icon" title={row.notes}><i className="bi bi-sticky-fill" /></span>}</td>
                          <td data-label="Total" className="dfi-total-col">{isOff ? '-' : formatCurrency(total)}</td>
                          <td data-label="Avg/Stop">{isOff ? '-' : formatCurrency(avgPerStop)}</td>
                          <td data-label="Actions">
                            <div className="dfi-actions-cell">
                              <button type="button" className="dfi-icon-btn" aria-label="Edit operation" title="Edit" onClick={() => openEditModal(row.operationId)}><i className="bi bi-pencil" /></button>
                              <button type="button" className="dfi-icon-btn dfi-delete-btn" aria-label="Delete operation" title="Delete" onClick={() => setDeleteId(row.operationId)}><i className="bi bi-trash" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {!tableLoading && filteredRows.length > 0 && (
                  <tfoot id="insightsTableFoot">
                    <tr className="dfi-totals-row">
                      <td colSpan={12} className="text-end">Total</td>
                      <td className="dfi-total-col">{formatCurrency(totals.total)}</td>
                      <td>{formatCurrency(totals.avg)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Register Modal */}
      {modalOpen && (
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="dom-modal dfi-op-modal">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title">{modalTitle}</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={() => setModalOpen(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <form className="dom-modal-body" onSubmit={saveOperation}>
              {formError && <div className="dfi-form-error">{formError}</div>}
              <div className="dom-form-grid">
                <div className={`dom-form-field${formErrors.date ? ' has-error' : ''}`}>
                  <label className="dom-form-label">Date<span className="required-mark">*</span></label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                  {formErrors.date && <span className="dom-form-error-text">{formErrors.date}</span>}
                </div>
                <div className={`dom-form-field${formErrors.vendor ? ' has-error' : ''}`}>
                  <label className="dom-form-label">Vendor<span className="required-mark">*</span></label>
                  <select value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} required>
                    <option value="">Select Vendor</option>
                    {[...VENDORS].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((v) => <option value={v.fullName} key={v.userId}>{v.fullName}</option>)}
                  </select>
                  {formErrors.vendor && <span className="dom-form-error-text">{formErrors.vendor}</span>}
                </div>
                <div className={`dom-form-field${formErrors.depot ? ' has-error' : ''}`}>
                  <label className="dom-form-label">Depot Location<span className="required-mark">*</span></label>
                  <select value={formData.depot} onChange={(e) => setFormData({ ...formData, depot: e.target.value })} required>
                    <option value="">Select Depot</option>
                    {DEPOTS.map((d) => <option value={d} key={d}>{d}</option>)}
                  </select>
                  {formErrors.depot && <span className="dom-form-error-text">{formErrors.depot}</span>}
                </div>
                <div className={`dom-form-field${formErrors.vrm ? ' has-error' : ''}`}>
                  <label className="dom-form-label">VRN<span className="required-mark">*</span></label>
                  <select value={formData.vrm} onChange={(e) => setFormData({ ...formData, vrm: e.target.value })} required>
                    <option value="">Select Vehicle</option>
                    {VEHICLES.map((v) => <option value={v.registrationPlates} key={v.vehicleId}>{v.registrationPlates}</option>)}
                  </select>
                  {formErrors.vrm && <span className="dom-form-error-text">{formErrors.vrm}</span>}
                </div>
                <div className={`dom-form-field${formErrors.route ? ' has-error' : ''}`}>
                  <label className="dom-form-label">Route<span className="required-mark">*</span></label>
                  <select value={formData.route} onChange={(e) => setFormData({ ...formData, route: e.target.value })} required>
                    <option value="">Select Route</option>
                    {ALL_ROUTES.map((r) => <option value={r} key={r}>{r}</option>)}
                  </select>
                  {formErrors.route && <span className="dom-form-error-text">{formErrors.route}</span>}
                </div>
                <div className={`dom-form-field${formErrors.paymentMode ? ' has-error' : ''}`}>
                  <label className="dom-form-label">Payment Mode<span className="required-mark">*</span></label>
                  <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} required>
                    <option value="">Select Payment Mode</option>
                    {PAYMENT_MODES.map((m) => <option value={m.value} key={m.value}>{m.label}</option>)}
                  </select>
                  {formErrors.paymentMode && <span className="dom-form-error-text">{formErrors.paymentMode}</span>}
                </div>

                {formData.paymentMode !== 'OFF' && (
                  <>
                    <div className="dom-form-field">
                      <label className="dom-form-label">AD-HOC Service</label>
                      <select value={formData.adhocServiceId} onChange={(e) => {
                        const val = e.target.value;
                        const svc = ADHOC_SERVICES.find((s) => String(s.adhocServiceId) === val);
                        setFormData({ ...formData, adhocServiceId: val, adhoc: val ? String(svc?.adhocVendorPayment ?? 0) : '0' });
                      }}>
                        <option value="">None</option>
                        {ADHOC_SERVICES.map((s) => <option value={s.adhocServiceId} key={s.adhocServiceId}>{s.adhocName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Adhoc Value</label>
                      <input type="number" step="0.01" min={0} value={formData.adhoc} disabled={!formData.adhocServiceId} onChange={(e) => setFormData({ ...formData, adhoc: e.target.value })} />
                    </div>

                    {!formData.adhocServiceId && (
                      <>
                        <div className={`dom-form-field${formErrors.rate ? ' has-error' : ''}`}>
                          <label className="dom-form-label">
                            Rate ({FLAT_RATE_MODES.has(formData.paymentMode) ? '£' : '£/stop'}){REQUIRED_RATE_MODES.has(formData.paymentMode) && <span className="required-mark">*</span>}
                          </label>
                          <input type="number" step="0.01" min={0} placeholder="e.g., 1.51" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} />
                          {formErrors.rate && <span className="dom-form-error-text">{formErrors.rate}</span>}
                        </div>
                        <div className="dom-form-field">
                          <label className="dom-form-label">Stops / Hours</label>
                          <input type="number" step="1" min={0} placeholder="e.g., 96" value={formData.stops} onChange={(e) => setFormData({ ...formData, stops: e.target.value })} />
                        </div>
                        <div className="dom-form-field">
                          <label className="dom-form-label">Route Sort</label>
                          <input type="number" step="0.01" min={0} placeholder="e.g., 28" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: e.target.value })} />
                        </div>
                      </>
                    )}

                    <div className="dom-form-field">
                      <label className="dom-form-label">Extras</label>
                      <input type="number" step="0.01" min={0} placeholder="e.g., 2" value={formData.extras} onChange={(e) => setFormData({ ...formData, extras: e.target.value })} />
                    </div>
                  </>
                )}

                <div className="dom-form-field span-2">
                  <label className="dom-form-label">Notes</label>
                  <textarea rows={3} placeholder="Optional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
              </div>
              <div className="dom-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{editingId ? 'Update Register' : 'Save Register'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && deleteRow && (
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="dom-modal dom-modal-small">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title"><i className="bi bi-exclamation-triangle text-danger me-2" />Confirm Delete</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={() => setDeleteId(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="dom-modal-body">
              <p>Remove the register for {deleteRow.courier} on {formatDateDisplay(deleteRow.date)} (route {deleteRow.route})? This cannot be undone.</p>
              <div className="dom-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setDeleteId(null)}>Cancel</button>
                <button type="button" className="styled-button styled-button--danger" onClick={confirmDelete}>Delete</button>
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
