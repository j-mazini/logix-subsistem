import { useMemo, useState, useSyncExternalStore } from "react";
import { StandardPageLayout, PageContent, PageHeroCard } from "@/app/(private)/components";
import { getUserIdFromToken } from "@/app/(private)/mockAuth";
import {
  subscribe,
  getSnapshot,
  submitDriverResolution,
} from "@/services/traceQueryCaseService";
import type { TraceQueryCaseOutcome } from "../TraceQueries/types";
import { getCaseDeadlineEntries } from "../TraceQueries/utils/caseDeadlineAlerts";
import { DeadlineBanner } from "./components/DeadlineBanner";
import { CaseCard } from "./components/CaseCard";

/**
 * Driver's view of Trace & Queries cases assigned to them — investigate,
 * attach evidence, and close the case with a Resolved/Not Resolved outcome.
 * Ported as its own nav page (not a Requests tab): this is case resolution
 * work, not a personal request to the SP.
 */
export default function MyCasesPage() {
  const store = useSyncExternalStore(subscribe, getSnapshot);
  const driverId = getUserIdFromToken();
  const [submittingCaseId, setSubmittingCaseId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Excludes 'new': the case is already linked to this driver (see
  // traceQueryCaseService's buildSeedCases), but it isn't visible to them
  // until the admin has reviewed it and sent it on — same gate as
  // getCasesForDriver in the service.
  const myCases = useMemo(
    () => store.cases.filter((c) => c.driverUserId === driverId && c.status !== "new"),
    [store, driverId],
  );

  const openCases = useMemo(() => myCases.filter((c) => c.status === "assigned"), [myCases]);
  const closedCases = useMemo(
    () => myCases.filter((c) => c.status === "closed").sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? "")),
    [myCases],
  );

  const deadlineEntries = useMemo(
    () => getCaseDeadlineEntries(myCases),
    [myCases],
  );

  const handleSubmitResolution = (caseId: string, input: { note: string; photos: string[]; outcome: TraceQueryCaseOutcome }) => {
    setSubmittingCaseId(caseId);
    try {
      submitDriverResolution(caseId, input);
      setStatus({
        type: "success",
        message: input.outcome === "resolved" ? "Case closed as resolved." : "Case closed as not resolved.",
      });
    } catch {
      setStatus({ type: "error", message: "Could not submit the resolution. Please try again." });
    } finally {
      setSubmittingCaseId(null);
    }
  };

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageContent>
        <PageHeroCard icon="bi-flag-fill" title="My Querys" subtitle="DHL cases assigned to you" accent="orange" />

        {status && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 mb-4 text-sm font-medium ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            <i className={`bi ${status.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} aria-hidden="true" />
            {status.message}
          </div>
        )}

        <DeadlineBanner entries={deadlineEntries} />

        {myCases.length === 0 ? (
          <div className="liquid-glass-surface rounded-2xl px-4 py-10 text-center">
            <i className="bi bi-flag text-2xl text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-500">No cases assigned to you right now.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-600 mb-2.5">
                <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> Open ({openCases.length})
              </h2>
              {openCases.length === 0 ? (
                <p className="text-sm text-slate-400 pl-1">No open cases.</p>
              ) : (
                <div className="space-y-2.5">
                  {openCases.map((c) => (
                    <CaseCard
                      key={c.id} c={c}
                      submitting={submittingCaseId === c.id}
                      onSubmitResolution={handleSubmitResolution}
                    />
                  ))}
                </div>
              )}
            </div>

            {closedCases.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 mb-2.5">
                  <i className="bi bi-clock-history" aria-hidden="true" /> History ({closedCases.length})
                </h2>
                <div className="space-y-2.5">
                  {closedCases.map((c) => (
                    <CaseCard
                      key={c.id} c={c}
                      submitting={false}
                      onSubmitResolution={handleSubmitResolution}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </StandardPageLayout>
  );
}
