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

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
function parseLocalDate(dateStr: string) {
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}
function formatDateISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getWeekStart(date: string | Date) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function getWeekEnd(date: string | Date) {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}
function formatDateShort(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
function formatDateDisplay(dateStr: string) {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }

let toastSeq = 0;

const COLUMNS: { key: SortField; label: string; align?: 'end' }[] = [
  { key: 'date', label: 'Date' },
  { key: 'vendorName', label: 'Vendor' },
  { key: 'depot', label: 'Depot' },
  { key: 'route', label: 'Route' },
  { key: 'adhocName', label: 'Adhoc service' },
  { key: 'adhocCategory', label: 'Adhoc category' },
  { key: 'receivedPayment', label: 'Adhoc received payment', align: 'end' },
  { key: 'vendorPayment', label: 'Vendor payment', align: 'end' },
];

export default function AdhocInvoiceManagementPage() {
  useBodyClass('adm-page has-beam-sidebar');

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()));
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tableLoading, setTableLoading] = useState(true);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const master = useMemo(() => {
    const servicePartners = [
      { servicePartnerId: 1, partnerName: 'Swift Logistics' },
      { servicePartnerId: 2, partnerName: 'Kent Express' },
      { servicePartnerId: 3, partnerName: 'Medway Movers' },
    ];
    const depots = ['Maidstone', 'Chatham', 'Dartford', 'Ashford'];
    const routesByDepot: Record<string, string[]> = {};
    depots.forEach((dep) => {
      const prefix = dep.slice(0, 3).toUpperCase();
      routesByDepot[dep] = Array.from({ length: 3 }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);
    });
    const adhocDefs = [
      { name: 'Extra Stop', category: 'Operational', vendorMin: 8, vendorMax: 18, receivedMin: 14, receivedMax: 28 },
      { name: 'Redelivery', category: 'Customer Requested', vendorMin: 6, vendorMax: 14, receivedMin: 10, receivedMax: 22 },
      { name: 'Recovery', category: 'Operational', vendorMin: 15, vendorMax: 35, receivedMin: 25, receivedMax: 55 },
      { name: 'Additional Collection', category: 'Customer Requested', vendorMin: 10, vendorMax: 20, receivedMin: 16, receivedMax: 32 },
      { name: 'Out of Hours Run', category: 'Operational', vendorMin: 25, vendorMax: 45, receivedMin: 35, receivedMax: 70 },
    ];
    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
    const rng = rngForSeed('adhoc-vendors-v1');
    const vendors = Array.from({ length: 10 }, (_, i) => {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
      const depot = depots[i % depots.length];
      const hasSp = rng() > 0.3;
      return {
        userId: 1000 + i,
        fullName,
        depot,
        servicePartnerId: hasSp ? servicePartners[i % servicePartners.length].servicePartnerId : null,
      };
    });
    return { servicePartners, depots, routesByDepot, adhocDefs, vendors };
  }, []);

  const rowsByWeek = useRef(new Map<string, AdhocRow[]>());

  function generateRowsForWeek(weekStart: Date, key: string): AdhocRow[] {
    const rng = rngForSeed(`adhoc-week-${key}`);
    const isCurrentWeek = key === formatDateISO(getWeekStart(new Date()));
    if (!isCurrentWeek && rng() < 0.25) return [];

    const count = 4 + Math.floor(rng() * 6);
    const rows: AdhocRow[] = [];
    for (let i = 0; i < count; i++) {
      const vendor = master.vendors[Math.floor(rng() * master.vendors.length)];
      const routes = master.routesByDepot[vendor.depot];
      const route = routes[Math.floor(rng() * routes.length)];
      const dayOffset = Math.floor(rng() * 7);
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayOffset);
      const def = master.adhocDefs[Math.floor(rng() * master.adhocDefs.length)];
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

  function getRowsForWeek(weekStart: Date): AdhocRow[] {
    const key = formatDateISO(weekStart);
    if (!rowsByWeek.current.has(key)) {
      rowsByWeek.current.set(key, generateRowsForWeek(weekStart, key));
    }
    return rowsByWeek.current.get(key)!;
  }

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setTableLoading(true);
    const t = setTimeout(() => setTableLoading(false), 200);
    return () => clearTimeout(t);
  }, [selectedDate]);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekRangeLabel = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)} ${weekStart.getFullYear()}`;

  const displayRows = useMemo(() => {
    let rows = getRowsForWeek(weekStart);
    if (selectedServicePartnerId !== '') {
      rows = rows.filter((r) => String(r.servicePartnerId) === selectedServicePartnerId);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) => `${r.vendorName} ${r.depot} ${r.route} ${r.adhocName} ${r.adhocCategory}`.toLowerCase().includes(term));
    }
    const dir = sortDirection === 'asc' ? 1 : -1;
    const numericFields: SortField[] = ['receivedPayment', 'vendorPayment'];
    return [...rows].sort((a, b) => {
      if (numericFields.includes(sortField)) {
        return dir * ((a[sortField] as number) - (b[sortField] as number));
      }
      const av = String(a[sortField] ?? '').toLowerCase();
      const bv = String(b[sortField] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [weekStart.getTime(), selectedServicePartnerId, searchTerm, sortField, sortDirection]);

  const totalReceived = displayRows.reduce((s, r) => s + (r.receivedPayment || 0), 0);
  const totalVendor = displayRows.reduce((s, r) => s + (r.vendorPayment || 0), 0);

  function changeWeek(deltaDays: number) {
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    setSelectedDate(formatDateISO(current));
  }

  function handleSort(key: SortField) {
    if (sortField === key) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(key);
      setSortDirection('asc');
    }
  }

  function weekFilenameSuffix() {
    return `${formatDateShort(weekStart).replace('/', '-')}_${formatDateShort(weekEnd).replace('/', '-')}-${weekStart.getFullYear()}`;
  }

  function exportXlsx() {
    if (displayRows.length === 0) return;
    const sheetRows = displayRows.map((r) => ({
      Date: formatDateDisplay(r.date),
      Vendor: r.vendorName,
      Depot: r.depot,
      Route: r.route,
      'Adhoc service': r.adhocName,
      'Adhoc category': r.adhocCategory,
      'Adhoc received payment': r.receivedPayment,
      'Vendor payment': r.vendorPayment,
    }));
    sheetRows.push({
      Date: '', Vendor: '', Depot: '', Route: '', 'Adhoc service': '', 'Adhoc category': 'Totals',
      'Adhoc received payment': Math.round(totalReceived * 100) / 100,
      'Vendor payment': Math.round(totalVendor * 100) / 100,
    });
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adhoc Works');
    XLSX.writeFile(workbook, `adhoc-works-${weekFilenameSuffix()}.xlsx`);
    showToast(`Exported ${displayRows.length} row(s) to XLSX.`, 'success');
  }

  function exportPdf() {
    if (displayRows.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      showToast('Please allow pop-ups to export PDF.', 'error');
      return;
    }
    const bodyRows = displayRows
      .map(
        (r) => `
      <tr>
        <td>${formatDateDisplay(r.date)}</td>
        <td>${r.vendorName}</td>
        <td>${r.depot}</td>
        <td>${r.route}</td>
        <td>${r.adhocName}</td>
        <td>${r.adhocCategory}</td>
        <td class="amount">${formatCurrency(r.receivedPayment)}</td>
        <td class="amount">${formatCurrency(r.vendorPayment)}</td>
      </tr>`,
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
    setTimeout(() => printWindow.print(), 300);
    showToast(`Print dialog opened for ${displayRows.length} row(s).`, 'info');
  }

  const years = useMemo(() => {
    const currentYear = parseLocalDate(selectedDate).getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
  }, [selectedDate]);

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading adhoc works invoices…</p>
      </div>

      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <main className="adm-container container-fluid px-3 px-lg-4 py-4">
          <header className="page-header-section">
            <div className="page-header-welcome-text">
              <h1 className="page-header-title">Ad-hoc Invoice System</h1>
              <p className="page-header-date"><i className="bi bi-file-plus" /><span>Weekly view of one-off works invoicing.</span></p>
            </div>
          </header>

          <div className="adm-controls-bar">
            <div className="week-nav">
              <span className="week-nav-label"><i className="bi bi-calendar-week" /> Week</span>
              <div className="week-nav-controls">
                <button type="button" className="date-nav-btn" title="Previous week" aria-label="Previous week" onClick={() => changeWeek(-7)}>
                  <i className="bi bi-chevron-left" />
                </button>
                <select className="week-nav-select" aria-label="Month" value={parseLocalDate(selectedDate).getMonth()} onChange={(e) => {
                  const current = parseLocalDate(selectedDate);
                  current.setMonth(Number(e.target.value));
                  setSelectedDate(formatDateISO(current));
                }}>
                  {MONTH_NAMES.map((m, i) => (
                    <option value={i} key={m}>{m}</option>
                  ))}
                </select>
                <select className="week-nav-select" aria-label="Year" value={parseLocalDate(selectedDate).getFullYear()} onChange={(e) => {
                  const current = parseLocalDate(selectedDate);
                  current.setFullYear(Number(e.target.value));
                  setSelectedDate(formatDateISO(current));
                }}>
                  {years.map((y) => (
                    <option value={y} key={y}>{y}</option>
                  ))}
                </select>
                <button type="button" className="date-nav-btn" title="Next week" aria-label="Next week" onClick={() => changeWeek(7)}>
                  <i className="bi bi-chevron-right" />
                </button>
                <button type="button" className="date-nav-btn week-nav-today" title="Today" onClick={() => setSelectedDate(formatDateISO(new Date()))}>
                  <i className="bi bi-calendar-check" /><span>Today</span>
                </button>
              </div>
              <span className="week-range-label">{weekRangeLabel}</span>
            </div>

            <div className="adm-controls-actions">
              <div className="search-input-wrap adm-search-wrap">
                <i className="bi bi-search" />
                <input type="text" className="form-control" placeholder="Search vendor, depot, route, service…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <select className="form-select filter-select" value={selectedServicePartnerId} onChange={(e) => setSelectedServicePartnerId(e.target.value)}>
                <option value="">All Service Partners</option>
                {master.servicePartners.map((sp) => (
                  <option value={sp.servicePartnerId} key={sp.servicePartnerId}>{sp.partnerName}</option>
                ))}
              </select>
              <button type="button" className="styled-button styled-button--primary" disabled={displayRows.length === 0} onClick={exportXlsx}>
                <i className="bi bi-file-earmark-excel" /> Export XLSX
              </button>
              <button type="button" className="styled-button styled-button--outline" disabled={displayRows.length === 0} onClick={exportPdf}>
                <i className="bi bi-file-earmark-pdf" /> Export PDF
              </button>
            </div>
          </div>

          <div className="adm-table-card">
            <div className="adm-table-scroll">
              <table className="adm-table" id="adhocTable">
                <thead id="adhocTableHead">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col.key} className={col.align === 'end' ? 'text-end' : ''} style={{ cursor: 'pointer' }} onClick={() => handleSort(col.key)}>
                        {col.label}
                        {sortField === col.key && <span className="sort-ind">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody id="adhocTableBody">
                  {tableLoading ? (
                    <tr><td colSpan={8} className="adm-table-message">Loading…</td></tr>
                  ) : displayRows.length === 0 ? (
                    <tr><td colSpan={8} className="adm-table-message">{searchTerm.trim() !== '' ? 'No results for the current search.' : 'No adhoc works for the selected week.'}</td></tr>
                  ) : (
                    displayRows.map((r) => (
                      <tr key={r.id}>
                        <td data-label="Date" className="text-nowrap">{formatDateDisplay(r.date)}</td>
                        <td data-label="Vendor" className="fw-semibold">{r.vendorName}</td>
                        <td data-label="Depot">{r.depot}</td>
                        <td data-label="Route">{r.route}</td>
                        <td data-label="Adhoc service">{r.adhocName}</td>
                        <td data-label="Adhoc category" className="text-secondary">{r.adhocCategory}</td>
                        <td data-label="Adhoc received payment" className="fw-semibold adm-amount-cell">{formatCurrency(r.receivedPayment)}</td>
                        <td data-label="Vendor payment" className="fw-semibold adm-amount-cell">{formatCurrency(r.vendorPayment)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!tableLoading && displayRows.length > 0 && (
                  <tfoot id="adhocTableFoot">
                    <tr className="adm-totals-row">
                      <td colSpan={6} className="text-end fw-bold">Totals</td>
                      <td className="fw-bold adm-amount-cell">{formatCurrency(totalReceived)}</td>
                      <td className="fw-bold adm-amount-cell">{formatCurrency(totalVendor)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </main>
      </div>

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
