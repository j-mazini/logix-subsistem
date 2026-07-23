import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/week-planner.css';

/* =====================================================
 * Week Planner — ported from sp-portal/week-planner/script.js
 * (vanilla JS, class-based, mock/simulated data, no backend).
 *
 * Phase 1 scope deliberately excludes (per the original script.js's own
 * header comment): Daily View, Daily Comparison View, the Dashboard stats
 * screen, Types Config tabs, Flex Route modals, Ad-hoc Service modals,
 * Management & Support Team modals, Day Off modal, Vehicle edit modal,
 * PDF/Excel export modals — those belonged to a later phase there too.
 *
 * Mock data strategy preserved as-is: deterministic per-week generation
 * (seeded PRNG keyed by the Monday date of that week), cached so edits
 * (assign / move / unassign) mutate that cached array directly and persist
 * for the session while navigating weeks back and forth. This still
 * mutates plain objects in a ref-held Map exactly like the original
 * script.js mutated its in-memory arrays, then forces a re-render — kept
 * this way (rather than converting to immutable state updates) because
 * that mutate-then-redraw model is literally what the original class-based
 * app did, and preserving it keeps the record identity semantics (e.g.
 * `records.find(...)` returning the same object drag/drop mutates) intact.
 * ===================================================== */

/* ---------- deterministic PRNG (ported verbatim from script.js) ---------- */
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
  return mulberry32(hashStringToSeed(seedStr)());
}

/* ---------- date utilities (ported from utils/dateUtils.ts via script.js) ---------- */
function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function formatDateDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}
function getDayNameShort(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
}
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
/** Monday of the week containing `date` (local time, hours zeroed). */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
/** Array of 7 Date objects, Monday through Sunday. */
function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}
function getWeekDatesFiltered(weekStart: Date, includeWeekends: boolean): Date[] {
  const all = getWeekDates(weekStart);
  return includeWeekends ? all : all.filter((_, i) => i < 5);
}
function formatWeekRangeLabel(weekStart: Date, includeWeekends: boolean): string {
  const dates = getWeekDatesFiltered(weekStart, includeWeekends);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`;
}

/* ==================== mock reference data ==================== */
interface Depot {
  id: number;
  name: string;
  code: string;
}
const DEPOTS: Depot[] = [
  { id: 1, name: 'Heathrow Hub', code: 'HEA' },
  { id: 2, name: 'Dartford Depot', code: 'DFD' },
  { id: 3, name: 'Enfield Distribution', code: 'ENF' },
  { id: 4, name: 'Slough Gateway', code: 'SLG' },
];
const ROUTE_COUNT_BY_DEPOT: Record<number, number> = { 1: 7, 2: 5, 3: 6, 4: 8 };

interface Route {
  id: number;
  depotId: number;
  name: string;
}
function buildRoutesForDepot(depot: Depot): Route[] {
  const n = ROUTE_COUNT_BY_DEPOT[depot.id] || 6;
  const routes: Route[] = [];
  for (let i = 0; i < n; i++) routes.push({ id: depot.id * 100 + i + 1, depotId: depot.id, name: `${depot.code}-${101 + i}` });
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

interface PoolVendor {
  id: number;
  name: string;
  vehicle: string;
  plate: string;
}
function buildVendorPool(): PoolVendor[] {
  const pool: PoolVendor[] = [];
  const rng = rngForSeed('week-planner-vendor-pool');
  let idx = 0;
  for (let i = 0; i < VENDOR_FIRST_NAMES.length; i++) {
    const first = VENDOR_FIRST_NAMES[i];
    const last = VENDOR_LAST_NAMES[i % VENDOR_LAST_NAMES.length];
    idx++;
    const vehicle = VEHICLE_TYPES[idx % VEHICLE_TYPES.length];
    const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    const l2 = () => letters[Math.floor(rng() * letters.length)];
    const plate = `L${Math.floor(rng() * 9)}${Math.floor(rng() * 9)} ${l2()}${l2()}${l2()}`;
    pool.push({ id: idx, name: `${first} ${last}`, vehicle, plate });
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
interface WPRecord {
  weekPlannerId: number;
  depotId: number;
  routeId: number | null;
  isSupervisor: boolean;
  date: string;
  name: string;
  vendorId: number;
  route: string;
  routeSort: 'yes' | 'no';
  notes: string;
  vehicle: string;
  registrationPlate: string;
  status: string;
  isDayOff: string;
  isSort: string;
}

let weekPlannerIdCounter = 1;

/**
 * Deterministically generates a week's worth of WeekPlannerRecord-shaped
 * assignments for all depots/routes, plus one supervisor ("Team Leader")
 * slot per depot per day.
 */
function generateWeekRecords(weekStart: Date): WPRecord[] {
  const seedStr = formatDateISO(weekStart);
  const rng = rngForSeed(seedStr);
  const weekDates = getWeekDates(weekStart);
  const records: WPRecord[] = [];
  const usedByDate = new Map<string, Set<number>>();

  function pickVendor(dateISO: string): PoolVendor | null {
    const used = usedByDate.get(dateISO) || new Set<number>();
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
    const routes = ROUTES_BY_DEPOT.get(depot.id) || [];
    routes.forEach((route) => {
      weekDates.forEach((date) => {
        const dateISO = formatDateISO(date);
        if (rng() >= 0.62) return; // ~62% fill rate
        const vendor = pickVendor(dateISO);
        if (!vendor) return;
        const routeSort: 'yes' | 'no' = rng() < 0.3 ? 'yes' : 'no';
        const hasNotes = rng() < 0.15;
        records.push({
          weekPlannerId: weekPlannerIdCounter++,
          depotId: depot.id,
          routeId: route.id,
          isSupervisor: false,
          date: dateISO,
          name: vendor.name,
          vendorId: vendor.id,
          route: route.name,
          routeSort,
          notes: hasNotes ? MOCK_NOTES[Math.floor(rng() * MOCK_NOTES.length)] : '',
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
        weekPlannerId: -(weekPlannerIdCounter++),
        depotId: depot.id,
        routeId: null,
        isSupervisor: true,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: 'Team Leader',
        routeSort: 'no',
        notes: '',
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

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  hiding: boolean;
}

type DragPayload = { type: 'vendor'; vendorId: number } | { type: 'assignment'; id: number };

interface SupervisorPopoverState {
  depotId: number;
  dateISO: string;
  left: number;
  top: number;
}

export function WeekPlanner() {
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [showWeekends, setShowWeekends] = useState(true);
  const [collapsedDepots, setCollapsedDepots] = useState<Set<number>>(new Set());
  const [vendorsDrawerOpen, setVendorsDrawerOpen] = useState(false);
  const [vendorsDrawerSearch, setVendorsDrawerSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState<WPRecord | null>(null);
  const [supervisorPopover, setSupervisorPopover] = useState<SupervisorPopoverState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [renderVersion, setRenderVersion] = useState(0);

  const weekCache = useRef(new Map<string, WPRecord[]>());
  const dragPayload = useRef<DragPayload | null>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  function showToast(message: string, type: ToastType = 'info') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, hiding: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, hiding: true } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 320);
    }, 3200);
  }

  function rerender() {
    setRenderVersion((n) => n + 1);
  }

  /* records are mutated in-place (see file header note); renderVersion is the dependency-free trigger to re-read them */
  void renderVersion;

  function getCurrentRecords(): WPRecord[] {
    const key = formatDateISO(currentWeekStart);
    if (!weekCache.current.has(key)) weekCache.current.set(key, generateWeekRecords(currentWeekStart));
    return weekCache.current.get(key)!;
  }
  const records = getCurrentRecords();

  const availableVendors = useMemo(() => {
    const assigned = new Set(records.map((r) => r.vendorId));
    return VENDOR_POOL.filter((v) => !assigned.has(v.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, renderVersion]);

  function shiftWeek(deltaDays: number) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + deltaDays);
    setCurrentWeekStart(getWeekStart(d));
  }

  function findRecordById(id: number): WPRecord | null {
    return records.find((r) => r.weekPlannerId === id) || null;
  }

  function handleDropOnCell(depotId: number, routeId: number | null, dateISO: string) {
    const payload = dragPayload.current;
    dragPayload.current = null;
    if (!payload) return;
    const routes = ROUTES_BY_DEPOT.get(depotId) || [];
    const route = routes.find((r) => r.id === routeId);

    if (payload.type === 'vendor') {
      const vendor = VENDOR_POOL.find((v) => v.id === payload.vendorId);
      if (!vendor) return;
      const alreadyHere = records.some((r) => !r.isSupervisor && r.routeId === routeId && r.date === dateISO && r.vendorId === vendor.id);
      if (alreadyHere) {
        showToast(`${vendor.name} is already assigned to this cell.`, 'error');
        return;
      }
      records.push({
        weekPlannerId: weekPlannerIdCounter++,
        depotId,
        routeId,
        isSupervisor: false,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: route ? route.name : '',
        routeSort: 'no',
        notes: '',
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
      });
      showToast(`Assigned ${vendor.name} to ${route ? route.name : 'route'} on ${dateISO}.`, 'success');
      rerender();
      return;
    }

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
    rerender();
  }

  function saveAssignmentModal(vendorId: number, vehicle: string, plate: string, routeSort: 'yes' | 'no', status: string, notes: string) {
    const rec = editingRecord;
    if (!rec) return;
    const vendor = VENDOR_POOL.find((v) => v.id === vendorId);
    if (vendor) {
      rec.vendorId = vendor.id;
      rec.name = vendor.name;
    }
    rec.vehicle = vehicle.trim();
    rec.registrationPlate = plate.trim();
    if (!rec.isSupervisor) {
      rec.routeSort = routeSort;
      rec.isSort = routeSort === 'yes' ? 'true' : 'false';
    }
    rec.status = status;
    rec.isDayOff = status === 'Day Off' ? 'true' : 'false';
    rec.notes = notes.trim();
    showToast(`Saved changes for ${rec.name}.`, 'success');
    setEditingRecord(null);
    rerender();
  }

  function unassignFromModal() {
    const rec = editingRecord;
    if (!rec) return;
    const idx = records.findIndex((r) => r.weekPlannerId === rec.weekPlannerId);
    if (idx >= 0) records.splice(idx, 1);
    showToast(`Removed ${rec.name} from ${rec.route}.`, 'success');
    setEditingRecord(null);
    rerender();
  }

  function saveSupervisor(vendorId: number) {
    if (!supervisorPopover) return;
    const { depotId, dateISO } = supervisorPopover;
    const existingIdx = records.findIndex((r) => r.isSupervisor && r.depotId === depotId && r.date === dateISO);

    if (!vendorId) {
      if (existingIdx >= 0) records.splice(existingIdx, 1);
      setSupervisorPopover(null);
      rerender();
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
        weekPlannerId: -(weekPlannerIdCounter++),
        depotId,
        routeId: null,
        isSupervisor: true,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: 'Team Leader',
        routeSort: 'no',
        notes: '',
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
      });
    }
    showToast(`Team Leader for ${dateISO} set to ${vendor.name}.`, 'success');
    setSupervisorPopover(null);
    rerender();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setEditingRecord(null);
      setSupervisorPopover(null);
      setVendorsDrawerOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const weekDates = getWeekDatesFiltered(currentWeekStart, showWeekends);
  const filteredDrawerVendors = availableVendors.filter(
    (v) => !vendorsDrawerSearch.trim() || v.name.toLowerCase().includes(vendorsDrawerSearch.trim().toLowerCase()),
  );

  return (
    <PortalLayout mainClassName="wp-container container-fluid px-3 px-lg-4 py-4" title="Week Planner">
      {/* ============ PAGE INFO (kept from the original header; not part of the standardized pattern) ============ */}
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-calendar-week" />
            <span id="wpHeaderSubtitle">
              Week of {currentWeekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} — {DEPOTS.length} depots
            </span>
          </p>
        </div>
        <div className="wp-header-metric">
          <p className="wp-header-metric-label">Available Vendors</p>
          <p className="wp-header-metric-value" id="wpAvailableCount">
            {availableVendors.length}
          </p>
        </div>
      </div>

      {/* ============ CONTROLS ============ */}
      <div className="filters-bar wp-controls-bar">
        <div className="week-nav">
          <span className="week-nav-label">
            <i className="bi bi-calendar3" /> Week
          </span>
          <div className="week-nav-controls">
            <button type="button" className="date-nav-btn" id="btnPrevWeek" aria-label="Previous week" onClick={() => shiftWeek(-7)}>
              <i className="bi bi-chevron-left" />
            </button>
            <button
              type="button"
              className="date-nav-btn week-nav-today"
              id="btnThisWeek"
              onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
            >
              This week
            </button>
            <button type="button" className="date-nav-btn" id="btnNextWeek" aria-label="Next week" onClick={() => shiftWeek(7)}>
              <i className="bi bi-chevron-right" />
            </button>
            <span className="week-range-label" id="weekRangeLabel">
              {formatWeekRangeLabel(currentWeekStart, showWeekends)}
            </span>
          </div>
        </div>

        <div className="wp-toggle-wrap">
          <label className="wp-switch">
            <input type="checkbox" id="showWeekendsToggle" checked={showWeekends} onChange={(e) => setShowWeekends(e.target.checked)} />
            <span className="wp-switch-slider" />
          </label>
          <span className="filters-label wp-toggle-label" id="showWeekendsLabel">
            {showWeekends ? 'Show weekends' : 'Weekdays only'}
          </span>
        </div>

        <div className="dfi-actions">
          <button type="button" className="styled-button styled-button--outline" id="btnToggleVendorsPanel" onClick={() => setVendorsDrawerOpen(true)}>
            <i className="bi bi-people" /> Available Vendors <span className="wp-badge-count" id="btnVendorsCount">{availableVendors.length}</span>
          </button>
        </div>
      </div>

      {/* ============ COLOR LEGEND ============ */}
      <div className="wp-legend">
        <span className="wp-legend-item">
          <span className="wp-legend-dot wp-legend-dot--sort" /> Route Sort
        </span>
        <span className="wp-legend-item">
          <span className="wp-legend-dot wp-legend-dot--supervisor" /> Team Leader
        </span>
        <span className="wp-legend-item">
          <span className="wp-plate wp-legend-plate">AB12 CDE</span> Vehicle registration
        </span>
      </div>

      {/* ============ DEPOT SECTIONS ============ */}
      <div id="depotSections" className="wp-depot-list">
        {DEPOTS.map((depot) => {
          const routes = ROUTES_BY_DEPOT.get(depot.id) || [];
          const depotRecords = records.filter((r) => r.depotId === depot.id);
          const supervisorByDate = new Map<string, WPRecord>();
          depotRecords.filter((r) => r.isSupervisor).forEach((r) => supervisorByDate.set(r.date, r));
          const collapsed = collapsedDepots.has(depot.id);
          const gridTemplate = `160px repeat(${weekDates.length}, minmax(120px, 1fr))`;

          return (
            <section className={`wp-depot-section${collapsed ? ' collapsed' : ''}`} data-depot-id={depot.id} key={depot.id}>
              <div
                className="wp-depot-header"
                data-depot-toggle
                onClick={() =>
                  setCollapsedDepots((prev) => {
                    const next = new Set(prev);
                    if (next.has(depot.id)) next.delete(depot.id);
                    else next.add(depot.id);
                    return next;
                  })
                }
              >
                <div className="wp-depot-header-left">
                  <button type="button" className="wp-depot-collapse-btn" aria-label="Collapse depot">
                    <i className="bi bi-chevron-down" />
                  </button>
                  <div>
                    <h2 className="wp-depot-title">{depot.name}</h2>
                    <p className="wp-depot-subtitle">
                      {routes.length} route{routes.length === 1 ? '' : 's'} scheduled
                    </p>
                  </div>
                </div>
              </div>

              <div className="wp-depot-body">
                <div className="wp-grid-scroll">
                  <div className="wp-grid" style={{ gridTemplateColumns: gridTemplate }}>
                    <div className="wp-cell-label wp-supervisor-label">
                      <strong>Team Leader</strong>
                      <span className="wp-supervisor-sub">{depot.name}</span>
                    </div>
                    {weekDates.map((date) => {
                      const dateISO = formatDateISO(date);
                      const supAssignment = supervisorByDate.get(dateISO);
                      return (
                        <div
                          key={`sup-${dateISO}`}
                          className={`wp-cell-day wp-supervisor-cell${isWeekend(date) ? ' is-weekend' : ''}`}
                          data-supervisor-cell
                          data-depot-id={depot.id}
                          data-date={dateISO}
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const popW = 250;
                            let left = rect.left + rect.width / 2 - popW / 2;
                            left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
                            let top = rect.bottom + 6;
                            if (top + 160 > window.innerHeight) top = rect.top - 166;
                            setSupervisorPopover({ depotId: depot.id, dateISO, left, top });
                          }}
                        >
                          {supAssignment ? (
                            <div className="wp-supervisor-chip" title={`${supAssignment.name} — click to edit`}>
                              {supAssignment.name}
                            </div>
                          ) : (
                            <span className="wp-supervisor-empty">—</span>
                          )}
                        </div>
                      );
                    })}

                    <div className="wp-cell-head wp-head-corner">
                      <span className="wp-day-name">Route</span>
                    </div>
                    {weekDates.map((date) => (
                      <div key={`head-${formatDateISO(date)}`} className={`wp-cell-head${isWeekend(date) ? ' is-weekend' : ''}`}>
                        <span className="wp-day-name">{getDayNameShort(date)}</span>
                        <span className="wp-day-date">{formatDateDMY(date)}</span>
                      </div>
                    ))}

                    {routes.map((route) => (
                      <>
                        <div className="wp-cell-label" title={route.name} key={`label-${route.id}`}>
                          {route.name}
                        </div>
                        {weekDates.map((date) => {
                          const dateISO = formatDateISO(date);
                          const cellRecords = depotRecords.filter((r) => !r.isSupervisor && r.routeId === route.id && r.date === dateISO);
                          return (
                            <div
                              key={`cell-${route.id}-${dateISO}`}
                              className={`wp-cell-day${isWeekend(date) ? ' is-weekend' : ''}`}
                              data-day-cell
                              data-depot-id={depot.id}
                              data-route-id={route.id}
                              data-date={dateISO}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = dragPayload.current?.type === 'vendor' ? 'copy' : 'move';
                                (e.currentTarget as HTMLElement).classList.add('wp-drop-hover');
                              }}
                              onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('wp-drop-hover')}
                              onDrop={(e) => {
                                e.preventDefault();
                                (e.currentTarget as HTMLElement).classList.remove('wp-drop-hover');
                                handleDropOnCell(depot.id, route.id, dateISO);
                              }}
                            >
                              {cellRecords.length === 0 ? (
                                <span className="wp-cell-empty">–</span>
                              ) : (
                                cellRecords.map((rec) => (
                                  <div
                                    key={rec.weekPlannerId}
                                    className={`wp-card${rec.routeSort === 'no' ? ' wp-card--sort-no' : ''}${
                                      rec.status === 'Day Off' || rec.status === 'OFF' ? ' wp-card--day-off' : ''
                                    }`}
                                    draggable
                                    data-assignment-id={rec.weekPlannerId}
                                    title={`${rec.name} — click to edit`}
                                    onDragStart={(e) => {
                                      dragPayload.current = { type: 'assignment', id: rec.weekPlannerId };
                                      e.dataTransfer.effectAllowed = 'move';
                                      (e.currentTarget as HTMLElement).classList.add('dragging');
                                    }}
                                    onDragEnd={(e) => (e.currentTarget as HTMLElement).classList.remove('dragging')}
                                    onClick={() => {
                                      const found = findRecordById(rec.weekPlannerId);
                                      if (found) setEditingRecord(found);
                                    }}
                                  >
                                    <div className="wp-card-top">
                                      <span className="wp-card-name">{rec.name}</span>
                                      {rec.routeSort === 'yes' && <span className="wp-sort-dot" title="Route Sort" />}
                                    </div>
                                    <div className="wp-card-bottom">
                                      <span className="wp-plate">{rec.registrationPlate || '—'}</span>
                                      {rec.notes && (
                                        <span className="wp-card-notes-flag" title={rec.notes}>
                                          !
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {createPortal(
        <>
          {/* ============ Loading screen ============ */}
          <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
            <div className="spinner" />
            <p>Loading week planner…</p>
          </div>

          {/* ============ Available Vendors drawer ============ */}
          <div className="wp-drawer-overlay" id="vendorsDrawerOverlay" hidden={!vendorsDrawerOpen} onClick={() => setVendorsDrawerOpen(false)} />
          <aside className={`wp-vendors-drawer${vendorsDrawerOpen ? ' open' : ''}`} id="vendorsDrawer" aria-hidden={!vendorsDrawerOpen}>
            <div className="wp-drawer-header">
              <h2>
                <i className="bi bi-people" /> Available Vendors
              </h2>
              <button type="button" className="dom-modal-close" id="btnCloseVendorsDrawer" aria-label="Close" onClick={() => setVendorsDrawerOpen(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="wp-drawer-search">
              <div className="search-input-wrap">
                <i className="bi bi-search" />
                <input
                  type="text"
                  id="vendorsDrawerSearch"
                  className="form-control"
                  placeholder="Search vendor…"
                  autoComplete="off"
                  value={vendorsDrawerSearch}
                  onChange={(e) => setVendorsDrawerSearch(e.target.value)}
                />
              </div>
            </div>
            <p className="wp-drawer-hint">Drag a vendor onto an empty day cell to assign them for that route and day.</p>
            <div className="wp-drawer-list" id="vendorsDrawerList">
              {filteredDrawerVendors.length === 0 ? (
                <p className="wp-drawer-empty">
                  <i className="bi bi-check2-circle" />
                  <br />
                  No unassigned vendors match.
                </p>
              ) : (
                filteredDrawerVendors.map((v) => (
                  <div
                    key={v.id}
                    className="wp-vendor-chip"
                    draggable
                    data-vendor-id={v.id}
                    title="Drag onto a day cell to assign"
                    onDragStart={(e) => {
                      dragPayload.current = { type: 'vendor', vendorId: v.id };
                      e.dataTransfer.effectAllowed = 'copy';
                      (e.currentTarget as HTMLElement).classList.add('dragging');
                    }}
                    onDragEnd={(e) => (e.currentTarget as HTMLElement).classList.remove('dragging')}
                  >
                    <div>
                      <span className="wp-vendor-chip-name">{v.name}</span>
                      <span className="wp-vendor-chip-vehicle">{v.vehicle}</span>
                    </div>
                    <i className="bi bi-grip-vertical wp-vendor-chip-drag" />
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ============ Assignment edit modal ============ */}
          <div className={`wp-modal-backdrop${editingRecord ? ' sp-modal-backdrop-anim' : ''}`} id="assignmentModalBackdrop" hidden={!editingRecord}>
            {editingRecord && (
              <AssignmentModal
                record={editingRecord}
                depotName={DEPOTS.find((d) => d.id === editingRecord.depotId)?.name || ''}
                onClose={() => setEditingRecord(null)}
                onSave={saveAssignmentModal}
                onUnassign={unassignFromModal}
              />
            )}
          </div>

          {/* ============ Supervisor inline popover ============ */}
          <div
            className="wp-popover"
            id="supervisorPopover"
            hidden={!supervisorPopover}
            style={supervisorPopover ? { left: supervisorPopover.left, top: supervisorPopover.top } : undefined}
          >
            {supervisorPopover && (
              <SupervisorPopoverBody
                depotName={DEPOTS.find((d) => d.id === supervisorPopover.depotId)?.name || ''}
                dateISO={supervisorPopover.dateISO}
                initialVendorId={
                  records.find((r) => r.isSupervisor && r.depotId === supervisorPopover.depotId && r.date === supervisorPopover.dateISO)?.vendorId || 0
                }
                onSave={saveSupervisor}
              />
            )}
          </div>

          {/* ============ Toasts ============ */}
          <div className="toast-container" id="toastContainer">
            {toasts.map((t) => {
              const icon = t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
              return (
                <div className={`app-toast ${t.type}${t.hiding ? ' hiding' : ''}`} key={t.id}>
                  <i className={`bi ${icon}`} />
                  <span>{t.message}</span>
                </div>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </PortalLayout>
  );
}

function AssignmentModal({
  record,
  depotName,
  onClose,
  onSave,
  onUnassign,
}: {
  record: WPRecord;
  depotName: string;
  onClose: () => void;
  onSave: (vendorId: number, vehicle: string, plate: string, routeSort: 'yes' | 'no', status: string, notes: string) => void;
  onUnassign: () => void;
}) {
  const [vendorId, setVendorId] = useState(record.vendorId);
  const [vehicle, setVehicle] = useState(record.vehicle || '');
  const [plate, setPlate] = useState(record.registrationPlate || '');
  const [routeSort, setRouteSort] = useState<'yes' | 'no'>(record.routeSort || 'no');
  const [status, setStatus] = useState(record.status || 'Working');
  const [notes, setNotes] = useState(record.notes || '');

  // Mounted/unmounted via JSX conditional (see caller), so `active` is
  // always true for the lifetime of this component.
  useModalBehavior(onClose);

  return (
    <div className="wp-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="assignmentModalTitle">
      <div className="wp-modal-header">
        <h2 className="wp-modal-title" id="assignmentModalTitle">
          <i className="bi bi-pencil-square me-2" />
          Edit Assignment
        </h2>
        <button type="button" className="dom-modal-close" id="btnCloseAssignmentModal" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <form
        className="wp-modal-body"
        id="assignmentForm"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(vendorId, vehicle, plate, routeSort, status, notes);
        }}
      >
        <div className="wp-modal-meta" id="assignmentModalMeta">
          <i className="bi bi-geo-alt" /> {depotName} · <i className="bi bi-signpost-2" /> {record.route} · <i className="bi bi-calendar3" /> {record.date}
        </div>
        <div className="dom-form-grid">
          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="fieldVendorName">
              Vendor
            </label>
            <select id="fieldVendorName" className="form-select" value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))}>
              {VENDOR_POOL.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="dom-form-field">
            <label className="dom-form-label" htmlFor="fieldVehicle">
              Vehicle
            </label>
            <input id="fieldVehicle" type="text" placeholder="e.g. 7.5T Box Truck" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
          </div>
          <div className="dom-form-field">
            <label className="dom-form-label" htmlFor="fieldPlate">
              Registration Plate
            </label>
            <input id="fieldPlate" type="text" placeholder="e.g. LX68 XYZ" value={plate} onChange={(e) => setPlate(e.target.value)} />
          </div>
          {!record.isSupervisor && (
            <div className="dom-form-field">
              <label className="dom-form-label" htmlFor="fieldRouteSort">
                Route Sort
              </label>
              <select id="fieldRouteSort" value={routeSort} onChange={(e) => setRouteSort(e.target.value as 'yes' | 'no')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          )}
          <div className="dom-form-field">
            <label className="dom-form-label" htmlFor="fieldStatus">
              Status
            </label>
            <select id="fieldStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Working">Working</option>
              <option value="Day Off">Day Off</option>
              <option value="OFF">OFF</option>
            </select>
          </div>
          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="fieldNotes">
              Notes
            </label>
            <textarea id="fieldNotes" rows={3} placeholder="Optional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="dom-form-actions wp-modal-actions">
          <button type="button" className="styled-button styled-button--danger" id="btnUnassign" onClick={onUnassign}>
            <i className="bi bi-trash" /> Unassign
          </button>
          <div className="wp-modal-actions-right">
            <button type="button" className="styled-button styled-button--outline" id="btnCancelAssignment" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="styled-button styled-button--primary" id="btnSaveAssignment">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SupervisorPopoverBody({
  depotName,
  dateISO,
  initialVendorId,
  onSave,
}: {
  depotName: string;
  dateISO: string;
  initialVendorId: number;
  onSave: (vendorId: number) => void;
}) {
  const [vendorId, setVendorId] = useState(initialVendorId);

  return (
    <>
      <p className="wp-popover-title" id="supervisorPopoverTitle">
        Team Leader — {depotName} ({dateISO})
      </p>
      <select id="supervisorPopoverSelect" className="form-select" value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))}>
        <option value="">-- Unassigned --</option>
        {VENDOR_POOL.map((v) => (
          <option value={v.id} key={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <div className="wp-popover-actions">
        <button type="button" className="styled-button styled-button--outline" id="btnClearSupervisor" onClick={() => onSave(0)}>
          Clear
        </button>
        <button type="button" className="styled-button styled-button--primary" id="btnSaveSupervisor" onClick={() => onSave(vendorId)}>
          Save
        </button>
      </div>
    </>
  );
}
