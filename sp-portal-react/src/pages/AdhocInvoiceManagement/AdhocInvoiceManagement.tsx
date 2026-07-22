import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import '../../styles/legacy/adhoc-invoice-management.css';

/* =====================================================
   Ported 1:1 from sp-portal/adhoc-invoice-management/script.js
   (AdhocInvoiceApp class). Deterministic seeded-PRNG mock data,
   no dependency on window.DHL_MOCK_DATA — the original script.js
   builds its own self-contained master data set.
   ===================================================== */

/* ---------- deterministic PRNG helpers (kept in sync across renders:
   switching weeks / filters back and forth won't reshuffle data) ---------- */
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

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Parse a YYYY-MM-DD string as a local Date (no timezone shift). */
function parseLocalDate(dateStr: string): Date {
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday of the week containing `date`. */
function getWeekStart(date: string | Date): Date {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Sunday of the week containing `date`. */
function getWeekEnd(date: string | Date): Date {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

function formatDateShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface ServicePartner {
  servicePartnerId: number;
  partnerName: string;
}

interface Vendor {
  userId: number;
  fullName: string;
  depot: string;
  servicePartnerId: number | null;
}

interface AdhocDef {
  name: string;
  category: string;
  vendorMin: number;
  vendorMax: number;
  receivedMin: number;
  receivedMax: number;
}

interface AdhocRow {
  id: string;
  date: string;
  vendorName: string;
  depot: string;
  route: string;
  adhocName: string;
  adhocCategory: string;
  receivedPayment: number;
  vendorPayment: number;
  servicePartnerId: number | null;
}

type SortField = 'date' | 'vendorName' | 'depot' | 'route' | 'adhocName' | 'adhocCategory' | 'receivedPayment' | 'vendorPayment';
type SortDirection = 'asc' | 'desc';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  hiding: boolean;
}

/* ==================== MASTER (mock) DATA — built once, module scope ==================== */
const SERVICE_PARTNERS: ServicePartner[] = [
  { servicePartnerId: 1, partnerName: 'Swift Logistics' },
  { servicePartnerId: 2, partnerName: 'Kent Express' },
  { servicePartnerId: 3, partnerName: 'Medway Movers' },
];

const DEPOTS = ['Maidstone', 'Chatham', 'Dartford', 'Ashford'];

const ROUTES_BY_DEPOT: Record<string, string[]> = {};
DEPOTS.forEach((dep) => {
  const prefix = dep.slice(0, 3).toUpperCase();
  ROUTES_BY_DEPOT[dep] = Array.from({ length: 3 }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);
});

const ADHOC_DEFS: AdhocDef[] = [
  { name: 'Extra Stop', category: 'Operational', vendorMin: 8, vendorMax: 18, receivedMin: 14, receivedMax: 28 },
  { name: 'Redelivery', category: 'Customer Requested', vendorMin: 6, vendorMax: 14, receivedMin: 10, receivedMax: 22 },
  { name: 'Recovery', category: 'Operational', vendorMin: 15, vendorMax: 35, receivedMin: 25, receivedMax: 55 },
  { name: 'Additional Collection', category: 'Customer Requested', vendorMin: 10, vendorMax: 20, receivedMin: 16, receivedMax: 32 },
  { name: 'Out of Hours Run', category: 'Operational', vendorMin: 25, vendorMax: 45, receivedMin: 35, receivedMax: 70 },
];

const VENDORS: Vendor[] = (() => {
  const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
  const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
  const rng = rngForSeed('adhoc-vendors-v1');
  return Array.from({ length: 10 }, (_, i) => {
    const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const depot = DEPOTS[i % DEPOTS.length];
    const hasSp = rng() > 0.3;
    return {
      userId: 1000 + i,
      fullName,
      depot,
      servicePartnerId: hasSp ? SERVICE_PARTNERS[i % SERVICE_PARTNERS.length].servicePartnerId : null,
    };
  });
})();

function generateRowsForWeek(weekStart: Date, key: string): AdhocRow[] {
  const rng = rngForSeed(`adhoc-week-${key}`);
  const isCurrentWeek = key === formatDateISO(getWeekStart(new Date()));

  // A quarter of past/future weeks come back empty, to exercise the
  // empty-state UI — but never the current week, so the page never
  // opens on an empty table.
  if (!isCurrentWeek && rng() < 0.25) return [];

  const count = 4 + Math.floor(rng() * 6); // 4-9 rows per active week
  const rows: AdhocRow[] = [];
  for (let i = 0; i < count; i++) {
    const vendor = VENDORS[Math.floor(rng() * VENDORS.length)];
    const routes = ROUTES_BY_DEPOT[vendor.depot];
    const route = routes[Math.floor(rng() * routes.length)];
    const dayOffset = Math.floor(rng() * 7);
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayOffset);
    const def = ADHOC_DEFS[Math.floor(rng() * ADHOC_DEFS.length)];
    const vendorPayment = Math.round((def.vendorMin + rng() * (def.vendorMax - def.vendorMin)) * 100) / 100;
    const receivedPayment = Math.round((def.receivedMin + rng() * (def.receivedMax - def.receivedMin)) * 100) / 100;

    rows.push({
      id: `${key}-${i}`,
      date: formatDateISO(date),
      vendorName: vendor.fullName,
      depot: vendor.depot,
      route,
      adhocName: def.name,
      adhocCategory: def.category,
      receivedPayment,
      vendorPayment,
      servicePartnerId: vendor.servicePartnerId,
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function applySort(rows: AdhocRow[], field: SortField, direction: SortDirection): AdhocRow[] {
  const dir = direction === 'asc' ? 1 : -1;
  const numericFields: SortField[] = ['receivedPayment', 'vendorPayment'];
  return [...rows].sort((a, b) => {
    if (numericFields.includes(field)) {
      return dir * ((a[field] as number) - (b[field] as number));
    }
    const av = String(a[field] ?? '').toLowerCase();
    const bv = String(b[field] ?? '').toLowerCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/** Load the sheetjs/xlsx UMD bundle from the same CDN URL the static page used, once. */
let xlsxLoadPromise: Promise<void> | null = null;
function loadXlsx(): Promise<void> {
  if (typeof window !== 'undefined' && (window as unknown as { XLSX?: unknown }).XLSX) {
    return Promise.resolve();
  }
  if (!xlsxLoadPromise) {
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-adhoc-xlsx]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('xlsx load failed')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.async = true;
      script.dataset.adhocXlsx = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('xlsx load failed'));
      document.head.appendChild(script);
    });
  }
  return xlsxLoadPromise;
}

const THEAD_COLUMNS: { key: SortField; label: string; className?: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'depot', label: 'Depot' },
  { key: 'route', label: 'Route' },
  { key: 'adhocName', label: 'Adhoc service' },
  { key: 'adhocCategory', label: 'Adhoc category' },
  { key: 'receivedPayment', label: 'Adhoc received payment', className: 'text-end' },
  { key: 'vendorPayment', label: 'Vendor payment', className: 'text-end' },
];

export function AdhocInvoiceManagement() {
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(new Date()));
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [overlayActive, setOverlayActive] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map());

  // Page-scoped body class: style.css's `body.adm-page` rule (base page
  // background/typography) requires the class directly on <body>, which
  // this SPA's shared index.html/main.tsx don't set per-route.
  useEffect(() => {
    document.body.classList.add('adm-page');
    return () => document.body.classList.remove('adm-page');
  }, []);

  // Initial "full page" loading overlay — mirrors init()'s 400ms setTimeout.
  useEffect(() => {
    const t = setTimeout(() => setOverlayActive(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Simulated table loading — mirrors render(true) being called by setDate()
  // (week nav / today / month / year changes), including the initial render.
  useEffect(() => {
    setTableLoading(true);
    const t = setTimeout(() => setTableLoading(false), 200);
    return () => clearTimeout(t);
  }, [selectedDate]);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((ts) => ts.forEach(clearTimeout));
      timers.clear();
    };
  }, []);

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate]);
  const weekKey = useMemo(() => formatDateISO(weekStart), [weekStart]);

  const weekRows = useMemo(() => generateRowsForWeek(weekStart, weekKey), [weekStart, weekKey]);

  const filteredRows = useMemo(() => {
    let rows = weekRows;
    if (selectedServicePartnerId !== '') {
      rows = rows.filter((r) => String(r.servicePartnerId) === selectedServicePartnerId);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) => {
        const hay = `${r.vendorName} ${r.depot} ${r.route} ${r.adhocName} ${r.adhocCategory}`.toLowerCase();
        return hay.includes(term);
      });
    }
    return rows;
  }, [weekRows, selectedServicePartnerId, searchTerm]);

  const displayRows = useMemo(() => applySort(filteredRows, sortField, sortDirection), [filteredRows, sortField, sortDirection]);

  const years = useMemo(() => {
    const currentYear = parseLocalDate(selectedDate).getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  }, [selectedDate]);

  const weekRangeLabel = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)} ${weekStart.getFullYear()}`;
  const selectedMonth = parseLocalDate(selectedDate).getMonth();
  const selectedYear = parseLocalDate(selectedDate).getFullYear();

  function setDate(date: string) {
    setSelectedDate(date);
  }

  function changeWeek(deltaDays: number) {
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    setDate(formatDateISO(current));
  }

  function handleSortClick(key: SortField) {
    if (sortField === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  }

  function showToast(message: string, type: ToastItem['type'] = 'info') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, hiding: false }]);
    const hideTimer = setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, hiding: true } : t)));
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        toastTimersRef.current.delete(id);
      }, 320);
      toastTimersRef.current.set(id, [removeTimer]);
    }, 3200);
    toastTimersRef.current.set(id, [hideTimer]);
  }

  function weekFilenameSuffix() {
    return `${formatDateShort(weekStart).replace('/', '-')}_${formatDateShort(weekEnd).replace('/', '-')}-${weekStart.getFullYear()}`;
  }

  async function handleExportXlsx() {
    const rows = displayRows;
    if (rows.length === 0) return;

    try {
      await loadXlsx();
    } catch {
      showToast('XLSX export library failed to load.', 'error');
      return;
    }
    const XLSX = (window as unknown as { XLSX?: any }).XLSX;
    if (!XLSX) {
      showToast('XLSX export library failed to load.', 'error');
      return;
    }

    const sheetRows = rows.map((r) => ({
      Date: formatDateDisplay(r.date),
      Vendor: r.vendorName,
      Depot: r.depot,
      Route: r.route,
      'Adhoc service': r.adhocName,
      'Adhoc category': r.adhocCategory,
      'Adhoc received payment': r.receivedPayment,
      'Vendor payment': r.vendorPayment,
    }));
    const totalReceived = rows.reduce((s, r) => s + (r.receivedPayment || 0), 0);
    const totalVendor = rows.reduce((s, r) => s + (r.vendorPayment || 0), 0);
    sheetRows.push({
      Date: '',
      Vendor: '',
      Depot: '',
      Route: '',
      'Adhoc service': '',
      'Adhoc category': 'Totals',
      'Adhoc received payment': Math.round(totalReceived * 100) / 100,
      'Vendor payment': Math.round(totalVendor * 100) / 100,
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adhoc Works');
    XLSX.writeFile(workbook, `adhoc-works-${weekFilenameSuffix()}.xlsx`);
    showToast(`Exported ${rows.length} row(s) to XLSX.`, 'success');
  }

  function handleExportPdf() {
    const rows = displayRows;
    if (rows.length === 0) return;

    const totalReceived = rows.reduce((s, r) => s + (r.receivedPayment || 0), 0);
    const totalVendor = rows.reduce((s, r) => s + (r.vendorPayment || 0), 0);

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      showToast('Please allow pop-ups to export PDF.', 'error');
      return;
    }

    const escapeHtml = (text: unknown) => {
      const div = document.createElement('div');
      div.textContent = text == null ? '' : String(text);
      return div.innerHTML;
    };

    const bodyRows = rows
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(formatDateDisplay(r.date))}</td>
        <td>${escapeHtml(r.vendorName)}</td>
        <td>${escapeHtml(r.depot)}</td>
        <td>${escapeHtml(r.route)}</td>
        <td>${escapeHtml(r.adhocName)}</td>
        <td>${escapeHtml(r.adhocCategory)}</td>
        <td class="amount">${formatCurrency(r.receivedPayment)}</td>
        <td class="amount">${formatCurrency(r.vendorPayment)}</td>
      </tr>
    `,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <head>
        <meta charset="UTF-8" />
        <title>Adhoc Works — ${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)} ${weekStart.getFullYear()}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p.subtitle { font-size: 12px; color: #64748b; margin: 0 0 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
          td.amount, th.amount { text-align: right; }
          tfoot td { font-weight: 700; text-align: right; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Ad-hoc Invoice System — Adhoc Works Invoice Management</h1>
        <p class="subtitle">Week ${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)} ${weekStart.getFullYear()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Vendor</th><th>Depot</th><th>Route</th>
              <th>Adhoc service</th><th>Adhoc category</th>
              <th class="amount">Adhoc received payment</th><th class="amount">Vendor payment</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="6">Totals</td>
              <td class="amount">${formatCurrency(totalReceived)}</td>
              <td class="amount">${formatCurrency(totalVendor)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
    showToast(`Print dialog opened for ${rows.length} row(s).`, 'info');
  }

  const hasSearch = searchTerm.trim() !== '';
  const exportDisabled = displayRows.length === 0;

  return (
    <PortalLayout mainClassName="adm-container container-fluid px-3 px-lg-4 py-4" title="Ad-hoc Invoice System">
      <div className={`loading-overlay${overlayActive ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading adhoc works invoices…</p>
      </div>

      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-file-plus" />
            <span>Weekly view of one-off works invoicing.</span>
          </p>
        </div>
      </div>

      <div className="adm-controls-bar" data-animate="fade-in-up">
        <div className="week-nav">
          <span className="week-nav-label">
            <i className="bi bi-calendar-week" /> Week
          </span>
          <div className="week-nav-controls">
            <button type="button" className="date-nav-btn" id="btnPrevWeek" title="Previous week" aria-label="Previous week" onClick={() => changeWeek(-7)}>
              <i className="bi bi-chevron-left" />
            </button>
            <select
              className="week-nav-select"
              id="weekMonthSelect"
              aria-label="Month"
              value={selectedMonth}
              onChange={(e) => {
                const current = parseLocalDate(selectedDate);
                current.setMonth(Number(e.target.value));
                setDate(formatDateISO(current));
              }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="week-nav-select"
              id="weekYearSelect"
              aria-label="Year"
              value={selectedYear}
              onChange={(e) => {
                const current = parseLocalDate(selectedDate);
                current.setFullYear(Number(e.target.value));
                setDate(formatDateISO(current));
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" className="date-nav-btn" id="btnNextWeek" title="Next week" aria-label="Next week" onClick={() => changeWeek(7)}>
              <i className="bi bi-chevron-right" />
            </button>
            <button type="button" className="date-nav-btn week-nav-today" id="btnTodayWeek" title="Today" onClick={() => setDate(formatDateISO(new Date()))}>
              <i className="bi bi-calendar-check" />
              <span>Today</span>
            </button>
          </div>
          <span className="week-range-label" id="weekRangeLabel">
            {weekRangeLabel}
          </span>
        </div>

        <div className="adm-controls-actions">
          <div className="search-input-wrap adm-search-wrap">
            <i className="bi bi-search" />
            <input
              type="text"
              id="searchInput"
              className="form-control"
              placeholder="Search vendor, depot, route, service…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select filter-select"
            id="filterServicePartner"
            value={selectedServicePartnerId}
            onChange={(e) => setSelectedServicePartnerId(e.target.value)}
          >
            <option value="">All Service Partners</option>
            {SERVICE_PARTNERS.map((sp) => (
              <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                {sp.partnerName}
              </option>
            ))}
          </select>
          <button type="button" className="styled-button styled-button--primary" id="btnExportXlsx" disabled={exportDisabled} onClick={handleExportXlsx}>
            <i className="bi bi-file-earmark-excel" /> Export XLSX
          </button>
          <button type="button" className="styled-button styled-button--outline" id="btnExportPdf" disabled={exportDisabled} onClick={handleExportPdf}>
            <i className="bi bi-file-earmark-pdf" /> Export PDF
          </button>
        </div>
      </div>

      <div className="adm-table-card">
        <div className="adm-table-scroll">
          <table className="adm-table" id="adhocTable">
            <thead id="adhocTableHead">
              <tr>
                {THEAD_COLUMNS.map((col) => (
                  <th key={col.key} data-sort-key={col.key} className={col.className} onClick={() => handleSortClick(col.key)}>
                    {col.label}
                    {sortField === col.key && <span className="sort-ind">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id="adhocTableBody">
              {tableLoading ? (
                <tr>
                  <td colSpan={8} className="adm-table-message">
                    Loading…
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="adm-table-message">
                    {hasSearch ? 'No results for the current search.' : 'No adhoc works for the selected week.'}
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Date" className="text-nowrap">
                      {formatDateDisplay(r.date)}
                    </td>
                    <td data-label="Vendor" className="fw-semibold">
                      {r.vendorName}
                    </td>
                    <td data-label="Depot">{r.depot}</td>
                    <td data-label="Route">{r.route}</td>
                    <td data-label="Adhoc service">{r.adhocName}</td>
                    <td data-label="Adhoc category" className="text-secondary">
                      {r.adhocCategory}
                    </td>
                    <td data-label="Adhoc received payment" className="fw-semibold adm-amount-cell">
                      {formatCurrency(r.receivedPayment)}
                    </td>
                    <td data-label="Vendor payment" className="fw-semibold adm-amount-cell">
                      {formatCurrency(r.vendorPayment)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot id="adhocTableFoot">
              {!tableLoading && displayRows.length > 0 && (
                <tr className="adm-totals-row">
                  <td colSpan={6} className="text-end fw-bold">
                    Totals
                  </td>
                  <td className="fw-bold adm-amount-cell">{formatCurrency(displayRows.reduce((s, r) => s + (r.receivedPayment || 0), 0))}</td>
                  <td className="fw-bold adm-amount-cell">{formatCurrency(displayRows.reduce((s, r) => s + (r.vendorPayment || 0), 0))}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => (
          <div key={t.id} className={`app-toast ${t.type}${t.hiding ? ' hiding' : ''}`}>
            <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
