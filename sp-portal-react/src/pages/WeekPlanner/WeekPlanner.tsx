import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import AvailableDrivers from './components/AvailableDrivers';
import DayOffModal, { type DayOffEntry } from './components/DayOffModal';
import TypesConfigModal from './components/TypesConfigModal';
import AddAdhocServiceModal from './components/AddAdhocServiceModal';
import FlexRouteModal from './components/FlexRouteModal';
import AddManagementSupportModal from './components/AddManagementSupportModal';
import ExportScheduleModal, { type ExportScheduleOptions } from './components/ExportScheduleModal';
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

/* ---------- week notes (Week Planner + export only, persisted locally per week-start date) ---------- */
const WEEK_NOTES_STORAGE_KEY = 'wp_week_notes';
function getWeekNote(weekStartISO: string): string {
  try {
    const raw = localStorage.getItem(WEEK_NOTES_STORAGE_KEY);
    if (!raw) return '';
    const data = JSON.parse(raw);
    return typeof data[weekStartISO] === 'string' ? data[weekStartISO] : '';
  } catch {
    return '';
  }
}
function setWeekNote(weekStartISO: string, note: string): void {
  try {
    const raw = localStorage.getItem(WEEK_NOTES_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (note.trim() === '') delete data[weekStartISO];
    else data[weekStartISO] = note;
    localStorage.setItem(WEEK_NOTES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
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
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const PICKER_YEARS = (() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - 2 + i);
})();
/** Every Monday-start week that touches the given month, earliest first. */
function getWeeksOfMonth(year: number, month: number): { weekStart: Date; label: string }[] {
  const lastOfMonth = new Date(year, month + 1, 0);
  const weeks: { weekStart: Date; label: string }[] = [];
  let cursor = getWeekStart(new Date(year, month, 1));
  let index = 1;
  while (cursor <= lastOfMonth) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    weeks.push({
      weekStart: new Date(cursor),
      label: `Week ${index} (${cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`,
    });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
    index++;
  }
  return weeks;
}
function formatWeekRangeLabel(weekStart: Date, includeWeekends: boolean): string {
  const dates = getWeekDatesFiltered(weekStart, includeWeekends);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`;
}

/* ---------- XLSX export (ported from Next.js ExportDayScheduleModal / ExportWeekScheduleModal) ----------
 * The source modals generate a PDF per selected depot via a backend PDF service; this app has no
 * such backend and a single mock depot, so the export target is an .xlsx workbook instead — built
 * with the sheetjs/xlsx UMD bundle loaded from CDN at click-time, the same pattern already used by
 * AdhocInvoiceManagement.tsx (xlsx isn't an installed npm dependency in this project). */
let xlsxLoadPromise: Promise<void> | null = null;
function loadXlsx(): Promise<void> {
  if (typeof window !== 'undefined' && (window as unknown as { XLSX?: unknown }).XLSX) {
    return Promise.resolve();
  }
  if (!xlsxLoadPromise) {
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-wp-xlsx]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('xlsx load failed')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.async = true;
      script.dataset.wpXlsx = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('xlsx load failed'));
      document.head.appendChild(script);
    });
  }
  return xlsxLoadPromise;
}

/* ==================== mock reference data ==================== */
interface Depot {
  id: number;
  name: string;
  code: string;
}
const DEPOTS: Depot[] = [
  { id: 1, name: 'Central Hub', code: 'HUB' },
];
const ROUTE_COUNT_BY_DEPOT: Record<number, number> = { 1: 6 };

interface Route {
  id: number;
  depotId: number;
  name: string;
  isFlex?: boolean;
}
function buildRoutesForDepot(depot: Depot): Route[] {
  const n = ROUTE_COUNT_BY_DEPOT[depot.id] || 6;
  const routes: Route[] = [];
  for (let i = 0; i < n; i++) routes.push({ id: depot.id * 100 + i + 1, depotId: depot.id, name: `${depot.code}-${101 + i}` });
  return routes;
}
const ROUTES_BY_DEPOT = new Map(DEPOTS.map((d) => [d.id, buildRoutesForDepot(d)]));

/** Flex routes — extra routes hidden by default; a depot can show/hide them via "Manage Flex Routes". */
const FLEX_ROUTE_NAMES = ['Overflow A', 'Overflow B', 'Weekend Surge', 'Peak Cover'];
function buildFlexRoutesForDepot(depot: Depot): Route[] {
  return FLEX_ROUTE_NAMES.map((name, i) => ({ id: depot.id * 100 + 50 + i, depotId: depot.id, name: `${depot.code}-FLEX-${i + 1} (${name})`, isFlex: true }));
}
const FLEX_ROUTES_BY_DEPOT = new Map(DEPOTS.map((d) => [d.id, buildFlexRoutesForDepot(d)]));

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
  vendorTypeId?: number;
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

interface FleetVehicle {
  id: number;
  model: string;
  plate: string;
}
function buildVehicleFleet(): FleetVehicle[] {
  const fleet: FleetVehicle[] = [];
  const rng = rngForSeed('week-planner-vehicle-fleet');
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const l2 = () => letters[Math.floor(rng() * letters.length)];
  for (let i = 0; i < VEHICLE_TYPES.length * 4; i++) {
    const model = VEHICLE_TYPES[i % VEHICLE_TYPES.length];
    const plate = `L${Math.floor(rng() * 9)}${Math.floor(rng() * 9)} ${l2()}${l2()}${l2()}`;
    fleet.push({ id: i + 1, model, plate });
  }
  return fleet;
}
/** Independent fleet vehicles for the vehicle picker — decoupled from each vendor's initial vehicle/plate. */
const VEHICLE_FLEET = buildVehicleFleet();

export interface AdhocServiceCatalogItem {
  id: number;
  adhocName: string;
  adhocReceivedPayment: number;
  adhocVendorPayment: number;
  [key: string]: string | number | boolean;
}
/** Seed catalog for Ad-Hoc Services — editable via Types Config's "Adhoc Services" tab, shared with the Add Ad-Hoc Service modal. */
const DEFAULT_ADHOC_SERVICES: AdhocServiceCatalogItem[] = [
  { id: 1, adhocName: 'CMP Unload', adhocReceivedPayment: 45, adhocVendorPayment: 30 },
  { id: 2, adhocName: 'Flyer Sort', adhocReceivedPayment: 25, adhocVendorPayment: 18 },
  { id: 3, adhocName: 'Boat', adhocReceivedPayment: 60, adhocVendorPayment: 42 },
  { id: 4, adhocName: 'Pre-9 Delivery', adhocReceivedPayment: 35, adhocVendorPayment: 24 },
];

interface StaffMember {
  id: number;
  name: string;
}
/** Office/admin staff pool for Management & Support assignments — distinct from VENDOR_POOL (drivers), with a non-overlapping id range. */
const MANAGEMENT_STAFF_POOL: StaffMember[] = [
  { id: 501, name: 'Diana Cooper' },
  { id: 502, name: 'Marcus Webb' },
  { id: 503, name: 'Sophie Turner' },
  { id: 504, name: 'Nathan Ford' },
  { id: 505, name: 'Rachel Kim' },
  { id: 506, name: 'Tom Bradley' },
];

export interface ManagementFunctionCatalogItem {
  id: number;
  title: string;
  [key: string]: string | number | boolean;
}
/** Seed catalog for Management & Support functions — editable via Types Config's "Management Functions" tab. */
const DEFAULT_MANAGEMENT_FUNCTIONS: ManagementFunctionCatalogItem[] = [
  { id: 1, title: 'Team Leader - Ops' },
  { id: 2, title: 'IT Support' },
  { id: 3, title: 'HR Coordinator' },
  { id: 4, title: 'Customer Service' },
];

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
  /** Ad-Hoc Services assignment — not tied to a real route; matched by adhocServiceId instead of routeId. */
  isAdhoc: boolean;
  adhocServiceId?: number;
  /** Management & Support Team assignment — office/admin staff on a named function, not tied to a route. */
  isManagementSupport: boolean;
  managementFunctionId?: number;
}

/** Two records occupy the "same slot" (route+depot+supervisor, the same ad-hoc service, or the same management function) regardless of vendor/date. */
function isSameSlot(a: WPRecord, b: WPRecord): boolean {
  if (a.isAdhoc || b.isAdhoc) return a.isAdhoc === b.isAdhoc && a.adhocServiceId === b.adhocServiceId;
  if (a.isManagementSupport || b.isManagementSupport) {
    return a.isManagementSupport === b.isManagementSupport && a.managementFunctionId === b.managementFunctionId;
  }
  return a.isSupervisor === b.isSupervisor && a.depotId === b.depotId && a.routeId === b.routeId;
}

/** Management & Support assignments are staffed from MANAGEMENT_STAFF_POOL; everything else from VENDOR_POOL. */
function personPoolFor(rec: Pick<WPRecord, 'isManagementSupport'>): { id: number; name: string }[] {
  return rec.isManagementSupport ? MANAGEMENT_STAFF_POOL : VENDOR_POOL;
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
          isAdhoc: false,
          isManagementSupport: false,
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
        isAdhoc: false,
        isManagementSupport: false,
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

type ViewMode = 'weekly' | 'daily';

export function WeekPlanner() {
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(() => new Date());
  const currentWeekStart = useMemo(() => getWeekStart(currentDay), [currentDay]);
  const [showWeekMonthPicker, setShowWeekMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const weekMonthPickerRef = useRef<HTMLDivElement>(null);
  const pickerWeeks = useMemo(() => getWeeksOfMonth(pickerYear, pickerMonth), [pickerYear, pickerMonth]);
  const [weekNote, setWeekNoteState] = useState('');
  const [showWeekNotePanel, setShowWeekNotePanel] = useState(false);

  /* Week notes are per week-start date — reload the note and pop the corner panel open whenever the viewed week changes. */
  useEffect(() => {
    const key = formatDateISO(currentWeekStart);
    setWeekNoteState(getWeekNote(key));
    setShowWeekNotePanel(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  function handleWeekNoteChange(value: string) {
    setWeekNoteState(value);
    setWeekNote(formatDateISO(currentWeekStart), value);
  }
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [showWeekends, setShowWeekends] = useState(false);
  const [collapsedDepots, setCollapsedDepots] = useState<Set<number>>(new Set());
  const [editingRecord, setEditingRecord] = useState<WPRecord | null>(null);
  const [supervisorPopover, setSupervisorPopover] = useState<SupervisorPopoverState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [renderVersion, setRenderVersion] = useState(0);
  const [isAvailableDriversOpen, setIsAvailableDriversOpen] = useState(false);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [showTypesConfigModal, setShowTypesConfigModal] = useState(false);
  const [showAddAdhocModal, setShowAddAdhocModal] = useState(false);
  const [adhocServiceCatalog, setAdhocServiceCatalog] = useState<AdhocServiceCatalogItem[]>(DEFAULT_ADHOC_SERVICES);
  const [adhocCollapsed, setAdhocCollapsed] = useState(false);
  const [visibleFlexRouteIds, setVisibleFlexRouteIds] = useState<Set<number>>(new Set());
  const [flexModalDepotId, setFlexModalDepotId] = useState<number | null>(null);
  const [showAddManagementModal, setShowAddManagementModal] = useState(false);
  const [managementFunctionCatalog, setManagementFunctionCatalog] = useState<ManagementFunctionCatalogItem[]>(DEFAULT_MANAGEMENT_FUNCTIONS);
  const [managementCollapsed, setManagementCollapsed] = useState(false);
  const [dayOffEntries, setDayOffEntries] = useState<DayOffEntry[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const weekCache = useRef(new Map<string, WPRecord[]>());
  const dragPayload = useRef<DragPayload | null>(null);
  const toastIdRef = useRef(0);
  const dayOffIdRef = useRef(0);

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

  function generateWeek() {
    const key = formatDateISO(currentWeekStart);
    weekCache.current.delete(key);
    showToast('Week regenerated with new assignments.', 'success');
    rerender();
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
  }, [currentDay, renderVersion]);

  function shiftWeek(deltaDays: number) {
    setCurrentDay((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  }

  function shiftDay(deltaDays: number) {
    setCurrentDay((prev) => {
      const next = new Date(prev);
      do {
        next.setDate(next.getDate() + deltaDays);
      } while (!showWeekends && isWeekend(next));
      return next;
    });
  }

  function openWeekMonthPicker() {
    setPickerYear(currentDay.getFullYear());
    setPickerMonth(currentDay.getMonth());
    setShowWeekMonthPicker(true);
  }

  function pickWeek(weekStart: Date) {
    setCurrentDay(new Date(weekStart));
    setShowWeekMonthPicker(false);
  }

  useEffect(() => {
    if (!showWeekMonthPicker) return;
    function handlePointerDown(e: MouseEvent) {
      if (weekMonthPickerRef.current && !weekMonthPickerRef.current.contains(e.target as Node)) {
        setShowWeekMonthPicker(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowWeekMonthPicker(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showWeekMonthPicker]);

  function findRecordById(id: number): WPRecord | null {
    return records.find((r) => r.weekPlannerId === id) || null;
  }

  function handleDropOnCell(depotId: number, routeId: number | null, dateISO: string) {
    const payload = dragPayload.current;
    dragPayload.current = null;
    if (!payload) return;
    const routes = [...(ROUTES_BY_DEPOT.get(depotId) || []), ...(FLEX_ROUTES_BY_DEPOT.get(depotId) || [])];
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
        isAdhoc: false,
        isManagementSupport: false,
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

  function handleDropOnAdhocCell(serviceId: number, dateISO: string) {
    const payload = dragPayload.current;
    dragPayload.current = null;
    if (!payload) return;
    const service = adhocServiceCatalog.find((s) => s.id === serviceId);
    if (!service) return;

    if (payload.type === 'vendor') {
      const vendor = VENDOR_POOL.find((v) => v.id === payload.vendorId);
      if (!vendor) return;
      const alreadyHere = records.some((r) => r.isAdhoc && r.adhocServiceId === serviceId && r.date === dateISO && r.vendorId === vendor.id);
      if (alreadyHere) {
        showToast(`${vendor.name} is already assigned to this cell.`, 'error');
        return;
      }
      records.push({
        weekPlannerId: weekPlannerIdCounter++,
        depotId: DEPOTS[0].id,
        routeId: null,
        isSupervisor: false,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: service.adhocName,
        routeSort: 'no',
        notes: '',
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
        isAdhoc: true,
        adhocServiceId: serviceId,
        isManagementSupport: false,
      });
      showToast(`Assigned ${vendor.name} to ${service.adhocName} on ${dateISO}.`, 'success');
      rerender();
      return;
    }

    const rec = records.find((r) => r.weekPlannerId === payload.id);
    if (!rec) return;
    if (rec.isAdhoc && rec.adhocServiceId === serviceId && rec.date === dateISO) return; // no-op, same cell
    const duplicate = records.some((r) => r !== rec && r.isAdhoc && r.adhocServiceId === serviceId && r.date === dateISO && r.vendorId === rec.vendorId);
    if (duplicate) {
      showToast(`${rec.name} is already assigned to this cell.`, 'error');
      return;
    }
    rec.isAdhoc = true;
    rec.adhocServiceId = serviceId;
    rec.routeId = null;
    rec.route = service.adhocName;
    rec.date = dateISO;
    showToast(`Moved ${rec.name} to ${service.adhocName} on ${dateISO}.`, 'success');
    rerender();
  }

  function saveAdhocService(data: { userId: number; serviceId: number; dates: string[]; notes: string }) {
    const vendor = VENDOR_POOL.find((v) => v.id === data.userId);
    const service = adhocServiceCatalog.find((s) => s.id === data.serviceId);
    if (!vendor || !service) return;
    if (data.dates.length === 0) {
      throw new Error('Select at least one day.');
    }

    let created = 0;
    let skipped = 0;
    data.dates.forEach((dateISO) => {
      const alreadyHere = records.some((r) => r.isAdhoc && r.adhocServiceId === service.id && r.date === dateISO && r.vendorId === vendor.id);
      if (alreadyHere) {
        skipped++;
        return;
      }
      created++;
      records.push({
        weekPlannerId: weekPlannerIdCounter++,
        depotId: DEPOTS[0].id,
        routeId: null,
        isSupervisor: false,
        date: dateISO,
        name: vendor.name,
        vendorId: vendor.id,
        route: service.adhocName,
        routeSort: 'no',
        notes: data.notes,
        vehicle: vendor.vehicle,
        registrationPlate: vendor.plate,
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
        isAdhoc: true,
        adhocServiceId: service.id,
        isManagementSupport: false,
      });
    });

    if (created === 0) {
      throw new Error(`${vendor.name} is already assigned to ${service.adhocName} on the selected date(s).`);
    }

    const parts = [`${created} day${created === 1 ? '' : 's'} added`];
    if (skipped > 0) parts.push(`${skipped} already assigned`);
    showToast(`${service.adhocName} assigned to ${vendor.name} (${parts.join(', ')}).`, 'success');
    setShowAddAdhocModal(false);
    rerender();
  }

  function handleDropOnManagementCell(functionId: number, dateISO: string) {
    const payload = dragPayload.current;
    dragPayload.current = null;
    if (!payload) return;
    const fn = managementFunctionCatalog.find((f) => f.id === functionId);
    if (!fn) return;

    if (payload.type === 'vendor') {
      const staff = MANAGEMENT_STAFF_POOL.find((v) => v.id === payload.vendorId);
      if (!staff) return;
      const alreadyHere = records.some(
        (r) => r.isManagementSupport && r.managementFunctionId === functionId && r.date === dateISO && r.vendorId === staff.id,
      );
      if (alreadyHere) {
        showToast(`${staff.name} is already assigned to this cell.`, 'error');
        return;
      }
      records.push({
        weekPlannerId: weekPlannerIdCounter++,
        depotId: DEPOTS[0].id,
        routeId: null,
        isSupervisor: false,
        date: dateISO,
        name: staff.name,
        vendorId: staff.id,
        route: fn.title,
        routeSort: 'no',
        notes: '',
        vehicle: '',
        registrationPlate: '',
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
        isAdhoc: false,
        isManagementSupport: true,
        managementFunctionId: functionId,
      });
      showToast(`Assigned ${staff.name} to ${fn.title} on ${dateISO}.`, 'success');
      rerender();
      return;
    }

    const rec = records.find((r) => r.weekPlannerId === payload.id);
    if (!rec) return;
    if (rec.isManagementSupport && rec.managementFunctionId === functionId && rec.date === dateISO) return; // no-op, same cell
    const duplicate = records.some(
      (r) => r !== rec && r.isManagementSupport && r.managementFunctionId === functionId && r.date === dateISO && r.vendorId === rec.vendorId,
    );
    if (duplicate) {
      showToast(`${rec.name} is already assigned to this cell.`, 'error');
      return;
    }
    rec.isManagementSupport = true;
    rec.managementFunctionId = functionId;
    rec.isAdhoc = false;
    rec.routeId = null;
    rec.route = fn.title;
    rec.date = dateISO;
    showToast(`Moved ${rec.name} to ${fn.title} on ${dateISO}.`, 'success');
    rerender();
  }

  function saveManagementSupport(data: { userId: number; functionId: number; dates: string[]; notes: string }) {
    const staff = MANAGEMENT_STAFF_POOL.find((v) => v.id === data.userId);
    const fn = managementFunctionCatalog.find((f) => f.id === data.functionId);
    if (!staff || !fn) return;
    if (data.dates.length === 0) {
      throw new Error('Select at least one day.');
    }

    let created = 0;
    let skipped = 0;
    data.dates.forEach((dateISO) => {
      const alreadyHere = records.some(
        (r) => r.isManagementSupport && r.managementFunctionId === fn.id && r.date === dateISO && r.vendorId === staff.id,
      );
      if (alreadyHere) {
        skipped++;
        return;
      }
      created++;
      records.push({
        weekPlannerId: weekPlannerIdCounter++,
        depotId: DEPOTS[0].id,
        routeId: null,
        isSupervisor: false,
        date: dateISO,
        name: staff.name,
        vendorId: staff.id,
        route: fn.title,
        routeSort: 'no',
        notes: data.notes,
        vehicle: '',
        registrationPlate: '',
        status: 'Working',
        isDayOff: 'false',
        isSort: 'false',
        isAdhoc: false,
        isManagementSupport: true,
        managementFunctionId: fn.id,
      });
    });

    if (created === 0) {
      throw new Error(`${staff.name} is already assigned to ${fn.title} on the selected date(s).`);
    }

    const parts = [`${created} day${created === 1 ? '' : 's'} added`];
    if (skipped > 0) parts.push(`${skipped} already assigned`);
    showToast(`${fn.title} assigned to ${staff.name} (${parts.join(', ')}).`, 'success');
    setShowAddManagementModal(false);
    rerender();
  }

  function applyFlexRouteVisibility(depotId: number, selectedIds: Set<number>) {
    const depotFlexIds = new Set((FLEX_ROUTES_BY_DEPOT.get(depotId) || []).map((r) => r.id));
    setVisibleFlexRouteIds((prev) => {
      const next = new Set(prev);
      depotFlexIds.forEach((id) => next.delete(id));
      selectedIds.forEach((id) => next.add(id));
      return next;
    });
    setFlexModalDepotId(null);
  }

  function hideFlexRoute(route: Route) {
    setVisibleFlexRouteIds((prev) => {
      const next = new Set(prev);
      next.delete(route.id);
      return next;
    });
    showToast(`${route.name} hidden from the planner. Re-add it any time via "Manage Flex Routes".`, 'info');
  }

  function saveAssignmentModal(vendorId: number, vehicleId: number, routeSort: 'yes' | 'no', status: string, notes: string) {
    const rec = editingRecord;
    if (!rec) return;
    const person = personPoolFor(rec).find((v) => v.id === vendorId);
    if (person) {
      rec.vendorId = person.id;
      rec.name = person.name;
    }
    if (!rec.isManagementSupport) {
      const fleetVehicle = VEHICLE_FLEET.find((v) => v.id === vehicleId);
      if (fleetVehicle) {
        rec.vehicle = fleetVehicle.model;
        rec.registrationPlate = fleetVehicle.plate;
      }
    }
    if (!rec.isSupervisor && !rec.isAdhoc && !rec.isManagementSupport) {
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

  /** Assign this vendor+vehicle to the same route for every day of the week, overwriting whoever else is there. */
  function assignWeekFromModal(vendorId: number, vehicleId: number, routeSort: 'yes' | 'no', notes: string) {
    const rec = editingRecord;
    if (!rec) return;
    const person = personPoolFor(rec).find((v) => v.id === vendorId);
    const fleetVehicle = VEHICLE_FLEET.find((v) => v.id === vehicleId);
    if (!person || (!rec.isManagementSupport && !fleetVehicle)) return;

    const vendorDayOffDates = new Set(dayOffEntries.filter((e) => e.userId === vendorId).map((e) => e.date));
    let created = 0;
    let overwritten = 0;
    let skipped = 0;

    fullWeekDates.forEach((date) => {
      const dateISO = formatDateISO(date);
      if (vendorDayOffDates.has(dateISO)) {
        skipped++;
        return;
      }
      const existing = records.find((r) => isSameSlot(r, rec) && r.date === dateISO);
      if (existing) {
        if (existing.vendorId !== person.id) overwritten++;
        existing.vendorId = person.id;
        existing.name = person.name;
        if (!rec.isManagementSupport && fleetVehicle) {
          existing.vehicle = fleetVehicle.model;
          existing.registrationPlate = fleetVehicle.plate;
        }
        if (!existing.isSupervisor && !existing.isAdhoc && !existing.isManagementSupport) {
          existing.routeSort = routeSort;
          existing.isSort = routeSort === 'yes' ? 'true' : 'false';
        }
        existing.status = 'Working';
        existing.isDayOff = 'false';
        existing.notes = notes.trim();
      } else {
        created++;
        records.push({
          weekPlannerId: rec.isSupervisor ? -(weekPlannerIdCounter++) : weekPlannerIdCounter++,
          depotId: rec.depotId,
          routeId: rec.routeId,
          isSupervisor: rec.isSupervisor,
          date: dateISO,
          name: person.name,
          vendorId: person.id,
          route: rec.route,
          routeSort,
          notes: notes.trim(),
          vehicle: !rec.isManagementSupport && fleetVehicle ? fleetVehicle.model : '',
          registrationPlate: !rec.isManagementSupport && fleetVehicle ? fleetVehicle.plate : '',
          status: 'Working',
          isDayOff: 'false',
          isSort: !rec.isSupervisor && !rec.isAdhoc && !rec.isManagementSupport && routeSort === 'yes' ? 'true' : 'false',
          isAdhoc: rec.isAdhoc,
          adhocServiceId: rec.adhocServiceId,
          isManagementSupport: rec.isManagementSupport,
          managementFunctionId: rec.managementFunctionId,
        });
      }
    });

    const parts = [`${created} added`, `${overwritten} overwritten`];
    if (skipped > 0) parts.push(`${skipped} skipped (day off)`);
    showToast(`Assigned ${person.name} to ${rec.route} for the week (${parts.join(', ')}).`, 'success');
    setEditingRecord(null);
    rerender();
  }

  /** Remove every assignment for this vendor on this route across the whole week. */
  function removeWeekFromModal() {
    const rec = editingRecord;
    if (!rec) return;
    let removed = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      if (isSameSlot(r, rec) && r.vendorId === rec.vendorId) {
        records.splice(i, 1);
        removed++;
      }
    }
    showToast(`Removed ${rec.name} from ${rec.route} for the week (${removed} day${removed === 1 ? '' : 's'}).`, 'success');
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
        isAdhoc: false,
        isManagementSupport: false,
      });
    }
    showToast(`Team Leader for ${dateISO} set to ${vendor.name}.`, 'success');
    setSupervisorPopover(null);
    rerender();
  }

  function saveDayOff(data: { userId: number; dates: string[]; reason: string; notes: string }) {
    const vendor = VENDOR_POOL.find((v) => v.id === data.userId);
    if (!vendor) return;

    const alreadyOffDates = new Set(dayOffEntries.filter((e) => e.userId === data.userId).map((e) => e.date));
    const datesToCreate = data.dates.filter((d) => !alreadyOffDates.has(d));
    if (datesToCreate.length === 0) {
      throw new Error(`${vendor.name} is already marked as day off for the selected date(s).`);
    }

    // Remove any existing assignments (route or Team Leader) for this vendor on these dates,
    // across every week already generated — mirrors the source app hard-deleting conflicting
    // assignments when a day off is registered.
    const targetDates = new Set(datesToCreate);
    weekCache.current.forEach((weekRecords) => {
      for (let i = weekRecords.length - 1; i >= 0; i--) {
        const rec = weekRecords[i];
        if (rec.vendorId === data.userId && targetDates.has(rec.date)) {
          weekRecords.splice(i, 1);
        }
      }
    });

    const newEntries: DayOffEntry[] = datesToCreate.map((date) => ({
      id: `${data.userId}-${date}-${dayOffIdRef.current++}`,
      userId: data.userId,
      date,
      reason: data.reason,
      notes: data.notes,
    }));
    setDayOffEntries((prev) => [...prev, ...newEntries]);
    showToast(`Day off registered for ${vendor.name} (${datesToCreate.length} day${datesToCreate.length === 1 ? '' : 's'}).`, 'success');
    setShowDayOffModal(false);
    rerender();
  }

  async function exportSchedule({ scope, includeWeekends }: ExportScheduleOptions) {
    try {
      await loadXlsx();
    } catch {
      showToast('XLSX export library failed to load.', 'error');
      return;
    }
    const XLSX = (window as unknown as { XLSX?: any }).XLSX; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!XLSX) {
      showToast('XLSX export library failed to load.', 'error');
      return;
    }

    const targetDates = scope === 'day' ? [currentDay] : getWeekDatesFiltered(currentWeekStart, includeWeekends);
    const targetISOs = new Set(targetDates.map(formatDateISO));
    const rowsForExport = records
      .filter((r) => targetISOs.has(r.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.route.localeCompare(b.route))
      .map((r) => ({
        Date: r.date,
        Day: getDayNameShort(new Date(`${r.date}T00:00:00`)),
        Depot: DEPOTS.find((d) => d.id === r.depotId)?.name || '',
        Type: r.isSupervisor ? 'Team Leader' : r.isAdhoc ? 'Ad-Hoc' : r.isManagementSupport ? 'Mgmt & Support' : 'Route',
        'Route / Function': r.route,
        'Vendor / Staff': r.name,
        Vehicle: r.vehicle || '',
        'Reg. Plate': r.registrationPlate || '',
        'Route Sort': r.routeSort === 'yes' ? 'Yes' : 'No',
        Status: r.status,
        Notes: r.notes || '',
      }));

    if (rowsForExport.length === 0) {
      showToast('Nothing to export for the selected scope.', 'error');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rowsForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, scope === 'day' ? 'Day Schedule' : 'Week Schedule');

    if (weekNote.trim() !== '') {
      const notesSheet = XLSX.utils.json_to_sheet([
        { Week: formatWeekRangeLabel(currentWeekStart, true), Notes: weekNote },
      ]);
      XLSX.utils.book_append_sheet(workbook, notesSheet, 'Week Notes');
    }

    const filenameDate = scope === 'day' ? formatDateISO(currentDay) : formatDateISO(currentWeekStart);
    XLSX.writeFile(workbook, `week-planner-${scope}-schedule-${filenameDate}.xlsx`);
    showToast(`Exported ${rowsForExport.length} row(s) to XLSX.`, 'success');
    setShowExportModal(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setEditingRecord(null);
      setSupervisorPopover(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const weekDates = viewMode === 'daily' ? [currentDay] : getWeekDatesFiltered(currentWeekStart, showWeekends);
  const dailyLabel = currentDay.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  // Full week (independent of Weekly/Daily toggle) — target range for the modal's Assign Week / Remove Week bulk actions.
  const fullWeekDates = getWeekDatesFiltered(currentWeekStart, showWeekends);

  return (
    <PortalLayout mainClassName="wp-container container-fluid px-3 px-lg-4 py-4" title="Week Planner" hideAnnouncements>
      {/* ============ PAGE INFO (kept from the original header; not part of the standardized pattern) ============ */}
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-calendar-week" />
            <span id="wpHeaderSubtitle">
              {viewMode === 'daily' ? 'Day' : 'Week'} of{' '}
              {(viewMode === 'daily' ? currentDay : currentWeekStart).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}{' '}
              — {DEPOTS.length} depots
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
            <i className={`bi ${viewMode === 'daily' ? 'bi-calendar-day' : 'bi-calendar3'}`} /> {viewMode === 'daily' ? 'Day' : 'Week'}
          </span>
          <div className="week-nav-controls">
            <button
              type="button"
              className="date-nav-btn"
              id="btnPrevWeek"
              aria-label={viewMode === 'daily' ? 'Previous day' : 'Previous week'}
              onClick={() => (viewMode === 'daily' ? shiftDay(-1) : shiftWeek(-7))}
            >
              <i className="bi bi-chevron-left" />
            </button>
            <button type="button" className="date-nav-btn week-nav-today" id="btnThisWeek" onClick={() => setCurrentDay(new Date())}>
              {viewMode === 'daily' ? 'Today' : 'This week'}
            </button>
            <div className="wp-week-picker-anchor" ref={weekMonthPickerRef}>
              <button
                type="button"
                className={`date-nav-btn wp-week-picker-toggle${showWeekMonthPicker ? ' is-active' : ''}`}
                id="btnWeekMonthPicker"
                aria-label="Pick a specific week and month"
                aria-expanded={showWeekMonthPicker}
                onClick={() => (showWeekMonthPicker ? setShowWeekMonthPicker(false) : openWeekMonthPicker())}
              >
                <i className="bi bi-calendar-event" />
              </button>
              {showWeekMonthPicker && (
                <div className="wp-week-picker-panel" role="dialog" aria-label="Select week and month">
                  <div className="wp-week-picker-row">
                    <div className="wp-week-picker-field">
                      <label htmlFor="wpPickerMonth">Month</label>
                      <select
                        id="wpPickerMonth"
                        className="form-select"
                        value={pickerMonth}
                        onChange={(e) => setPickerMonth(Number(e.target.value))}
                      >
                        {MONTH_NAMES.map((name, i) => (
                          <option key={name} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="wp-week-picker-field">
                      <label htmlFor="wpPickerYear">Year</label>
                      <select
                        id="wpPickerYear"
                        className="form-select"
                        value={pickerYear}
                        onChange={(e) => setPickerYear(Number(e.target.value))}
                      >
                        {PICKER_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="wp-week-picker-field">
                    <label htmlFor="wpPickerWeek">Week</label>
                    <select
                      id="wpPickerWeek"
                      className="form-select"
                      value={formatDateISO(currentWeekStart)}
                      onChange={(e) => {
                        const match = pickerWeeks.find((w) => formatDateISO(w.weekStart) === e.target.value);
                        if (match) pickWeek(match.weekStart);
                      }}
                    >
                      <option value="" disabled hidden>
                        Select a week…
                      </option>
                      {pickerWeeks.map((w) => (
                        <option key={formatDateISO(w.weekStart)} value={formatDateISO(w.weekStart)}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="date-nav-btn"
              id="btnNextWeek"
              aria-label={viewMode === 'daily' ? 'Next day' : 'Next week'}
              onClick={() => (viewMode === 'daily' ? shiftDay(1) : shiftWeek(7))}
            >
              <i className="bi bi-chevron-right" />
            </button>
            <span className="week-range-label" id="weekRangeLabel">
              {viewMode === 'daily' ? dailyLabel : formatWeekRangeLabel(currentWeekStart, showWeekends)}
            </span>
          </div>
        </div>

        <div className="wp-toggle-wrap wp-view-toggle" role="group" aria-label="Planner view">
          <button
            type="button"
            className={`date-nav-btn${viewMode === 'weekly' ? ' is-active' : ''}`}
            onClick={() => setViewMode('weekly')}
          >
            <i className="bi bi-calendar-week" /> Weekly
          </button>
          <button
            type="button"
            className={`date-nav-btn${viewMode === 'daily' ? ' is-active' : ''}`}
            onClick={() => setViewMode('daily')}
          >
            <i className="bi bi-calendar-day" /> Daily
          </button>
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
          <button
            type="button"
            className="styled-button styled-button--outline"
            onClick={() => setShowTypesConfigModal(true)}
            title="Manage driver, vendor, user, vehicle types, cost models and adhoc services"
          >
            <i className="bi bi-sliders" /> Types Config
          </button>
          <button
            type="button"
            className="styled-button styled-button--outline"
            onClick={() => setShowAddAdhocModal(true)}
            title="Add an ad-hoc service assignment for a vendor"
          >
            <i className="bi bi-puzzle" /> Add Ad-Hoc
          </button>
          <button
            type="button"
            className="styled-button styled-button--outline"
            onClick={() => setShowAddManagementModal(true)}
            title="Add a Management & Support Team assignment"
          >
            <i className="bi bi-person-badge" /> Add Mgmt/Support
          </button>
          <button
            type="button"
            className="styled-button styled-button--outline"
            onClick={() => setShowDayOffModal(true)}
            title="Register a day off for a vendor"
          >
            <i className="bi bi-person-x" /> Day Off
          </button>
          <button
            type="button"
            className="styled-button styled-button--outline"
            onClick={() => setShowExportModal(true)}
            title="Export the current day or week schedule to Excel"
          >
            <i className="bi bi-file-earmark-spreadsheet" /> Export
          </button>
          <button
            type="button"
            className="styled-button styled-button--outline"
            onClick={generateWeek}
            title="Regenerate week with new random assignments"
          >
            <i className="bi bi-arrow-repeat" /> Generate Week
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

      {/* ============ AVAILABLE DRIVERS DRAWER ============ */}
      <AvailableDrivers
            drivers={availableVendors.map((v) => ({
              id: v.id,
              userId: v.id,
              name: v.name,
              fullName: v.name,
              vehicle: v.vehicle,
              plate: v.plate || '',
              vendorTypeId: v.vendorTypeId || 0,
            }))}
            weekDates={weekDates}
            dayOffEntries={dayOffEntries}
            onVendorDragStart={(userId: number) => {
              dragPayload.current = { type: 'vendor', vendorId: userId };
            }}
            isOpen={isAvailableDriversOpen}
            onToggle={setIsAvailableDriversOpen}
          />

          {/* ============ DEPOT SECTIONS ============ */}
          <div className="wp-depot-group">
          <div id="depotSections" className="wp-depot-list">
            {DEPOTS.map((depot) => {
          const routes = ROUTES_BY_DEPOT.get(depot.id) || [];
          const flexRoutesForDepot = (FLEX_ROUTES_BY_DEPOT.get(depot.id) || []).filter((r) => visibleFlexRouteIds.has(r.id));
          const allRoutes = [...routes, ...flexRoutesForDepot];
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
                      {allRoutes.length} route{allRoutes.length === 1 ? '' : 's'} scheduled
                      {flexRoutesForDepot.length > 0 && ` (${flexRoutesForDepot.length} flex)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="styled-button styled-button--outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlexModalDepotId(depot.id);
                  }}
                  title="Show or hide flex routes for this depot"
                >
                  <i className="bi bi-signpost-split" /> Manage Flex Routes
                  {flexRoutesForDepot.length > 0 && ` (${flexRoutesForDepot.length})`}
                </button>
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

                    {allRoutes.map((route) => (
                      <>
                        <div className="wp-cell-label" title={route.name} key={`label-${route.id}`}>
                          {route.isFlex ? (
                            <span className="wp-cell-label-flex">
                              <span>
                                {route.name}
                                <span className="wp-flex-badge">FLEX</span>
                              </span>
                              <button
                                type="button"
                                className="wp-flex-remove-btn"
                                title="Hide this flex route"
                                onClick={() => hideFlexRoute(route)}
                              >
                                <i className="bi bi-x" />
                              </button>
                            </span>
                          ) : (
                            route.name
                          )}
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
                                    title={rec.notes ? `${rec.name} — Note: ${rec.notes}` : `${rec.name} — click to edit`}
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
                                      <span
                                        className={`wp-sort-flag${rec.routeSort === 'yes' ? ' wp-sort-flag--yes' : ' wp-sort-flag--no'}`}
                                        title={rec.routeSort === 'yes' ? 'Route Sort' : 'No Sort'}
                                      >
                                        {rec.routeSort === 'yes' ? 'Sort' : 'No Sort'}
                                      </span>
                                    </div>
                                    <div className="wp-card-bottom">
                                      <span className="wp-plate">{rec.registrationPlate || '—'}</span>
                                      {rec.notes && (
                                        <span className="wp-card-notes-wrap">
                                          <span className="wp-card-notes-flag" aria-label={`Note: ${rec.notes}`} tabIndex={0}>
                                            !
                                          </span>
                                          <span className="wp-note-dialog" role="tooltip">
                                            {rec.notes}
                                          </span>
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
                <div className="wp-depot-footer">
                  <button
                    type="button"
                    className="styled-button styled-button--outline"
                    onClick={() => setShowAddAdhocModal(true)}
                    title="Add an ad-hoc service assignment for a vendor"
                  >
                    <i className="bi bi-puzzle" /> New Ad-Hoc Service
                  </button>
                </div>
              </div>
            </section>
          );
        })}

          {/* ============ AD-HOC SERVICES SECTION (part of the depot list) ============ */}
          {adhocServiceCatalog.length > 0 && (
            <section className={`wp-depot-section wp-adhoc-section${adhocCollapsed ? ' collapsed' : ''}`}>
              <div className="wp-depot-header" onClick={() => setAdhocCollapsed((prev) => !prev)}>
                <div className="wp-depot-header-left">
                  <button type="button" className="wp-depot-collapse-btn" aria-label="Collapse ad-hoc services">
                    <i className="bi bi-chevron-down" />
                  </button>
                  <div>
                    <h2 className="wp-depot-title">
                      <i className="bi bi-puzzle me-2" />
                      Ad-Hoc Services
                    </h2>
                    <p className="wp-depot-subtitle">
                      {adhocServiceCatalog.length} service{adhocServiceCatalog.length === 1 ? '' : 's'} configured
                    </p>
                  </div>
                </div>
              </div>

              <div className="wp-depot-body">
                <div className="wp-grid-scroll">
                  <div className="wp-grid wp-grid-nosupervisor" style={{ gridTemplateColumns: `160px repeat(${weekDates.length}, minmax(120px, 1fr))` }}>
                    <div className="wp-cell-head wp-head-corner">
                      <span className="wp-day-name">Service</span>
                    </div>
                    {weekDates.map((date) => (
                      <div key={`adhoc-head-${formatDateISO(date)}`} className={`wp-cell-head${isWeekend(date) ? ' is-weekend' : ''}`}>
                        <span className="wp-day-name">{getDayNameShort(date)}</span>
                        <span className="wp-day-date">{formatDateDMY(date)}</span>
                      </div>
                    ))}

                    {adhocServiceCatalog.map((service) => (
                      <>
                        <div className="wp-cell-label" title={service.adhocName} key={`adhoc-label-${service.id}`}>
                          {service.adhocName}
                        </div>
                        {weekDates.map((date) => {
                          const dateISO = formatDateISO(date);
                          const cellRecords = records.filter((r) => r.isAdhoc && r.adhocServiceId === service.id && r.date === dateISO);
                          return (
                            <div
                              key={`adhoc-cell-${service.id}-${dateISO}`}
                              className={`wp-cell-day${isWeekend(date) ? ' is-weekend' : ''}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = dragPayload.current?.type === 'vendor' ? 'copy' : 'move';
                                (e.currentTarget as HTMLElement).classList.add('wp-drop-hover');
                              }}
                              onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('wp-drop-hover')}
                              onDrop={(e) => {
                                e.preventDefault();
                                (e.currentTarget as HTMLElement).classList.remove('wp-drop-hover');
                                handleDropOnAdhocCell(service.id, dateISO);
                              }}
                            >
                              {cellRecords.length === 0 ? (
                                <span className="wp-cell-empty">–</span>
                              ) : (
                                cellRecords.map((rec) => (
                                  <div
                                    key={rec.weekPlannerId}
                                    className={`wp-card${rec.status === 'Day Off' || rec.status === 'OFF' ? ' wp-card--day-off' : ''}`}
                                    draggable
                                    title={rec.notes ? `${rec.name} — Note: ${rec.notes}` : `${rec.name} — click to edit`}
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
                                    </div>
                                    <div className="wp-card-bottom">
                                      <span className="wp-plate">{rec.registrationPlate || '—'}</span>
                                      {rec.notes && (
                                        <span className="wp-card-notes-wrap">
                                          <span className="wp-card-notes-flag" aria-label={`Note: ${rec.notes}`} tabIndex={0}>
                                            !
                                          </span>
                                          <span className="wp-note-dialog" role="tooltip">
                                            {rec.notes}
                                          </span>
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
          )}
          </div>
          </div>

          {/* ============ MANAGEMENT & SUPPORT SECTION ============ */}
          {managementFunctionCatalog.length > 0 && (
            <section className={`wp-depot-section wp-management-section${managementCollapsed ? ' collapsed' : ''}`}>
              <div className="wp-depot-header" onClick={() => setManagementCollapsed((prev) => !prev)}>
                <div className="wp-depot-header-left">
                  <button type="button" className="wp-depot-collapse-btn" aria-label="Collapse management & support">
                    <i className="bi bi-chevron-down" />
                  </button>
                  <div>
                    <h2 className="wp-depot-title">
                      <i className="bi bi-person-badge me-2" />
                      Management &amp; Support
                    </h2>
                    <p className="wp-depot-subtitle">
                      {managementFunctionCatalog.length} function{managementFunctionCatalog.length === 1 ? '' : 's'} configured
                    </p>
                  </div>
                </div>
              </div>

              <div className="wp-depot-body">
                <div className="wp-grid-scroll">
                  <div className="wp-grid wp-grid-nosupervisor" style={{ gridTemplateColumns: `160px repeat(${weekDates.length}, minmax(120px, 1fr))` }}>
                    <div className="wp-cell-head wp-head-corner">
                      <span className="wp-day-name">Function</span>
                    </div>
                    {weekDates.map((date) => (
                      <div key={`mgmt-head-${formatDateISO(date)}`} className={`wp-cell-head${isWeekend(date) ? ' is-weekend' : ''}`}>
                        <span className="wp-day-name">{getDayNameShort(date)}</span>
                        <span className="wp-day-date">{formatDateDMY(date)}</span>
                      </div>
                    ))}

                    {managementFunctionCatalog.map((fn) => (
                      <>
                        <div className="wp-cell-label" title={fn.title} key={`mgmt-label-${fn.id}`}>
                          {fn.title}
                        </div>
                        {weekDates.map((date) => {
                          const dateISO = formatDateISO(date);
                          const cellRecords = records.filter((r) => r.isManagementSupport && r.managementFunctionId === fn.id && r.date === dateISO);
                          return (
                            <div
                              key={`mgmt-cell-${fn.id}-${dateISO}`}
                              className={`wp-cell-day${isWeekend(date) ? ' is-weekend' : ''}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = dragPayload.current?.type === 'vendor' ? 'copy' : 'move';
                                (e.currentTarget as HTMLElement).classList.add('wp-drop-hover');
                              }}
                              onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('wp-drop-hover')}
                              onDrop={(e) => {
                                e.preventDefault();
                                (e.currentTarget as HTMLElement).classList.remove('wp-drop-hover');
                                handleDropOnManagementCell(fn.id, dateISO);
                              }}
                            >
                              {cellRecords.length === 0 ? (
                                <span className="wp-cell-empty">–</span>
                              ) : (
                                cellRecords.map((rec) => (
                                  <div
                                    key={rec.weekPlannerId}
                                    className={`wp-card${rec.status === 'Day Off' || rec.status === 'OFF' ? ' wp-card--day-off' : ''}`}
                                    draggable
                                    title={rec.notes ? `${rec.name} — Note: ${rec.notes}` : `${rec.name} — click to edit`}
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
                                    </div>
                                    {rec.notes && (
                                      <div className="wp-card-bottom">
                                        <span className="wp-card-notes-wrap">
                                          <span className="wp-card-notes-flag" aria-label={`Note: ${rec.notes}`} tabIndex={0}>
                                            !
                                          </span>
                                          <span className="wp-note-dialog" role="tooltip">
                                            {rec.notes}
                                          </span>
                                        </span>
                                      </div>
                                    )}
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
          )}

      {createPortal(
        <>
          {/* ============ Loading screen ============ */}
          <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
            <div className="spinner" />
            <p>Loading week planner…</p>
          </div>

          {/* ============ Assignment edit modal ============ */}
          <div className={`wp-modal-backdrop${editingRecord ? ' sp-modal-backdrop-anim' : ''}`} id="assignmentModalBackdrop" hidden={!editingRecord}>
            {editingRecord && (
              <AssignmentModal
                record={editingRecord}
                depotName={DEPOTS.find((d) => d.id === editingRecord.depotId)?.name || ''}
                showWeekends={showWeekends}
                onClose={() => setEditingRecord(null)}
                onSave={saveAssignmentModal}
                onUnassign={unassignFromModal}
                onAssignWeek={assignWeekFromModal}
                onRemoveWeek={removeWeekFromModal}
              />
            )}
          </div>

          {/* ============ Day Off modal ============ */}
          <div className={`wp-modal-backdrop${showDayOffModal ? ' sp-modal-backdrop-anim' : ''}`} id="dayOffModalBackdrop" hidden={!showDayOffModal}>
            {showDayOffModal && (
              <DayOffModal
                onClose={() => setShowDayOffModal(false)}
                onSave={saveDayOff}
                vendors={VENDOR_POOL.map((v) => ({ id: v.id, name: v.name }))}
                currentDate={currentDay}
              />
            )}
          </div>

          {/* ============ Types Configuration modal ============ */}
          <div className={`wp-modal-backdrop${showTypesConfigModal ? ' sp-modal-backdrop-anim' : ''}`} id="typesConfigModalBackdrop" hidden={!showTypesConfigModal}>
            {showTypesConfigModal && (
              <TypesConfigModal
                onClose={() => setShowTypesConfigModal(false)}
                adhocServices={adhocServiceCatalog}
                onAdhocServicesChange={setAdhocServiceCatalog}
                managementFunctions={managementFunctionCatalog}
                onManagementFunctionsChange={setManagementFunctionCatalog}
              />
            )}
          </div>

          {/* ============ Add Ad-Hoc Service modal ============ */}
          <div className={`wp-modal-backdrop${showAddAdhocModal ? ' sp-modal-backdrop-anim' : ''}`} id="addAdhocModalBackdrop" hidden={!showAddAdhocModal}>
            {showAddAdhocModal && (
              <AddAdhocServiceModal
                onClose={() => setShowAddAdhocModal(false)}
                onSave={saveAdhocService}
                vendors={VENDOR_POOL.map((v) => ({ id: v.id, name: v.name }))}
                services={adhocServiceCatalog}
                weekDates={getWeekDates(currentWeekStart)}
                currentDay={currentDay}
              />
            )}
          </div>

          {/* ============ Add Management & Support modal ============ */}
          <div className={`wp-modal-backdrop${showAddManagementModal ? ' sp-modal-backdrop-anim' : ''}`} id="addManagementModalBackdrop" hidden={!showAddManagementModal}>
            {showAddManagementModal && (
              <AddManagementSupportModal
                onClose={() => setShowAddManagementModal(false)}
                onSave={saveManagementSupport}
                staff={MANAGEMENT_STAFF_POOL}
                functions={managementFunctionCatalog.map((f) => ({ id: f.id, title: f.title }))}
                weekDates={getWeekDates(currentWeekStart)}
                currentDay={currentDay}
              />
            )}
          </div>

          {/* ============ Manage Flex Routes modal ============ */}
          <div className={`wp-modal-backdrop${flexModalDepotId !== null ? ' sp-modal-backdrop-anim' : ''}`} id="flexRouteModalBackdrop" hidden={flexModalDepotId === null}>
            {flexModalDepotId !== null && (
              <FlexRouteModal
                onClose={() => setFlexModalDepotId(null)}
                onApply={(selectedIds) => applyFlexRouteVisibility(flexModalDepotId, selectedIds)}
                depotName={DEPOTS.find((d) => d.id === flexModalDepotId)?.name || ''}
                routes={(FLEX_ROUTES_BY_DEPOT.get(flexModalDepotId) || []).map((r) => ({ id: r.id, name: r.name }))}
                initiallySelected={visibleFlexRouteIds}
              />
            )}
          </div>

          {/* ============ Export Schedule modal ============ */}
          <div className={`wp-modal-backdrop${showExportModal ? ' sp-modal-backdrop-anim' : ''}`} id="exportScheduleModalBackdrop" hidden={!showExportModal}>
            {showExportModal && (
              <ExportScheduleModal
                onClose={() => setShowExportModal(false)}
                onExport={exportSchedule}
                dayLabel={dailyLabel}
                weekLabel={formatWeekRangeLabel(currentWeekStart, showWeekends)}
                defaultIncludeWeekends={showWeekends}
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

          {/* ============ Week notes (Week Planner + export only, floats in a screen corner) ============ */}
          {showWeekNotePanel ? (
            <div className="wp-week-notes-panel" role="complementary" aria-label="Week notes">
              <div className="wp-week-notes-header">
                <span className="wp-week-notes-title">
                  <i className="bi bi-sticky" /> Week notes
                </span>
                <span className="wp-week-notes-range">{formatWeekRangeLabel(currentWeekStart, true)}</span>
                <button
                  type="button"
                  className="wp-week-notes-close"
                  aria-label="Minimize week notes"
                  onClick={() => setShowWeekNotePanel(false)}
                >
                  <i className="bi bi-dash-lg" />
                </button>
              </div>
              <textarea
                className="wp-week-notes-textarea"
                placeholder="General notes for this week (visible only in Week Planner, included in exports)…"
                value={weekNote}
                onChange={(e) => handleWeekNoteChange(e.target.value)}
                rows={4}
              />
            </div>
          ) : (
            <button
              type="button"
              className="wp-week-notes-reopen"
              aria-label="Open week notes"
              title="Week notes"
              onClick={() => setShowWeekNotePanel(true)}
            >
              <i className="bi bi-sticky" />
              {weekNote.trim() !== '' && <span className="wp-week-notes-dot" />}
            </button>
          )}

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

function findFleetVehicleId(record: WPRecord): number {
  const byPlate = VEHICLE_FLEET.find((v) => v.plate === record.registrationPlate);
  if (byPlate) return byPlate.id;
  const byModel = VEHICLE_FLEET.find((v) => v.model === record.vehicle);
  return byModel ? byModel.id : (VEHICLE_FLEET[0]?.id ?? 0);
}

function AssignmentModal({
  record,
  depotName,
  showWeekends,
  onClose,
  onSave,
  onUnassign,
  onAssignWeek,
  onRemoveWeek,
}: {
  record: WPRecord;
  depotName: string;
  showWeekends: boolean;
  onClose: () => void;
  onSave: (vendorId: number, vehicleId: number, routeSort: 'yes' | 'no', status: string, notes: string) => void;
  onUnassign: () => void;
  onAssignWeek: (vendorId: number, vehicleId: number, routeSort: 'yes' | 'no', notes: string) => void;
  onRemoveWeek: () => void;
}) {
  const [vendorId, setVendorId] = useState(record.vendorId);
  const [vehicleId, setVehicleId] = useState(() => findFleetVehicleId(record));
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
          onSave(vendorId, vehicleId, routeSort, status, notes);
        }}
      >
        <div className="wp-modal-meta" id="assignmentModalMeta">
          <i className="bi bi-geo-alt" /> {depotName} · <i className="bi bi-signpost-2" /> {record.route} · <i className="bi bi-calendar3" /> {record.date}
        </div>
        <div className="dom-form-grid">
          <div className="dom-form-field span-2">
            <label className="dom-form-label" htmlFor="fieldVendorName">
              {record.isManagementSupport ? 'Staff Member' : 'Vendor'}
            </label>
            <select id="fieldVendorName" className="form-select" value={vendorId} onChange={(e) => setVendorId(Number(e.target.value))}>
              {personPoolFor(record).map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          {!record.isManagementSupport && (
            <div className="dom-form-field span-2">
              <label className="dom-form-label" htmlFor="fieldVehicle">
                Vehicle
              </label>
              <select id="fieldVehicle" className="form-select" value={vehicleId} onChange={(e) => setVehicleId(Number(e.target.value))}>
                {VEHICLE_FLEET.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.model} — {v.plate}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!record.isSupervisor && !record.isAdhoc && !record.isManagementSupport && (
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
        <div className="wp-modal-actions-wrap">
          <button
            type="button"
            className="styled-button styled-button--primary"
            title="Assign this vendor and vehicle to this route for every day of the week"
            onClick={() => onAssignWeek(vendorId, vehicleId, routeSort, notes)}
          >
            <i className="bi bi-calendar-range" /> Assign Week{!showWeekends ? ' (Mon–Fri)' : ''}
          </button>
          <button type="button" className="styled-button styled-button--warning" id="btnUnassign" onClick={onUnassign}>
            <i className="bi bi-calendar-x" /> Remove Day
          </button>
          <button
            type="button"
            className="styled-button styled-button--danger"
            onClick={() => {
              if (window.confirm(`Remove ${record.name} from ${record.route} for the entire week? This cannot be undone.`)) onRemoveWeek();
            }}
          >
            <i className="bi bi-calendar2-x" /> Remove Week
          </button>
          <button type="button" className="styled-button styled-button--outline" id="btnCancelAssignment" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="styled-button styled-button--primary" id="btnSaveAssignment">
            Save
          </button>
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
