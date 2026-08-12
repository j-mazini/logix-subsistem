import { useDriverSession } from '../context/DriverSessionContext';
import styles from './Profile.module.css';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DriverProfile() {
  const { driver } = useDriverSession();

  return (
    <div className={styles.profilePage}>
      <div className={styles.header}>
        <div className={styles.avatar}>{getInitials(driver.fullName)}</div>
        <h1 className={styles.name}>{driver.fullName}</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Service Partner</span>
          <span className={styles.value}>{driver.servicePartnerName}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          <span className={styles.label}>Driver ID</span>
          <span className={styles.value}>{driver.userId}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          <span className={styles.label}>Vendor Type</span>
          <span className={styles.value}>{`Vendor Type #${driver.vendorTypeId}`}</span>
        </div>
      </div>

      <a className={styles.signOutLink} href="/driver-login">
        Sign out
      </a>
    </div>
  );
}
