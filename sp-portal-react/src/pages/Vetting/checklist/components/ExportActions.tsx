'use client';

import { useState } from 'react';
import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import { exportCandidate } from '../modules/client-outputs/exporters';
import styles from '../page.module.css';

export function ExportActions({ candidate }: { candidate: ChecklistCandidate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDhlModalOpen, setIsDhlModalOpen] = useState(false);
  const [includeSuitability, setIncludeSuitability] = useState(true);
  const [includeInterviewNotes, setIncludeInterviewNotes] = useState(false);
  const [signerName, setSignerName] = useState(candidate.owner || candidate.interview.supervisorName || '');
  const [dhlExportError, setDhlExportError] = useState('');

  const downloadCostModelsGuide = () => {
    const link = document.createElement('a');
    link.href = '/documents/cost-models-guide.md';
    link.download = 'cost-models-guide.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const confirmDhlExport = () => {
    if (!includeSuitability && !includeInterviewNotes) {
      setDhlExportError('Select at least one DHL export section.');
      return;
    }
    if (!signerName.trim()) {
      setDhlExportError('Enter the name of the person signing this document.');
      return;
    }

    setDhlExportError('');
    setIsDhlModalOpen(false);
    setIsOpen(false);
    exportCandidate('dhl', candidate, { includeSuitability, includeInterviewNotes, signerName: signerName.trim() });
  };

  return (
    <aside className={`${styles.exportActions} ${isOpen ? styles.exportActionsOpen : ''}`} aria-label="Case export actions">
      <button
        type="button"
        className={styles.exportToggle}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? 'Close' : 'Exports'}
      </button>
      <div className={styles.exportActionsPanel}>
        <span className={styles.exportActionsLabel}>Exports</span>
        <button type="button" className={styles.exportButton} onClick={() => exportCandidate('suitability', candidate)}>
          Suitability PDF
        </button>
        <button type="button" className={styles.exportButton} onClick={() => exportCandidate('interview', candidate)}>
          Export interview
        </button>
        <button type="button" className={styles.exportButton} onClick={() => setIsDhlModalOpen(true)}>
          Export to DHL
        </button>
        <button type="button" className={styles.exportButtonPrimary} onClick={() => exportCandidate('report', candidate)}>
          Export report
        </button>
        <button type="button" className={styles.exportButton} onClick={downloadCostModelsGuide}>
          Cost models guide
        </button>
      </div>
      {isDhlModalOpen && (
        <div className={styles.dhlExportBackdrop} role="presentation">
          <div className={styles.dhlExportModal} role="dialog" aria-modal="true" aria-labelledby="dhl-export-title">
            <div>
              <p className={styles.dhlExportKicker}>DHL export</p>
              <h3 id="dhl-export-title" className={styles.dhlExportTitle}>Choose handoff sections</h3>
            </div>
            <label className={styles.dhlExportChoice}>
              <input
                type="checkbox"
                checked={includeSuitability}
                onChange={(event) => {
                  setIncludeSuitability(event.target.checked);
                  setDhlExportError('');
                }}
              />
              <span>
                <b>Suitability Assessment</b>
                <small>Formal DHL handoff pack with evidence, readiness and declaration.</small>
              </span>
            </label>
            <label className={styles.dhlExportChoice}>
              <input
                type="checkbox"
                checked={includeInterviewNotes}
                onChange={(event) => {
                  setIncludeInterviewNotes(event.target.checked);
                  setDhlExportError('');
                }}
              />
              <span>
                <b>Interview Notes</b>
                <small>Only the free-text interview notes field.</small>
              </span>
            </label>
            <label className={styles.dhlSignatureField}>
              <span>Name for signature</span>
              <input
                type="text"
                value={signerName}
                placeholder="e.g. Jonathan Pitondo"
                onChange={(event) => {
                  setSignerName(event.target.value);
                  setDhlExportError('');
                }}
              />
            </label>
            {dhlExportError && <p className={styles.dhlExportError}>{dhlExportError}</p>}
            <div className={styles.dhlExportActions}>
              <button
                type="button"
                className={styles.exportButton}
                onClick={() => {
                  setDhlExportError('');
                  setIsDhlModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button type="button" className={styles.exportButtonPrimary} onClick={confirmDhlExport}>
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
