/* =====================================================
   Daily Financial Insights — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend).
   Ported from Logixsphere Next.js app/(private)/daily-financial-insights.
   Real (in-memory) add/edit/delete against a per-day mock data store.
   ===================================================== */

/* ---------- deterministic PRNG helpers (kept in sync across renders:
   changing filters/period back and forth won't reshuffle already-seen data) ---------- */
function hashStringToSeed(str) {
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
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

/** £ currency, 2 decimals — mirrors utils.ts formatCurrency(). */
function formatCurrency(value) {
  return `£${(Number(value) || 0).toFixed(2)}`;
}

/** Parse a YYYY-MM-DD string as a local Date (no timezone shift). */
function parseLocalDate(dateStr) {
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysISO(dateISO, delta) {
  const d = parseLocalDate(dateISO);
  d.setDate(d.getDate() + delta);
  return formatDateISO(d);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '--';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatDateLong(dateStr) {
  if (!dateStr) return '--';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ==================== payment mode metadata ==================== */
const PAYMENT_MODES = [
  { value: 'DR', label: 'DR' },
  { value: 'FSR', label: 'FSR' },
  { value: 'VSR', label: 'VSR' },
  { value: 'SP_VSR', label: 'SP_VSR' },
  { value: '1', label: 'DAF' },
  { value: '7', label: 'Hourly Rate' },
  { value: 'OFF', label: 'OFF' },
];
const PAYMENT_MODE_LABEL = Object.fromEntries(PAYMENT_MODES.map((m) => [m.value, m.label]));
const REQUIRED_RATE_MODES = new Set(['DR', 'FSR', '7']);
const FLAT_RATE_MODES = new Set(['DR', '1']); // rate is a flat £ value, not £/stop

/**
 * Row total — mirrors utils.ts calculateRow():
 * DR & DAF (cost model 1): rate + sort + adhoc + extras
 * FSR / VSR / SP_VSR / Hourly: rate * stops + sort + adhoc + extras
 * OFF: no operation, so no financials.
 */
function calculateRow(row) {
  if (row.paymentMode === 'OFF') return { total: 0, avgPerStop: 0 };
  const rate = row.rate || 0;
  const stops = row.stops || 0;
  const sort = row.sort || 0;
  const adhoc = row.adhoc || 0;
  const extras = row.extras || 0;
  const total = FLAT_RATE_MODES.has(row.paymentMode)
    ? rate + sort + adhoc + extras
    : rate * stops + sort + adhoc + extras;
  const avgPerStop = stops > 0 ? total / stops : 0;
  return { total, avgPerStop };
}

/** Total Paid Stops column — mirrors utils.ts calculateTotalPaidStops(). */
function calculateTotalPaidStops(row) {
  if (row.paymentMode === 'OFF') return 0;
  if (FLAT_RATE_MODES.has(row.paymentMode)) return row.stops || 0;
  return (row.stops || 0) + (row.rate || 0);
}

const MOCK_NOTES = [
  'Vehicle arrived late.',
  'Extra stop confirmed by depot.',
  'Route completed early.',
  'Traffic delay reported.',
  'Customer redelivery required.',
];

class DailyFinancialInsightsApp {
  constructor() {
    this.rowsByDate = new Map(); // dateISO -> rows[]
    this.filters = { dateFrom: '', dateTo: '', search: '', payment: 'All' };
    this.sortField = 'date';
    this.sortDirection = 'asc';
    this.editingId = null;
    this.rowToDeleteId = null;
    this.formData = this.emptyFormData();
    this._loadTimer = null;

    this.buildMasterData();
    this.init();
  }

  emptyFormData() {
    return {
      date: formatDateISO(new Date()),
      depot: '', vrm: '', vendor: '', route: '', paymentMode: '',
      rate: '', stops: '', sort: '', adhoc: '0', extras: '', notes: '', adhocServiceId: '',
    };
  }

  /* ==================== INIT ==================== */
  init() {
    const today = formatDateISO(new Date());
    this.filters.dateFrom = addDaysISO(today, -6);
    this.filters.dateTo = today;

    this.populateFilterOptions();
    this.setupListeners();
    this.render(true);

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== MASTER (mock) DATA ==================== */
  buildMasterData() {
    this.depots = ['LCY', 'LSE', 'MSE', 'BAOP'];

    this.routesByDepot = {};
    this.depots.forEach((dep) => {
      this.routesByDepot[dep] = Array.from({ length: 4 }, (_, i) => `${dep}${i + 1}`);
    });
    this.allRoutes = this.depots.flatMap((dep) => this.routesByDepot[dep]);

    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
    this.vendors = Array.from({ length: 12 }, (_, i) => ({
      userId: 2000 + i,
      fullName: `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`,
    }));

    const plateRng = rngForSeed('dfi-vehicles-v1');
    this.vehicles = Array.from({ length: 16 }, (_, i) => {
      const letters = String.fromCharCode(65 + Math.floor(plateRng() * 26)) + String.fromCharCode(65 + Math.floor(plateRng() * 26));
      const nums = String(10 + Math.floor(plateRng() * 89));
      const tail = String.fromCharCode(65 + Math.floor(plateRng() * 26)) + String.fromCharCode(65 + Math.floor(plateRng() * 26)) + String.fromCharCode(65 + Math.floor(plateRng() * 26));
      return { vehicleId: 3000 + i, registrationPlates: `${letters}${nums} ${tail}` };
    });

    this.adhocServices = [
      { adhocServiceId: 1, adhocName: 'Extra Stop', adhocVendorPayment: 12 },
      { adhocServiceId: 2, adhocName: 'Redelivery', adhocVendorPayment: 9 },
      { adhocServiceId: 3, adhocName: 'Recovery', adhocVendorPayment: 24 },
      { adhocServiceId: 4, adhocName: 'Additional Collection', adhocVendorPayment: 15 },
      { adhocServiceId: 5, adhocName: 'Out of Hours Run', adhocVendorPayment: 32 },
    ];
  }

  /* ==================== PER-DAY MOCK ROWS ==================== */
  getRowsForDate(dateISO) {
    if (!this.rowsByDate.has(dateISO)) {
      this.rowsByDate.set(dateISO, this.generateRowsForDate(dateISO));
    }
    return this.rowsByDate.get(dateISO);
  }

  generateRowsForDate(dateISO) {
    const rng = rngForSeed(`dfi-day-${dateISO}`);
    const count = 15 + Math.floor(rng() * 26); // 15-40 rows/day
    const rows = [];

    for (let i = 0; i < count; i++) {
      const depot = this.depots[Math.floor(rng() * this.depots.length)];
      const vendor = this.vendors[Math.floor(rng() * this.vendors.length)];
      const vehicle = this.vehicles[Math.floor(rng() * this.vehicles.length)];
      const route = this.routesByDepot[depot][Math.floor(rng() * this.routesByDepot[depot].length)];

      // weighted payment mode pick
      const roll = rng();
      let paymentMode;
      if (roll < 0.30) paymentMode = 'FSR';
      else if (roll < 0.50) paymentMode = 'VSR';
      else if (roll < 0.65) paymentMode = 'SP_VSR';
      else if (roll < 0.80) paymentMode = 'DR';
      else if (roll < 0.90) paymentMode = '1';
      else if (roll < 0.95) paymentMode = '7';
      else paymentMode = 'OFF';

      let rate = 0, stops = 0, sort = 0, extras = 0, adhoc = 0, adhocServiceId = null;

      if (paymentMode !== 'OFF') {
        if (paymentMode === 'DR' || paymentMode === '1') {
          rate = Math.round((100 + rng() * 80) * 100) / 100;
          stops = 60 + Math.floor(rng() * 100);
        } else if (paymentMode === '7') {
          rate = Math.round((12 + rng() * 6) * 100) / 100;
          stops = 6 + Math.floor(rng() * 5); // hours worked
        } else {
          // FSR / VSR / SP_VSR — rate is £/stop
          rate = Math.round((1.0 + rng() * 1.3) * 100) / 100;
          stops = 60 + Math.floor(rng() * 100);
        }

        sort = rng() < 0.6 ? Math.round(rng() * 32 * 100) / 100 : 0;
        extras = rng() < 0.3 ? Math.round((2 + rng() * 14) * 100) / 100 : 0;

        if (rng() < 0.2) {
          const svc = this.adhocServices[Math.floor(rng() * this.adhocServices.length)];
          adhocServiceId = svc.adhocServiceId;
          adhoc = svc.adhocVendorPayment;
        }
      }

      const notes = rng() < 0.25 ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '';

      rows.push({
        operationId: `${dateISO}-${i}`,
        date: dateISO,
        depot,
        vrm: vehicle.registrationPlates,
        courier: vendor.fullName,
        route,
        paymentMode,
        rate, stops, sort, adhoc, extras, notes,
        adhocServiceId,
      });
    }
    return rows;
  }

  /* ==================== FILTER OPTIONS ==================== */
  populateFilterOptions() {
    // Payment mode <select> options are static in the HTML already.
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.getElementById('dateFromInput').value = this.filters.dateFrom;
    document.getElementById('dateToInput').value = this.filters.dateTo;

    document.getElementById('dateFromInput').addEventListener('change', (e) => {
      this.filters.dateFrom = e.target.value || this.filters.dateFrom;
      this.render(true);
    });
    document.getElementById('dateToInput').addEventListener('change', (e) => {
      this.filters.dateTo = e.target.value || this.filters.dateTo;
      this.render(true);
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.render();
    });

    document.getElementById('filterPaymentMode').addEventListener('change', (e) => {
      this.filters.payment = e.target.value;
      this.render();
    });

    document.getElementById('btnClearFilters').addEventListener('click', () => {
      const today = formatDateISO(new Date());
      this.filters = { dateFrom: addDaysISO(today, -6), dateTo: today, search: '', payment: 'All' };
      document.getElementById('dateFromInput').value = this.filters.dateFrom;
      document.getElementById('dateToInput').value = this.filters.dateTo;
      document.getElementById('searchInput').value = '';
      document.getElementById('filterPaymentMode').value = 'All';
      this.render(true);
    });

    document.getElementById('insightsTableHead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort-key]');
      if (!th) return;
      const key = th.dataset.sortKey;
      if (this.sortField === key) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = key;
        this.sortDirection = 'asc';
      }
      this.render();
    });

    document.getElementById('insightsTableBody').addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) { this.openEditModal(editBtn.dataset.edit); return; }
      const deleteBtn = e.target.closest('[data-delete]');
      if (deleteBtn) { this.openDeleteModal(deleteBtn.dataset.delete); return; }
    });

    // New / modal
    document.getElementById('btnNewRegister').addEventListener('click', () => this.openCreateModal());
    document.getElementById('btnCloseOperationModal').addEventListener('click', () => this.closeOperationModal());
    document.getElementById('btnCancelOperation').addEventListener('click', () => this.closeOperationModal());
    document.getElementById('operationModalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'operationModalBackdrop') this.closeOperationModal();
    });
    document.getElementById('operationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveOperation();
    });
    document.getElementById('operationFormGrid').addEventListener('input', (e) => this.handleFormInput(e));
    document.getElementById('operationFormGrid').addEventListener('change', (e) => this.handleFormChange(e));

    // Delete modal
    document.getElementById('btnCloseDeleteModal').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('btnCancelDelete').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('deleteModalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'deleteModalBackdrop') this.closeDeleteModal();
    });
    document.getElementById('btnConfirmDelete').addEventListener('click', () => this.confirmDelete());

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      this.closeDeleteModal();
      this.closeOperationModal();
    });
  }

  /* ==================== DATA HELPERS ==================== */
  getRowsInRange() {
    const { dateFrom, dateTo } = this.filters;
    if (!dateFrom) return [];
    const from = dateFrom;
    const to = dateTo && dateTo >= dateFrom ? dateTo : dateFrom;
    const rows = [];
    let cursor = from;
    let guard = 0;
    while (cursor <= to && guard < 400) {
      rows.push(...this.getRowsForDate(cursor));
      cursor = addDaysISO(cursor, 1);
      guard++;
    }
    return rows;
  }

  /** Mirrors dataProcessor.ts filterInsightData() (date range already applied via getRowsInRange). */
  getFilteredRows() {
    let rows = this.getRowsInRange();

    if (this.filters.search) {
      const term = this.filters.search.toLowerCase();
      rows = rows.filter((r) => {
        const matchesRoute = (r.route || '').toLowerCase().includes(term);
        const matchesVehicle = (r.vrm || '').toLowerCase().includes(term);
        const matchesVendor = (r.courier || '').toLowerCase().includes(term);
        return matchesRoute || matchesVehicle || matchesVendor;
      });
    }

    if (this.filters.payment && this.filters.payment !== 'All') {
      rows = rows.filter((r) => r.paymentMode === this.filters.payment);
    }

    return this.applySort(rows);
  }

  applySort(rows) {
    const field = this.sortField;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const numericFields = new Set(['rate', 'stops', 'sort', 'adhoc', 'extras', 'total', 'avgPerStop', 'totalPaidStops']);

    const valueFor = (row, f) => {
      if (f === 'total' || f === 'avgPerStop') return calculateRow(row)[f];
      if (f === 'totalPaidStops') return calculateTotalPaidStops(row);
      return row[f];
    };

    return [...rows].sort((a, b) => {
      if (field === 'date') {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (da !== db) return dir * (da - db);
        return dir * (a.route || '').localeCompare(b.route || '');
      }
      if (numericFields.has(field)) {
        return dir * ((valueFor(a, field) || 0) - (valueFor(b, field) || 0));
      }
      const av = String(valueFor(a, field) ?? '').toLowerCase();
      const bv = String(valueFor(b, field) ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  /** Mirrors dataProcessor.ts calculatePageTotals(). */
  calculatePageTotals(rows) {
    let total = 0;
    let totalStops = 0;
    rows.forEach((row) => {
      total += calculateRow(row).total || 0;
      totalStops += row.stops || 0;
    });
    const avg = totalStops > 0 ? total / totalStops : 0;
    return {
      total: Math.round(total * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      count: rows.length,
    };
  }

  /* ==================== RENDER ==================== */
  render(simulateLoad = false) {
    this.renderHeader();

    const tbody = document.getElementById('insightsTableBody');
    const tfoot = document.getElementById('insightsTableFoot');

    if (simulateLoad) {
      clearTimeout(this._loadTimer);
      tbody.innerHTML = `<tr><td colspan="15" class="dfi-table-message">Loading…</td></tr>`;
      tfoot.innerHTML = '';
      this._loadTimer = setTimeout(() => this.renderRows(), 200);
      return;
    }
    this.renderRows();
  }

  renderHeader() {
    const { dateFrom, dateTo } = this.filters;
    const subtitleEl = document.getElementById('pageHeaderSubtitle');
    if (dateFrom && dateTo && dateFrom !== dateTo) {
      subtitleEl.textContent = `Period: ${formatDateLong(dateFrom)} - ${formatDateLong(dateTo)}`;
    } else {
      subtitleEl.textContent = `Date: ${formatDateLong(dateFrom || dateTo)}`;
    }
  }

  renderRows() {
    const tbody = document.getElementById('insightsTableBody');
    const tfoot = document.getElementById('insightsTableFoot');
    const rows = this.getFilteredRows();

    this.renderMetrics(rows);
    this.updateSortIndicators();

    if (rows.length === 0) {
      const hasFilters = this.filters.search.trim() !== '' || this.filters.payment !== 'All';
      tbody.innerHTML = `<tr><td colspan="15" class="dfi-table-message">${hasFilters ? 'No results for the current filters.' : 'No registers for the selected period.'}</td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    tbody.innerHTML = rows.map((row) => this.renderRow(row)).join('');

    const totals = this.calculatePageTotals(rows);
    tfoot.innerHTML = `
      <tr class="dfi-totals-row">
        <td colspan="12" class="text-end" data-label="">Total</td>
        <td class="dfi-total-col" data-label="Total">${formatCurrency(totals.total)}</td>
        <td data-label="Avg/Stop">${formatCurrency(totals.avg)}</td>
        <td data-label=""></td>
      </tr>
    `;
  }

  renderRow(row) {
    const isOff = row.paymentMode === 'OFF';
    const { total, avgPerStop } = calculateRow(row);
    const totalPaidStops = calculateTotalPaidStops(row);
    const pmLabel = PAYMENT_MODE_LABEL[row.paymentMode] || row.paymentMode;

    const rateDisplay = isOff
      ? '-'
      : FLAT_RATE_MODES.has(row.paymentMode)
        ? formatCurrency(row.rate)
        : `£${(row.rate || 0).toFixed(2)}/stop`;

    const extrasDisplay = isOff || row.paymentMode === '7' ? '-' : (row.extras ? formatCurrency(row.extras) : '-');
    const notesDisplay = isOff || !row.notes
      ? '-'
      : `<span class="dfi-notes-icon" title="${escapeHtml(row.notes)}"><i class="bi bi-sticky-fill"></i></span>`;

    return `
      <tr>
        <td data-label="Date">${escapeHtml(formatDateDisplay(row.date))}</td>
        <td data-label="VRN">${escapeHtml(row.vrm)}</td>
        <td data-label="Vendor" class="dfi-vendor-cell">${escapeHtml(row.courier)}</td>
        <td data-label="Route" class="dfi-route-cell">${escapeHtml(row.route)}</td>
        <td data-label="Payment"><span class="dfi-pm-badge dfi-pm-${row.paymentMode}">${escapeHtml(pmLabel)}</span></td>
        <td data-label="Rate">${rateDisplay}</td>
        <td data-label="Stops">${isOff ? '-' : row.stops}</td>
        <td data-label="Total Paid">${isOff ? '-' : totalPaidStops.toFixed(2)}</td>
        <td data-label="Route Sort">${isOff || !row.sort ? '-' : formatCurrency(row.sort)}</td>
        <td data-label="AD-HOC SERVICE">${isOff || !row.adhoc ? '-' : formatCurrency(row.adhoc)}</td>
        <td data-label="Extras">${extrasDisplay}</td>
        <td data-label="Notes">${notesDisplay}</td>
        <td data-label="Total" class="dfi-total-col">${isOff ? '-' : formatCurrency(total)}</td>
        <td data-label="Avg/Stop">${isOff ? '-' : formatCurrency(avgPerStop)}</td>
        <td data-label="Actions">
          <div class="dfi-actions-cell">
            <button type="button" class="dfi-icon-btn" data-edit="${row.operationId}" aria-label="Edit operation" title="Edit"><i class="bi bi-pencil"></i></button>
            <button type="button" class="dfi-icon-btn dfi-delete-btn" data-delete="${row.operationId}" aria-label="Delete operation" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }

  renderMetrics(rows) {
    const totals = this.calculatePageTotals(rows);
    const uniqueRoutes = new Set(rows.map((r) => r.route).filter(Boolean)).size;
    const uniqueVendors = new Set(rows.map((r) => r.courier).filter(Boolean)).size;
    const metrics = [
      { label: 'Total Records', value: rows.length },
      { label: 'Total Amount', value: formatCurrency(totals.total) },
      { label: 'Routes', value: uniqueRoutes },
      { label: 'Vendors', value: uniqueVendors },
    ];
    document.getElementById('dfiMetrics').innerHTML = metrics.map((m) => `
      <div class="dfi-metric-card">
        <p class="dfi-metric-label">${escapeHtml(m.label)}</p>
        <p class="dfi-metric-value">${escapeHtml(String(m.value))}</p>
      </div>
    `).join('');
  }

  updateSortIndicators() {
    document.querySelectorAll('#insightsTableHead th[data-sort-key]').forEach((th) => {
      const ind = th.querySelector('.sort-ind');
      if (ind) ind.remove();
      if (th.dataset.sortKey === this.sortField) {
        const span = document.createElement('span');
        span.className = 'sort-ind';
        span.innerHTML = this.sortDirection === 'asc' ? '<i class="bi bi-arrow-down"></i>' : '<i class="bi bi-arrow-up"></i>';
        th.appendChild(span);
      }
    });
  }

  /* ==================== OPERATION MODAL (add/edit) ==================== */
  openCreateModal() {
    this.editingId = null;
    this.formErrors = {};
    this.formData = this.emptyFormData();
    this.formData.date = this.filters.dateTo || formatDateISO(new Date());
    document.getElementById('operationModalTitle').textContent = 'Add New Register';
    document.getElementById('btnSubmitOperation').textContent = 'Save Register';
    this.renderOperationForm();
    document.getElementById('operationModalBackdrop').hidden = false;
  }

  openEditModal(operationId) {
    const row = this.findRowById(operationId);
    if (!row) return;
    this.editingId = operationId;
    this.formErrors = {};
    this.formData = {
      date: row.date,
      depot: row.depot,
      vrm: row.vrm,
      vendor: row.courier,
      route: row.route,
      paymentMode: row.paymentMode,
      rate: row.rate ? String(row.rate) : '',
      stops: row.stops ? String(row.stops) : '',
      sort: row.sort ? String(row.sort) : '',
      adhoc: row.adhoc ? String(row.adhoc) : '0',
      extras: row.extras ? String(row.extras) : '',
      notes: row.notes || '',
      adhocServiceId: row.adhocServiceId != null ? String(row.adhocServiceId) : '',
    };
    document.getElementById('operationModalTitle').textContent = 'Edit Register';
    document.getElementById('btnSubmitOperation').textContent = 'Update Register';
    this.renderOperationForm();
    document.getElementById('operationModalBackdrop').hidden = false;
  }

  closeOperationModal() {
    document.getElementById('operationModalBackdrop').hidden = true;
    this.editingId = null;
  }

  findRowById(operationId) {
    for (const rows of this.rowsByDate.values()) {
      const found = rows.find((r) => r.operationId === operationId);
      if (found) return found;
    }
    return null;
  }

  handleFormInput(e) {
    const field = e.target.dataset.field;
    if (!field) return;
    this.formData[field] = e.target.value;
  }

  handleFormChange(e) {
    const field = e.target.dataset.field;
    if (!field) return;
    this.formData[field] = e.target.value;

    if (field === 'adhocServiceId') {
      if (!e.target.value) {
        this.formData.adhoc = '0';
      } else {
        const svc = this.adhocServices.find((s) => String(s.adhocServiceId) === e.target.value);
        if (svc) this.formData.adhoc = String(svc.adhocVendorPayment);
      }
      this.renderOperationForm();
      return;
    }
    if (field === 'paymentMode') {
      this.renderOperationForm();
    }
  }

  /**
   * Renders the add/edit form fields.
   * NOTE — simplification vs. the Next.js OperationModal: the source app derives Rate
   * from a selected cost-model band (FSR fixedPrice / VSR & SP_VSR pricePerStop, looked
   * up per vendor+route). This mock has no cost-model/vendor-contract data, so Rate is a
   * plain editable £ (flat for DR/DAF) or £/stop (FSR/VSR/SP_VSR/Hourly) number field —
   * the banded auto-calc and its FSRInfoIcon breakdown popover are not reproduced.
   */
  renderOperationForm() {
    const fd = this.formData;
    const errors = this.formErrors || {};
    const isOff = fd.paymentMode === 'OFF';
    const hasAdhocService = Boolean(fd.adhocServiceId);
    const isRateRequired = REQUIRED_RATE_MODES.has(fd.paymentMode);
    const rateUnit = FLAT_RATE_MODES.has(fd.paymentMode) ? '£' : '£/stop';

    const errClass = (field) => (errors[field] ? ' has-error' : '');
    const errText = (field) => (errors[field] ? `<span class="dom-form-error-text">${escapeHtml(errors[field])}</span>` : '');

    const vendorOptions = [...this.vendors]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((v) => `<option value="${escapeHtml(v.fullName)}" ${fd.vendor === v.fullName ? 'selected' : ''}>${escapeHtml(v.fullName)}</option>`).join('');

    const depotOptions = this.depots
      .map((d) => `<option value="${d}" ${fd.depot === d ? 'selected' : ''}>${d}</option>`).join('');

    const vehicleOptions = this.vehicles
      .map((v) => `<option value="${escapeHtml(v.registrationPlates)}" ${fd.vrm === v.registrationPlates ? 'selected' : ''}>${escapeHtml(v.registrationPlates)}</option>`).join('');

    const routeOptions = this.allRoutes
      .map((r) => `<option value="${r}" ${fd.route === r ? 'selected' : ''}>${r}</option>`).join('');

    const paymentOptions = PAYMENT_MODES
      .map((m) => `<option value="${m.value}" ${fd.paymentMode === m.value ? 'selected' : ''}>${m.label}</option>`).join('');

    const adhocOptions = this.adhocServices
      .map((s) => `<option value="${s.adhocServiceId}" ${fd.adhocServiceId === String(s.adhocServiceId) ? 'selected' : ''}>${escapeHtml(s.adhocName)}</option>`).join('');

    let html = `
      <div class="dom-form-field${errClass('date')}">
        <label class="dom-form-label">Date<span class="required-mark">*</span></label>
        <input type="date" data-field="date" value="${escapeHtml(fd.date)}" required />
        ${errText('date')}
      </div>
      <div class="dom-form-field${errClass('vendor')}">
        <label class="dom-form-label">Vendor<span class="required-mark">*</span></label>
        <select data-field="vendor" required><option value="">Select Vendor</option>${vendorOptions}</select>
        ${errText('vendor')}
      </div>
      <div class="dom-form-field${errClass('depot')}">
        <label class="dom-form-label">Depot Location<span class="required-mark">*</span></label>
        <select data-field="depot" required><option value="">Select Depot</option>${depotOptions}</select>
        ${errText('depot')}
      </div>
      <div class="dom-form-field${errClass('vrm')}">
        <label class="dom-form-label">VRN<span class="required-mark">*</span></label>
        <select data-field="vrm" required><option value="">Select Vehicle</option>${vehicleOptions}</select>
        ${errText('vrm')}
      </div>
      <div class="dom-form-field${errClass('route')}">
        <label class="dom-form-label">Route<span class="required-mark">*</span></label>
        <select data-field="route" required><option value="">Select Route</option>${routeOptions}</select>
        ${errText('route')}
      </div>
      <div class="dom-form-field${errClass('paymentMode')}">
        <label class="dom-form-label">Payment Mode<span class="required-mark">*</span></label>
        <select data-field="paymentMode" required><option value="">Select Payment Mode</option>${paymentOptions}</select>
        ${errText('paymentMode')}
      </div>
    `;

    if (!isOff) {
      html += `
      <div class="dom-form-field">
        <label class="dom-form-label">AD-HOC Service</label>
        <select data-field="adhocServiceId"><option value="">None</option>${adhocOptions}</select>
      </div>
      <div class="dom-form-field">
        <label class="dom-form-label">Adhoc Value</label>
        <input type="number" step="0.01" min="0" data-field="adhoc" value="${escapeHtml(fd.adhoc)}" ${hasAdhocService ? '' : 'disabled'} />
      </div>
      `;

      if (!hasAdhocService) {
        html += `
        <div class="dom-form-field${errClass('rate')}">
          <label class="dom-form-label">Rate (${rateUnit})${isRateRequired ? '<span class="required-mark">*</span>' : ''}</label>
          <input type="number" step="0.01" min="0" data-field="rate" value="${escapeHtml(fd.rate)}" placeholder="e.g., 1.51" />
          ${errText('rate')}
        </div>
        <div class="dom-form-field">
          <label class="dom-form-label">Stops / Hours</label>
          <input type="number" step="1" min="0" data-field="stops" value="${escapeHtml(fd.stops)}" placeholder="e.g., 96" />
        </div>
        <div class="dom-form-field">
          <label class="dom-form-label">Route Sort</label>
          <input type="number" step="0.01" min="0" data-field="sort" value="${escapeHtml(fd.sort)}" placeholder="e.g., 28" />
        </div>
        `;
      }

      html += `
      <div class="dom-form-field">
        <label class="dom-form-label">Extras</label>
        <input type="number" step="0.01" min="0" data-field="extras" value="${escapeHtml(fd.extras)}" placeholder="e.g., 2" />
      </div>
      `;
    }

    html += `
      <div class="dom-form-field span-2">
        <label class="dom-form-label">Notes</label>
        <textarea data-field="notes" rows="3" placeholder="Optional notes...">${escapeHtml(fd.notes)}</textarea>
      </div>
    `;

    document.getElementById('operationFormGrid').innerHTML = html;
  }

  validateForm() {
    const fd = this.formData;
    const errors = {};
    if (!fd.date) errors.date = 'Date is required.';
    if (!fd.vendor) errors.vendor = 'Vendor is required.';
    if (!fd.depot) errors.depot = 'Depot is required.';
    if (!fd.vrm) errors.vrm = 'VRN is required.';
    if (!fd.route) errors.route = 'Route is required.';
    if (!fd.paymentMode) errors.paymentMode = 'Payment mode is required.';

    const isOff = fd.paymentMode === 'OFF';
    const hasAdhocService = Boolean(fd.adhocServiceId);
    if (!isOff && !hasAdhocService && REQUIRED_RATE_MODES.has(fd.paymentMode) && !fd.rate) {
      errors.rate = 'Rate is required for this payment mode.';
    }
    return errors;
  }

  saveOperation() {
    const errors = this.validateForm();
    this.formErrors = errors;
    if (Object.keys(errors).length > 0) {
      this.renderOperationForm();
      this.showFormError('Please fill in all required fields.');
      return;
    }
    this.hideFormError();

    const fd = this.formData;
    const isOff = fd.paymentMode === 'OFF';
    const num = (v) => (v === '' || v == null ? 0 : parseFloat(String(v).replace(',', '.')) || 0);

    const newRow = {
      operationId: this.editingId || `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: fd.date,
      depot: fd.depot,
      vrm: fd.vrm,
      courier: fd.vendor,
      route: fd.route,
      paymentMode: fd.paymentMode,
      rate: isOff ? 0 : num(fd.rate),
      stops: isOff ? 0 : num(fd.stops),
      sort: isOff ? 0 : num(fd.sort),
      adhoc: isOff ? 0 : num(fd.adhoc),
      extras: isOff ? 0 : num(fd.extras),
      notes: fd.notes || '',
      adhocServiceId: isOff || !fd.adhocServiceId ? null : Number(fd.adhocServiceId),
    };

    if (this.editingId) {
      // Remove old row (it may have lived under a different date if the user changed it).
      for (const [dateKey, rows] of this.rowsByDate.entries()) {
        const idx = rows.findIndex((r) => r.operationId === this.editingId);
        if (idx !== -1) {
          rows.splice(idx, 1);
          if (rows.length === 0) this.rowsByDate.delete(dateKey);
          break;
        }
      }
      this.getRowsForDate(newRow.date).push(newRow);
      this.showToast('Register updated successfully!', 'success');
    } else {
      this.getRowsForDate(newRow.date).push(newRow);
      this.showToast('Register added successfully!', 'success');
    }

    this.closeOperationModal();
    this.render();
  }

  showFormError(message) {
    const el = document.getElementById('operationFormError');
    el.textContent = message;
    el.hidden = false;
  }
  hideFormError() {
    const el = document.getElementById('operationFormError');
    el.hidden = true;
    el.textContent = '';
  }

  /* ==================== DELETE MODAL ==================== */
  openDeleteModal(operationId) {
    const row = this.findRowById(operationId);
    if (!row) return;
    this.rowToDeleteId = operationId;
    document.getElementById('deleteModalText').textContent =
      `Remove the register for ${row.courier} on ${formatDateDisplay(row.date)} (route ${row.route})? This cannot be undone.`;
    document.getElementById('deleteModalBackdrop').hidden = false;
  }

  closeDeleteModal() {
    document.getElementById('deleteModalBackdrop').hidden = true;
    this.rowToDeleteId = null;
  }

  confirmDelete() {
    if (!this.rowToDeleteId) { this.closeDeleteModal(); return; }
    let removed = false;
    for (const [dateKey, rows] of this.rowsByDate.entries()) {
      const idx = rows.findIndex((r) => r.operationId === this.rowToDeleteId);
      if (idx !== -1) {
        rows.splice(idx, 1);
        if (rows.length === 0) this.rowsByDate.delete(dateKey);
        removed = true;
        break;
      }
    }
    this.closeDeleteModal();
    if (removed) {
      this.showToast('Register deleted successfully.', 'success');
      this.render();
    } else {
      this.showToast('Could not delete register. Please try again.', 'error');
    }
  }

  /* ==================== TOASTS ==================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
    toast.innerHTML = `<i class="bi ${icon}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new DailyFinancialInsightsApp();
  window.dailyFinancialInsightsApp = app;
});
