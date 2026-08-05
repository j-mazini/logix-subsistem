import { useState } from "react";
import { CASE_TYPE_LABEL, type TraceQueryCase, type TraceQueryCaseOutcome } from "../../TraceQueries/types";
import { CASE_TYPE_STYLE } from "../../TraceQueries/caseTypeStyle";
import { formatHoursRemaining, getCaseDeadline } from "../../TraceQueries/utils/caseDeadlineAlerts";
import { CaseUpdateForm } from "./CaseUpdateForm";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function DeadlineTag({ c }: { c: TraceQueryCase }) {
  const deadline = getCaseDeadline(c);
  if (!deadline) return null;
  const hoursRemaining = Math.round((deadline.getTime() - Date.now()) / 3600000);
  const overdue = hoursRemaining < 0;
  const urgent = !overdue && hoursRemaining <= 24;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        overdue ? "bg-red-100 text-red-700" : urgent ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
      }`}
    >
      <i className={`bi bi-hourglass-split ${overdue ? "animate-pulse" : ""}`} aria-hidden="true" /> {formatHoursRemaining(hoursRemaining)}
    </span>
  );
}

const OUTCOME_LABEL: Record<TraceQueryCaseOutcome, string> = { resolved: "Resolved", not_resolved: "Not Resolved" };

interface CaseCardProps {
  c: TraceQueryCase;
  submitting: boolean;
  onSubmitResolution: (caseId: string, input: { note: string; photos: string[]; outcome: TraceQueryCaseOutcome }) => void;
}

export function CaseCard({ c, submitting, onSubmitResolution }: CaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = c.status === "assigned";
  const typeStyle = CASE_TYPE_STYLE[c.caseType];

  return (
    <div
      className="liquid-glass-surface rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
      style={{ borderLeft: `3px solid ${typeStyle.color}` }}
    >
      <button
        type="button"
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: typeStyle.bg, color: typeStyle.color }}
        >
          <i className={`bi ${typeStyle.icon} text-base`} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">{c.id}</span>
            <span
              className="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
              style={{ background: typeStyle.bg, color: typeStyle.color }}
            >
              {CASE_TYPE_LABEL[c.caseType]}
            </span>
            {isOpen && <DeadlineTag c={c} />}
            {c.status === "closed" && c.outcome && (
              <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${c.outcome === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {OUTCOME_LABEL[c.outcome]}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600 truncate">{c.packageId} &middot; {c.customer} &middot; {c.stopAddress}</p>
        </div>
        <i className={`bi bi-chevron-down text-slate-400 mt-1.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div className="border-t border-white/40 px-4 py-3 space-y-3">
          <p className="text-sm text-slate-700">{c.dhlDescription}</p>

          {c.updates.length > 0 && (
            <div className="relative space-y-3 pl-7 before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-indigo-300/70 before:to-transparent">
              {c.updates.map((entry) => (
                <div key={entry.id} className="relative">
                  <span
                    className={`absolute left-[-28px] top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white shadow ${
                      entry.authorType === "driver" ? "bg-gradient-to-br from-sky-500 to-sky-700" : "bg-gradient-to-br from-indigo-500 to-indigo-700"
                    }`}
                  >
                    <i className={`bi ${entry.authorType === "driver" ? "bi-person-badge" : "bi-person-workspace"}`} aria-hidden="true" />
                  </span>
                  <div className="rounded-lg bg-white/70 border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{entry.authorName}</span>
                      <span>{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{entry.note}</p>
                    {entry.photos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entry.photos.map((photo, i) => (
                          <img
                            key={i} src={photo} alt={`Evidence ${i + 1}`}
                            className="h-14 w-14 rounded-md object-cover border border-slate-200 transition-transform hover:scale-105"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isOpen && (
            <CaseUpdateForm
              submitting={submitting}
              onSubmit={(input) => onSubmitResolution(c.id, input)}
            />
          )}
        </div>
      )}
    </div>
  );
}
