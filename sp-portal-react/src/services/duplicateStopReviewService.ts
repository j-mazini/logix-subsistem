/**
 * DuplicateStopReviewService — bridges the Trace & Queries duplicate-stop
 * review flow into the Deductions page.
 *
 * Trace & Queries regenerates its report list from a deterministic mock
 * seed on every load (same convention as the rest of this project's admin
 * pages), so a report's review decision can't live on the report object
 * itself — it would vanish on reload. This service persists just the
 * decision (keyed by report id) and, for confirmed reports, the resulting
 * deduction entry that the Deductions page reads and displays under its own
 * "Duplicate Stop" category.
 *
 * Same shape as workforceService.ts: localStorage-backed, single rebuilt
 * snapshot, subscribe/getSnapshot for useSyncExternalStore, cross-tab sync
 * via the storage event.
 */

import type { DuplicateStopReport } from '../pages/TraceQueries/types';

export type ReviewStatus = 'approved' | 'reproved';

export interface ReviewOverride {
  status: ReviewStatus;
  note: string;
  reviewedAt: string;
  deductionRefNumber?: string;
}

export interface DuplicateStopDeductionEntry {
  backendId: number;
  refNumber: string;
  reportId: string;
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
  overrides: Map<string, ReviewOverride>;
  deductions: DuplicateStopDeductionEntry[];
}

const listeners = new Set<Listener>();

const overrides = new Map<string, ReviewOverride>();
const deductions: DuplicateStopDeductionEntry[] = [];

let snapshot: Snapshot = { version: 0, overrides, deductions };
let seeded = false;
let nextBackendId = 1;

const STORAGE_KEY = 'dhl_trace_queries_reviews';
const STORAGE_SCHEMA = 1;

interface PersistedReviews {
  schema: number;
  overrides: [string, ReviewOverride][];
  deductions: DuplicateStopDeductionEntry[];
}

function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as PersistedReviews | null;
    if (!parsed || parsed.schema !== STORAGE_SCHEMA) return;

    overrides.clear();
    for (const [id, override] of parsed.overrides ?? []) overrides.set(id, override);

    deductions.length = 0;
    deductions.push(...(parsed.deductions ?? []));
    nextBackendId = deductions.reduce((max, d) => Math.max(max, d.backendId + 1), 1);
  } catch {
    // Storage disabled, private mode, or corrupted content: start empty.
    // Losing local review decisions is bad, crashing the page is worse.
  }
}

function persist(): void {
  try {
    if (!overrides.size && !deductions.length) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload: PersistedReviews = {
      schema: STORAGE_SCHEMA,
      overrides: Array.from(overrides.entries()),
      deductions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota full or storage unavailable: session continues in memory only.
  }
}

function rebuild(): void {
  snapshot = { version: snapshot.version + 1, overrides, deductions: [...deductions] };
  listeners.forEach((listener) => listener());
}

function commit(): void {
  persist();
  rebuild();
}

function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  loadPersisted();
  snapshot = { version: 1, overrides, deductions: [...deductions] };
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

// ------------------------------------------------------------- reads

export function getReviewOverride(reportId: string): ReviewOverride | undefined {
  return getSnapshot().overrides.get(reportId);
}

export function getDuplicateStopDeductions(): DuplicateStopDeductionEntry[] {
  return getSnapshot().deductions;
}

// ------------------------------------------------------------- writes

function buildRefNumber(driverName: string, date: Date): string {
  const nameParts = driverName.trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? (nameParts[0].charAt(0) + nameParts.slice(1).join('')).toUpperCase().replace(/\s/g, '')
    : driverName.toUpperCase().replace(/\s/g, '');

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const prefix = `DUP-${initials}-${day}${month}${year}`;

  const matchingSeqs = deductions
    .filter((d) => d.refNumber.startsWith(prefix))
    .map((d) => Number.parseInt(d.refNumber.split('-').pop() || '', 10))
    .filter((n) => Number.isFinite(n));
  const seq = (matchingSeqs.length ? Math.max(...matchingSeqs) : 0) + 1;

  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

/** Admin approves the report as a genuine duplicate — generates the deduction. */
export function approve(report: DuplicateStopReport, amount: number, note: string): DuplicateStopDeductionEntry {
  ensureSeeded();

  const now = new Date();
  const entry: DuplicateStopDeductionEntry = {
    backendId: nextBackendId++,
    refNumber: buildRefNumber(report.driverName, now),
    reportId: report.id,
    driverUserId: report.driverUserId,
    driverName: report.driverName,
    amount,
    incidentDate: report.firstScan.timestamp.slice(0, 10),
    packageId: report.packageId,
    note,
    createdAt: now.toISOString(),
  };

  deductions.push(entry);
  overrides.set(report.id, {
    status: 'approved',
    note,
    reviewedAt: now.toISOString(),
    deductionRefNumber: entry.refNumber,
  });
  commit();
  return entry;
}

/** Admin reproves the report — no deduction, just the decision on record. */
export function reprove(report: DuplicateStopReport, note: string): void {
  ensureSeeded();
  overrides.set(report.id, {
    status: 'reproved',
    note,
    reviewedAt: new Date().toISOString(),
  });
  commit();
}
