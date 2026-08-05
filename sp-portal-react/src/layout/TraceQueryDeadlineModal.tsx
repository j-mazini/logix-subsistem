import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { CASE_TYPE_LABEL } from '../pages/TraceQueries/types';
import { CASE_TYPE_STYLE } from '../pages/TraceQueries/caseTypeStyle';
import { formatHoursRemaining, type CaseDeadlineEntry } from '../pages/TraceQueries/utils/caseDeadlineAlerts';
import './TraceQueryDeadlineModal.css';

interface TraceQueryDeadlineModalProps {
  /** Already worst-first from getCaseDeadlineEntries. */
  entries: CaseDeadlineEntry[];
  onClose: () => void;
}

function countdownTone(hoursRemaining: number): string {
  if (hoursRemaining < 0) return 'tqd-countdown--overdue';
  return 'tqd-countdown--urgent';
}

/**
 * Lists DHL cases approaching or past their 3-day resolution deadline,
 * opened from the Announcements card's warning row. Same portal/structure
 * as ComplianceAlertsModal — the same window, different content.
 */
export function TraceQueryDeadlineModal({ entries, onClose }: TraceQueryDeadlineModalProps) {
  useModalBehavior(onClose);

  const overdueCount = entries.filter((e) => e.hoursRemaining < 0).length;

  return createPortal(
    <div className="annc-modal" role="dialog" aria-modal="true" aria-label="Case resolution deadlines">
      <div className="annc-modal-backdrop" onClick={onClose} />

      <div className="annc-modal-dialog tqd-dialog">
        <div className="annc-modal-header">
          <h2 className="annc-modal-title">
            <i className="bi bi-hourglass-split tqd-title-icon" aria-hidden="true" />
            Case resolution deadlines
            {entries.length > 0 && ` (${entries.length})`}
          </h2>
          <button type="button" className="annc-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="annc-modal-body">
          {entries.length === 0 ? (
            <p className="annc-modal-empty">No cases are approaching their resolution deadline.</p>
          ) : (
            <>
              <p className="tqd-summary">
                {overdueCount > 0 && (
                  <>
                    <strong>{overdueCount}</strong>
                    {overdueCount === 1 ? ' case is' : ' cases are'} overdue.{' '}
                  </>
                )}
                {entries.length - overdueCount > 0 && (
                  <>
                    <strong>{entries.length - overdueCount}</strong> due within 24h.
                  </>
                )}
              </p>

              <ul className="tqd-list">
                {entries.map((entry) => {
                  const typeStyle = CASE_TYPE_STYLE[entry.caseType];
                  return (
                    <li key={entry.caseId} className={`tqd-item${entry.hoursRemaining < 0 ? ' tqd-item--overdue' : ''}`}>
                      <span className="tqd-type-icon" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                        <i className={`bi ${typeStyle.icon}`} aria-hidden="true" />
                      </span>

                      <div className="tqd-item-main">
                        <p className="tqd-case">{entry.caseId}</p>
                        <p className="tqd-detail">
                          <span className="tqd-type" style={{ background: typeStyle.bg, color: typeStyle.color }}>{CASE_TYPE_LABEL[entry.caseType]}</span>
                          {entry.driverName} &middot; {entry.packageId}
                        </p>
                      </div>

                      <div className="tqd-item-side">
                        <span className={`tqd-countdown ${countdownTone(entry.hoursRemaining)}`}>
                          {entry.hoursRemaining < 0 && <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />}
                          {formatHoursRemaining(entry.hoursRemaining)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="annc-modal-footer">
          <Link to="/trace-queries" className="annc-modal-cta" onClick={onClose}>
            Go to Trace & Queries <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
