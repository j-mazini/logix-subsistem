import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { MOCK_DRIVERS } from '../../data/mockDrivers';
import {
  subscribe,
  getSnapshot,
  approve,
  reprove,
} from '../../services/duplicateStopReviewService';
import type { DuplicateStopReport, DuplicateStopReviewStatus } from './types';
import styles from './TraceQueries.module.css';

/**
 * Trace & Queries — admin review of duplicate stops reported by DHL.
 *
 * A "duplicate stop" is the same package scanned twice as delivered/visited.
 * Most are innocent (retry, signal glitch); some are a driver double-scanning
 * intentionally. The admin reviews each report and either reproves it or
 * approves the duplicate, which generates a deduction against the driver —
 * the deduction is handed off to the Deductions page via
 * duplicateStopReviewService so it shows up there under its own category.
 *
 * Follows this project's established admin-page convention (self-contained
 * component, seeded mock data, no backend) — see DeductionsDisbursementsRecharges
 * and RequestsAdmin for the same shape.
 */

/* ==================== Deterministic PRNG (same scheme as Deductions/RouteBalance) ==================== */

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

/* ==================== Mock data ==================== */

const STREETS = [
  '14 Baker Street', '22 Oxford Road', '7 Kings Avenue', '101 Mill Lane', '56 Church Street',
  '8 Victoria Road', '19 Park Lane', '33 Station Road', '5 High Street', '48 Elm Grove',
];
const POSTCODES = ['SW1A 1AA', 'E1 6AN', 'NW1 2DB', 'SE1 9SG', 'W1D 3QU', 'EC1A 1BB', 'N1 9GU', 'SW3 5BS'];
const CUSTOMERS = [
  'Amelia Clarke', 'Oliver Bennett', 'Isla Robertson', 'Noah Campbell', 'Freya Mitchell',
  'Harry Ellison', 'Lily Sinclair', 'Jack Whitfield', 'Poppy Hendricks', 'Leo Fairweather',
];
const VEHICLE_PLATES = ['AB12 CDE', 'EF34 FGH', 'JK56 LMN', 'OP78 PQR', 'ST90 UVW', 'XY12 ZAB'];
const SCAN_NOTES = [
  'Front door', 'Reception desk', 'Left in porch', 'Handed to recipient',
  'Left with neighbour', 'Safe place - bin store', 'Signed for at door', 'Concierge',
];
const REPROVED_SEED_NOTES = [
  'GPS glitch caused a duplicate ping — single physical delivery confirmed with customer.',
  'Driver retried scan after a device error; only one parcel was delivered.',
  'Customer confirmed a single delivery; second scan was an app resync.',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function buildInitialReports(): DuplicateStopReport[] {
  const rng = rngForSeed('trace-queries-duplicate-stops');
  const reports: DuplicateStopReport[] = [];
  const today = new Date();
  const total = 26;

  for (let i = 0; i < total; i++) {
    const driver = MOCK_DRIVERS[Math.floor(rng() * MOCK_DRIVERS.length)];
    const streetIdx = Math.floor(rng() * STREETS.length);
    const daysAgo = Math.floor(rng() * 45);
    const stopDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);

    const firstHour = 8 + Math.floor(rng() * 9);
    const firstMinute = Math.floor(rng() * 60);
    const firstScanDate = new Date(stopDay.getFullYear(), stopDay.getMonth(), stopDay.getDate(), firstHour, firstMinute);

    const minutesBetween = 2 + Math.floor(rng() * 300);
    const secondScanDate = new Date(firstScanDate.getTime() + minutesBetween * 60000);

    const dhlReportedDate = new Date(secondScanDate.getTime() + (60 + Math.floor(rng() * 1400)) * 60000);

    const packageId = `PKG${100000 + Math.floor(rng() * 899999)}`;

    let firstNoteIdx = Math.floor(rng() * SCAN_NOTES.length);
    let secondNoteIdx = Math.floor(rng() * SCAN_NOTES.length);
    if (secondNoteIdx === firstNoteIdx) secondNoteIdx = (secondNoteIdx + 1) % SCAN_NOTES.length;

    const isPreSeededReproved = rng() < 0.15;

    const report: DuplicateStopReport = {
      id: `TQ-${String(i + 1).padStart(4, '0')}`,
      packageId,
      stopAddress: STREETS[streetIdx],
      postcode: POSTCODES[Math.floor(rng() * POSTCODES.length)],
      customer: CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)],
      driverUserId: driver.userId,
      driverName: driver.fullName,
      firstScan: {
        timestamp: toIso(firstScanDate),
        location: SCAN_NOTES[firstNoteIdx],
        vehicleId: VEHICLE_PLATES[Math.floor(rng() * VEHICLE_PLATES.length)],
      },
      secondScan: {
        timestamp: toIso(secondScanDate),
        location: SCAN_NOTES[secondNoteIdx],
        vehicleId: VEHICLE_PLATES[Math.floor(rng() * VEHICLE_PLATES.length)],
      },
      minutesBetween,
      dhlReportedAt: toIso(dhlReportedDate),
      status: isPreSeededReproved ? 'reproved' : 'pending',
      reviewNote: isPreSeededReproved ? REPROVED_SEED_NOTES[Math.floor(rng() * REPROVED_SEED_NOTES.length)] : undefined,
      reviewedAt: isPreSeededReproved ? toIso(new Date(dhlReportedDate.getTime() + 24 * 60 * 60000)) : undefined,
    };

    reports.push(report);
  }

  return reports.sort((a, b) => (a.dhlReportedAt < b.dhlReportedAt ? 1 : -1));
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ==================== Small presentational pieces ==================== */

const STATUS_LABEL: Record<DuplicateStopReviewStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  reproved: 'Reproved',
};

const STATUS_BADGE_CLASS: Record<DuplicateStopReviewStatus, string> = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  reproved: styles.statusReproved,
};

function StatusBadge({ status }: { status: DuplicateStopReviewStatus }) {
  return <span className={`${styles.statusBadge} ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

function KpiCard({ icon, color, bg, title, value, isActive, onSelect }: {
  icon: string; color: string; bg: string; title: string; value: string; isActive: boolean; onSelect: () => void;
}) {
  return (
    <div className={`${styles.kpiCard} ${isActive ? styles.kpiCardActive : ''}`} onClick={onSelect} role="button" tabIndex={0}>
      <div className={styles.kpiIcon} style={{ background: bg, color }}>
        <i className={`bi ${icon}`} />
      </div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiTitle}>{title}</div>
        <div className={styles.kpiValue}>{value}</div>
      </div>
    </div>
  );
}

/* ==================== Detail modal ==================== */

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ReportModal({ report, onClose, onApprove, onReprove }: {
  report: DuplicateStopReport;
  onClose: () => void;
  onApprove: (amount: number, note: string) => void;
  onReprove: (note: string) => void;
}) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reprove'>('idle');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [reproveNote, setReproveNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  const isPending = report.status === 'pending';
  const amountValue = Number.parseFloat(amount);
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;
  const noteValid = note.trim().length > 0;

  const handleSubmitApprove = () => {
    if (!amountValid || !noteValid) {
      setAttempted(true);
      return;
    }
    onApprove(amountValue, note.trim());
  };

  const handleSubmitReprove = () => {
    onReprove(reproveNote.trim());
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2><i className="bi bi-exclamation-diamond" /> Duplicate Stop — {report.packageId}</h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}><span>Driver</span><strong>{report.driverName}</strong></div>
            <div className={styles.summaryRow}><span>Stop Address</span><strong>{report.stopAddress}, {report.postcode}</strong></div>
            <div className={styles.summaryRow}><span>Customer</span><strong>{report.customer}</strong></div>
            <div className={styles.summaryRow}><span>DHL Reported</span><strong>{formatDateTime(report.dhlReportedAt)}</strong></div>
            <div className={styles.summaryRow}><span>Time Between Scans</span><strong>{report.minutesBetween} min</strong></div>
          </div>

          <div className={styles.scanCompare}>
            <div className={styles.scanCol}>
              <div className={styles.scanColTitle}>First Scan</div>
              <div className={styles.scanField}><span>Timestamp</span><strong>{formatDateTime(report.firstScan.timestamp)}</strong></div>
              <div className={styles.scanField}><span>Note</span><strong>{report.firstScan.location}</strong></div>
              {report.firstScan.vehicleId && <div className={styles.scanField}><span>Vehicle</span><strong>{report.firstScan.vehicleId}</strong></div>}
            </div>
            <div className={styles.scanCol}>
              <div className={styles.scanColTitle}>Second Scan</div>
              <div className={styles.scanField}><span>Timestamp</span><strong>{formatDateTime(report.secondScan.timestamp)}</strong></div>
              <div className={styles.scanField}><span>Note</span><strong>{report.secondScan.location}</strong></div>
              {report.secondScan.vehicleId && <div className={styles.scanField}><span>Vehicle</span><strong>{report.secondScan.vehicleId}</strong></div>}
            </div>
          </div>

          {!isPending && (
            <div className={styles.outcomeBox}>
              <StatusBadge status={report.status} />
              {report.reviewedAt && <p className={styles.outcomeMeta}>Reviewed {formatDateTime(report.reviewedAt)}</p>}
              {report.reviewNote && <p className={styles.outcomeNote}>&ldquo;{report.reviewNote}&rdquo;</p>}
              {report.deductionRefNumber && (
                <p className={styles.outcomeMeta}>
                  Deduction <strong>{report.deductionRefNumber}</strong> generated — visible on the Deductions page.
                </p>
              )}
            </div>
          )}

          {isPending && mode === 'idle' && (
            <div className={styles.actionRow}>
              <button type="button" className={styles.btnSecondary} onClick={() => setMode('reprove')}>
                <i className="bi bi-x-circle" /> Reprove
              </button>
              <button type="button" className={styles.btnDanger} onClick={() => setMode('approve')}>
                <i className="bi bi-shield-exclamation" /> Approve
              </button>
            </div>
          )}

          {isPending && mode === 'reprove' && (
            <div className={styles.decisionForm}>
              <div className={styles.formGroup}>
                <label>Note (optional)</label>
                <textarea rows={3} className={styles.formInput} value={reproveNote} onChange={(e) => setReproveNote(e.target.value)}
                  placeholder="Why this looks like an innocent duplicate…" />
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnSecondary} onClick={() => setMode('idle')}>Back</button>
                <button type="button" className={styles.btnSuccess} onClick={handleSubmitReprove}>Confirm Reproval</button>
              </div>
            </div>
          )}

          {isPending && mode === 'approve' && (
            <div className={styles.decisionForm}>
              <div className={styles.formGroup}>
                <label>Deduction Amount (&pound;) <span className={styles.requiredMark}>*</span></label>
                <input
                  type="number" step="0.01" min="0.01" className={`${styles.formInput} ${attempted && !amountValid ? styles.formInputError : ''}`}
                  value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                />
                {attempted && !amountValid && <div className={styles.fieldError}>Enter an amount greater than 0</div>}
              </div>
              <div className={styles.formGroup}>
                <label>Justification <span className={styles.requiredMark}>*</span></label>
                <textarea
                  rows={3} className={`${styles.formInput} ${attempted && !noteValid ? styles.formInputError : ''}`}
                  value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this is being approved as a duplicate…"
                />
                {attempted && !noteValid && <div className={styles.fieldError}>Justification is required</div>}
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnSecondary} onClick={() => setMode('idle')}>Back</button>
                <button type="button" className={styles.btnDanger} onClick={handleSubmitApprove}>
                  <i className="bi bi-shield-exclamation" /> Generate Deduction
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Page ==================== */

export function TraceQueries() {
  const store = useSyncExternalStore(subscribe, getSnapshot);
  const baseReports = useMemo(() => buildInitialReports(), []);

  const reports = useMemo(() => baseReports.map((report) => {
    const override = store.overrides.get(report.id);
    if (!override) return report;
    return {
      ...report,
      status: override.status,
      reviewNote: override.note,
      reviewedAt: override.reviewedAt,
      deductionRefNumber: override.deductionRefNumber,
    };
  }), [baseReports, store]);

  // Exclusive tab, not a toggleable filter — pending/approved/reproved never
  // list together, so there is no "All" state.
  const [activeTab, setActiveTab] = useState<DuplicateStopReviewStatus>('pending');
  const [driverFilter, setDriverFilter] = useState<'All' | number>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<DuplicateStopReport | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const kpis = useMemo(() => {
    const pending = reports.filter((r) => r.status === 'pending').length;
    const approvedReports = reports.filter((r) => r.status === 'approved');
    const reprovedCount = reports.filter((r) => r.status === 'reproved').length;
    const totalDeducted = store.deductions.reduce((sum, d) => sum + d.amount, 0);
    return { pending, approvedCount: approvedReports.length, reprovedCount, totalDeducted };
  }, [reports, store]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (r.status !== activeTab) return false;
      if (driverFilter !== 'All' && r.driverUserId !== driverFilter) return false;
      if (query && !r.packageId.toLowerCase().includes(query) && !r.stopAddress.toLowerCase().includes(query) && !r.driverName.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [reports, activeTab, driverFilter, searchQuery]);

  const handleApprove = useCallback((amount: number, note: string) => {
    if (!selectedReport) return;
    const entry = approve(selectedReport, amount, note);
    showToast(`Deduction ${entry.refNumber} generated for ${selectedReport.driverName}.`, 'success');
    setSelectedReport(null);
  }, [selectedReport, showToast]);

  const handleReprove = useCallback((note: string) => {
    if (!selectedReport) return;
    reprove(selectedReport, note);
    showToast('Report reproved.', 'success');
    setSelectedReport(null);
  }, [selectedReport, showToast]);

  return (
    <PortalLayout mainClassName="tq-container container-fluid px-3 px-lg-4 py-4" title="Trace & Queries" titleIcon="bi-search" hideAnnouncements>
      <div className={styles.page}>
        <p className={styles.pageSubtitle}>Duplicate stops reported by DHL — review each one and approve the duplicate to generate a deduction.</p>

        <div className={styles.kpiGrid}>
          <KpiCard
            icon="bi-hourglass-split" color="#854d0e" bg="#fef9c3" title="Pending" value={String(kpis.pending)}
            isActive={activeTab === 'pending'} onSelect={() => setActiveTab('pending')}
          />
          <KpiCard
            icon="bi-shield-exclamation" color="#991b1b" bg="#fee2e2" title="Approved"
            value={`${kpis.approvedCount} · £${kpis.totalDeducted.toFixed(2)}`}
            isActive={activeTab === 'approved'} onSelect={() => setActiveTab('approved')}
          />
          <KpiCard
            icon="bi-check-circle" color="#166534" bg="#dcfce7" title="Reproved" value={String(kpis.reprovedCount)}
            isActive={activeTab === 'reproved'} onSelect={() => setActiveTab('reproved')}
          />
        </div>

        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <i className="bi bi-search" />
            <input
              type="text" placeholder="Search package ID, address, driver…"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className={styles.filterSelect} value={driverFilter} onChange={(e) => setDriverFilter(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
            <option value="All">All Drivers</option>
            {MOCK_DRIVERS.map((d) => <option key={d.userId} value={d.userId}>{d.fullName}</option>)}
          </select>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Package ID</th>
                  <th>Driver</th>
                  <th>Stop Address</th>
                  <th>First Scan</th>
                  <th>Second Scan</th>
                  <th>&Delta; min</th>
                  <th>DHL Reported</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 && (
                  <tr><td colSpan={9} className={styles.emptyRow}>No duplicate stop reports match these filters.</td></tr>
                )}
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.packageId}</td>
                    <td>{report.driverName}</td>
                    <td>{report.stopAddress}</td>
                    <td>{formatDateTime(report.firstScan.timestamp)}</td>
                    <td>{formatDateTime(report.secondScan.timestamp)}</td>
                    <td>{report.minutesBetween}</td>
                    <td>{formatDateTime(report.dhlReportedAt)}</td>
                    <td><StatusBadge status={report.status} /></td>
                    <td>
                      <button type="button" className={styles.viewBtn} onClick={() => setSelectedReport(report)} title="Review">
                        <i className="bi bi-eye-fill" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onApprove={handleApprove}
          onReprove={handleReprove}
        />
      )}

      <div className={styles.toastContainer}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[`toast${t.type.charAt(0).toUpperCase()}${t.type.slice(1)}`]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
