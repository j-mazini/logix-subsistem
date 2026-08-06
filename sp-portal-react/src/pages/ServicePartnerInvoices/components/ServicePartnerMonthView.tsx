// Ported from the Next.js source's ServicePartnerMonthView.tsx. The source
// loaded a full invoice-with-items by id via `fetchServicePartnerInvoiceById`
// before showing the document/downloading — this SPA's mock invoices already
// carry their items/deductions in full, so "View"/"Download" read directly
// from the local store instead of an async fetch.
import { useState } from 'react';
import type { Invoice } from '../../../data/servicePartnerInvoicesData';
import { formatGbp } from '../utils/format';
import { exportSingleServicePartnerInvoiceToPDF } from '../utils/pdfExport';
import { ServicePartnerInvoiceModal } from './ServicePartnerInvoiceModal';

interface Props {
  invoices: Invoice[];
}

export function ServicePartnerMonthView({ invoices }: Props) {
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleDownload = async (inv: Invoice) => {
    const key = `${inv.servicePartnerId}-${inv.date}`;
    setDownloadingKey(key);
    try {
      await exportSingleServicePartnerInvoiceToPDF(inv);
    } finally {
      setDownloadingKey(null);
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amountTotal, 0);
  const partnerCount = new Set(invoices.map((inv) => inv.servicePartnerId)).size;

  return (
    <>
      <div className="spi-stats-grid spi-stats-grid--two">
        <div className="spi-summary-card">
          <div>
            <p className="spi-summary-label">Total Amount</p>
            <p className="spi-summary-value spi-summary-value--blue">{formatGbp(totalAmount)}</p>
          </div>
          <div className="spi-summary-icon spi-summary-icon--blue">
            <i className="bi bi-currency-pound" />
          </div>
        </div>
        <div className="spi-summary-card">
          <div>
            <p className="spi-summary-label">Service Partners</p>
            <p className="spi-summary-value spi-summary-value--green">{partnerCount}</p>
          </div>
          <div className="spi-summary-icon spi-summary-icon--green">
            <i className="bi bi-people-fill" />
          </div>
        </div>
      </div>

      <div className="spi-table-card">
        <div className="spi-table-scroll">
          <table className="spi-table spi-table--main">
            <thead>
              <tr>
                <th>Service Partner</th>
                <th>Company</th>
                <th className="text-end">Total Amount</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="spi-table-empty">No invoices for this period</td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const key = `${inv.servicePartnerId}-${inv.date}`;
                  return (
                    <tr key={key}>
                      <td className="fw-semibold">{inv.servicePartnerName}</td>
                      <td>{inv.companyName}</td>
                      <td className="text-end fw-semibold">{formatGbp(inv.amountTotal)}</td>
                      <td className="text-end">
                        <div className="spi-row-actions">
                          <button type="button" className="spi-btn spi-btn--primary spi-btn--sm" onClick={() => setActiveInvoice(inv)}>
                            View
                          </button>
                          <button
                            type="button"
                            className="spi-icon-btn"
                            disabled={downloadingKey === key}
                            title="Download PDF"
                            aria-label="Download PDF"
                            onClick={() => handleDownload(inv)}
                          >
                            <i className={downloadingKey === key ? 'bi bi-arrow-repeat spi-spin' : 'bi bi-download'} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeInvoice && <ServicePartnerInvoiceModal invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />}
    </>
  );
}
