import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import type { Invoice } from '../../../data/financialInvoicesData';
import { formatCurrency, formatDate } from '../../../data/financialInvoicesData';
import { exportInvoiceDetailsToPDF } from '../utils/pdfExport';

interface InvoiceDetailsModalProps {
  invoice: Invoice;
  onClose: () => void;
}

/**
 * Ported from components/invoice-details-modal.tsx (1,026 lines in the Next.js
 * source), which fetched full invoice/deduction line items from a real BFF
 * endpoint. This SPA's Invoice mock shape carries only the list-level fields
 * (no per-stop line items or deduction breakdown from a backend), so the
 * layout is kept — vendor/invoice detail cards, totals, balance-due banner —
 * but line items and deductions are omitted rather than fabricated.
 */
export function InvoiceDetailsModal({ invoice, onClose }: InvoiceDetailsModalProps) {
  useModalBehavior(onClose, true);

  return createPortal(
    <div className="fi-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fi-modal fi-modal--details" role="dialog" aria-modal="true">
        <div className="fi-modal-header">
          <h2>Invoice Details</h2>
          <button type="button" className="fi-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="fi-modal-body">
          <div className="fi-details-top">
            <div>
              <h3 className="fi-details-company">Logixsphere Self Billing</h3>
              <p className="fi-details-sub">Self Billing Invoice</p>
            </div>
            <div className="fi-details-number">
              <p className="fi-details-number-label">Invoice #</p>
              <p className="fi-details-number-value">{invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="fi-details-grid">
            <div className="fi-details-card">
              <div className="fi-details-card-head">
                <i className="bi bi-person-fill" /> Vendor Details
              </div>
              <div className="fi-details-card-body">
                <div><span>Name:</span> <strong>{invoice.courier}</strong></div>
                <div><span>Service Partner:</span> <strong>{invoice.servicePartnerName || '—'}</strong></div>
                {invoice.userId != null && <div><span>Vendor ID:</span> <strong>{invoice.userId}</strong></div>}
              </div>
            </div>
            <div className="fi-details-card">
              <div className="fi-details-card-head">
                <i className="bi bi-calendar-fill" /> Invoice Details
              </div>
              <div className="fi-details-card-body">
                <div><span>Period:</span> <strong>{formatDate(invoice.referenceDate)}</strong></div>
                <div><span>Created On:</span> <strong>{formatDate(invoice.invoiceCreatedOn)}</strong></div>
                <div><span>Total Stops:</span> <strong>{invoice.totalStops ?? '—'}</strong></div>
              </div>
            </div>
          </div>

          <div className="fi-details-total-banner">
            <span>Total Payment</span>
            <span>£{formatCurrency(invoice.totalPayment)}</span>
          </div>
        </div>

        <div className="fi-modal-footer">
          <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
            Close
          </button>
          <button type="button" className="styled-button styled-button--primary" onClick={() => exportInvoiceDetailsToPDF(invoice)}>
            <i className="bi bi-file-earmark-pdf" /> Export PDF
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
