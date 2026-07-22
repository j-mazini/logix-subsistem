import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { vehiclesData } from '../../data/dashboardData';
import styles from './Vehicles.module.css';

export function Vehicles() {
  useViewportAttribute();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fleet Management</h1>
        <p className={styles.subtitle}>Monitor your vehicle fleet status and maintenance</p>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <h2>Vehicles</h2>
          <button className={styles.actionButton}>+ Add Vehicle</button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>VRN</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Depot</th>
                <th>Status</th>
                <th>Mileage</th>
                <th>Last Service</th>
              </tr>
            </thead>
            <tbody>
              {vehiclesData.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className={styles.vrnCell}>{vehicle.vrn}</td>
                  <td>{vehicle.brand}</td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.depot}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status-${vehicle.status}`]}`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td>{vehicle.mileage.toLocaleString()} km</td>
                  <td>{vehicle.lastService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Fleet Statistics</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Vehicles</div>
            <div className={styles.statValue}>{vehiclesData.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>In Use</div>
            <div className={styles.statValue}>{vehiclesData.filter(v => v.status === 'in-use').length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Available</div>
            <div className={styles.statValue}>{vehiclesData.filter(v => v.status === 'available').length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Maintenance</div>
            <div className={styles.statValue}>{vehiclesData.filter(v => v.status === 'maintenance').length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
