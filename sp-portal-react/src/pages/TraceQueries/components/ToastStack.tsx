import type { ToastItem } from '../hooks/useToasts';
import styles from '../TraceQueries.module.css';

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[`toast${t.type.charAt(0).toUpperCase()}${t.type.slice(1)}`]}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
