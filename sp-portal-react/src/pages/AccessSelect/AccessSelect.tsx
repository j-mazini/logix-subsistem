import { useNavigate } from 'react-router-dom';
import styles from './AccessSelect.module.css';

export function AccessSelect() {
  const navigate = useNavigate();

  return (
    <div className={styles.accessSelectPage}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <i className="bi bi-grid-1x2-fill"></i>
        </div>
        <h1>Select Access</h1>
        <p>Choose your portal to get started</p>
      </div>

      <div className={styles.grid}>
        {/* DHL Administration Card */}
        <div className={styles.card} onClick={() => window.location.href = 'https://www.dhl.com'}>
          <div className={`${styles.icon} ${styles.iconDhl}`}>
            <i className="bi bi-building"></i>
          </div>
          <div className={styles.cardHeader}>
            <h2>DHL Administration</h2>
            <span className={`${styles.badge} ${styles.badgeDhl}`}>ADMIN</span>
          </div>
          <p className={styles.description}>
            Access the DHL administration portal for system management, reporting, and compliance tracking.
          </p>
          <ul className={styles.features}>
            <li>Global reporting & analytics</li>
            <li>Vendor management</li>
            <li>Performance metrics</li>
            <li>Compliance tracking</li>
          </ul>
          <button className={`${styles.cta} ${styles.ctaDhl}`}>
            <i className="bi bi-arrow-right"></i>
            Access Admin
          </button>
        </div>

        {/* Service Provider Portal Card */}
        <div className={styles.card} onClick={() => navigate('/login')}>
          <div className={`${styles.icon} ${styles.iconSp}`}>
            <i className="bi bi-truck"></i>
          </div>
          <div className={styles.cardHeader}>
            <h2>Service Provider Portal</h2>
            <span className={`${styles.badge} ${styles.badgeSp}`}>PORTAL</span>
          </div>
          <p className={styles.description}>
            Access your service provider portal to manage operations, drivers, vehicles, and routes.
          </p>
          <ul className={styles.features}>
            <li>Dashboard & KPIs</li>
            <li>Driver management</li>
            <li>Fleet management</li>
            <li>Financial insights</li>
          </ul>
          <button className={`${styles.cta} ${styles.ctaSp}`}>
            <i className="bi bi-arrow-right"></i>
            Access Portal
          </button>
        </div>
      </div>
    </div>
  );
}
