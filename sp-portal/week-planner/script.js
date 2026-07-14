/* =====================================================
   Week Planner — Logixsphere portal (Phase 1: weekly scheduling grid)
   Vanilla JS, class-based, mock/simulated data (no backend).
   Ported (scoped) from Logixsphere Next.js app/(private)/week-planner:
     contexts/PlannerContext.tsx (WeekPlannerRecord shape),
     components/WeeklyView/{WeekGrid,DayCell,DepositSection}.tsx (grid layout),
     components/Common/VendorCard.tsx (assignment card look),
     components/AvailableVendors.tsx (side panel of unassigned vendors),
     utils/dateUtils.ts (Monday-start week helpers).

   Phase 1 scope deliberately excludes: Daily View, Daily Comparison View,
   the Dashboard stats screen, Types Config tabs, Flex Route modals, Ad-hoc
   Service modals, Management & Support Team modals, Day Off modal, Vehicle
   edit modal, PDF/Excel export modals — those belong to a later phase.

   Mock data strategy: deterministic per-week generation (seeded PRNG keyed
   by the Monday date of that week) cached in an in-memory Map. Once a week
   has been generated, edits (assign / move / unassign) mutate that cached
   array directly, so they persist for the rest of the session while you
   navigate away and back to that week. Different weeks get their own
   deterministic — but independent — generated schedule.
   ===================================================== */

/* ---------- deterministic PRNG helpers (kept in sync across renders) ---------- */
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

/* ---------- date utilities (ported from utils/dateUtils.ts) ---------- */
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
function formatDateDMY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}
function getDayNameShort(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
}
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}
/** Monday of the week containing `date` (local time, hours zeroed). */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
/** Array of 7 Date objects, Monday through Sunday. */
function getWeekDates(weekStart) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}
function getWeekDatesFiltered(weekStart, includeWeekends) {
  const all = getWeekDates(weekStart);
  return includeWeekends ? all : all.filter((_, i) => i < 5);
}
function formatWeekRangeLabel(weekStart, includeWeekends) {
  const dates = getWeekDatesFiltered(weekStart, includeWeekends);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const year = last.getFullYear();
  return `${fmt(first)} – ${fmt(last)} ${year}`;
}

/* ==================== mock reference data ==================== */
const DEPOTS = [
  { id: 1, name: 'Heathrow Hub', code: 'HEA' },
  { id: 2, name: 'Dartford Depot', code: 'DFD' },
  { id: 3, name: 'Enfield Distribution', code: 'ENF' },
  { id: 4, name: 'Slough Gateway', code: 'SLG' },
];

const ROUTE_COUNT_BY_DEPOT = { 1: 7, 2: 5, 3: 6, 4: 8 };

function buildRoutesForDepot(depot) {
  const n = ROUTE_COUNT_BY_DEPOT[depot.id] || 6;
  const routes = [];
  for (let i = 0; i < n; i++) {
    routes.push({ id: depot.id * 100 + i + 1, depotId: depot.id, name: `${depot.code}-${101 + i}` });
  }
  return routes;
}
const ROUTES_BY_DEPOT = new Map(DEPOTS.map((d) => [d.id, buildRoutesForDepot(d)]));

const VENDOR_FIRST_NAMES = [
  'James', 'Oliver', 'Harry', 'George', 'Jack', 'Charlie', 'Thomas', 'Jacob',
  'Alfie', 'Freddie', 'Amelia', 'Olivia', 'Isla', 'Ava', 'Emily', 'Sophia',
  'Grace', 'Mia', 'Poppy', 'Ella', 'Ryan', 'Liam', 'Noah', 'Ethan', 'Mason',
  'Priya', 'Amir', 'Kofi', 'Lena', 'Marta',
];
const VENDOR_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor', 'Davies', 'Evans', 'Wilson',
  'Thomas', 'Roberts', 'Walker', 'Wright', 'Green', 'Hall', 'Wood', 'Patel',
  'Khan', 'Osei', 'Kowalski', 'Novak',
];
const VEHICLE_TYPES = ['3.5T Luton', '7.5T Box Truck', 'Transit Van', 'Sprinter Van', '18T Rigid', 'Flatbed Truck'];

function buildVendorPool() {
  const pool = [];
  const rng = rngForSeed('week-planner-vendor-pool');
  let idx = 0;
  for (let i = 0; i < VENDOR_FIRST_NAMES.length; i++) {
    const first = VENDOR_FIRST_NAMES[i];
    const last = VENDOR_LAST_NAMES[i % VENDOR_LAST_NAMES.length];
    const name = `${first} ${last}`;
    idx++;
    const vehicle = VEHICLE_TYPES[idx % VEHICLE_TYPES.length];
    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    const l2 = () => letters[Math.floor(rng() * letters.length)];
    const plate = `L${Math.floor(rng() * 9)}${Math.floor(rng() * 9)} ${l2()}${l2()}${l2()}`;
    pool.push({ id: idx, name, vehicle, plate });
  }
  return pool;
}
const VENDOR_POOL = buildVendorPool();

const MOCK_NOTES = [
  'Vehicle arrived late.',
  'Extra stop confirmed by depot.',
  'Route completed early.',
  'Traffic delay reported.',
  'Customer redelivery required.',
  'Covering for absent driver.',
];

/* ==================== week record generation ==================== */
let __weekPlannerIdCounter = 1;

/**
 * Deterministically generate a week's worth of WeekPlannerRecord-shaped
 * assignments for all depots/routes, plus one supervisor ("Team Leader")
 * slot per depot per day. Shape mirrors contexts/PlannerContext.tsx's
 * WeekPlannerRecord: date, name (vendor), route, routeSort, adhocSort,
 * notes, reason, vehicle, registrationPlate, status, isDayOff, isSort,
 * weekPlannerId — plus depotId/routeId/isSupervisor to drive this grid.
 */
function generateWeekRecords(weekStart) {
  const seedStr = formatDateISO(weekStart);
  const rng = rngForSeed(seedStr);
  const weekDates = getWeekDates(weekStart);
  const records = [];
  const usedByDate = new Map(); // dateISO -> Set(vendorId)

  function pickVendor(dateISO) {
    const used = usedByDate.get(dateISO) || new Set();
    for (let tries = 0; tries < 12; tries++) {
      const candidate = VENDOR_POOL[Math.floor(rng() * VENDOR_POOL.length)];
      if (!used.has(candidate.id)) {
        used.add(candidate.id);
        usedByDate.set(dateISO, used);
        return candidate;
      }
    }
    return null;
  }

  DEPOTS.forEach((depot) => {
    const routes = ROUTES_BY_DEPOT.get(depot.id);
    routes.forEach((route) => {
      weekDates.forEach((date) => {
        const dateISO = formatDateISO(date);
        if (rng() >= 0.62) return; // ~62% fill rate
        const vendor = pickVendor(dateISO);
        if (!vendor) return;
        const routeSort = rng() < 0.3 ? 'yes' : 'no';
        const hasNotes = rng() < 0.15;
        records.push({
          weekPlannerId: __weekPlannerIdCounter++,
          depotId: depot.id,
          routeId: route.id,
          isSupervisor: false,
          date: dateISO,
          name: vendor.name,
          vendorId: vendor.id,
          route: route.name,
          routeSort,
          adhocSort: '',
          notes: hasNotes ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '',
          reason: '',
          vehicle: vendor.vehicle,
          registrationPlate: vendor.plate,
          status: 'Working',
          isDayOff: 'false',
          isSort: routeSort === 'yes' ? 'true' : 'false',
        });
      });
    });

    // Team Leader / supervisor slot — one per depot per day
    weekDates.forEach((date) => {
      const dateISO = formatDateISO(date);
      if (rng() >= 0.75) return; // ~75% filled
      const vendor = pickVendor(dateISO);
      if (!vendor) return;
      records.push({
        weekPlannerId: -(__weekPlannerIdCounter++),
        depotId: depot.id,
        routeId: null,
        isSupervisor: true,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: 'Team Leader',
        routeSort: 'no',
        adhocSort: '',
        notes: '',
        reason: '',
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
      });
    });
  });

  return records;
}

/* ==================== toast helper (shared portal pattern) ==================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  const toast = document.createElement('div');
  toast.className = `app-toast ${type}`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ==================== application ==================== */
class WeekPlannerApp {
  constructor() {
    this.currentWeekStart = getWeekStart(new Date());
    this.showWeekends = true;
    this.weekCache = new Map(); // weekISO -> records[]
    this.vendorsDrawerOpen = false;
    this.editingRecord = null; // record object currently open in the edit modal
    this.editingContext = null; // { depotId, routeId, dateISO } for a *new* assignment via modal (unused directly; drag creates immediately)
    this.dragPayload = null;
    this.supervisorPopoverTarget = null; // { depotId, dateISO }

    this._bindStaticEvents();
    this._loadTimer = setTimeout(() => {
      document.getElementById('loadingOverlay')?.classList.remove('active');
      this.render();
    }, 300);
  }

  /* ---------- data access ---------- */
  getWeekRecords(weekStart) {
    const key = formatDateISO(weekStart);
    if (!this.weekCache.has(key)) {
      this.weekCache.set(key, generateWeekRecords(weekStart));
    }
    return this.weekCache.get(key);
  }

  getCurrentRecords() {
    return this.getWeekRecords(this.currentWeekStart);
  }

  getAssignedVendorIdsThisWeek() {
    const ids = new Set();
    this.getCurrentRecords().forEach((r) => ids.add(r.vendorId));
    return ids;
  }

  getAvailableVendors() {
    const assigned = this.getAssignedVendorIdsThisWeek();
    return VENDOR_POOL.filter((v) => !assigned.has(v.id));
  }

  findRecordById(id) {
    return this.getCurrentRecords().find((r) => r.weekPlannerId === id) || null;
  }

  /* ---------- static event bindings (elements that always exist) ---------- */
  _bindStaticEvents() {
    document.getElementById('btnPrevWeek').addEventListener('click', () => this.shiftWeek(-7));
    document.getElementById('btnNextWeek').addEventListener('click', () => this.shiftWeek(7));
    document.getElementById('btnThisWeek').addEventListener('click', () => {
      this.currentWeekStart = getWeekStart(new Date());
      this.render();
    });
    document.getElementById('showWeekendsToggle').addEventListener('change', (e) => {
      this.showWeekends = e.target.checked;
      document.getElementById('showWeekendsLabel').textContent = this.showWeekends ? 'Show weekends' : 'Weekdays only';
      this.render();
    });

    document.getElementById('btnToggleVendorsPanel').addEventListener('click', () => this.openVendorsDrawer());
    document.getElementById('btnCloseVendorsDrawer').addEventListener('click', () => this.closeVendorsDrawer());
    document.getElementById('vendorsDrawerOverlay').addEventListener('click', () => this.closeVendorsDrawer());
    document.getElementById('vendorsDrawerSearch').addEventListener('input', () => this.renderVendorsDrawer());

    // Assignment edit modal
    document.getElementById('btnCloseAssignmentModal').addEventListener('click', () => this.closeAssignmentModal());
    document.getElementById('btnCancelAssignment').addEventListener('click', () => this.closeAssignmentModal());
    document.getElementById('assignmentModalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'assignmentModalBackdrop') this.closeAssignmentModal();
    });
    document.getElementById('assignmentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveAssignmentModal();
    });
    document.getElementById('btnUnassign').addEventListener('click', () => this.unassignFromModal());

    // Supervisor popover
    document.getElementById('btnSaveSupervisor').addEventListener('click', () => this.saveSupervisorPopover());
    document.getElementById('btnClearSupervisor').addEventListener('click', () => this.clearSupervisorPopover());
    document.addEventListener('click', (e) => {
      const pop = document.getElementById('supervisorPopover');
      if (pop.hidden) return;
      if (pop.contains(e.target) || e.target.closest('.wp-supervisor-cell')) return;
      pop.hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      this.closeAssignmentModal();
      document.getElementById('supervisorPopover').hidden = true;
      this.closeVendorsDrawer();
    });
  }

  shiftWeek(deltaDays) {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + deltaDays);
    this.currentWeekStart = getWeekStart(d);
    this.render();
  }

  /* ---------- vendors drawer ---------- */
  openVendorsDrawer() {
    this.vendorsDrawerOpen = true;
    document.getElementById('vendorsDrawer').classList.add('open');
    document.getElementById('vendorsDrawer').setAttribute('aria-hidden', 'false');
    document.getElementById('vendorsDrawerOverlay').hidden = false;
    this.renderVendorsDrawer();
  }
  closeVendorsDrawer() {
    this.vendorsDrawerOpen = false;
    document.getElementById('vendorsDrawer').classList.remove('open');
    document.getElementById('vendorsDrawer').setAttribute('aria-hidden', 'true');
    document.getElementById('vendorsDrawerOverlay').hidden = true;
  }

  renderVendorsDrawer() {
    const listEl = document.getElementById('vendorsDrawerList');
    const search = (document.getElementById('vendorsDrawerSearch').value || '').trim().toLowerCase();
    const available = this.getAvailableVendors().filter((v) => !search || v.name.toLowerCase().includes(search));

    document.getElementById('wpAvailableCount').textContent = String(this.getAvailableVendors().length);
    document.getElementById('btnVendorsCount').textContent = String(this.getAvailableVendors().length);

    if (available.length === 0) {
      listEl.innerHTML = `<p class="wp-drawer-empty"><i class="bi bi-check2-circle"></i><br>No unassigned vendors match.</p>`;
      return;
    }

    listEl.innerHTML = available.map((v) => `
      <div class="wp-vendor-chip" draggable="true" data-vendor-id="${v.id}" title="Drag onto a day cell to assign">
        <div>
          <span class="wp-vendor-chip-name">${escapeHtml(v.name)}</span>
          <span class="wp-vendor-chip-vehicle">${escapeHtml(v.vehicle)}</span>
        </div>
        <i class="bi bi-grip-vertical wp-vendor-chip-drag"></i>
      </div>
    `).join('');

    listEl.querySelectorAll('.wp-vendor-chip').forEach((chip) => {
      chip.addEventListener('dragstart', (e) => {
        const vendorId = Number(chip.dataset.vendorId);
        this.dragPayload = { type: 'vendor', vendorId };
        e.dataTransfer.setData('text/plain', JSON.stringify(this.dragPayload));
        e.dataTransfer.effectAllowed = 'copy';
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        this.dragPayload = null;
      });
    });
  }

  /* ---------- main render ---------- */
  render() {
    document.getElementById('weekRangeLabel').textContent = formatWeekRangeLabel(this.currentWeekStart, this.showWeekends);
    document.getElementById('wpHeaderSubtitle').textContent =
      `Week of ${this.currentWeekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} — ${DEPOTS.length} depots`;

    const available = this.getAvailableVendors();
    document.getElementById('wpAvailableCount').textContent = String(available.length);
    document.getElementById('btnVendorsCount').textContent = String(available.length);

    this.renderDepots();
    if (this.vendorsDrawerOpen) this.renderVendorsDrawer();
  }

  renderDepots() {
    const container = document.getElementById('depotSections');
    const weekDates = getWeekDatesFiltered(this.currentWeekStart, this.showWeekends);
    const records = this.getCurrentRecords();

    container.innerHTML = DEPOTS.map((depot) => this.renderDepotSectionHtml(depot, weekDates, records)).join('');

    DEPOTS.forEach((depot) => this._bindDepotSection(depot));
  }

  renderDepotSectionHtml(depot, weekDates, records) {
    const routes = ROUTES_BY_DEPOT.get(depot.id);
    const depotRecords = records.filter((r) => r.depotId === depot.id);
    const supervisorByDate = new Map();
    depotRecords.filter((r) => r.isSupervisor).forEach((r) => supervisorByDate.set(r.date, r));

    const dayCount = weekDates.length;
    const gridTemplate = `160px repeat(${dayCount}, minmax(120px, 1fr))`;

    let html = `<section class="wp-depot-section" data-depot-id="${depot.id}">`;
    html += `<div class="wp-depot-header" data-depot-toggle>
      <div class="wp-depot-header-left">
        <button type="button" class="wp-depot-collapse-btn" aria-label="Collapse depot"><i class="bi bi-chevron-down"></i></button>
        <div>
          <h2 class="wp-depot-title">${escapeHtml(depot.name)}</h2>
          <p class="wp-depot-subtitle">${routes.length} route${routes.length === 1 ? '' : 's'} scheduled</p>
        </div>
      </div>
    </div>`;

    html += `<div class="wp-depot-body"><div class="wp-grid-scroll"><div class="wp-grid" style="grid-template-columns:${gridTemplate}">`;

    // Supervisor row
    html += `<div class="wp-cell-label wp-supervisor-label">
      <strong>Team Leader</strong>
      <span class="wp-supervisor-sub">${escapeHtml(depot.name)}</span>
    </div>`;
    weekDates.forEach((date) => {
      const dateISO = formatDateISO(date);
      const supAssignment = supervisorByDate.get(dateISO);
      const weekendCls = isWeekend(date) ? ' is-weekend' : '';
      html += `<div class="wp-cell-day wp-supervisor-cell${weekendCls}" data-supervisor-cell data-depot-id="${depot.id}" data-date="${dateISO}">`;
      html += supAssignment
        ? `<div class="wp-supervisor-chip" title="${escapeHtml(supAssignment.name)} — click to edit">${escapeHtml(supAssignment.name)}</div>`
        : `<span class="wp-supervisor-empty">—</span>`;
      html += `</div>`;
    });

    // Day header row
    html += `<div class="wp-cell-head wp-head-corner"><span class="wp-day-name">Route</span></div>`;
    weekDates.forEach((date) => {
      const weekendCls = isWeekend(date) ? ' is-weekend' : '';
      html += `<div class="wp-cell-head${weekendCls}">
        <span class="wp-day-name">${getDayNameShort(date)}</span>
        <span class="wp-day-date">${formatDateDMY(date)}</span>
      </div>`;
    });

    // Route rows
    routes.forEach((route) => {
      html += `<div class="wp-cell-label" title="${escapeHtml(route.name)}">${escapeHtml(route.name)}</div>`;
      weekDates.forEach((date) => {
        const dateISO = formatDateISO(date);
        const cellRecords = depotRecords.filter((r) => !r.isSupervisor && r.routeId === route.id && r.date === dateISO);
        const weekendCls = isWeekend(date) ? ' is-weekend' : '';
        html += `<div class="wp-cell-day${weekendCls}" data-day-cell data-depot-id="${depot.id}" data-route-id="${route.id}" data-date="${dateISO}">`;
        if (cellRecords.length === 0) {
          html += `<span class="wp-cell-empty">–</span>`;
        } else {
          cellRecords.forEach((rec) => {
            html += this.renderAssignmentCardHtml(rec);
          });
        }
        html += `</div>`;
      });
    });

    html += `</div></div></div></section>`;
    return html;
  }

  renderAssignmentCardHtml(rec) {
    const sortDot = rec.routeSort === 'yes' ? `<span class="wp-sort-dot" title="Route Sort"></span>` : '';
    const dayOffCls = rec.status === 'Day Off' || rec.status === 'OFF' ? ' wp-card--day-off' : '';
    const sortCls = rec.routeSort === 'no' ? ' wp-card--sort-no' : '';
    const notesFlag = rec.notes ? `<span class="wp-card-notes-flag" title="${escapeHtml(rec.notes)}">!</span>` : '';
    return `
      <div class="wp-card${sortCls}${dayOffCls}" draggable="true" data-assignment-id="${rec.weekPlannerId}" title="${escapeHtml(rec.name)} — click to edit">
        <div class="wp-card-top">
          <span class="wp-card-name">${escapeHtml(rec.name)}</span>
          ${sortDot}
        </div>
        <div class="wp-card-bottom">
          <span class="wp-plate">${escapeHtml(rec.registrationPlate || '—')}</span>
          ${notesFlag}
        </div>
      </div>
    `;
  }

  /* ---------- per-depot event binding ---------- */
  _bindDepotSection(depot) {
    const section = document.querySelector(`.wp-depot-section[data-depot-id="${depot.id}"]`);
    if (!section) return;

    section.querySelector('[data-depot-toggle]').addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    // Supervisor cells: click to open inline popover
    section.querySelectorAll('[data-supervisor-cell]').forEach((cell) => {
      cell.addEventListener('click', (e) => this.openSupervisorPopover(cell, e));
    });

    // Assignment cards: click to edit, dragstart to move
    section.querySelectorAll('.wp-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = Number(card.dataset.assignmentId);
        const rec = this.findRecordById(id);
        if (rec) this.openAssignmentModal(rec);
      });
      card.addEventListener('dragstart', (e) => {
        const id = Number(card.dataset.assignmentId);
        this.dragPayload = { type: 'assignment', id };
        e.dataTransfer.setData('text/plain', JSON.stringify(this.dragPayload));
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
        e.stopPropagation();
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.dragPayload = null;
      });
    });

    // Day cells: drop targets
    section.querySelectorAll('[data-day-cell]').forEach((cell) => {
      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = this.dragPayload?.type === 'vendor' ? 'copy' : 'move';
        cell.classList.add('wp-drop-hover');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('wp-drop-hover'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('wp-drop-hover');
        this.handleDropOnCell(cell, e);
      });
    });
  }

  /* ---------- drag & drop logic ---------- */
  handleDropOnCell(cell, e) {
    let payload = this.dragPayload;
    if (!payload) {
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { payload = null; }
    }
    if (!payload) return;

    const depotId = Number(cell.dataset.depotId);
    const routeId = Number(cell.dataset.routeId);
    const dateISO = cell.dataset.date;
    const routes = ROUTES_BY_DEPOT.get(depotId) || [];
    const route = routes.find((r) => r.id === routeId);
    const records = this.getCurrentRecords();

    if (payload.type === 'vendor') {
      const vendor = VENDOR_POOL.find((v) => v.id === payload.vendorId);
      if (!vendor) return;
      const alreadyHere = records.some((r) => !r.isSupervisor && r.routeId === routeId && r.date === dateISO && r.vendorId === vendor.id);
      if (alreadyHere) {
        showToast(`${vendor.name} is already assigned to this cell.`, 'error');
        return;
      }
      records.push({
        weekPlannerId: __weekPlannerIdCounter++,
        depotId,
        routeId,
        isSupervisor: false,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: route ? route.name : '',
        routeSort: 'no',
        adhocSort: '',
        notes: '',
        reason: '',
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
      });
      showToast(`Assigned ${vendor.name} to ${route ? route.name : 'route'} on ${dateISO}.`, 'success');
      this.render();
      return;
    }

    if (payload.type === 'assignment') {
      const rec = records.find((r) => r.weekPlannerId === payload.id);
      if (!rec) return;
      if (rec.depotId === depotId && rec.routeId === routeId && rec.date === dateISO) return; // no-op, same cell
      const duplicate = records.some((r) => r !== rec && !r.isSupervisor && r.routeId === routeId && r.date === dateISO && r.vendorId === rec.vendorId);
      if (duplicate) {
        showToast(`${rec.name} is already assigned to this cell.`, 'error');
        return;
      }
      rec.depotId = depotId;
      rec.routeId = routeId;
      rec.route = route ? route.name : rec.route;
      rec.date = dateISO;
      showToast(`Moved ${rec.name} to ${route ? route.name : 'route'} on ${dateISO}.`, 'success');
      this.render();
    }
  }

  /* ---------- assignment edit modal ---------- */
  openAssignmentModal(rec) {
    this.editingRecord = rec;
    const backdrop = document.getElementById('assignmentModalBackdrop');
    document.getElementById('assignmentModalTitle').innerHTML = `<i class="bi bi-pencil-square me-2"></i>Edit Assignment`;

    const depot = DEPOTS.find((d) => d.id === rec.depotId);
    document.getElementById('assignmentModalMeta').innerHTML =
      `<i class="bi bi-geo-alt"></i> ${escapeHtml(depot ? depot.name : '')} · <i class="bi bi-signpost-2"></i> ${escapeHtml(rec.route)} · <i class="bi bi-calendar3"></i> ${escapeHtml(rec.date)}`;

    const vendorSelect = document.getElementById('fieldVendorName');
    vendorSelect.innerHTML = VENDOR_POOL.map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
    vendorSelect.value = String(rec.vendorId);

    document.getElementById('fieldVehicle').value = rec.vehicle || '';
    document.getElementById('fieldPlate').value = rec.registrationPlate || '';
    document.getElementById('fieldRouteSort').value = rec.routeSort || 'no';
    document.getElementById('fieldRouteSort').closest('.dom-form-field').style.display = rec.isSupervisor ? 'none' : '';
    document.getElementById('fieldStatus').value = rec.status || 'Working';
    document.getElementById('fieldNotes').value = rec.notes || '';

    backdrop.hidden = false;
  }

  closeAssignmentModal() {
    document.getElementById('assignmentModalBackdrop').hidden = true;
    this.editingRecord = null;
  }

  saveAssignmentModal() {
    const rec = this.editingRecord;
    if (!rec) return;
    const vendorId = Number(document.getElementById('fieldVendorName').value);
    const vendor = VENDOR_POOL.find((v) => v.id === vendorId);
    if (vendor) {
      rec.vendorId = vendor.id;
      rec.name = vendor.name;
    }
    rec.vehicle = document.getElementById('fieldVehicle').value.trim();
    rec.registrationPlate = document.getElementById('fieldPlate').value.trim();
    if (!rec.isSupervisor) {
      rec.routeSort = document.getElementById('fieldRouteSort').value;
      rec.isSort = rec.routeSort === 'yes' ? 'true' : 'false';
    }
    rec.status = document.getElementById('fieldStatus').value;
    rec.isDayOff = rec.status === 'Day Off' ? 'true' : 'false';
    rec.notes = document.getElementById('fieldNotes').value.trim();

    showToast(`Saved changes for ${rec.name}.`, 'success');
    this.closeAssignmentModal();
    this.render();
  }

  unassignFromModal() {
    const rec = this.editingRecord;
    if (!rec) return;
    const records = this.getCurrentRecords();
    const idx = records.findIndex((r) => r.weekPlannerId === rec.weekPlannerId);
    if (idx >= 0) records.splice(idx, 1);
    showToast(`Removed ${rec.name} from ${rec.route}.`, 'success');
    this.closeAssignmentModal();
    this.render();
  }

  /* ---------- supervisor inline popover ---------- */
  openSupervisorPopover(cell, event) {
    const depotId = Number(cell.dataset.depotId);
    const dateISO = cell.dataset.date;
    this.supervisorPopoverTarget = { depotId, dateISO };

    const depot = DEPOTS.find((d) => d.id === depotId);
    const records = this.getCurrentRecords();
    const existing = records.find((r) => r.isSupervisor && r.depotId === depotId && r.date === dateISO);

    const popover = document.getElementById('supervisorPopover');
    document.getElementById('supervisorPopoverTitle').textContent = `Team Leader — ${depot ? depot.name : ''} (${dateISO})`;

    const select = document.getElementById('supervisorPopoverSelect');
    select.innerHTML = `<option value="">-- Unassigned --</option>` + VENDOR_POOL.map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
    select.value = existing ? String(existing.vendorId) : '';

    const rect = cell.getBoundingClientRect();
    const popW = 250;
    let left = rect.left + rect.width / 2 - popW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
    let top = rect.bottom + 6;
    if (top + 160 > window.innerHeight) top = rect.top - 166;

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.hidden = false;
    event.stopPropagation();
  }

  saveSupervisorPopover() {
    const target = this.supervisorPopoverTarget;
    if (!target) return;
    const { depotId, dateISO } = target;
    const records = this.getCurrentRecords();
    const existingIdx = records.findIndex((r) => r.isSupervisor && r.depotId === depotId && r.date === dateISO);
    const vendorId = Number(document.getElementById('supervisorPopoverSelect').value || 0);

    if (!vendorId) {
      if (existingIdx >= 0) records.splice(existingIdx, 1);
      document.getElementById('supervisorPopover').hidden = true;
      this.render();
      return;
    }

    const vendor = VENDOR_POOL.find((v) => v.id === vendorId);
    if (!vendor) return;

    if (existingIdx >= 0) {
      records[existingIdx].vendorId = vendor.id;
      records[existingIdx].name = vendor.name;
      records[existingIdx].vehicle = vendor.vehicle;
      records[existingIdx].registrationPlate = vendor.plate;
    } else {
      records.push({
        weekPlannerId: -(__weekPlannerIdCounter++),
        depotId,
        routeId: null,
        isSupervisor: true,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: 'Team Leader',
        routeSort: 'no',
        adhocSort: '',
        notes: '',
        reason: '',
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
      });
    }
    showToast(`Team Leader for ${dateISO} set to ${vendor.name}.`, 'success');
    document.getElementById('supervisorPopover').hidden = true;
    this.render();
  }

  clearSupervisorPopover() {
    document.getElementById('supervisorPopoverSelect').value = '';
    this.saveSupervisorPopover();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.weekPlannerApp = new WeekPlannerApp();
});
