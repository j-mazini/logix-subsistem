import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import styles from './VettingAdmin.module.css';

export function VettingAdmin() {
  useViewportAttribute();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>VettingAdmin</h1>
        <p className={styles.subtitle}>Manage your VettingAdmin operations</p>
      </div>

      <div className={styles.contentSection}>
        <p>This page is under construction.</p>
        <p>Data management and UI components will be added as part of the ongoing implementation.</p>
      </div>
    </div>
  );
}
