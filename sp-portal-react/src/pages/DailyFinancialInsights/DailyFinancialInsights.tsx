import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/daily-financial-insights.css';
import {
  ADHOC_SERVICES,
  ALL_ROUTES,
  DEPOTS,
  FLAT_RATE_MODES,
  PAYMENT_MODES,
  PAYMENT_MODE_LABEL,
  REQUIRED_RATE_MODES,
  VEHICLES,
  VENDORS,
  addDaysISO,
  applySort,
  calculatePageTotals,
  calculateRow,
  calculateTotalPaidStops,
  formatCurrency,
  formatDateDisplay,
  formatDateISO,
  formatDateLong,
  generateRowsForDate,
  type Row,
  type SortField,
} from '../../data/dfiData';

/**
 * Manual port of script.js's DailyFinancialInsightsApp. The static page keeps
 * per-day generated rows in a `Map` instance field; here that lives in a
 * `useRef<Map>` so the deterministic mock data survives re-renders without
 * being regenerated (same seed → same rows, matching the original's caching).
 */

const COLUMNS: { key: SortField | null; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'vrm', label: 'VRN' },
  { key: 'courier', label: 'Vendor' },
  { key: 'route', label: 'Route' },
  { key: 'paymentMode', label: 'Payment' },
  { key: 'rate', label: 'Rate' },
  { key: 'stops', label: 'Stops' },
  { key: 'totalPaidStops', label: 'Total Paid' },
  { key: 'sort', label: 'Route Sort' },
  { key: 'adhoc', label: 'AD-HOC SERVICE' },
  { key: 'extras', label: 'Extras' },
  { key: null, label: 'Notes' },
  { key: 'total', label: 'Total' },
  { key: 'avgPerStop', label: 'Avg/Stop' },
  { key: null, label: 'Actions' },
];

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}
let toastSeq = 0;

interface FormData {
  date: string;
  depot: string;
  vrm: string;
  vendor: string;
  route: string;
  paymentMode: string;
  rate: string;
  stops: string;
  sort: string;
  adhoc: string;
  extras: string;
  notes: string;
  adhocServiceId: string;
}

function emptyFormData(): FormData {
  return {
    date: formatDateISO(new Date()),
    depot: '', vrm: '', vendor: '', route: '', paymentMode: '',
    rate: '', stops: '', sort: '', adhoc: '0', extras: '', notes: '', adhocServiceId: '',
  };
}

export function DailyFinancialInsights() {
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

  useModalBehavior(() => setModalOpen(false), modalOpen);
  useModalBehavior(() => setDeleteId(null), Boolean(deleteId));

  function showToast(message: string, type: ToastType = 'info') {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }

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

  const filteredRows = useMemo(() => {
    let rows = getRowsInRange();
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter(
        (r) => (r.route || '').toLowerCase().includes(term) || (r.vrm || '').toLowerCase().includes(term) || (r.courier || '').toLowerCase().includes(term),
      );
    }
    if (payment !== 'All') rows = rows.filter((r) => r.paymentMode === payment);
    return applySort(rows, sortField, sortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, search, payment, sortField, sortDirection]);

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
  const headerSubtitle =
    dateFrom && dateTo && dateFrom !== dateTo
      ? `Period: ${formatDateLong(dateFrom)} - ${formatDateLong(dateTo)}`
      : `Date: ${formatDateLong(dateFrom || dateTo)}`;

  return (
    <PortalLayout mainClassName="dfi-container container-fluid px-3 px-lg-4 py-4" title="Daily Financial Insights">
      {/* ============ PAGE INFO (kept from the original header; not part of the standardized pattern) ============ */}
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-graph-up" />
            <span id="pageHeaderSubtitle">{headerSubtitle}</span>
          </p>
        </div>
        <div className="dfi-metrics" id="dfiMetrics">
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
      </div>

      {/* ============ FILTERS ============ */}
      <div className="filters-bar" data-animate="fade-in-up">
        <div>
          <label className="filters-label" htmlFor="dateFromInput">Period</label>
          <div className="dfi-period-group">
            <input
              type="date"
              id="dateFromInput"
              className="date-nav-input"
              aria-label="Period from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value || dateFrom)}
            />
            <span className="dfi-period-sep">to</span>
            <input
              type="date"
              id="dateToInput"
              className="date-nav-input"
              aria-label="Period to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value || dateTo)}
            />
          </div>
        </div>
        <div className="search-wrap dfi-search-wrap">
          <label className="filters-label" htmlFor="searchInput">Search (Route, Vehicle, Vendor)</label>
          <div className="search-input-wrap">
            <i className="bi bi-search" />
            <input
              type="text"
              id="searchInput"
              className="form-control"
              placeholder="Route, vehicle, vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="filters-label" htmlFor="filterPaymentMode">Payment Mode</label>
          <select
            className="form-select filter-select"
            id="filterPaymentMode"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="All">All</option>
            {PAYMENT_MODES.map((m) => (
              <option value={m.value} key={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="dfi-actions">
          <button type="button" className="styled-button styled-button--outline" id="btnClearFilters" onClick={handleClearFilters}>
            <i className="bi bi-x-circle" /> Clear
          </button>
          <button type="button" className="styled-button styled-button--primary" id="btnNewRegister" onClick={openCreateModal}>
            <i className="bi bi-plus-circle" /> New
          </button>
        </div>
      </div>

      {/* ============ TABLE ============ */}
      <div className="dfi-table-card">
        <div className="dfi-table-scroll">
          <table className="dfi-table" id="insightsTable">
            <thead id="insightsTableHead">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    data-sort-key={col.key ?? undefined}
                    className={col.key ? undefined : 'dfi-no-sort'}
                    onClick={col.key ? () => handleSort(col.key as SortField) : undefined}
                  >
                    {col.label}
                    {col.key && sortField === col.key && (
                      <span className="sort-ind"><i className={`bi bi-arrow-${sortDirection === 'asc' ? 'down' : 'up'}`} /></span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id="insightsTableBody">
              {tableLoading ? (
                <tr><td colSpan={15} className="dfi-table-message">Loading…</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="dfi-table-message">
                    {search.trim() !== '' || payment !== 'All' ? 'No results for the current filters.' : 'No registers for the selected period.'}
                  </td>
                </tr>
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
                      <td data-label="Notes">
                        {isOff || !row.notes ? '-' : <span className="dfi-notes-icon" title={row.notes}><i className="bi bi-sticky-fill" /></span>}
                      </td>
                      <td data-label="Total" className="dfi-total-col">{isOff ? '-' : formatCurrency(total)}</td>
                      <td data-label="Avg/Stop">{isOff ? '-' : formatCurrency(avgPerStop)}</td>
                      <td data-label="Actions">
                        <div className="dfi-actions-cell">
                          <button type="button" className="dfi-icon-btn" aria-label="Edit operation" title="Edit" onClick={() => openEditModal(row.operationId)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button type="button" className="dfi-icon-btn dfi-delete-btn" aria-label="Delete operation" title="Delete" onClick={() => setDeleteId(row.operationId)}>
                            <i className="bi bi-trash" />
                          </button>
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

      {/* ============ Loading overlay ============ */}
      {/* The static page renders this as a sibling of #sidebarWrapper (fixed,
          full-viewport). Portalled to document.body for the same reason every
          fixed-position overlay on this page is portalled: PortalLayout's
          .liquid-glass-page-bg ancestor uses backdrop-filter, which would
          otherwise trap position:fixed descendants inside its own bounds. */}
      {createPortal(
        <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
          <div className="spinner" />
          <p>Loading daily financial insights…</p>
        </div>,
        document.body,
      )}

      {/* ============ MODAL: Add / Edit Register ============ */}
      {modalOpen &&
        createPortal(
          <div
            className="dom-modal-backdrop sp-modal-backdrop-anim"
            id="operationModalBackdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <div
              className="dom-modal dfi-op-modal sp-modal-anim"
              role="dialog"
              aria-modal="true"
              aria-labelledby="operationModalTitle"
            >
              <div className="dom-modal-header">
                <h2 className="dom-modal-title" id="operationModalTitle">{modalTitle}</h2>
                <button type="button" className="dom-modal-close" id="btnCloseOperationModal" aria-label="Close" onClick={() => setModalOpen(false)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <form className="dom-modal-body" id="operationForm" onSubmit={saveOperation}>
                <div className="dfi-form-error" id="operationFormError" hidden={!formError}>{formError}</div>
                <div className="dom-form-grid" id="operationFormGrid">
                  <div className={`dom-form-field${formErrors.date ? ' has-error' : ''}`}>
                    <label className="dom-form-label">Date<span className="required-mark">*</span></label>
                    <input type="date" data-field="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                    {formErrors.date && <span className="dom-form-error-text">{formErrors.date}</span>}
                  </div>
                  <div className={`dom-form-field${formErrors.vendor ? ' has-error' : ''}`}>
                    <label className="dom-form-label">Vendor<span className="required-mark">*</span></label>
                    <select data-field="vendor" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} required>
                      <option value="">Select Vendor</option>
                      {[...VENDORS].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((v) => (
                        <option value={v.fullName} key={v.userId}>{v.fullName}</option>
                      ))}
                    </select>
                    {formErrors.vendor && <span className="dom-form-error-text">{formErrors.vendor}</span>}
                  </div>
                  <div className={`dom-form-field${formErrors.depot ? ' has-error' : ''}`}>
                    <label className="dom-form-label">Depot Location<span className="required-mark">*</span></label>
                    <select data-field="depot" value={formData.depot} onChange={(e) => setFormData({ ...formData, depot: e.target.value })} required>
                      <option value="">Select Depot</option>
                      {DEPOTS.map((d) => <option value={d} key={d}>{d}</option>)}
                    </select>
                    {formErrors.depot && <span className="dom-form-error-text">{formErrors.depot}</span>}
                  </div>
                  <div className={`dom-form-field${formErrors.vrm ? ' has-error' : ''}`}>
                    <label className="dom-form-label">VRN<span className="required-mark">*</span></label>
                    <select data-field="vrm" value={formData.vrm} onChange={(e) => setFormData({ ...formData, vrm: e.target.value })} required>
                      <option value="">Select Vehicle</option>
                      {VEHICLES.map((v) => <option value={v.registrationPlates} key={v.vehicleId}>{v.registrationPlates}</option>)}
                    </select>
                    {formErrors.vrm && <span className="dom-form-error-text">{formErrors.vrm}</span>}
                  </div>
                  <div className={`dom-form-field${formErrors.route ? ' has-error' : ''}`}>
                    <label className="dom-form-label">Route<span className="required-mark">*</span></label>
                    <select data-field="route" value={formData.route} onChange={(e) => setFormData({ ...formData, route: e.target.value })} required>
                      <option value="">Select Route</option>
                      {ALL_ROUTES.map((r) => <option value={r} key={r}>{r}</option>)}
                    </select>
                    {formErrors.route && <span className="dom-form-error-text">{formErrors.route}</span>}
                  </div>
                  <div className={`dom-form-field${formErrors.paymentMode ? ' has-error' : ''}`}>
                    <label className="dom-form-label">Payment Mode<span className="required-mark">*</span></label>
                    <select data-field="paymentMode" value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })} required>
                      <option value="">Select Payment Mode</option>
                      {PAYMENT_MODES.map((m) => <option value={m.value} key={m.value}>{m.label}</option>)}
                    </select>
                    {formErrors.paymentMode && <span className="dom-form-error-text">{formErrors.paymentMode}</span>}
                  </div>

                  {/*
                    NOTE — simplification vs. the Next.js OperationModal: the source app derives
                    Rate from a selected cost-model band (FSR fixedPrice / VSR & SP_VSR
                    pricePerStop, looked up per vendor+route). This mock has no cost-model/
                    vendor-contract data, so Rate is a plain editable £ (flat for DR/DAF) or
                    £/stop (FSR/VSR/SP_VSR/Hourly) number field — the banded auto-calc and its
                    FSRInfoIcon breakdown popover are not reproduced. Ported 1:1 from script.js's
                    own renderOperationForm(), which has this exact same simplification.
                  */}
                  {formData.paymentMode !== 'OFF' && (
                    <>
                      <div className="dom-form-field">
                        <label className="dom-form-label">AD-HOC Service</label>
                        <select
                          data-field="adhocServiceId"
                          value={formData.adhocServiceId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const svc = ADHOC_SERVICES.find((s) => String(s.adhocServiceId) === val);
                            setFormData({ ...formData, adhocServiceId: val, adhoc: val ? String(svc?.adhocVendorPayment ?? 0) : '0' });
                          }}
                        >
                          <option value="">None</option>
                          {ADHOC_SERVICES.map((s) => <option value={s.adhocServiceId} key={s.adhocServiceId}>{s.adhocName}</option>)}
                        </select>
                      </div>
                      <div className="dom-form-field">
                        <label className="dom-form-label">Adhoc Value</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          data-field="adhoc"
                          value={formData.adhoc}
                          disabled={!formData.adhocServiceId}
                          onChange={(e) => setFormData({ ...formData, adhoc: e.target.value })}
                        />
                      </div>

                      {!formData.adhocServiceId && (
                        <>
                          <div className={`dom-form-field${formErrors.rate ? ' has-error' : ''}`}>
                            <label className="dom-form-label">
                              Rate ({FLAT_RATE_MODES.has(formData.paymentMode) ? '£' : '£/stop'})
                              {REQUIRED_RATE_MODES.has(formData.paymentMode) && <span className="required-mark">*</span>}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              data-field="rate"
                              placeholder="e.g., 1.51"
                              value={formData.rate}
                              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                            />
                            {formErrors.rate && <span className="dom-form-error-text">{formErrors.rate}</span>}
                          </div>
                          <div className="dom-form-field">
                            <label className="dom-form-label">Stops / Hours</label>
                            <input
                              type="number"
                              step="1"
                              min={0}
                              data-field="stops"
                              placeholder="e.g., 96"
                              value={formData.stops}
                              onChange={(e) => setFormData({ ...formData, stops: e.target.value })}
                            />
                          </div>
                          <div className="dom-form-field">
                            <label className="dom-form-label">Route Sort</label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              data-field="sort"
                              placeholder="e.g., 28"
                              value={formData.sort}
                              onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
                            />
                          </div>
                        </>
                      )}

                      <div className="dom-form-field">
                        <label className="dom-form-label">Extras</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          data-field="extras"
                          placeholder="e.g., 2"
                          value={formData.extras}
                          onChange={(e) => setFormData({ ...formData, extras: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="dom-form-field span-2">
                    <label className="dom-form-label">Notes</label>
                    <textarea
                      data-field="notes"
                      rows={3}
                      placeholder="Optional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="dom-form-actions">
                  <button type="button" className="styled-button styled-button--outline" id="btnCancelOperation" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="styled-button styled-button--primary" id="btnSubmitOperation">{editingId ? 'Update Register' : 'Save Register'}</button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* ============ MODAL: Delete confirm ============ */}
      {deleteId &&
        deleteRow &&
        createPortal(
          <div
            className="dom-modal-backdrop sp-modal-backdrop-anim"
            id="deleteModalBackdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteId(null);
            }}
          >
            <div
              className="dom-modal dom-modal-small sp-modal-anim"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="deleteModalTitle"
            >
              <button type="button" className="dom-modal-close sp-danger-modal-close" id="btnCloseDeleteModal" aria-label="Close" onClick={() => setDeleteId(null)}>
                <i className="bi bi-x-lg" />
              </button>
              <div className="sp-danger-modal-body">
                <div className="sp-danger-modal-icon">
                  <i className="bi bi-exclamation-triangle-fill" />
                </div>
                <h5 id="deleteModalTitle" className="sp-danger-modal-title">Delete this register?</h5>
                <p className="sp-danger-modal-text" id="deleteModalText">
                  You&apos;re about to remove the register for <strong>{deleteRow.courier}</strong> on {formatDateDisplay(deleteRow.date)} (route {deleteRow.route}).
                </p>
                <p className="sp-danger-modal-subtext">This action cannot be undone.</p>
              </div>
              <div className="dom-modal-body sp-danger-modal-footer">
                <button type="button" className="styled-button styled-button--outline" id="btnCancelDelete" onClick={() => setDeleteId(null)}>Cancel</button>
                <button type="button" className="styled-button styled-button--danger" id="btnConfirmDelete" onClick={confirmDelete} autoFocus>Delete</button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Toast Container */}
      {createPortal(
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
        </div>,
        document.body,
      )}
    </PortalLayout>
  );
}
