import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import {
  SERVICE_PARTNERS,
  INVOICE_VENDORS,
  addInvoice,
  invoiceExistsForPeriod,
  type Invoice,
} from '../../../data/financialInvoicesData';

interface NewInvoiceModalProps {
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}

/**
 * Ported from components/new-invoice-modal.tsx (1,560 lines): the source
 * validated against a real SPMS backend (isSpms flag, invoice-already-exists
 * lookups over the API). Here validation runs against the local mock store
 * (`invoiceExistsForPeriod`) instead — same UX (block duplicate
 * vendor+period, require the core fields), no backend round trip.
 */
export function NewInvoiceModal({ onClose, onCreated }: NewInvoiceModalProps) {
  useModalBehavior(onClose, true);

  const [vendorId, setVendorId] = useState('');
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totalStops, setTotalStops] = useState('');
  const [totalPayment, setTotalPayment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vendor = INVOICE_VENDORS.find((v) => String(v.userId) === vendorId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vendor) {
      setError('Select a vendor.');
      return;
    }
    if (!period) {
      setError('Select a period.');
      return;
    }
    const stops = Number(totalStops);
    const payment = Number(totalPayment);
    if (!totalStops || Number.isNaN(stops) || stops < 0) {
      setError('Enter a valid number of stops.');
      return;
    }
    if (!totalPayment || Number.isNaN(payment) || payment <= 0) {
      setError('Enter a valid total payment.');
      return;
    }
    if (invoiceExistsForPeriod(vendor.fullName, period)) {
      setError(`An invoice already exists for ${vendor.fullName} in this period.`);
      return;
    }

    setSubmitting(true);
    const servicePartnerName = SERVICE_PARTNERS.find((sp) => sp.servicePartnerId === vendor.servicePartnerId)?.partnerName;
    const [year, month] = period.split('-').map(Number);
    const now = new Date();
    const created = addInvoice({
      invoiceNumber: `INV-${period}-${vendor.userId}`,
      courier: vendor.fullName,
      invoiceCreatedOn: now.toISOString().slice(0, 10),
      totalPayment: Math.round(payment * 100) / 100,
      referenceDate: `${year}-${String(month).padStart(2, '0')}-01`,
      totalStops: stops,
      servicePartnerName,
      userId: vendor.userId,
    });
    setSubmitting(false);
    onCreated(created);
    onClose();
  }

  return createPortal(
    <div className="fi-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fi-modal fi-modal--form" role="dialog" aria-modal="true">
        <div className="fi-modal-header">
          <h2>New Single Invoice</h2>
          <button type="button" className="fi-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fi-modal-body fi-form-grid">
            {error && <div className="fi-form-error">{error}</div>}

            <label className="fi-field">
              <span>Vendor</span>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                <option value="">Select vendor…</option>
                {INVOICE_VENDORS.map((v) => (
                  <option key={v.userId} value={v.userId}>
                    {v.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className="fi-field">
              <span>Period</span>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
            </label>

            <label className="fi-field">
              <span>Total Stops</span>
              <input type="number" min={0} value={totalStops} onChange={(e) => setTotalStops(e.target.value)} required />
            </label>

            <label className="fi-field">
              <span>Total Payment (£)</span>
              <input type="number" min={0} step="0.01" value={totalPayment} onChange={(e) => setTotalPayment(e.target.value)} required />
            </label>
          </div>

          <div className="fi-modal-footer">
            <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="styled-button styled-button--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
