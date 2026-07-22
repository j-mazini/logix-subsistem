import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import styles from './Vehicles.module.css';

export function Vehicles() {
  useViewportAttribute();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vehicles</h1>
        <p className={styles.subtitle}>Manage your Vehicles operations</p>
      </div>

      <div className={styles.contentSection}>
        <p>This page is under construction.</p>
        <p>Data management and UI components will be added as part of the ongoing implementation.</p>
      </div>
    </div>
  );
}
