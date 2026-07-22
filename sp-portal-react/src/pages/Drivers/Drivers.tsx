import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import styles from './Drivers.module.css';

export function Drivers() {
  useViewportAttribute();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Drivers</h1>
        <p className={styles.subtitle}>Manage your Drivers operations</p>
      </div>

      <div className={styles.contentSection}>
        <p>This page is under construction.</p>
        <p>Data management and UI components will be added as part of the ongoing implementation.</p>
      </div>
    </div>
  );
}
