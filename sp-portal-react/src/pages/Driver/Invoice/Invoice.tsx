import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { MOCK_INVOICES, gbp, type DriverInvoice } from '../data/driverMockData';
import styles from './Invoice.module.css';

/** Maps an invoice's workflow status to the CSS class for its color-coded pill. */
function statusClass(status: DriverInvoice['status']): string {
  if (status === 'Paid') return styles.statusPaid;
  if (status === 'Scheduled for Payment') return styles.statusScheduled;
  return styles.statusInvoiced;
}

function formatPayDate(payDate: string | null): string | null {
  if (!payDate) return null;
  return new Date(payDate).toLocaleDateString('en-GB');
}

/** Driver Portal — Invoices tab. Read-only mobile card list of the driver's
 *  invoices; "Download" is a mocked action (toast only, no real file). */
export function DriverInvoice() {
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  function toast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2500);
  }

  function handleDownload(invoice: DriverInvoice) {
    toast(`⬇ Downloading invoice for ${invoice.id}…`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Invoices</h1>
        <p>Your billing periods and payment status</p>
      </header>

      <ul className={styles.list}>
        {MOCK_INVOICES.map((invoice) => {
          const payDateLabel = formatPayDate(invoice.payDate);
          return (
            <li key={invoice.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.period}>
                  <span className={styles.periodLabel}>{invoice.period}</span>
                  <span className={styles.invoiceId}>{invoice.id}</span>
                </div>
                <span className={`${styles.statusPill} ${statusClass(invoice.status)}`}>{invoice.status}</span>
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.amountBlock}>
                  <span className={styles.amount}>{gbp(invoice.amount)}</span>
                  {payDateLabel && <span className={styles.payDate}>Paid on {payDateLabel}</span>}
                </div>
                <button type="button" className={styles.downloadBtn} onClick={() => handleDownload(invoice)} aria-label={`Download invoice ${invoice.id}`}>
                  <Download size={16} />
                  <span>Download</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={`${styles.toast}${toastVisible ? ` ${styles.toastVisible}` : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
}
