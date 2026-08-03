import React, { useMemo } from 'react';

export interface DashboardRecord {
  date: string;
  vendorId: number;
  name: string;
  route: string;
  routeId: number | null;
  isSupervisor: boolean;
}
export interface DashboardRoute {
  id: number;
  name: string;
}
export interface DashboardVendor {
  id: number;
  name: string;
}

interface DashboardStatsProps {
  weekDates: Date[];
  records: DashboardRecord[];
  routes: DashboardRoute[];
  vendors: DashboardVendor[];
}

function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWeekendDate(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  return (
    <div className={`wp-stat-card wp-stat-card--${color}`}>
      <div className="wp-stat-card-icon">
        <i className={`bi ${icon}`} />
      </div>
      <div className="wp-stat-card-body">
        <div className="wp-stat-card-value">{value}</div>
        <div className="wp-stat-card-title">{title}</div>
        {subtitle && <div className="wp-stat-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

function DayCard({ date, dayName, count, weekend }: { date: Date; dayName: string; count: number; weekend: boolean }) {
  return (
    <div className={`wp-day-stat-card${weekend ? ' is-weekend' : ''}`}>
      <div className="wp-day-stat-header">
        <span className="wp-day-stat-name">{dayName}</span>
        <span className="wp-day-stat-date">
          {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="wp-day-stat-count">{count}</div>
      <div className="wp-day-stat-label">assignments</div>
    </div>
  );
}

function AlertCard({ type, message }: { type: 'warning' | 'info' | 'success'; message: React.ReactNode }) {
  const icon = type === 'warning' ? 'bi-exclamation-triangle-fill' : type === 'info' ? 'bi-people-fill' : 'bi-check-circle-fill';
  return (
    <div className={`wp-alert-card wp-alert-card--${type}`}>
      <i className={`bi ${icon}`} />
      <div>{message}</div>
    </div>
  );
}

/** Week Planner Dashboard — ported from Next.js week-planner's components/Dashboard/ (mock data, no cost model in Phase 1). */
const DashboardStats: React.FC<DashboardStatsProps> = ({ weekDates, records, routes, vendors }) => {
  const stats = useMemo(() => {
    const weekDateStrs = weekDates.map(formatISO);
    const weekRecords = records.filter((r) => weekDateStrs.includes(r.date));

    const totalAssignments = weekRecords.length;
    const uniqueVendors = new Set(weekRecords.map((r) => r.vendorId)).size;

    const routeIdsWithAssignments = new Set(weekRecords.filter((r) => !r.isSupervisor && r.routeId != null).map((r) => r.routeId));
    const uniqueRoutes = routeIdsWithAssignments.size;
    const routesWithoutAssignments = routes.filter((r) => !routeIdsWithAssignments.has(r.id)).length;

    const teamLeaderDays = weekRecords.filter((r) => r.isSupervisor).length;
    const possibleTeamLeaderDays = weekDates.length;

    const assignmentsByDay = weekDates.map((date) => {
      const dateStr = formatISO(date);
      return {
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: weekRecords.filter((r) => r.date === dateStr).length,
        weekend: isWeekendDate(date),
      };
    });

    const vendorIdsWithAssignments = new Set(weekRecords.map((r) => r.vendorId));
    const vendorsWithoutAssignments = vendors.filter((v) => !vendorIdsWithAssignments.has(v.id)).length;

    return {
      totalAssignments,
      uniqueVendors,
      totalVendors: vendors.length,
      uniqueRoutes,
      totalRoutes: routes.length,
      routesWithoutAssignments,
      vendorsWithoutAssignments,
      teamLeaderDays,
      possibleTeamLeaderDays,
      assignmentsByDay,
    };
  }, [weekDates, records, routes, vendors]);

  return (
    <div className="wp-dashboard">
      <div className="wp-dashboard-header">
        <h2>Week Planner Dashboard</h2>
        <p>
          {weekDates.length > 0 &&
            `${String(weekDates[0].getDate()).padStart(2, '0')}/${String(weekDates[0].getMonth() + 1).padStart(2, '0')}/${weekDates[0].getFullYear()} - ${String(
              weekDates[weekDates.length - 1].getDate(),
            ).padStart(2, '0')}/${String(weekDates[weekDates.length - 1].getMonth() + 1).padStart(2, '0')}/${weekDates[weekDates.length - 1].getFullYear()}`}
        </p>
      </div>

      <div className="wp-stat-grid">
        <StatCard title="Total Assignments" value={stats.totalAssignments} icon="bi-check-circle-fill" color="green" />
        <StatCard title="Active Vendors" value={stats.uniqueVendors} subtitle={`of ${stats.totalVendors} total`} icon="bi-people-fill" color="blue" />
        <StatCard title="Active Routes" value={stats.uniqueRoutes} subtitle={`of ${stats.totalRoutes} total`} icon="bi-signpost-2-fill" color="purple" />
        <StatCard
          title="Team Leader Coverage"
          value={stats.teamLeaderDays}
          subtitle={`of ${stats.possibleTeamLeaderDays} days`}
          icon="bi-person-badge-fill"
          color="orange"
        />
      </div>

      <div className="wp-dashboard-section">
        <h3>
          <i className="bi bi-calendar3" /> Assignments by Day
        </h3>
        <div className="wp-day-stat-grid">
          {stats.assignmentsByDay.map((day) => (
            <DayCard key={formatISO(day.date)} date={day.date} dayName={day.dayName} count={day.count} weekend={day.weekend} />
          ))}
        </div>
      </div>

      <div className="wp-dashboard-section">
        <h3>
          <i className="bi bi-exclamation-circle" /> Alerts &amp; Warnings
        </h3>
        <div className="wp-alert-list">
          {stats.routesWithoutAssignments > 0 && (
            <AlertCard
              type="warning"
              message={
                <>
                  <strong>{stats.routesWithoutAssignments} routes</strong> without assignments
                </>
              }
            />
          )}
          {stats.vendorsWithoutAssignments > 0 && (
            <AlertCard
              type="info"
              message={
                <>
                  <strong>{stats.vendorsWithoutAssignments} vendors</strong> available without assignments
                </>
              }
            />
          )}
          {stats.routesWithoutAssignments === 0 && stats.vendorsWithoutAssignments === 0 && (
            <AlertCard type="success" message="All routes have assignments!" />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
