import { useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { LiveKPICards } from './components/LiveKPICards/LiveKPICards';
import { OperationalMap } from './components/OperationalMap/OperationalMap';
import { TeamRoster } from './components/TeamRoster/TeamRoster';
import { DriverPerformanceModal } from './components/DriverPerformanceModal/DriverPerformanceModal';
import { useDailyVendorPerformance } from './hooks/useDailyVendorPerformance';
import { useLiveTracking } from './hooks/useLiveTracking';
import { useTeamStatus } from './hooks/useTeamStatus';
import styles from './LiveService.module.css';

export default function Page() {
  const { deliverers } = useLiveTracking();
  const { team } = useTeamStatus();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [performanceId, setPerformanceId] = useState<string | null>(null);

  const { kpiCards } = useDailyVendorPerformance(deliverers, selectedId);

  const selectedDeliverer = useMemo(
    () => (selectedId ? deliverers.find(d => d.id === selectedId) || null : null),
    [selectedId, deliverers]
  );

  const onRoute = useMemo(() => team.filter(m => m.routeStatus === 'departed').length, [team]);

  const lastUpdated = useMemo(
    () => deliverers.reduce((latest, d) => (d.lastUpdate > latest ? d.lastUpdate : latest), deliverers[0]?.lastUpdate ?? ''),
    [deliverers]
  );

  const performanceMember = useMemo(
    () => (performanceId ? team.find(m => m.id === performanceId) || null : null),
    [performanceId, team]
  );

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
              <strong key={onRoute} className={styles.pulse}>{onRoute}</strong> on route
            </span>
            {lastUpdated && (
              <span className={styles.timestamp}>
                {new Date(lastUpdated).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </div>
        </section>

        <div className={styles.kpiScopeRow}>
          <span className={styles.kpiScopeLabel}>
            {selectedDeliverer
              ? `${selectedDeliverer.vehiclePlate} · ${selectedDeliverer.routeName} — Today`
              : 'Fleet — Today'}
          </span>
          {selectedDeliverer && (
            <button type="button" className={styles.kpiScopeClear} onClick={() => setSelectedId(null)}>
              Back to fleet
            </button>
          )}
        </div>

        <LiveKPICards cards={kpiCards} />

        <div className={styles.mapSection}>
          <OperationalMap deliverers={deliverers} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <TeamRoster team={team} onSelect={setPerformanceId} />

        {performanceMember && (
          <DriverPerformanceModal member={performanceMember} onClose={() => setPerformanceId(null)} />
        )}
      </div>
    </PortalLayout>
  );
}
