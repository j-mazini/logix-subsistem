/**
 * TraceQueryCaseService — source of truth for DHL case resolution (Trace &
 * Queries → "DHL Cases" tab).
 *
 * Unlike duplicateStopReviewService.ts (a single review decision layered
 * over a regenerated report list), a case accumulates real state over time —
 * assignment, an append-only update timeline, closure, feedback, PDF
 * marker — that three independent surfaces must read identically: the admin
 * page, the driver's My Cases page, and AnnouncementsContext (rendered on
 * every route). So this follows workforceService.ts's shape instead: a
 * deterministic seeded base list with full-object overrides layered on top,
 * localStorage-backed, subscribe/getSnapshot for useSyncExternalStore,
 * cross-tab sync via the storage event.
 */

import { MOCK_DRIVERS, type MockDriver } from '../data/mockDrivers';
import { MOCK_DRIVER_USER } from '../app/(private)/mockAuth';
import type {
  TraceQueryCase,
  TraceQueryCaseOutcome,
  TraceQueryCaseType,
  TraceQueryUpdateEntry,
} from '../pages/TraceQueries/types';

/**
 * MOCK_DRIVERS (userId 1-12) and the driver shell's single mock session
 * (MOCK_DRIVER_USER, id 101 "Sam Carter") are disjoint identity spaces
 * elsewhere in this project. Cases need to be linkable to whichever driver
 * is actually logged into the driver shell, so the seed generator (and the
 * admin table's driver filter) draw from this list instead of raw MOCK_DRIVERS.
 */
export const ASSIGNABLE_DRIVERS: MockDriver[] = [
  { userId: MOCK_DRIVER_USER.id, fullName: MOCK_DRIVER_USER.fullName },
  ...MOCK_DRIVERS,
];

export interface TraceQueryLiquidationDeductionEntry {
  backendId: number;
  refNumber: string;
  caseId: string;
  driverUserId: number;
  driverName: string;
  amount: number;
  incidentDate: string;
  packageId: string;
  note: string;
  createdAt: string;
}

type Listener = () => void;

interface Snapshot {
  version: number;
  cases: TraceQueryCase[];
  deductions: TraceQueryLiquidationDeductionEntry[];
}

const listeners = new Set<Listener>();

let baseCases: TraceQueryCase[] = [];
const overrides = new Map<string, TraceQueryCase>();
const deductions: TraceQueryLiquidationDeductionEntry[] = [];

let snapshot: Snapshot = { version: 0, cases: [], deductions: [] };
let seeded = false;
let nextBackendId = 1;

const STORAGE_KEY = 'dhl_trace_query_cases';
const STORAGE_SCHEMA = 1;

interface PersistedCases {
  schema: number;
  overrides: TraceQueryCase[];
  deductions: TraceQueryLiquidationDeductionEntry[];
}

/* ==================== Deterministic PRNG (same scheme as TraceQueries/Deductions/RouteBalance) ==================== */

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

/* ==================== Seed data ==================== */

const STREETS = [
  '14 Baker Street', '22 Oxford Road', '7 Kings Avenue', '101 Mill Lane', '56 Church Street',
  '8 Victoria Road', '19 Park Lane', '33 Station Road', '5 High Street', '48 Elm Grove',
];
/** Same convention as DeductionsDisbursementsRecharges's ROUTE_NAMES — an independent mock pool, not shared state. */
const ROUTE_NAMES = ['LON-01', 'LON-02', 'LON-03', 'MAN-01', 'MAN-02', 'BIR-01'];
const POSTCODES = ['SW1A 1AA', 'E1 6AN', 'NW1 2DB', 'SE1 9SG', 'W1D 3QU', 'EC1A 1BB', 'N1 9GU', 'SW3 5BS'];
const CUSTOMERS = [
  'Amelia Clarke', 'Oliver Bennett', 'Isla Robertson', 'Noah Campbell', 'Freya Mitchell',
  'Harry Ellison', 'Lily Sinclair', 'Jack Whitfield', 'Poppy Hendricks', 'Leo Fairweather',
];
const CASE_TYPES: TraceQueryCaseType[] = ['wrong_delivery_location', 'missing_parcel', 'damaged_parcel', 'delivery_not_attempted', 'other'];
const DHL_DESCRIPTIONS: Record<TraceQueryCaseType, string[]> = {
  wrong_delivery_location: [
    'Customer reports the parcel was left at a neighbouring address, not their own.',
    'GPS drop location does not match the customer’s registered address.',
  ],
  missing_parcel: [
    'Parcel scanned as delivered but customer says nothing arrived.',
    'Customer disputes delivery — no parcel found on premises.',
  ],
  damaged_parcel: [
    'Customer reports the parcel arrived crushed and contents damaged.',
    'Photo evidence from customer shows a torn/opened parcel on arrival.',
  ],
  delivery_not_attempted: [
    'Tracking shows "delivered" but no attempt was logged by the depot.',
    'Customer was home all day; no card left, no knock, no scan event.',
  ],
  other: [
    'Customer raised a general service complaint tied to this delivery.',
    'Recipient disputes the delivery instructions that were followed.',
  ],
};
const ADMIN_ASSIGN_NOTES = [
  'Please investigate and report back with evidence.',
  'DHL is chasing this one — priority.',
  'Check with the customer directly if needed.',
];
const DRIVER_CLOSING_NOTES_RESOLVED = [
  'Went back to the address, found the parcel with the neighbour, redelivered to the customer directly. Confirmed happy.',
  'Spoke to the customer — parcel was actually received, they missed the porch delivery note. Confirmed resolved.',
  'Located the parcel at the depot, redelivered same day with signature.',
];
const DRIVER_CLOSING_NOTES_NOT_RESOLVED = [
  'Parcel cannot be located. Checked with depot and neighbours, no trace. Recommend write-off.',
  'Customer confirms parcel never arrived and address was correct — scan was made in error.',
  'Returned to the address twice, no one available and no safe place. Unable to resolve within the window.',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildSeedCases(): TraceQueryCase[] {
  const rng = rngForSeed('trace-query-cases');
  const cases: TraceQueryCase[] = [];
  const now = new Date();
  const total = 26;

  for (let i = 0; i < total; i++) {
    const caseType = pick(rng, CASE_TYPES);
    const dhlDaysAgo = 1 + Math.floor(rng() * 20);
    const dhlReportedAt = new Date(now.getTime() - dhlDaysAgo * 86400000 - Math.floor(rng() * 12) * 3600000);

    const caseValue = Math.round((25 + rng() * 475) * 100) / 100;
    const packageId = `PKG${100000 + Math.floor(rng() * 899999)}`;

    // The driver and route are the delivery record this case is actually
    // about — known the moment DHL reports the incident, not a choice the
    // admin makes later. "new" only gates whether the driver can see it yet.
    const driver = pick(rng, ASSIGNABLE_DRIVERS);
    const routeName = pick(rng, ROUTE_NAMES);

    const roll = rng();
    const traceCase: TraceQueryCase = {
      id: `TQC-${String(i + 1).padStart(4, '0')}`,
      caseType,
      dhlDescription: pick(rng, DHL_DESCRIPTIONS[caseType]),
      packageId,
      stopAddress: pick(rng, STREETS),
      postcode: pick(rng, POSTCODES),
      customer: pick(rng, CUSTOMERS),
      caseValue,
      dhlReportedAt: toIso(dhlReportedAt),
      status: 'new',
      routeName,
      driverUserId: driver.userId,
      driverName: driver.fullName,
      updates: [],
    };

    if (roll < 0.28) {
      // stays 'new' — not yet reviewed/sent to the linked driver
      cases.push(traceCase);
      continue;
    }

    // Spread assignment ages across the 72h window: some fresh, some
    // urgent (<24h left), some already overdue — so the deadline UI and
    // notification bell have something to show on first load.
    const hoursAgoOptions = [4, 10, 20, 30, 50, 60, 68, 76, 90];
    const assignedHoursAgo = pick(rng, hoursAgoOptions);
    const assignedAt = new Date(now.getTime() - assignedHoursAgo * 3600000);
    const assignmentNote = pick(rng, ADMIN_ASSIGN_NOTES);

    traceCase.status = 'assigned';
    traceCase.assignedAt = toIso(assignedAt);
    traceCase.assignmentNote = assignmentNote;
    traceCase.updates = [{
      id: `${traceCase.id}-U1`,
      authorType: 'admin',
      authorName: 'Admin',
      note: assignmentNote,
      photos: [],
      createdAt: toIso(assignedAt),
    }];

    if (roll < 0.62) {
      // stays 'assigned' — driver hasn't submitted a resolution yet
      cases.push(traceCase);
      continue;
    }

    // closed — driver has submitted a resolution
    const resolved = rng() < 0.55;
    const outcome: TraceQueryCaseOutcome = resolved ? 'resolved' : 'not_resolved';
    const closedAt = new Date(assignedAt.getTime() + (2 + Math.floor(rng() * 40)) * 3600000);
    const closingNote = resolved ? pick(rng, DRIVER_CLOSING_NOTES_RESOLVED) : pick(rng, DRIVER_CLOSING_NOTES_NOT_RESOLVED);

    traceCase.status = 'closed';
    traceCase.closedAt = toIso(closedAt);
    traceCase.outcome = outcome;
    traceCase.updates.push({
      id: `${traceCase.id}-U2`,
      authorType: 'driver',
      authorName: driver.fullName,
      note: closingNote,
      photos: [],
      createdAt: toIso(closedAt),
      outcome,
    });

    if (outcome === 'not_resolved') {
      const entry = buildLiquidationEntry(traceCase, closingNote, closedAt);
      deductions.push(entry);
      traceCase.deductionRefNumber = entry.refNumber;
    }

    if (roll < 0.85) {
      // closed, awaiting admin feedback + PDF
      cases.push(traceCase);
      continue;
    }

    // fully wrapped up — feedback already given, PDF already generated
    const feedbackAt = new Date(closedAt.getTime() + (1 + Math.floor(rng() * 20)) * 3600000);
    traceCase.feedback = resolved
      ? 'Confirmed resolved with the driver — parcel reached the customer. Closing the case with DHL.'
      : 'Unable to recover the parcel within the resolution window. Liquidation damage applied; closing the case with DHL.';
    traceCase.feedbackAt = toIso(feedbackAt);
    traceCase.pdfGeneratedAt = toIso(new Date(feedbackAt.getTime() + 3600000));

    cases.push(traceCase);
  }

  return cases.sort((a, b) => (a.dhlReportedAt < b.dhlReportedAt ? 1 : -1));
}

/* ==================== Persistence ==================== */

function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as PersistedCases | null;
    if (!parsed || parsed.schema !== STORAGE_SCHEMA) return;

    overrides.clear();
    for (const c of parsed.overrides ?? []) overrides.set(c.id, c);

    deductions.length = 0;
    deductions.push(...(parsed.deductions ?? []));
    nextBackendId = deductions.reduce((max, d) => Math.max(max, d.backendId + 1), 1);
  } catch {
    // Storage disabled, private mode, or corrupted content: start from seed.
    // Losing local case decisions is bad, crashing the page is worse.
  }
}

function persist(): void {
  try {
    if (!overrides.size && !deductions.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload: PersistedCases = {
      schema: STORAGE_SCHEMA,
      overrides: Array.from(overrides.values()),
      deductions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota full or storage unavailable: session continues in memory only.
  }
}

function effectiveCases(): TraceQueryCase[] {
  return baseCases.map((c) => overrides.get(c.id) ?? c);
}

function rebuild(): void {
  snapshot = { version: snapshot.version + 1, cases: effectiveCases(), deductions: [...deductions] };
  listeners.forEach((listener) => listener());
}

function commit(): void {
  persist();
  rebuild();
}

function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  baseCases = buildSeedCases();
  // Seed-generated 'closed'/'not_resolved' deductions above were pushed
  // straight into `deductions` before any persisted overrides existed;
  // loadPersisted() below replaces that array wholesale if a prior session
  // already saved its own (which also captures every seed-time deduction,
  // since persist() always dumps the full array).
  const seedDeductions = [...deductions];
  loadPersisted();
  if (deductions.length === 0) deductions.push(...seedDeductions);
  snapshot = { version: 1, cases: effectiveCases(), deductions: [...deductions] };
}

function handleExternalWrite(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  loadPersisted();
  rebuild();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleExternalWrite);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Snapshot {
  ensureSeeded();
  return snapshot;
}

/* ==================== Reads ==================== */

export function getCases(): TraceQueryCase[] {
  return getSnapshot().cases;
}

export function getCaseById(id: string): TraceQueryCase | undefined {
  return getSnapshot().cases.find((c) => c.id === id);
}

/**
 * A driver's own case list — excludes 'new' even though the case is already
 * linked to them, because the admin hasn't reviewed/sent it yet. That review
 * step is the control gate, not the driver link itself.
 */
export function getCasesForDriver(driverUserId: number): TraceQueryCase[] {
  return getSnapshot().cases.filter((c) => c.driverUserId === driverUserId && c.status !== 'new');
}

export function getLiquidationDeductions(): TraceQueryLiquidationDeductionEntry[] {
  return getSnapshot().deductions;
}

/* ==================== Writes ==================== */

function buildRefNumber(driverName: string, date: Date): string {
  const nameParts = driverName.trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? (nameParts[0].charAt(0) + nameParts.slice(1).join('')).toUpperCase().replace(/\s/g, '')
    : driverName.toUpperCase().replace(/\s/g, '');

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const prefix = `LQD-${initials}-${day}${month}${year}`;

  const matchingSeqs = deductions
    .filter((d) => d.refNumber.startsWith(prefix))
    .map((d) => Number.parseInt(d.refNumber.split('-').pop() || '', 10))
    .filter((n) => Number.isFinite(n));
  const seq = (matchingSeqs.length ? Math.max(...matchingSeqs) : 0) + 1;

  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

function buildLiquidationEntry(c: TraceQueryCase, note: string, closedAt: Date): TraceQueryLiquidationDeductionEntry {
  return {
    backendId: nextBackendId++,
    refNumber: buildRefNumber(c.driverName, closedAt),
    caseId: c.id,
    driverUserId: c.driverUserId,
    driverName: c.driverName,
    amount: c.caseValue,
    incidentDate: closedAt.toISOString().slice(0, 10),
    packageId: c.packageId,
    note,
    createdAt: closedAt.toISOString(),
  };
}

function requireCase(caseId: string): TraceQueryCase {
  const found = effectiveCases().find((c) => c.id === caseId);
  if (!found) throw new Error(`Trace query case not found: ${caseId}`);
  return found;
}

function saveCase(next: TraceQueryCase): TraceQueryCase {
  overrides.set(next.id, next);
  commit();
  return next;
}

/**
 * Admin reviews a 'new' DHL case and sends it to the driver already linked
 * to that delivery's route — there's nothing to pick, the case names its
 * driver from creation (see buildSeedCases). This just opens the 3-day
 * resolution window and makes the case visible on the driver's My Cases page.
 */
export function sendToDriver(caseId: string, note: string): TraceQueryCase {
  ensureSeeded();
  const current = requireCase(caseId);

  const now = new Date();
  const entry: TraceQueryUpdateEntry = {
    id: `${current.id}-U${current.updates.length + 1}`,
    authorType: 'admin',
    authorName: 'Admin',
    note,
    photos: [],
    createdAt: now.toISOString(),
  };

  return saveCase({
    ...current,
    status: 'assigned',
    assignedAt: now.toISOString(),
    assignmentNote: note,
    updates: [...current.updates, entry],
  });
}

/**
 * Driver submits their resolution — notes, photo evidence, and a mandatory
 * Resolved/Not Resolved outcome. This is the only way a case closes: there
 * is no separate "add a note without closing" action.
 */
export function submitDriverResolution(
  caseId: string,
  input: { note: string; photos: string[]; outcome: TraceQueryCaseOutcome },
): TraceQueryCase {
  ensureSeeded();
  const current = requireCase(caseId);
  const now = new Date();

  const entry: TraceQueryUpdateEntry = {
    id: `${current.id}-U${current.updates.length + 1}`,
    authorType: 'driver',
    authorName: current.driverName,
    note: input.note,
    photos: input.photos,
    createdAt: now.toISOString(),
    outcome: input.outcome,
  };

  const next: TraceQueryCase = {
    ...current,
    status: 'closed',
    closedAt: now.toISOString(),
    outcome: input.outcome,
    updates: [...current.updates, entry],
  };

  if (input.outcome === 'not_resolved') {
    const deductionEntry = buildLiquidationEntry(next, input.note, now);
    deductions.push(deductionEntry);
    next.deductionRefNumber = deductionEntry.refNumber;
  }

  return saveCase(next);
}

/** Admin's closing feedback for DHL — recorded after the case is closed. */
export function submitAdminFeedback(caseId: string, feedback: string): TraceQueryCase {
  ensureSeeded();
  const current = requireCase(caseId);
  return saveCase({
    ...current,
    feedback,
    feedbackAt: new Date().toISOString(),
  });
}

export function markPdfGenerated(caseId: string): TraceQueryCase {
  ensureSeeded();
  const current = requireCase(caseId);
  return saveCase({
    ...current,
    pdfGeneratedAt: new Date().toISOString(),
  });
}
