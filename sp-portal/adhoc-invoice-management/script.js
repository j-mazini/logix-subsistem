/* =====================================================
   Ad-hoc Invoice System (Adhoc Works Invoice Management) — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend)
   ===================================================== */

/* ---------- small deterministic PRNG helpers (kept in sync across
   loads: switching weeks / filters back and forth won't reshuffle data) ---------- */
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

function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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

/** Monday of the week containing `date`. */
function getWeekStart(date) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Sunday of the week containing `date`. */
function getWeekEnd(date) {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

function formatDateShort(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatDateDisplay(dateStr) {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class AdhocInvoiceApp {
  constructor() {
    this.selectedDate = formatDateISO(new Date());
    this.selectedServicePartnerId = '';
    this.searchTerm = '';
    this.sortField = 'date';
    this.sortDirection = 'asc';
    this.rowsByWeek = new Map(); // weekStartISO -> rows[]
    this._loadTimer = null;

    this.buildMasterData();
    this.init();
  }

  /* ==================== INIT ==================== */
  init() {
    this.populateFilterOptions();
    this.populateMonthYearOptions();
    this.setupListeners();
    this.render(true);

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== MASTER (mock) DATA ==================== */
  buildMasterData() {
    this.servicePartners = [
      { servicePartnerId: 1, partnerName: 'Swift Logistics' },
      { servicePartnerId: 2, partnerName: 'Kent Express' },
      { servicePartnerId: 3, partnerName: 'Medway Movers' },
    ];

    this.depots = ['Maidstone', 'Chatham', 'Dartford', 'Ashford'];

    this.routesByDepot = {};
    this.depots.forEach((dep) => {
      const prefix = dep.slice(0, 3).toUpperCase();
      this.routesByDepot[dep] = Array.from({ length: 3 }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);
    });

    this.adhocDefs = [
      { name: 'Extra Stop', category: 'Operational', vendorMin: 8, vendorMax: 18, receivedMin: 14, receivedMax: 28 },
      { name: 'Redelivery', category: 'Customer Requested', vendorMin: 6, vendorMax: 14, receivedMin: 10, receivedMax: 22 },
      { name: 'Recovery', category: 'Operational', vendorMin: 15, vendorMax: 35, receivedMin: 25, receivedMax: 55 },
      { name: 'Additional Collection', category: 'Customer Requested', vendorMin: 10, vendorMax: 20, receivedMin: 16, receivedMax: 32 },
      { name: 'Out of Hours Run', category: 'Operational', vendorMin: 25, vendorMax: 45, receivedMin: 35, receivedMax: 70 },
    ];

    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
    const rng = rngForSeed('adhoc-vendors-v1');
    this.vendors = Array.from({ length: 10 }, (_, i) => {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
      const depot = this.depots[i % this.depots.length];
      const hasSp = rng() > 0.3;
      return {
        userId: 1000 + i,
        fullName,
        depot,
        servicePartnerId: hasSp ? this.servicePartners[i % this.servicePartners.length].servicePartnerId : null,
      };
    });
  }

  /* ==================== PER-WEEK MOCK ROWS ==================== */
  getRowsForWeek(weekStart) {
    const key = formatDateISO(weekStart);
    if (!this.rowsByWeek.has(key)) {
      this.rowsByWeek.set(key, this.generateRowsForWeek(weekStart, key));
    }
    return this.rowsByWeek.get(key);
  }

  generateRowsForWeek(weekStart, key) {
    const rng = rngForSeed(`adhoc-week-${key}`);
    const isCurrentWeek = key === formatDateISO(getWeekStart(new Date()));

    // A quarter of past/future weeks come back empty, to exercise the
    // empty-state UI — but never the current week, so the page never
    // opens on an empty table.
    if (!isCurrentWeek && rng() < 0.25) return [];

    const count = 4 + Math.floor(rng() * 6); // 4-9 rows per active week
    const rows = [];
    for (let i = 0; i < count; i++) {
      const vendor = this.vendors[Math.floor(rng() * this.vendors.length)];
      const routes = this.routesByDepot[vendor.depot];
      const route = routes[Math.floor(rng() * routes.length)];
      const dayOffset = Math.floor(rng() * 7);
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayOffset);
      const def = this.adhocDefs[Math.floor(rng() * this.adhocDefs.length)];
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

  /* ==================== FILTER OPTIONS ==================== */
  populateFilterOptions() {
    const spSel = document.getElementById('filterServicePartner');
    this.servicePartners.forEach((sp) => {
      const opt = document.createElement('option');
      opt.value = String(sp.servicePartnerId);
      opt.textContent = sp.partnerName;
      spSel.appendChild(opt);
    });
  }

  populateMonthYearOptions() {
    const monthSel = document.getElementById('weekMonthSelect');
    monthSel.innerHTML = MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join('');

    const currentYear = parseLocalDate(this.selectedDate).getFullYear();
    const yearSel = document.getElementById('weekYearSelect');
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
    yearSel.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.getElementById('btnPrevWeek').addEventListener('click', () => this.changeWeek(-7));
    document.getElementById('btnNextWeek').addEventListener('click', () => this.changeWeek(7));
    document.getElementById('btnTodayWeek').addEventListener('click', () => this.setDate(formatDateISO(new Date())));

    document.getElementById('weekMonthSelect').addEventListener('change', (e) => {
      const current = parseLocalDate(this.selectedDate);
      current.setMonth(Number(e.target.value));
      this.setDate(formatDateISO(current));
    });
    document.getElementById('weekYearSelect').addEventListener('change', (e) => {
      const current = parseLocalDate(this.selectedDate);
      current.setFullYear(Number(e.target.value));
      this.setDate(formatDateISO(current));
    });

    document.getElementById('filterServicePartner').addEventListener('change', (e) => {
      this.selectedServicePartnerId = e.target.value;
      this.render();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.render();
    });

    document.getElementById('adhocTableHead').addEventListener('click', (e) => {
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

    document.getElementById('btnExportXlsx').addEventListener('click', () => this.exportXlsx());
    document.getElementById('btnExportPdf').addEventListener('click', () => this.exportPdf());
  }

  changeWeek(deltaDays) {
    const current = parseLocalDate(this.selectedDate);
    current.setDate(current.getDate() + deltaDays);
    this.setDate(formatDateISO(current));
  }

  setDate(date) {
    this.selectedDate = date;
    this.populateMonthYearOptions();
    this.render(true);
  }

  /* ==================== DATA HELPERS ==================== */
  getWeekRows() {
    const weekStart = getWeekStart(this.selectedDate);
    let rows = this.getRowsForWeek(weekStart);
    if (this.selectedServicePartnerId !== '') {
      rows = rows.filter((r) => String(r.servicePartnerId) === this.selectedServicePartnerId);
    }
    return rows;
  }

  getDisplayRows() {
    let rows = this.getWeekRows();
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) => {
        const hay = `${r.vendorName} ${r.depot} ${r.route} ${r.adhocName} ${r.adhocCategory}`.toLowerCase();
        return hay.includes(term);
      });
    }
    return this.applySort(rows);
  }

  applySort(rows) {
    const field = this.sortField;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const numericFields = ['receivedPayment', 'vendorPayment'];
    return [...rows].sort((a, b) => {
      if (numericFields.includes(field)) {
        return dir * ((a[field] || 0) - (b[field] || 0));
      }
      const av = String(a[field] ?? '').toLowerCase();
      const bv = String(b[field] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  /* ==================== RENDER ==================== */
  render(simulateLoad = false) {
    this.renderHeader();
    this.updateSortIndicators();

    const tbody = document.getElementById('adhocTableBody');
    const tfoot = document.getElementById('adhocTableFoot');

    if (simulateLoad) {
      clearTimeout(this._loadTimer);
      tbody.innerHTML = `<tr><td colspan="8" class="adm-table-message">Loading…</td></tr>`;
      tfoot.innerHTML = '';
      this._loadTimer = setTimeout(() => this.renderRows(), 200);
      return;
    }
    this.renderRows();
  }

  renderRows() {
    const tbody = document.getElementById('adhocTableBody');
    const tfoot = document.getElementById('adhocTableFoot');
    const rows = this.getDisplayRows();

    this.updateExportButtonsState(rows);

    if (rows.length === 0) {
      const hasSearch = this.searchTerm.trim() !== '';
      tbody.innerHTML = `<tr><td colspan="8" class="adm-table-message">${hasSearch ? 'No results for the current search.' : 'No adhoc works for the selected week.'}</td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td data-label="Date" class="text-nowrap">${escapeHtml(formatDateDisplay(r.date))}</td>
        <td data-label="Vendor" class="fw-semibold">${escapeHtml(r.vendorName)}</td>
        <td data-label="Depot">${escapeHtml(r.depot)}</td>
        <td data-label="Route">${escapeHtml(r.route)}</td>
        <td data-label="Adhoc service">${escapeHtml(r.adhocName)}</td>
        <td data-label="Adhoc category" class="text-secondary">${escapeHtml(r.adhocCategory)}</td>
        <td data-label="Adhoc received payment" class="fw-semibold adm-amount-cell">${formatCurrency(r.receivedPayment)}</td>
        <td data-label="Vendor payment" class="fw-semibold adm-amount-cell">${formatCurrency(r.vendorPayment)}</td>
      </tr>
    `).join('');

    const totalReceived = rows.reduce((s, r) => s + (r.receivedPayment || 0), 0);
    const totalVendor = rows.reduce((s, r) => s + (r.vendorPayment || 0), 0);
    tfoot.innerHTML = `
      <tr class="adm-totals-row">
        <td colspan="6" class="text-end fw-bold">Totals</td>
        <td class="fw-bold adm-amount-cell">${formatCurrency(totalReceived)}</td>
        <td class="fw-bold adm-amount-cell">${formatCurrency(totalVendor)}</td>
      </tr>
    `;
  }

  renderHeader() {
    const weekStart = getWeekStart(this.selectedDate);
    const weekEnd = getWeekEnd(this.selectedDate);
    const subtitle = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)} ${weekStart.getFullYear()}`;
    document.getElementById('weekRangeLabel').textContent = subtitle;
    document.getElementById('weekMonthSelect').value = String(parseLocalDate(this.selectedDate).getMonth());
    document.getElementById('weekYearSelect').value = String(parseLocalDate(this.selectedDate).getFullYear());
  }

  updateSortIndicators() {
    document.querySelectorAll('#adhocTableHead th[data-sort-key]').forEach((th) => {
      const ind = th.querySelector('.sort-ind');
      if (ind) ind.remove();
      if (th.dataset.sortKey === this.sortField) {
        const span = document.createElement('span');
        span.className = 'sort-ind';
        span.textContent = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
        th.appendChild(span);
      }
    });
  }

  updateExportButtonsState(rows) {
    document.getElementById('btnExportXlsx').disabled = rows.length === 0;
    document.getElementById('btnExportPdf').disabled = rows.length === 0;
  }

  /* ==================== EXPORT ==================== */
  weekFilenameSuffix() {
    const weekStart = getWeekStart(this.selectedDate);
    const weekEnd = getWeekEnd(this.selectedDate);
    return `${formatDateShort(weekStart).replace('/', '-')}_${formatDateShort(weekEnd).replace('/', '-')}-${weekStart.getFullYear()}`;
  }

  exportXlsx() {
    const rows = this.getDisplayRows();
    if (rows.length === 0) return;

    if (typeof XLSX === 'undefined') {
      this.showToast('XLSX export library failed to load.', 'error');
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
      Date: '', Vendor: '', Depot: '', Route: '', 'Adhoc service': '', 'Adhoc category': 'Totals',
      'Adhoc received payment': Math.round(totalReceived * 100) / 100,
      'Vendor payment': Math.round(totalVendor * 100) / 100,
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adhoc Works');
    XLSX.writeFile(workbook, `adhoc-works-${this.weekFilenameSuffix()}.xlsx`);
    this.showToast(`Exported ${rows.length} row(s) to XLSX.`, 'success');
  }

  exportPdf() {
    const rows = this.getDisplayRows();
    if (rows.length === 0) return;

    const weekStart = getWeekStart(this.selectedDate);
    const weekEnd = getWeekEnd(this.selectedDate);
    const totalReceived = rows.reduce((s, r) => s + (r.receivedPayment || 0), 0);
    const totalVendor = rows.reduce((s, r) => s + (r.vendorPayment || 0), 0);

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      this.showToast('Please allow pop-ups to export PDF.', 'error');
      return;
    }

    const bodyRows = rows.map((r) => `
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
    `).join('');

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
    this.showToast(`Print dialog opened for ${rows.length} row(s).`, 'info');
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
  const app = new AdhocInvoiceApp();
  window.adhocInvoiceApp = app;
});
