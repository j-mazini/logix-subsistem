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
          <div className={styles.cardBody}>
            <div className={styles.cardHeader}>
              <h2>DHL Administration</h2>
              <span className={`${styles.badge} ${styles.badgeDhl}`}>ADMIN</span>
            </div>
            <p className={styles.description}>System management, reporting &amp; compliance tracking.</p>
          </div>
          <div className={`${styles.arrow} ${styles.arrowDhl}`}>
            <i className="bi bi-arrow-right"></i>
          </div>
        </div>

        {/* Service Provider Portal Card */}
        <div className={styles.card} onClick={() => navigate('/login')}>
          <div className={`${styles.icon} ${styles.iconSp}`}>
            <i className="bi bi-truck"></i>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardHeader}>
              <h2>Service Provider Portal</h2>
              <span className={`${styles.badge} ${styles.badgeSp}`}>PORTAL</span>
            </div>
            <p className={styles.description}>Manage operations, drivers, vehicles &amp; routes.</p>
          </div>
          <div className={`${styles.arrow} ${styles.arrowSp}`}>
            <i className="bi bi-arrow-right"></i>
          </div>
        </div>

        {/* Driver view Card */}
        <div className={styles.card} onClick={() => navigate('/driver-login')}>
          <div className={`${styles.icon} ${styles.iconDriver}`}>
            <i className="bi bi-person-badge"></i>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardHeader}>
              <h2>Driver view</h2>
              <span className={`${styles.badge} ${styles.badgeDriver}`}>DRIVER</span>
            </div>
            <p className={styles.description}>Earnings, deductions, invoices &amp; requests.</p>
          </div>
          <div className={`${styles.arrow} ${styles.arrowDriver}`}>
            <i className="bi bi-arrow-right"></i>
          </div>
        </div>

        {/* Driver Portal Card */}
        <div className={styles.card} onClick={() => navigate('/daily-performance-insight')}>
          <div className={`${styles.icon} ${styles.iconDriver}`}>
            <i className="bi bi-truck-front"></i>
          </div>
          <div className={styles.cardHeader}>
            <h2>Driver Portal</h2>
            <span className={`${styles.badge} ${styles.badgeDriver}`}>DRIVER</span>
          </div>
          <p className={styles.description}>
            Access your personal driver dashboard to view earnings, performance, deductions, and invoices.
          </p>
          <ul className={styles.features}>
            <li>Monthly earnings</li>
            <li>Performance insights</li>
            <li>Deductions & invoices</li>
            <li>Requests & schedule</li>
          </ul>
          <button className={`${styles.cta} ${styles.ctaDriver}`}>
            <i className="bi bi-arrow-right"></i>
            Access Driver Portal
          </button>
        </div>
      </div>
    </div>
  );
}
