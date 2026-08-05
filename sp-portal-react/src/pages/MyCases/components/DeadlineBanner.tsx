import { formatHoursRemaining, type CaseDeadlineEntry } from "../../TraceQueries/utils/caseDeadlineAlerts";

/** Urgent/overdue banner for this driver's own cases — the driver has no notification bell, so this is the only surface for the 3-day SLA. */
export function DeadlineBanner({ entries }: { entries: CaseDeadlineEntry[] }) {
  if (entries.length === 0) return null;

  const overdue = entries.filter((e) => e.hoursRemaining < 0);
  const urgent = entries.filter((e) => e.hoursRemaining >= 0);
  const hasOverdue = overdue.length > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 mb-4 ${
        hasOverdue ? "border-red-200/70 bg-gradient-to-br from-red-50 via-rose-50 to-amber-50 text-red-900" : "border-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 text-amber-900"
      }`}
    >
      <div className="flex items-center gap-2.5 font-semibold text-sm">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${hasOverdue ? "bg-red-500/15" : "bg-amber-500/15"}`}>
          <i className={`bi bi-hourglass-split ${hasOverdue ? "animate-pulse" : ""}`} aria-hidden="true" />
        </span>
        {overdue.length > 0 && `${overdue.length} case${overdue.length === 1 ? "" : "s"} overdue`}
        {overdue.length > 0 && urgent.length > 0 && ", "}
        {urgent.length > 0 && `${urgent.length} due within 24h`}
      </div>
      <ul className="mt-2.5 space-y-1.5 text-xs">
        {entries.map((e) => (
          <li key={e.caseId} className="flex items-center justify-between gap-2 rounded-lg bg-white/50 px-2.5 py-1.5">
            <span className="font-medium">{e.caseId} &middot; {e.packageId}</span>
            <span className={`font-bold tabular-nums ${e.hoursRemaining < 0 ? "text-red-700" : "text-amber-800"}`}>
              {formatHoursRemaining(e.hoursRemaining)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
