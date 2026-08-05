import type { TraceQueryCase, TraceQueryCaseType } from '../types';

/**
 * Resolution window: 3 days from when the admin assigns a case to a driver.
 * Modeled on Compliance's expirationUtils.ts (entries + counts, worst-first)
 * but at hour granularity, since 72h is a much shorter horizon than that
 * file's 30/60-day one.
 */
const RESOLUTION_WINDOW_HOURS = 72;
const URGENT_THRESHOLD_HOURS = 24;

export type CaseDeadlineTone = 'ok' | 'urgent' | 'overdue';

export interface CaseDeadlineEntry {
  caseId: string;
  caseType: TraceQueryCaseType;
  driverUserId: number;
  driverName: string;
  packageId: string;
  deadline: string;
  /** Hours until the deadline. Negative = overdue by that many hours. */
  hoursRemaining: number;
  tone: CaseDeadlineTone;
}

/** assignedAt + 72h. Only meaningful while the case is still 'assigned' — a closed case has no live deadline. */
export function getCaseDeadline(c: TraceQueryCase): Date | null {
  if (c.status !== 'assigned' || !c.assignedAt) return null;
  return new Date(new Date(c.assignedAt).getTime() + RESOLUTION_WINDOW_HOURS * 3600000);
}

function toneFor(hoursRemaining: number): CaseDeadlineTone {
  if (hoursRemaining < 0) return 'overdue';
  if (hoursRemaining <= URGENT_THRESHOLD_HOURS) return 'urgent';
  return 'ok';
}

/**
 * One entry per still-open case with a live deadline, worst-first (most
 * overdue, then soonest due). Cases with plenty of time left are excluded —
 * this feeds notification surfaces, not a full case list.
 */
export function getCaseDeadlineEntries(cases: TraceQueryCase[], now: Date = new Date()): CaseDeadlineEntry[] {
  const entries: CaseDeadlineEntry[] = [];

  for (const c of cases) {
    const deadline = getCaseDeadline(c);
    if (!deadline) continue;

    const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / 3600000);
    const tone = toneFor(hoursRemaining);
    if (tone === 'ok') continue;

    entries.push({
      caseId: c.id,
      caseType: c.caseType,
      driverUserId: c.driverUserId,
      driverName: c.driverName,
      packageId: c.packageId,
      deadline: deadline.toISOString(),
      hoursRemaining,
      tone,
    });
  }

  return entries.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

export interface CaseDeadlineAlerts {
  entries: CaseDeadlineEntry[];
  overdueCount: number;
  urgentCount: number;
  totalCount: number;
}

export function getCaseDeadlineAlerts(cases: TraceQueryCase[], now: Date = new Date()): CaseDeadlineAlerts {
  const entries = getCaseDeadlineEntries(cases, now);
  const overdueCount = entries.filter((e) => e.tone === 'overdue').length;
  const urgentCount = entries.filter((e) => e.tone === 'urgent').length;
  return { entries, overdueCount, urgentCount, totalCount: entries.length };
}

export function formatHoursRemaining(hoursRemaining: number): string {
  if (hoursRemaining < 0) {
    const overdueBy = Math.abs(hoursRemaining);
    if (overdueBy < 24) return `Overdue by ${overdueBy}h`;
    return `Overdue by ${Math.floor(overdueBy / 24)}d`;
  }
  if (hoursRemaining === 0) return 'Due now';
  if (hoursRemaining < 24) return `${hoursRemaining}h left`;
  return `${Math.floor(hoursRemaining / 24)}d left`;
}
