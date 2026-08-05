import styles from '../TraceQueries.module.css';

export function KpiCard({ icon, color, bg, title, value, isActive, onSelect, pulse }: {
  icon: string; color: string; bg: string; title: string; value: string; isActive: boolean; onSelect: () => void;
  /** Shows a small blinking dot next to the title — reserved for counts that need urgent attention. */
  pulse?: boolean;
}) {
  return (
    <div
      className={`liquid-glass-surface ${styles.kpiCard} ${isActive ? styles.kpiCardActive : ''}`}
      onClick={onSelect} role="button" tabIndex={0}
    >
      <div className={styles.kpiIcon} style={{ background: bg, color }}>
        <i className={`bi ${icon}`} />
      </div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiTitle}>
          {title}
          {pulse && <span className={styles.kpiPulseDot} />}
        </div>
        <div className={styles.kpiValue}>{value}</div>
      </div>
    </div>
  );
}
