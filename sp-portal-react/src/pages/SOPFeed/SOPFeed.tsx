import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import styles from './SOPFeed.module.css';

export function SOPFeed() {
  useViewportAttribute();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>SOPFeed</h1>
        <p className={styles.subtitle}>Manage your SOPFeed operations</p>
      </div>

      <div className={styles.contentSection}>
        <p>This page is under construction.</p>
        <p>Data management and UI components will be added as part of the ongoing implementation.</p>
      </div>
    </div>
  );
}
