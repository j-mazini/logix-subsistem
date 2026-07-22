import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { driversData } from '../../data/dashboardData';
import styles from './Drivers.module.css';

export function Drivers() {
  useViewportAttribute();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Driver Management</h1>
        <p className={styles.subtitle}>Manage driver assignments and performance</p>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <h2>Active Drivers</h2>
          <button className={styles.actionButton}>+ Add Driver</button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Depot</th>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {driversData.map((driver) => (
                <tr key={driver.id}>
                  <td className={styles.nameCell}>{driver.name}</td>
                  <td>{driver.email}</td>
                  <td>{driver.phone}</td>
                  <td>{driver.depot}</td>
                  <td>{driver.route}</td>
                  <td>{driver.vehicleAssigned}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status-${driver.status}`]}`}>
                      {driver.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Driver Statistics</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Drivers</div>
            <div className={styles.statValue}>{driversData.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={styles.statValue}>{driversData.filter(d => d.status === 'active').length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>On Leave</div>
            <div className={styles.statValue}>{driversData.filter(d => d.status === 'on-leave').length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Inactive</div>
            <div className={styles.statValue}>{driversData.filter(d => d.status === 'inactive').length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
