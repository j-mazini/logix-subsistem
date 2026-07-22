import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { dashboardMetrics, routeMetrics, operationalAlerts } from '../../data/dashboardData';
import styles from './Dashboard.module.css';

export function Dashboard() {
  useViewportAttribute();

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back to your service provider dashboard</p>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active Deliveries</div>
          <div className={styles.metricValue}>{dashboardMetrics.activeDeliveries.toLocaleString()}</div>
          <div className={styles.metricTrend}>+12.5% from yesterday</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Routes Running</div>
          <div className={styles.metricValue}>{dashboardMetrics.routesRunning}</div>
          <div className={styles.metricTrend}>All on schedule</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Fleet Status</div>
          <div className={styles.metricValue}>{dashboardMetrics.fleetStatus}%</div>
          <div className={styles.metricTrend}>Vehicles available</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>On-Time Rate</div>
          <div className={styles.metricValue}>{dashboardMetrics.onTimeRate}%</div>
          <div className={styles.metricTrend}>+2.1% improvement</div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Route Performance</h2>
        <div className={styles.routeTable}>
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Deliveries</th>
                <th>On-Time %</th>
                <th>Vehicles</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {routeMetrics.map((route) => (
                <tr key={route.name}>
                  <td>{route.name}</td>
                  <td>{route.deliveries}</td>
                  <td>{route.onTimePercentage}%</td>
                  <td>{route.vehicles}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status-${route.status}`]}`}>
                      {route.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Operational Alerts</h2>
        <div className={styles.alertsList}>
          {operationalAlerts.map((alert) => (
            <div key={alert.id} className={`${styles.alertItem} ${styles[`alert-${alert.type}`]}`}>
              <div className={styles.alertIcon}>{alert.type === 'error' ? '⚠️' : alert.type === 'warning' ? '⚡' : 'ℹ️'}</div>
              <div className={styles.alertContent}>
                <div className={styles.alertTitle}>{alert.title}</div>
                <div className={styles.alertDescription}>{alert.description}</div>
                <div className={styles.alertTime}>{alert.timestamp}</div>
              </div>
              <div className={styles.alertPriority}>
                <span className={`${styles.priorityBadge} ${styles[`priority-${alert.priority}`]}`}>
                  {alert.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
