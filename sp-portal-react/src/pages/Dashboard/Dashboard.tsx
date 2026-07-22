import { useViewportAttribute } from '../../hooks/useViewportAttribute';
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
          <div className={styles.metricValue}>2,847</div>
          <div className={styles.metricTrend}>+12.5% from yesterday</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Routes Running</div>
          <div className={styles.metricValue}>42</div>
          <div className={styles.metricTrend}>All on schedule</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Fleet Status</div>
          <div className={styles.metricValue}>98%</div>
          <div className={styles.metricTrend}>Vehicles available</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>On-Time Rate</div>
          <div className={styles.metricValue}>96.8%</div>
          <div className={styles.metricTrend}>+2.1% improvement</div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <button className={styles.actionButton}>View Routes</button>
          <button className={styles.actionButton}>Manage Vehicles</button>
          <button className={styles.actionButton}>Driver Assignments</button>
          <button className={styles.actionButton}>Performance Reports</button>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Recent Activity</h2>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <div className={styles.activityDot}></div>
            <div className={styles.activityContent}>
              <div className={styles.activityTitle}>Route MD7A completed</div>
              <div className={styles.activityTime}>2 hours ago</div>
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityDot}></div>
            <div className={styles.activityContent}>
              <div className={styles.activityTitle}>Vehicle AB12 CDE assigned</div>
              <div className={styles.activityTime}>5 hours ago</div>
            </div>
          </div>
          <div className={styles.activityItem}>
            <div className={styles.activityDot}></div>
            <div className={styles.activityContent}>
              <div className={styles.activityTitle}>New contract approved</div>
              <div className={styles.activityTime}>1 day ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
