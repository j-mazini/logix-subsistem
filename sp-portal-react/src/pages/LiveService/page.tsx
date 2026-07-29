import { useMemo } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { LiveKPICards } from './components/LiveKPICards/LiveKPICards';
import { OperationalMap } from './components/OperationalMap/OperationalMap';
import { ExceptionTriage } from './components/ExceptionTriage/ExceptionTriage';
import { ScannerLiveFeed } from './components/ScannerLiveFeed/ScannerLiveFeed';
import { TeamRoster } from './components/TeamRoster/TeamRoster';
import { useLiveMetrics } from './hooks/useLiveMetrics';
import { useLiveTracking } from './hooks/useLiveTracking';
import { useLiveExceptions } from './hooks/useLiveExceptions';
import { useScannerEvents } from './hooks/useScannerEvents';
import { useTeamStatus } from './hooks/useTeamStatus';
import styles from './LiveService.module.css';

export default function Page() {
  const { metrics } = useLiveMetrics();
  const { deliverers } = useLiveTracking();
  const { exceptions, resolveException } = useLiveExceptions();
  const { events } = useScannerEvents();
  const { team } = useTeamStatus();

  const activeCouriers = useMemo(() => team.filter(m => m.status === 'active').length, [team]);
  const openExceptions = useMemo(() => exceptions.filter(e => !e.resolved).length, [exceptions]);

  return (
    <PortalLayout mainClassName="live-service-main" title="Live Service">
      <div className={styles.consoleRoot}>
        <section className={styles.statusBar}>
          <div className={styles.statusIntro}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Live
            </span>
            <p className={styles.statusSubtitle}>
              The pulse of the operation — real-time overview
            </p>
          </div>

          <div className={styles.statusChips}>
            <span className={styles.chip}>
              <strong key={activeCouriers} className={styles.pulse}>{activeCouriers}</strong> on route
            </span>
            <span className={`${styles.chip} ${openExceptions > 0 ? styles.chipAlert : ''}`}>
              <strong key={openExceptions} className={styles.pulse}>{openExceptions}</strong> exceptions
            </span>
            <span className={styles.timestamp}>
              {new Date(metrics.lastUpdated).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        </section>

        <LiveKPICards metrics={metrics} />

        <div className={styles.mapSection}>
          <OperationalMap deliverers={deliverers} />
        </div>

        <div className={styles.secondaryGrid}>
          <ExceptionTriage exceptions={exceptions} onResolve={resolveException} />
          <ScannerLiveFeed events={events} />
        </div>

        <TeamRoster team={team} />
      </div>
    </PortalLayout>
  );
}
