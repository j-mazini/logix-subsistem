import { PortalLayout } from '../../layout/PortalLayout';
import { DhlCasesTab } from './DhlCasesTab';
import styles from './TraceQueries.module.css';

/**
 * Trace & Queries — admin handling of DHL case resolution: DHL reports a
 * case (already linked to the driver who ran that route), admin sends it
 * on, the driver investigates and submits a resolution, and a case closed
 * unresolved generates a Liquidation Damage deduction. See DhlCasesTab.tsx
 * and traceQueryCaseService.ts.
 *
 * The page used to also host a "Duplicate Stops" review queue (DHL reports
 * a package scanned twice; admin approves/reproves) as a second tab —
 * removed. duplicateStopReviewService.ts and its "Duplicate Stop" deduction
 * category on the Deductions page are untouched: existing entries still
 * display there, there just isn't a UI here to generate new ones anymore.
 */
export function TraceQueries() {
  return (
    <PortalLayout mainClassName="tq-container container-fluid px-3 px-lg-4 py-4" title="Trace & Queries" titleIcon="bi-search" hideAnnouncements>
      <div className={styles.page}>
        <DhlCasesTab />
      </div>
    </PortalLayout>
  );
}
