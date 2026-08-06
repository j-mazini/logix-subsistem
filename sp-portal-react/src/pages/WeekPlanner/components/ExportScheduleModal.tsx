import React, { useState } from 'react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

export type ExportScope = 'day' | 'week';

export interface ExportScheduleOptions {
  scope: ExportScope;
  includeWeekends: boolean;
}

interface ExportScheduleModalProps {
  onClose: () => void;
  onExport: (options: ExportScheduleOptions) => void;
  dayLabel: string;
  weekLabel: string;
  defaultIncludeWeekends: boolean;
}

/**
 * Export Schedule — simplified port of Next.js week-planner's
 * ExportDayScheduleModal.tsx / ExportWeekScheduleModal.tsx.
 *
 * The source modals let the user pick one-or-more depots and generate a
 * PDF per depot (via a backend PDF service). This app has a single mock
 * depot and no PDF pipeline, so the depot picker is dropped and the export
 * targets an XLSX workbook instead (via the `xlsx` package, the same
 * export mechanism already used elsewhere in this app — see
 * AdhocInvoiceManagement and RouteBalance). The remaining choices (export
 * the current day vs. the full week, whether to include weekends) are kept.
 */
const ExportScheduleModal: React.FC<ExportScheduleModalProps> = ({
  onClose,
  onExport,
  dayLabel,
  weekLabel,
  defaultIncludeWeekends,
}) => {
  const [scope, setScope] = useState<ExportScope>('week');
  const [includeWeekends, setIncludeWeekends] = useState(defaultIncludeWeekends);

  useModalBehavior(onClose);

  return (
    <div className="wp-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="exportScheduleModalTitle">
      <div className="wp-modal-header">
        <h2 className="wp-modal-title" id="exportScheduleModalTitle">
          <i className="bi bi-file-earmark-spreadsheet me-2" />
          Export Schedule
        </h2>
        <button type="button" className="dom-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="wp-modal-body">
        <p className="wp-modal-meta">Export the current schedule to an Excel (.xlsx) file.</p>

        <div className="dom-form-grid">
          <div className="dom-form-field span-2">
            <label className="dom-form-label">Scope</label>
            <div className="wp-mode-toggle">
              <button
                type="button"
                className={`styled-button ${scope === 'day' ? 'styled-button--primary' : 'styled-button--outline'}`}
                onClick={() => setScope('day')}
              >
                Current Day
              </button>
              <button
                type="button"
                className={`styled-button ${scope === 'week' ? 'styled-button--primary' : 'styled-button--outline'}`}
                onClick={() => setScope('week')}
              >
                Full Week
              </button>
            </div>
            <p className="wp-modal-meta" style={{ marginTop: 6 }}>
              {scope === 'day' ? dayLabel : weekLabel}
            </p>
          </div>

          <div className="dom-form-field span-2">
            <label className="wp-flex-row" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={(e) => setIncludeWeekends(e.target.checked)}
                disabled={scope === 'day'}
              />
              <span className="wp-flex-row-name">Include weekends (Sat &amp; Sun)</span>
            </label>
          </div>
        </div>
      </div>
      <div className="dom-form-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="styled-button styled-button--primary"
          onClick={() => onExport({ scope, includeWeekends })}
        >
          <i className="bi bi-download" /> Export
        </button>
      </div>
    </div>
  );
};

export default ExportScheduleModal;
