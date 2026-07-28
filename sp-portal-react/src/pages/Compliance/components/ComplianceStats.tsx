import { useMemo } from 'react';
import { UserProfile, VettingRecord, WorkforceTab } from '../types/compliance';

interface ComplianceStatsProps {
  profiles: UserProfile[];
  vettings: VettingRecord[];
  activeTab: WorkforceTab;
  onTabChange: (tab: WorkforceTab) => void;
}

/**
 * KPI cards for the Profiles tab (the Vetting tab has its own KPIs — it
 * embeds the real Vetting dashboard, so this component is only rendered
 * while activeTab === 'compliance').
 */
export function ComplianceStats({ profiles, activeTab, onTabChange }: ComplianceStatsProps) {
  const stats = useMemo(() => {
    const completed = profiles.filter((p) => p.vettingStatus === 'completed').length;
    const inProgress = profiles.filter((p) => p.vettingStatus === 'in-progress').length;
    const pending = profiles.filter((p) => p.vettingStatus === 'pending').length;
    const rejected = profiles.filter((p) => p.vettingStatus === 'rejected').length;
    const avgScore =
      profiles.length > 0
        ? Math.round(profiles.reduce((sum, p) => sum + p.complianceScore, 0) / profiles.length)
        : 0;

    return { total: profiles.length, completed, inProgress, pending, rejected, avgScore };
  }, [profiles]);

  return (
    <section className="compliance-stats-grid">
      <button type="button" className="stat-card" onClick={() => onTabChange(activeTab)}>
        <p className="stat-value">{stats.total}</p>
        <p className="stat-label">Total profiles</p>
      </button>
      <button type="button" className="stat-card" onClick={() => onTabChange(activeTab)}>
        <p className="stat-value stat-success">{stats.completed}</p>
        <p className="stat-label">Completed</p>
      </button>
      <button type="button" className="stat-card" onClick={() => onTabChange(activeTab)}>
        <p className="stat-value stat-warning">{stats.inProgress}</p>
        <p className="stat-label">In progress</p>
      </button>
      <button type="button" className="stat-card" onClick={() => onTabChange(activeTab)}>
        <p className="stat-value stat-danger">{stats.rejected}</p>
        <p className="stat-label">Rejected</p>
      </button>
      <div className="stat-card stat-card-large">
        <p className="stat-value stat-info">{stats.avgScore}%</p>
        <p className="stat-label">Average compliance</p>
        <div className="stat-progress-bar">
          <div className="stat-progress-fill" style={{ width: `${stats.avgScore}%` }} />
        </div>
      </div>
    </section>
  );
}
