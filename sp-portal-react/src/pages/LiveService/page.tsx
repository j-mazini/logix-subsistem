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

  const activeCouriers = team.filter(m => m.status === 'active').length;
  const openExceptions = exceptions.filter(e => !e.resolved).length;

  return (
    <PortalLayout mainClassName="live-service-main" title="Live Service">
      <section className={styles.statusBar}>
        <div className={styles.statusIntro}>
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Ao vivo
          </span>
          <p className={styles.statusSubtitle}>
            O pulso da operação — visão geral em tempo real
          </p>
        </div>

        <div className={styles.statusChips}>
          <span className={styles.chip}>
            <strong>{activeCouriers}</strong> em rota
          </span>
          <span className={`${styles.chip} ${openExceptions > 0 ? styles.chipAlert : ''}`}>
            <strong>{openExceptions}</strong> exceções
          </span>
          <span className={styles.timestamp}>
            {new Date(metrics.lastUpdated).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </section>

      <LiveKPICards metrics={metrics} />

      <div className={styles.mainGrid}>
        <OperationalMap deliverers={deliverers} />

        <aside className={styles.sidebar}>
          <ExceptionTriage exceptions={exceptions} onResolve={resolveException} />
          <ScannerLiveFeed events={events} />
        </aside>
      </div>

      <TeamRoster team={team} />
    </PortalLayout>
  );
}
