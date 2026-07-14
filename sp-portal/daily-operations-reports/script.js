/* =====================================================
   Daily Operation Insights ("Operations Insights") — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend).
   Ported from Logixsphere Next.js app/(private)/daily-operations-reports.
   Date-range filterable operations report table with Depot/Loop chip
   filters, sortable columns, pagination, vendor-details modal and
   client-side XLSX/PDF export.
   ===================================================== */

/* ---------- deterministic PRNG helpers (same seed -> same data every render) ---------- */
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

/** Mirrors utils.ts formatDate() — "dd MMM yyyy". */
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
  if (!monthName) return '';
  return `${day} ${monthName} ${year}`;
}

function formatDateLong(dateStr) {
  if (!dateStr) return '--';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Mirrors utils.ts formatValue(). */
function formatValue(value) {
  if (value === null || value === undefined || value === '') return '---';
  if (typeof value === 'number') {
    if (value % 1 === 0) return value.toString();
    return value.toFixed(2);
  }
  return value.toString();
}

/** Mirrors utils.ts getTWClass()/formatTW(). */
function getTWClass(twValue) {
  if (twValue === null || twValue === undefined) return 'dor-tw-none';
  const percentage = twValue * 100;
  if (percentage >= 90 && percentage <= 100) return 'dor-tw-green';
  if (percentage >= 80 && percentage < 90) return 'dor-tw-amber';
  if (percentage < 80) return 'dor-tw-red';
  return 'dor-tw-none';
}
function formatTW(twValue) {
  if (twValue === null || twValue === undefined) return '---';
  return `${(twValue * 100).toFixed(2)}%`;
}

/** Mirrors utils.ts isFlexRoute(). */
function isFlexRoute(route) {
  return route ? route.toUpperCase().includes('FLEX') : false;
}

/** Mirrors utils.ts timeToMinutes(). */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const time = String(timeStr).trim().toUpperCase();
  const match24h = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match24h) return parseInt(match24h[1], 10) * 60 + parseInt(match24h[2], 10);
  const match12h = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match12h) {
    let hours = parseInt(match12h[1], 10);
    const minutes = match12h[2] ? parseInt(match12h[2], 10) : 0;
    const period = match12h[3];
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return null;
}

/** Mirrors utils.ts breakToMinutes(). */
function breakToMinutes(breakValue) {
  if (!breakValue) return null;
  const breakStr = String(breakValue).trim().toLowerCase();
  const matchMin = breakStr.match(/^(\d+)\s*min/);
  if (matchMin) return parseInt(matchMin[1], 10);
  const matchTime = breakStr.match(/^(\d+):(\d+)$/);
  if (matchTime) return parseInt(matchTime[1], 10) * 60 + parseInt(matchTime[2], 10);
  const matchNumber = breakStr.match(/^(\d+)$/);
  if (matchNumber) return parseInt(matchNumber[1], 10);
  return null;
}

/** Mirrors utils.ts extractLoop() — strips "Flex " prefix, matches ^[A-Z]{2}\d+ */
function extractLoop(route) {
  if (!route) return '';
  const cleaned = route.replace(/^Flex\s+/i, '');
  const match = cleaned.match(/^([A-Z]{2}\d+)/);
  return match ? match[1] : '';
}

/** Mirrors lib/performance-utils.ts DEPOT_SORT_HOURS + VENDOR_EXTRA_HOURS. */
const DEPOT_SORT_HOURS = { LSE: 2 + 45 / 60, LCY: 2, MSE: 1 + 45 / 60 };
const VENDOR_EXTRA_HOURS = 15 / 60;

function hasSortY(routeSort) {
  if (routeSort == null) return false;
  if (typeof routeSort === 'string') return routeSort.toLowerCase() === 'y' || parseFloat(routeSort) > 0;
  return Number(routeSort) > 0;
}

function parseWorkedHoursToDecimal(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) || value < 0 ? 0 : value;
  const s = String(value).trim();
  if (!s) return 0;
  const parts = s.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && m >= 0) return Math.max(0, h + m / 60);
  }
  const parsed = parseFloat(s);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function calculateSortHoursForRow(routeSort, depositName) {
  const routeSortNum = typeof routeSort === 'number' ? routeSort : typeof routeSort === 'string' ? parseFloat(routeSort) : 0;
  if (routeSortNum <= 0) return 0;
  const normalized = (depositName || '').trim().toUpperCase();
  if (normalized !== 'LSE' && normalized !== 'LCY' && normalized !== 'MSE') return 0;
  const sortHours = DEPOT_SORT_HOURS[normalized];
  return typeof sortHours === 'number' ? sortHours : 0;
}

/** Base + sort (once per row when Sort=Yes). Mirrors utils.ts calculateWorkHoursWithSort(). */
function calculateWorkHoursWithSort(workHours, routeSort, depositName) {
  const base = Math.max(0, parseWorkedHoursToDecimal(workHours));
  return base + calculateSortHoursForRow(routeSort, depositName);
}

function formatDecimalHoursAsHMM(hours) {
  if (hours == null || hours <= 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Total work hours including sort + 15min/unique-vendor/day.
 * Mirrors utils.ts calculateTotalWorkHoursIncludingSort().
 */
function calculateTotalWorkHoursIncludingSort(rows) {
  let workHoursWithSortTotal = 0;
  for (const row of rows) {
    workHoursWithSortTotal += calculateWorkHoursWithSort(row.workHours, row.routeSort, row.depot);
  }
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Set());
    if (row.vendor) byDate.get(row.date).add(row.vendor);
  }
  let vendorExtraTotal = 0;
  for (const vendors of byDate.values()) vendorExtraTotal += vendors.size * VENDOR_EXTRA_HOURS;
  return workHoursWithSortTotal + vendorExtraTotal;
}

const MOCK_NOTES = [
  'Vehicle arrived late.',
  'Extra stop confirmed by depot.',
  'Route completed early.',
  'Traffic delay reported.',
  'Customer redelivery required.',
  'Vehicle breakdown, replacement dispatched.',
];

const PAGE_SIZES = [10, 25, 50, 100, 500];

class DailyOperationsReportsApp {
  constructor() {
    this.rowsByDate = new Map(); // dateISO -> rows[]
    this.filters = { dateFrom: '', dateTo: '', depot: 'All', loop: 'All', search: '' };
    this.sortField = 'date';
    this.sortDirection = 'asc';
    this.currentPage = 1;
    this.itemsPerPage = 500;
    this.selectedVendor = null;
    this._loadTimer = null;

    this.buildMasterData();
    this.init();
  }

  /* ==================== INIT ==================== */
  init() {
    const today = formatDateISO(new Date());
    // 7-day default window inside a wider ~8-week generated history so date-range filtering is meaningful.
    this.filters.dateFrom = addDaysISO(today, -6);
    this.filters.dateTo = today;

    this.setupListeners();
    this.render(true);

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== MASTER (mock) DATA ==================== */
  buildMasterData() {
    // LSE / LCY / MSE exercise the depot sort-hours bonus; BHX / NNL do not (matches
    // calculateSortHoursForRow(), which only pays sort time for LSE/LCY/MSE).
    this.depots = ['LSE', 'LCY', 'MSE', 'BHX', 'NNL'];
    this.loopsByDepot = {
      LSE: ['LS1', 'LS2', 'LS3', 'LL3'],
      LCY: ['LC1', 'LC2', 'LC3', 'LL4'],
      MSE: ['MS1', 'MS2', 'MS3', 'MS4'],
      BHX: ['BH1', 'BH2', 'BH3'],
      NNL: ['NN1', 'NN2', 'NN3'],
    };

    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz', 'Sophie', 'Lukas'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy', 'Adebayo', 'Cohen'];
    this.vendors = Array.from({ length: 16 }, (_, i) => `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`);

    const plateRng = rngForSeed('dor-vehicles-v1');
    this.vrns = Array.from({ length: 18 }, () => {
      const letters = String.fromCharCode(65 + Math.floor(plateRng() * 26)) + String.fromCharCode(65 + Math.floor(plateRng() * 26));
      const nums = String(10 + Math.floor(plateRng() * 89));
      const tail = String.fromCharCode(65 + Math.floor(plateRng() * 26)) + String.fromCharCode(65 + Math.floor(plateRng() * 26)) + String.fromCharCode(65 + Math.floor(plateRng() * 26));
      return `${letters}${nums} ${tail}`;
    });
  }

  /* ==================== PER-DAY MOCK ROWS ==================== */
  getRowsForDate(dateISO) {
    if (!this.rowsByDate.has(dateISO)) {
      this.rowsByDate.set(dateISO, this.generateRowsForDate(dateISO));
    }
    return this.rowsByDate.get(dateISO);
  }

  generateRowsForDate(dateISO) {
    const rng = rngForSeed(`dor-day-${dateISO}`);
    const dow = parseLocalDate(dateISO).getDay(); // 0 = Sunday
    if (dow === 0) return []; // no operations on Sundays

    const count = 20 + Math.floor(rng() * 41); // 20-60 rows/weekday
    const rows = [];

    for (let i = 0; i < count; i++) {
      // ~4% of rows represent an "OFF" day entry for a vendor (exercises the Off depot chip).
      if (rng() < 0.04) {
        rows.push({
          date: dateISO,
          route: 'OFF',
          vendor: this.vendors[Math.floor(rng() * this.vendors.length)],
          vrn: '---',
          tw: null,
          depart: null,
          arrive: null,
          workHours: null,
          stops: 0,
          note: rng() < 0.4 ? 'Scheduled day off.' : '',
          depot: 'OFF',
          breakTime: null,
          loop: null,
          routeSort: 0,
          isSpms: true,
        });
        continue;
      }

      const depot = this.depots[Math.floor(rng() * this.depots.length)];
      const loop = this.loopsByDepot[depot][Math.floor(rng() * this.loopsByDepot[depot].length)];
      const isFlex = rng() < 0.18;
      const route = isFlex ? `${loop} FLEX` : loop;
      const vendor = this.vendors[Math.floor(rng() * this.vendors.length)];
      const vrn = this.vrns[Math.floor(rng() * this.vrns.length)];

      const tw = rng() < 0.05 ? null : Math.min(1, Math.max(0, 0.7 + rng() * 0.32));

      const departMinutes = 300 + Math.floor(rng() * 240); // 05:00 - 09:00
      const workHours = Math.round((7 + rng() * 6) * 100) / 100; // 7h - 13h
      const arriveMinutes = Math.min(1439, departMinutes + Math.round(workHours * 60));
      const depart = `${String(Math.floor(departMinutes / 60)).padStart(2, '0')}:${String(departMinutes % 60).padStart(2, '0')}`;
      const arrive = `${String(Math.floor(arriveMinutes / 60)).padStart(2, '0')}:${String(arriveMinutes % 60).padStart(2, '0')}`;

      const breakMinutes = rng() < 0.2 ? 15 + Math.floor(rng() * 14) : 30 + Math.floor(rng() * 31); // ~20% under 30min
      const breakTime = `${Math.floor(breakMinutes / 60)}:${String(breakMinutes % 60).padStart(2, '0')}`;

      const stops = 40 + Math.floor(rng() * 120);
      const routeSort = rng() < 0.5 ? 1 : 0;
      const isSpms = rng() < 0.9;
      const note = rng() < 0.22 ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '';

      rows.push({
        date: dateISO,
        route,
        vendor,
        vrn,
        tw,
        depart,
        arrive,
        workHours,
        stops,
        note,
        depot,
        breakTime,
        loop,
        routeSort,
        isSpms,
      });
    }
    return rows;
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.getElementById('dateFromInput').value = this.filters.dateFrom;
    document.getElementById('dateToInput').value = this.filters.dateTo;

    document.getElementById('dateFromInput').addEventListener('change', (e) => {
      const value = e.target.value;
      if (!value) return;
      this.filters.dateFrom = value;
      if (this.filters.dateTo && this.filters.dateTo < value) this.filters.dateTo = value;
      document.getElementById('dateToInput').value = this.filters.dateTo;
      this.applyEffectiveItemsPerPage();
      this.currentPage = 1;
      this.render(true);
    });
    document.getElementById('dateToInput').addEventListener('change', (e) => {
      const value = e.target.value;
      this.filters.dateTo = value;
      if (value && this.filters.dateFrom && value < this.filters.dateFrom) {
        this.filters.dateFrom = value;
        document.getElementById('dateFromInput').value = value;
      }
      this.applyEffectiveItemsPerPage();
      this.currentPage = 1;
      this.render(true);
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.currentPage = 1;
      this.render();
    });

    document.getElementById('btnClearFilters').addEventListener('click', () => {
      const today = formatDateISO(new Date());
      this.filters = { dateFrom: addDaysISO(today, -6), dateTo: today, depot: 'All', loop: 'All', search: '' };
      document.getElementById('dateFromInput').value = this.filters.dateFrom;
      document.getElementById('dateToInput').value = this.filters.dateTo;
      document.getElementById('searchInput').value = '';
      this.applyEffectiveItemsPerPage();
      this.currentPage = 1;
      this.render(true);
    });

    document.getElementById('btnExportXlsx').addEventListener('click', () => this.exportXlsx());
    document.getElementById('btnExportPdf').addEventListener('click', () => this.exportPdf());

    document.getElementById('reportsTableHead').addEventListener('click', (e) => {
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

    document.getElementById('reportsTableBody').addEventListener('click', (e) => {
      const vendorBtn = e.target.closest('[data-vendor]');
      if (vendorBtn) { this.openVendorModal(vendorBtn.dataset.vendor); return; }
      const whBtn = e.target.closest('[data-toggle-wh]');
      if (whBtn) {
        e.stopPropagation();
        const popover = whBtn.parentElement.querySelector('.dor-workhours-popover');
        if (popover) popover.hidden = !popover.hidden;
        document.querySelectorAll('.dor-workhours-popover').forEach((p) => { if (p !== popover) p.hidden = true; });
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dor-workhours-wrap')) {
        document.querySelectorAll('.dor-workhours-popover').forEach((p) => { p.hidden = true; });
      }
    });

    document.getElementById('btnCloseVendorModal').addEventListener('click', () => this.closeVendorModal());
    document.getElementById('vendorModalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'vendorModalBackdrop') this.closeVendorModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeVendorModal();
    });

    document.getElementById('paginationBar').addEventListener('click', (e) => {
      const pageBtn = e.target.closest('[data-page]');
      if (pageBtn && !pageBtn.disabled) {
        this.currentPage = Number(pageBtn.dataset.page);
        this.render();
      }
    });
    document.getElementById('paginationBar').addEventListener('change', (e) => {
      if (e.target.id === 'perPageSelect') {
        this.itemsPerPage = Number(e.target.value);
        this.currentPage = 1;
        this.render();
      }
    });
  }

  /** Mirrors page.tsx's single-day (500) vs. period-with-end-date (50) items-per-page rule. */
  applyEffectiveItemsPerPage() {
    this.itemsPerPage = this.filters.dateTo && this.filters.dateTo.trim() ? 50 : 500;
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

  /** Depot/loop chip options — computed from date+search filtered rows (mirrors useFiltersData). */
  getRowsForToggleOptions() {
    let rows = this.getRowsInRange();
    if (this.filters.search) {
      const term = this.filters.search.toLowerCase();
      rows = rows.filter((r) => (r.route || '').toLowerCase().includes(term) || (r.vrn || '').toLowerCase().includes(term) || (r.vendor || '').toLowerCase().includes(term));
    }
    return rows;
  }

  /** Mirrors dataProcessor.ts filterReportData() (date range already applied via getRowsInRange). */
  getFilteredRows() {
    let rows = this.getRowsInRange();

    if (this.filters.search) {
      const term = this.filters.search.toLowerCase();
      rows = rows.filter((r) => (r.route || '').toLowerCase().includes(term) || (r.vrn || '').toLowerCase().includes(term) || (r.vendor || '').toLowerCase().includes(term));
    }

    if (this.filters.depot !== 'All') {
      if (this.filters.depot === 'Off') {
        rows = rows.filter((r) => (r.depot || '').trim().toUpperCase() === 'OFF');
      } else {
        const filterDepot = this.filters.depot.trim().toUpperCase();
        rows = rows.filter((r) => {
          const rowDepot = (r.depot || '').trim().toUpperCase();
          return rowDepot === filterDepot || rowDepot.includes(filterDepot) || filterDepot.includes(rowDepot);
        });
      }
    }

    if (this.filters.loop !== 'All') {
      rows = rows.filter((r) => (r.loop || extractLoop(r.route)) === this.filters.loop);
    }

    // Enrich with workHoursWithSort (base + depot sort bonus), mirrors addWorkHoursWithSortAndTotal().
    rows = rows.map((r) => ({ ...r, workHoursWithSort: calculateWorkHoursWithSort(r.workHours, r.routeSort, r.depot) }));

    return this.applySort(rows);
  }

  applySort(rows) {
    const field = this.sortField;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    if (!field) return rows;

    return [...rows].sort((a, b) => {
      let av = field === 'workHours' ? a.workHoursWithSort : a[field];
      let bv = field === 'workHours' ? b.workHoursWithSort : b[field];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (field === 'date') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else if (field === 'tw' || field === 'stops' || field === 'workHours') {
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

  /* ==================== RENDER ==================== */
  render(simulateLoad = false) {
    this.renderHeader();
    this.renderToggles();

    const tbody = document.getElementById('reportsTableBody');
    const tfoot = document.getElementById('reportsTableFoot');

    if (simulateLoad) {
      clearTimeout(this._loadTimer);
      tbody.innerHTML = `<tr><td colspan="11" class="dor-table-message">Loading…</td></tr>`;
      tfoot.innerHTML = '';
      document.getElementById('paginationBar').innerHTML = '';
      this._loadTimer = setTimeout(() => this.renderRows(), 200);
      return;
    }
    this.renderRows();
  }

  renderHeader() {
    const { dateFrom, dateTo } = this.filters;
    const subtitleEl = document.getElementById('pageHeaderSubtitle');
    if (dateFrom && dateTo && dateFrom !== dateTo) {
      subtitleEl.textContent = `Period: ${formatDateLong(dateFrom)} – ${formatDateLong(dateTo)}`;
    } else {
      subtitleEl.textContent = `Date: ${formatDateLong(dateFrom || dateTo)}`;
    }
  }

  renderToggles() {
    const toggleRows = this.getRowsForToggleOptions();
    const uniqueDepots = Array.from(new Set(toggleRows.map((r) => r.depot).filter((d) => d && d !== 'BAOP' && d !== 'GEN'))).sort();

    const depotChipRow = document.getElementById('depotChipRow');
    const chips = [];
    chips.push(`<button type="button" class="dor-chip${this.filters.depot === 'All' ? ' active' : ''}" data-depot="All">All</button>`);
    chips.push(`<button type="button" class="dor-chip${this.filters.depot === 'Off' ? ' active' : ''}" data-depot="Off">Off</button>`);
    uniqueDepots.filter((d) => d.toUpperCase() !== 'OFF').forEach((d) => {
      chips.push(`<button type="button" class="dor-chip${this.filters.depot === d ? ' active' : ''}" data-depot="${escapeHtml(d)}">${escapeHtml(d)}</button>`);
    });
    depotChipRow.innerHTML = chips.join('');
    depotChipRow.querySelectorAll('[data-depot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filters.depot = btn.dataset.depot;
        this.filters.loop = 'All';
        this.currentPage = 1;
        this.render();
      });
    });

    const loopSourceRows = this.filters.depot !== 'All' && this.filters.depot !== 'Off'
      ? toggleRows.filter((r) => (r.depot || '').toUpperCase() === this.filters.depot.toUpperCase())
      : toggleRows;
    const uniqueLoops = Array.from(new Set(loopSourceRows.map((r) => r.loop || extractLoop(r.route)).filter(Boolean))).sort();

    const loopChipRow = document.getElementById('loopChipRow');
    const loopChips = [`<button type="button" class="dor-chip${this.filters.loop === 'All' ? ' active' : ''}" data-loop="All">All</button>`];
    uniqueLoops.forEach((l) => {
      loopChips.push(`<button type="button" class="dor-chip${this.filters.loop === l ? ' active' : ''}" data-loop="${escapeHtml(l)}">${escapeHtml(l)}</button>`);
    });
    loopChipRow.innerHTML = loopChips.join('');
    loopChipRow.querySelectorAll('[data-loop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filters.loop = btn.dataset.loop;
        this.currentPage = 1;
        this.render();
      });
    });
  }

  renderRows() {
    const tbody = document.getElementById('reportsTableBody');
    const tfoot = document.getElementById('reportsTableFoot');
    const allFiltered = this.getFilteredRows();

    this.renderMetrics(allFiltered);

    const totalItems = allFiltered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.itemsPerPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const pageRows = allFiltered.slice(start, start + this.itemsPerPage);

    this.updateSortIndicators();

    if (allFiltered.length === 0) {
      const hasFilters = this.filters.search.trim() !== '' || this.filters.depot !== 'All' || this.filters.loop !== 'All';
      tbody.innerHTML = `<tr><td colspan="11" class="dor-table-message">${hasFilters ? 'No records found for the selected filters.' : 'No operations for the selected period.'}</td></tr>`;
      tfoot.innerHTML = '';
      document.getElementById('paginationBar').innerHTML = '';
      return;
    }

    tbody.innerHTML = pageRows.map((row) => this.renderRow(row)).join('');

    // Totals reflect the whole filtered range (not just the current page) — clearer for a
    // static demo than the source app's per-page totals, which come from server pagination.
    const totalStops = allFiltered.reduce((sum, r) => sum + (r.stops || 0), 0);
    const totalWorkHoursIncludingSort = calculateTotalWorkHoursIncludingSort(allFiltered);
    tfoot.innerHTML = `
      <tr class="dor-totals-row">
        <td colspan="8" class="dor-totals-label">Total Work Hours (incl. sort)</td>
        <td colspan="1">${escapeHtml(formatDecimalHoursAsHMM(totalWorkHoursIncludingSort))}</td>
        <td colspan="2"></td>
      </tr>
      <tr class="dor-totals-row">
        <td colspan="9" class="dor-totals-label">Total Stops</td>
        <td colspan="1">${totalStops}</td>
        <td colspan="1"></td>
      </tr>
    `;

    this.renderPagination(totalItems, totalPages);
  }

  renderRow(row) {
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

    const whDisplay = row.workHoursWithSort != null ? formatDecimalHoursAsHMM(row.workHoursWithSort) : (row.workHours != null ? formatValue(row.workHours) : null);
    const whHours = row.workHoursWithSort ?? parseWorkedHoursToDecimal(row.workHours);
    const whClass = whHours < 10 ? 'dor-workhours-red' : whHours > 10 ? 'dor-workhours-green' : '';
    const sortNote = sortYes
      ? `Sort: Yes (${DEPOT_SORT_HOURS[row.depot] != null ? row.depot + ' +' + formatDecimalHoursAsHMM(DEPOT_SORT_HOURS[row.depot]) : 'no depot bonus'})`
      : 'Sort: No';
    const whTooltip = `Depart: ${row.depart ?? '---'} · Arrive: ${row.arrive ?? '---'} · ${sortNote}`;

    const noteHtml = row.note && row.note.trim() !== '' && row.note !== '-'
      ? `<span class="dor-note-icon" title="${escapeHtml(row.note)}">!</span>`
      : '';

    return `
      <tr>
        <td data-label="Date">${escapeHtml(formatDateDisplay(row.date))}</td>
        <td data-label="Route">
          <span class="dor-route-cell">
            <span class="dor-route-dot ${sortYes ? 'dor-route-dot--yes' : 'dor-route-dot--no'}" title="${sortYes ? 'Sort: Yes' : 'Sort: No'}"></span>
            <span class="dor-route-name">${escapeHtml(routeDisplay)}</span>
          </span>
        </td>
        <td data-label="Vendor" class="dor-vendor-cell">
          <button type="button" class="dor-vendor-link" data-vendor="${escapeHtml(row.vendor)}" title="View all records for ${escapeHtml(row.vendor)}">${escapeHtml(row.vendor)}</button>
        </td>
        <td data-label="VRN"><span class="dor-vrn-plate">${escapeHtml(row.vrn)}</span></td>
        <td data-label="TW (%)"><span class="${twClass}">${twText}</span></td>
        <td data-label="Depart">${escapeHtml(formatValue(row.depart))}</td>
        <td data-label="Arrive"><span class="${arriveClass}">${row.arrive ? escapeHtml(row.arrive) : '---'}</span></td>
        <td data-label="Break"><span class="${breakClass}">${escapeHtml(formatValue(row.breakTime))}</span></td>
        <td data-label="Work Hours">
          ${whDisplay == null ? `<span title="${escapeHtml(whTooltip)}">---</span>` : `
          <span class="dor-workhours-wrap">
            <span class="dor-workhours-value ${whClass}" data-toggle-wh title="${escapeHtml(whTooltip)}">${escapeHtml(whDisplay)}</span>
          </span>`}
        </td>
        <td data-label="Stops" class="${row.isSpms === false ? 'dor-stops-highlight' : ''}">${escapeHtml(formatValue(row.stops))}</td>
        <td data-label="Note">${noteHtml}</td>
      </tr>
    `;
  }

  renderMetrics(rows) {
    const totalStops = rows.reduce((sum, r) => sum + (r.stops || 0), 0);
    const uniqueRoutes = new Set(rows.map((r) => r.route).filter(Boolean)).size;
    const totalHoursIncludingSort = calculateTotalWorkHoursIncludingSort(rows);
    const metrics = [
      { label: 'Total Records', value: rows.length },
      { label: 'Total Stops', value: totalStops },
      { label: 'Routes', value: uniqueRoutes },
      { label: 'Total Hours (incl. sort)', value: formatDecimalHoursAsHMM(totalHoursIncludingSort) },
    ];
    document.getElementById('dorMetrics').innerHTML = metrics.map((m) => `
      <div class="dor-metric-card">
        <p class="dor-metric-label">${escapeHtml(m.label)}</p>
        <p class="dor-metric-value">${escapeHtml(String(m.value))}</p>
      </div>
    `).join('');
  }

  updateSortIndicators() {
    document.querySelectorAll('#reportsTableHead th[data-sort-key]').forEach((th) => {
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

  /* ==================== PAGINATION ==================== */
  renderPagination(totalItems, totalPages) {
    const bar = document.getElementById('paginationBar');
    const from = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
    const to = Math.min(this.currentPage * this.itemsPerPage, totalItems);

    const perPageOptions = PAGE_SIZES.map((size) => `<option value="${size}" ${this.itemsPerPage === size ? 'selected' : ''}>${size}</option>`).join('');

    const pageNumbers = [];
    const windowSize = Math.min(totalPages, 10);
    let startPage;
    if (totalPages <= 10) startPage = 1;
    else if (this.currentPage <= 5) startPage = 1;
    else if (this.currentPage >= totalPages - 4) startPage = totalPages - 9;
    else startPage = this.currentPage - 5;
    for (let i = 0; i < windowSize; i++) pageNumbers.push(startPage + i);

    const pageBtns = pageNumbers.map((p) => `
      <li><button type="button" class="dor-page-btn${p === this.currentPage ? ' active' : ''}" data-page="${p}">${p}</button></li>
    `).join('');

    bar.innerHTML = `
      <div class="dor-pagination-info">Showing <strong>${from}</strong>-<strong>${to}</strong> of <strong>${totalItems}</strong></div>
      <div class="dor-pagination-controls">
        <div class="dor-per-page-group">
          <label for="perPageSelect">Items per page:</label>
          <select id="perPageSelect" class="dor-per-page-select">${perPageOptions}</select>
        </div>
        <nav aria-label="Pagination">
          <ul class="dor-page-list">
            <li><button type="button" class="dor-page-btn" data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button></li>
            ${pageBtns}
            <li><button type="button" class="dor-page-btn" data-page="${this.currentPage + 1}" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button></li>
          </ul>
        </nav>
      </div>
    `;
  }

  /* ==================== VENDOR DETAILS MODAL ==================== */
  openVendorModal(vendorName) {
    this.selectedVendor = vendorName;
    const vendorRows = this.getFilteredRows().filter((r) => r.vendor === vendorName);

    document.getElementById('vendorModalTitle').textContent = `Vendor Details: ${vendorName}`;
    document.getElementById('vendorModalSubtitle').textContent = `${vendorRows.length} record${vendorRows.length !== 1 ? 's' : ''} found`;

    const totalStops = vendorRows.reduce((sum, r) => sum + (r.stops || 0), 0);
    const totalWorkHours = vendorRows.reduce((sum, r) => sum + calculateWorkHoursWithSort(r.workHours, r.routeSort, r.depot), 0);

    document.getElementById('vendorModalSummary').innerHTML = `
      <div class="dor-summary-card dor-summary-card--blue">
        <p class="dor-summary-label">Total Records</p>
        <p class="dor-summary-value">${vendorRows.length}</p>
      </div>
      <div class="dor-summary-card dor-summary-card--green">
        <p class="dor-summary-label">Total Stops</p>
        <p class="dor-summary-value">${totalStops}</p>
      </div>
      <div class="dor-summary-card dor-summary-card--purple">
        <p class="dor-summary-label">Total Work Hours</p>
        <p class="dor-summary-value">${escapeHtml(formatDecimalHoursAsHMM(totalWorkHours))}</p>
      </div>
    `;

    const cardsEl = document.getElementById('vendorModalCards');
    if (vendorRows.length === 0) {
      cardsEl.innerHTML = '<p class="dor-table-message">No records found for this vendor.</p>';
    } else {
      cardsEl.innerHTML = vendorRows.map((row) => {
        const flexPrefixed = isFlexRoute(row.route) && !row.route.trim().toUpperCase().startsWith('FLEX');
        const routeDisplay = flexPrefixed ? `Flex ${row.route}` : row.route;
        const sortYes = hasSortY(row.routeSort);
        return `
        <div class="dor-vendor-card">
          <div class="dor-vendor-card-row dor-vendor-card-header">
            <span class="dor-vendor-card-key">Date</span>
            <span class="dor-vendor-card-val">${escapeHtml(formatDateDisplay(row.date))}</span>
          </div>
          <div class="dor-vendor-card-row">
            <span class="dor-vendor-card-key">Route</span>
            <span class="dor-vendor-card-val"><span class="dor-route-dot ${sortYes ? 'dor-route-dot--yes' : 'dor-route-dot--no'}" style="margin-right:4px;display:inline-block;"></span>${escapeHtml(routeDisplay)}</span>
          </div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">VRN</span><span class="dor-vendor-card-val">${escapeHtml(row.vrn)}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Depot</span><span class="dor-vendor-card-val">${escapeHtml(row.depot || '---')}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Depart</span><span class="dor-vendor-card-val">${escapeHtml(formatValue(row.depart))}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Arrive</span><span class="dor-vendor-card-val">${row.arrive ? escapeHtml(row.arrive) : '---'}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Break</span><span class="dor-vendor-card-val">${escapeHtml(formatValue(row.breakTime))}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">TW (%)</span><span class="dor-vendor-card-val ${getTWClass(row.tw)}">${row.tw !== null && row.tw !== undefined ? formatTW(row.tw) : '---'}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Work Hours</span><span class="dor-vendor-card-val">${escapeHtml(formatDecimalHoursAsHMM(calculateWorkHoursWithSort(row.workHours, row.routeSort, row.depot)))}</span></div>
          <div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Stops</span><span class="dor-vendor-card-val">${escapeHtml(formatValue(row.stops))}</span></div>
          ${row.note ? `<div class="dor-vendor-card-row"><span class="dor-vendor-card-key">Note</span><span class="dor-vendor-card-val" title="${escapeHtml(row.note)}"><span class="dor-note-icon">!</span></span></div>` : ''}
        </div>
        `;
      }).join('');
    }

    document.getElementById('vendorModalBackdrop').hidden = false;
  }

  closeVendorModal() {
    document.getElementById('vendorModalBackdrop').hidden = true;
    this.selectedVendor = null;
  }

  /* ==================== EXPORT ==================== */
  weekFilenameSuffix() {
    const { dateFrom, dateTo } = this.filters;
    const from = (dateFrom || dateTo || '').replace(/-/g, '');
    const to = (dateTo || dateFrom || '').replace(/-/g, '');
    return from === to ? from : `${from}-to-${to}`;
  }

  exportXlsx() {
    const rows = this.getFilteredRows();
    if (rows.length === 0) return;

    if (typeof XLSX === 'undefined') {
      this.showToast('XLSX export library failed to load.', 'error');
      return;
    }

    const sheetRows = rows.map((r) => ({
      Date: formatDateDisplay(r.date),
      Route: (isFlexRoute(r.route) && !r.route.trim().toUpperCase().startsWith('FLEX')) ? `Flex ${r.route}` : r.route,
      Vendor: r.vendor,
      VRN: r.vrn,
      'TW (%)': r.tw !== null && r.tw !== undefined ? formatTW(r.tw) : '---',
      Depart: formatValue(r.depart),
      Arrive: r.arrive || '---',
      Break: formatValue(r.breakTime),
      'Work Hours': formatDecimalHoursAsHMM(r.workHoursWithSort),
      Stops: formatValue(r.stops),
      Note: r.note || '',
      Depot: r.depot,
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operations Insights');
    XLSX.writeFile(workbook, `daily-operations-reports-${this.weekFilenameSuffix()}.xlsx`);
    this.showToast(`Exported ${rows.length} row(s) to XLSX.`, 'success');
  }

  exportPdf() {
    const rows = this.getFilteredRows();
    if (rows.length === 0) return;

    const { dateFrom, dateTo } = this.filters;
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      this.showToast('Please allow pop-ups to export PDF.', 'error');
      return;
    }

    const bodyRows = rows.map((r) => {
      const routeDisplay = (isFlexRoute(r.route) && !r.route.trim().toUpperCase().startsWith('FLEX')) ? `Flex ${r.route}` : r.route;
      return `
      <tr>
        <td>${escapeHtml(formatDateDisplay(r.date))}</td>
        <td>${escapeHtml(routeDisplay)}</td>
        <td>${escapeHtml(r.vendor)}</td>
        <td>${escapeHtml(r.vrn)}</td>
        <td class="amount">${r.tw !== null && r.tw !== undefined ? escapeHtml(formatTW(r.tw)) : '---'}</td>
        <td>${escapeHtml(formatValue(r.depart))}</td>
        <td>${r.arrive ? escapeHtml(r.arrive) : '---'}</td>
        <td>${escapeHtml(formatValue(r.breakTime))}</td>
        <td class="amount">${escapeHtml(formatDecimalHoursAsHMM(r.workHoursWithSort))}</td>
        <td class="amount">${escapeHtml(formatValue(r.stops))}</td>
        <td>${escapeHtml(r.note || '')}</td>
      </tr>
    `;
    }).join('');

    const periodLabel = dateFrom && dateTo && dateFrom !== dateTo
      ? `Period: ${formatDateLong(dateFrom)} – ${formatDateLong(dateTo)}`
      : `Date: ${formatDateLong(dateFrom || dateTo)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en-GB">
      <head>
        <meta charset="UTF-8" />
        <title>Operations Insights — ${escapeHtml(periodLabel)}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p.subtitle { font-size: 12px; color: #64748b; margin: 0 0 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
          th { background: #f1f5f9; text-transform: uppercase; font-size: 8px; letter-spacing: 0.04em; }
          td.amount, th.amount { text-align: right; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Operations Insights</h1>
        <p class="subtitle">${escapeHtml(periodLabel)} · ${rows.length} record(s)</p>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Route</th><th>Vendor</th><th>VRN</th><th class="amount">TW (%)</th>
              <th>Depart</th><th>Arrive</th><th>Break</th><th class="amount">Work Hours</th>
              <th class="amount">Stops</th><th>Note</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
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
  const app = new DailyOperationsReportsApp();
  window.dailyOperationsReportsApp = app;
});
