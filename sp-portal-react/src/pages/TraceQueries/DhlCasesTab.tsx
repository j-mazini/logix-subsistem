import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  subscribe,
  getSnapshot,
  ASSIGNABLE_DRIVERS,
  sendToDriver,
  submitAdminFeedback,
  markPdfGenerated,
} from '../../services/traceQueryCaseService';
import { CASE_TYPE_LABEL, type TraceQueryCase, type TraceQueryCaseStatus } from './types';
import { CASE_TYPE_STYLE } from './caseTypeStyle';
import { getCaseDeadline, getCaseDeadlineAlerts, formatHoursRemaining, type CaseDeadlineTone } from './utils/caseDeadlineAlerts';
import { generateCasePdf } from './lib/generateCasePdf';
import { downloadBlob } from '../../lib/pdf-utils';
import { useToasts } from './hooks/useToasts';
import { ToastStack } from './components/ToastStack';
import { KpiCard } from './components/KpiCard';
import styles from './TraceQueries.module.css';

/**
 * DHL Cases — general case resolution workflow: admin receives a case from
 * DHL, already linked to the driver who ran that delivery's route (see
 * traceQueryCaseService's buildSeedCases — there's nothing to pick, the
 * case names its driver from creation). Admin reviews and sends it on, the
 * driver investigates and submits notes + photo evidence with a
 * Resolved/Not Resolved outcome (which closes the case — see
 * submitDriverResolution for why there's no separate "add a note" step),
 * and the admin then adds feedback for DHL and generates the closing PDF.
 * A case closed without resolution auto-generates a Liquidation Damage
 * deduction, visible on the Deductions page.
 */

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type CaseFilterTab = 'new' | 'assigned' | 'awaiting-feedback' | 'closed';

const CASE_STATUS_LABEL: Record<TraceQueryCaseStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  closed: 'Closed',
};

const CASE_STATUS_BADGE_CLASS: Record<TraceQueryCaseStatus, string> = {
  new: styles.statusNew,
  assigned: styles.statusAssigned,
  closed: styles.statusClosed,
};

function CaseStatusBadge({ status }: { status: TraceQueryCaseStatus }) {
  return <span className={`${styles.statusBadge} ${CASE_STATUS_BADGE_CLASS[status]}`}>{CASE_STATUS_LABEL[status]}</span>;
}

function CaseTypeBadge({ c }: { c: TraceQueryCase }) {
  const style = CASE_TYPE_STYLE[c.caseType];
  return (
    <span className={styles.caseTypeBadge} style={{ background: style.bg, color: style.color }}>
      <i className={`bi ${style.icon}`} /> {CASE_TYPE_LABEL[c.caseType]}
    </span>
  );
}

const DEADLINE_CHIP_CLASS: Record<CaseDeadlineTone, string> = {
  ok: styles.deadlineOk,
  urgent: styles.deadlineUrgent,
  overdue: styles.deadlineOverdue,
};

function DeadlineChip({ c }: { c: TraceQueryCase }) {
  const deadline = getCaseDeadline(c);
  if (!deadline) return <span className={styles.deadlineNone}>—</span>;

  const hoursRemaining = Math.round((deadline.getTime() - Date.now()) / 3600000);
  const tone: CaseDeadlineTone = hoursRemaining < 0 ? 'overdue' : hoursRemaining <= 24 ? 'urgent' : 'ok';

  return (
    <span className={`${styles.deadlineChip} ${DEADLINE_CHIP_CLASS[tone]}`}>
      <i className="bi bi-hourglass-split" /> {formatHoursRemaining(hoursRemaining)}
    </span>
  );
}

function TimelineEntryView({ entry, authorType }: { entry: TraceQueryCase['updates'][number]; authorType: 'admin' | 'driver' }) {
  return (
    <div className={styles.timelineItem}>
      <span className={`${styles.timelineIcon} ${authorType === 'driver' ? styles.timelineIconDriver : styles.timelineIconAdmin}`}>
        <i className={`bi ${authorType === 'driver' ? 'bi-person-badge' : 'bi-person-workspace'}`} />
      </span>
      <div className={styles.timelineEntry}>
        <div className={styles.timelineHead}>
          <span className={styles.timelineAuthor}>{entry.authorName}</span>
          <span className={styles.timelineDate}>{formatDateTime(entry.createdAt)}</span>
        </div>
        <p className={styles.timelineNote}>{entry.note || <em>No note provided.</em>}</p>
        {entry.photos.length > 0 && (
          <div className={styles.photoGrid}>
            {entry.photos.map((photo, i) => (
              <img key={i} src={photo} alt={`Evidence ${i + 1}`} className={styles.photoThumb} />
            ))}
          </div>
        )}
        {entry.outcome && (
          <span className={`${styles.statusBadge} ${entry.outcome === 'resolved' ? styles.outcomeResolved : styles.outcomeNotResolved}`} style={{ marginTop: 8, display: 'inline-block' }}>
            {entry.outcome === 'resolved' ? 'Marked Resolved' : 'Marked Not Resolved'}
          </span>
        )}
      </div>
    </div>
  );
}

/* ==================== Detail modal ==================== */

function CaseModal({ c, onClose, onSend, onSubmitFeedback, onGeneratePdf, generatingPdf }: {
  c: TraceQueryCase;
  onClose: () => void;
  onSend: (note: string) => void;
  onSubmitFeedback: (feedback: string) => void;
  onGeneratePdf: () => void;
  generatingPdf: boolean;
}) {
  const [assignNote, setAssignNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const noteValid = assignNote.trim().length > 0;

  const handleSend = () => {
    if (!noteValid) {
      setAttempted(true);
      return;
    }
    onSend(assignNote.trim());
  };

  const handleFeedback = () => {
    if (!feedback.trim()) {
      setAttempted(true);
      return;
    }
    onSubmitFeedback(feedback.trim());
  };

  const typeStyle = CASE_TYPE_STYLE[c.caseType];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.modalHeaderIcon} style={{ background: typeStyle.bg, color: typeStyle.color }}>
              <i className={`bi ${typeStyle.icon}`} />
            </span>
            {c.id} — {CASE_TYPE_LABEL[c.caseType]}
          </h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}><span>DHL Description</span><strong>{c.dhlDescription}</strong></div>
            <div className={styles.summaryRow}><span>Package</span><strong>{c.packageId}</strong></div>
            <div className={styles.summaryRow}><span>Customer</span><strong>{c.customer}</strong></div>
            <div className={styles.summaryRow}><span>Address</span><strong>{c.stopAddress}, {c.postcode}</strong></div>
            <div className={styles.summaryRow}><span>Case Value</span><strong className={styles.caseValueBadge}>£{c.caseValue.toFixed(2)}</strong></div>
            <div className={styles.summaryRow}><span>DHL Reported</span><strong>{formatDateTime(c.dhlReportedAt)}</strong></div>
            <div className={styles.summaryRow}><span>Route</span><strong>{c.routeName}</strong></div>
            <div className={styles.summaryRow}><span>Route Driver</span><strong>{c.driverName}</strong></div>
            {c.status === 'assigned' && (
              <div className={styles.summaryRow}><span>Resolution Deadline</span><DeadlineChip c={c} /></div>
            )}
          </div>

          {c.updates.length > 0 && (
            <div className={styles.timeline}>
              {c.updates.map((entry) => (
                <TimelineEntryView key={entry.id} entry={entry} authorType={entry.authorType} />
              ))}
            </div>
          )}

          {c.status === 'closed' && (
            <div className={styles.outcomeBox}>
              <span className={`${styles.statusBadge} ${c.outcome === 'resolved' ? styles.outcomeResolved : styles.outcomeNotResolved}`}>
                {c.outcome === 'resolved' ? 'Resolved' : 'Not Resolved'}
              </span>
              {c.deductionRefNumber && (
                <p className={styles.outcomeMeta}>
                  Liquidation Damage deduction <strong>{c.deductionRefNumber}</strong> generated for £{c.caseValue.toFixed(2)} — visible on the Deductions page.
                </p>
              )}
            </div>
          )}

          {c.status === 'new' && (
            <div className={styles.decisionForm}>
              <div className={styles.formGroup}>
                <label>Note to {c.driverName} <span className={styles.requiredMark}>*</span></label>
                <textarea
                  rows={3} className={`${styles.formInput} ${attempted && !noteValid ? styles.formInputError : ''}`}
                  value={assignNote} onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="What DHL reported and what needs investigating…"
                />
                {attempted && !noteValid && <div className={styles.fieldError}>A note is required</div>}
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnSuccess} onClick={handleSend}>
                  <i className="bi bi-send" /> Send to {c.driverName}
                </button>
              </div>
            </div>
          )}

          {c.status === 'assigned' && (
            <p className={styles.outcomeMeta}>Waiting for the driver to submit their resolution.</p>
          )}

          {c.status === 'closed' && !c.feedback && (
            <div className={styles.decisionForm}>
              <div className={styles.formGroup}>
                <label>Feedback for DHL <span className={styles.requiredMark}>*</span></label>
                <textarea
                  rows={3} className={`${styles.formInput} ${attempted && !feedback.trim() ? styles.formInputError : ''}`}
                  value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Summary to close the case out with DHL…"
                />
                {attempted && !feedback.trim() && <div className={styles.fieldError}>Feedback is required to close the loop with DHL</div>}
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnSuccess} onClick={handleFeedback}>
                  <i className="bi bi-check2-circle" /> Submit Feedback
                </button>
              </div>
            </div>
          )}

          {c.status === 'closed' && c.feedback && (
            <div className={styles.decisionForm}>
              <div className={styles.formGroup}>
                <label>Feedback for DHL</label>
                <p className={styles.outcomeNote}>&ldquo;{c.feedback}&rdquo;</p>
                {c.feedbackAt && <p className={styles.outcomeMeta}>Submitted {formatDateTime(c.feedbackAt)}</p>}
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnDanger} onClick={onGeneratePdf} disabled={generatingPdf}>
                  <i className="bi bi-file-earmark-pdf" /> {generatingPdf ? 'Generating…' : c.pdfGeneratedAt ? 'Regenerate PDF' : 'Generate PDF for DHL'}
                </button>
              </div>
              {c.pdfGeneratedAt && <p className={styles.outcomeMeta}>Last generated {formatDateTime(c.pdfGeneratedAt)}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Tab ==================== */

const FILTER_TABS: { key: CaseFilterTab; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'new', label: 'New', icon: 'bi-inbox-fill', color: '#854d0e', bg: '#fef9c3' },
  { key: 'assigned', label: 'Assigned', icon: 'bi-person-check-fill', color: '#1e40af', bg: '#dbeafe' },
  { key: 'awaiting-feedback', label: 'Awaiting Feedback', icon: 'bi-chat-square-text-fill', color: '#92400e', bg: '#fef3c7' },
  { key: 'closed', label: 'Closed', icon: 'bi-check-circle-fill', color: '#166534', bg: '#dcfce7' },
];

function matchesFilterTab(c: TraceQueryCase, tab: CaseFilterTab): boolean {
  switch (tab) {
    case 'new': return c.status === 'new';
    case 'assigned': return c.status === 'assigned';
    case 'awaiting-feedback': return c.status === 'closed' && !c.feedback;
    case 'closed': return c.status === 'closed' && !!c.feedback;
  }
}

export function DhlCasesTab() {
  const store = useSyncExternalStore(subscribe, getSnapshot);

  const [activeTab, setActiveTab] = useState<CaseFilterTab>('new');
  const [driverFilter, setDriverFilter] = useState<'All' | number>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toasts, showToast } = useToasts();

  const selectedCase = useMemo(
    () => (selectedCaseId ? store.cases.find((c) => c.id === selectedCaseId) ?? null : null),
    [store, selectedCaseId],
  );

  const deadlineAlerts = useMemo(() => getCaseDeadlineAlerts(store.cases), [store]);

  const kpiCounts = useMemo(() => {
    const counts: Record<CaseFilterTab, number> = { new: 0, assigned: 0, 'awaiting-feedback': 0, closed: 0 };
    for (const c of store.cases) {
      for (const tab of FILTER_TABS) {
        if (matchesFilterTab(c, tab.key)) counts[tab.key]++;
      }
    }
    return counts;
  }, [store]);

  const totalLiquidation = useMemo(() => store.deductions.reduce((sum, d) => sum + d.amount, 0), [store]);

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return store.cases.filter((c) => {
      if (!matchesFilterTab(c, activeTab)) return false;
      if (driverFilter !== 'All' && c.driverUserId !== driverFilter) return false;
      if (query && !c.id.toLowerCase().includes(query) && !c.packageId.toLowerCase().includes(query)
        && !c.customer.toLowerCase().includes(query) && !c.driverName.toLowerCase().includes(query)
        && !c.routeName.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [store, activeTab, driverFilter, searchQuery]);

  const handleSend = useCallback((note: string) => {
    if (!selectedCase) return;
    const updated = sendToDriver(selectedCase.id, note);
    showToast(`${selectedCase.id} sent to ${updated.driverName}.`, 'success');
    setSelectedCaseId(null);
  }, [selectedCase, showToast]);

  const handleSubmitFeedback = useCallback((feedback: string) => {
    if (!selectedCase) return;
    submitAdminFeedback(selectedCase.id, feedback);
    showToast('Feedback recorded.', 'success');
  }, [selectedCase, showToast]);

  const handleGeneratePdf = useCallback(async () => {
    if (!selectedCase) return;
    setGeneratingPdf(true);
    try {
      const blob = await generateCasePdf(selectedCase);
      downloadBlob(blob, `trace-query-${selectedCase.id}.pdf`);
      markPdfGenerated(selectedCase.id);
      showToast('PDF generated for DHL.', 'success');
    } catch {
      showToast('Failed to generate the PDF.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  }, [selectedCase, showToast]);

  return (
    <>
      <p className={styles.pageSubtitle}>
        DHL cases requiring investigation and resolution — each one is already linked to the driver who ran that route; review and send it on, track the 3-day resolution window, and close the loop with DHL.
      </p>

      <div className={`${styles.kpiGrid} ${styles.kpiGrid4}`}>
        {FILTER_TABS.map((tab) => (
          <KpiCard
            key={tab.key}
            icon={tab.icon} color={tab.color} bg={tab.bg} title={tab.label}
            value={tab.key === 'closed' ? `${kpiCounts.closed} · £${totalLiquidation.toFixed(2)}`
              : tab.key === 'assigned' && deadlineAlerts.totalCount > 0 ? `${kpiCounts.assigned} (${deadlineAlerts.overdueCount} overdue, ${deadlineAlerts.urgentCount} due soon)`
              : String(kpiCounts[tab.key])}
            isActive={activeTab === tab.key} onSelect={() => setActiveTab(tab.key)}
            pulse={tab.key === 'assigned' && deadlineAlerts.overdueCount > 0}
          />
        ))}
      </div>

      <div className={styles.filterRow}>
        <div className={styles.searchBox}>
          <i className="bi bi-search" />
          <input
            type="text" placeholder="Search case ID, package, customer, driver, route…"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className={styles.filterSelect} value={driverFilter} onChange={(e) => setDriverFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
          <option value="All">All Drivers</option>
          {ASSIGNABLE_DRIVERS.map((d) => <option key={d.userId} value={d.userId}>{d.fullName}</option>)}
        </select>
      </div>

      <div className={`liquid-glass-surface ${styles.tableCard}`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Type</th>
                <th>Package / Customer</th>
                <th>Route Driver</th>
                <th>DHL Reported</th>
                <th>Deadline</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length === 0 && (
                <tr><td colSpan={8} className={styles.emptyRow}>No cases match these filters.</td></tr>
              )}
              {filteredCases.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td><CaseTypeBadge c={c} /></td>
                  <td>{c.packageId} · {c.customer}</td>
                  <td>{c.driverName}<span className={styles.routeTag}>{c.routeName}</span></td>
                  <td>{formatDateTime(c.dhlReportedAt)}</td>
                  <td><DeadlineChip c={c} /></td>
                  <td><CaseStatusBadge status={c.status} /></td>
                  <td>
                    <button type="button" className={styles.viewBtn} onClick={() => setSelectedCaseId(c.id)} title="View">
                      <i className="bi bi-eye-fill" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCase && (
        <CaseModal
          c={selectedCase}
          onClose={() => setSelectedCaseId(null)}
          onSend={handleSend}
          onSubmitFeedback={handleSubmitFeedback}
          onGeneratePdf={handleGeneratePdf}
          generatingPdf={generatingPdf}
        />
      )}

      <ToastStack toasts={toasts} />
    </>
  );
}
