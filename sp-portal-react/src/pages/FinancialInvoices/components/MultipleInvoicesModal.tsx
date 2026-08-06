import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import {
  SERVICE_PARTNERS,
  INVOICE_VENDORS,
  addInvoices,
  invoiceExistsForPeriod,
  type Invoice,
} from '../../../data/financialInvoicesData';

interface MultipleInvoicesModalProps {
  onClose: () => void;
  onCreated: (invoices: Invoice[]) => void;
}

interface DraftRow {
  vendorId: number;
  selected: boolean;
  totalStops: string;
  totalPayment: string;
}

/**
 * Ported from components/multiple-invoices-modal.tsx (1,813 lines): the
 * source built a spreadsheet-like batch-create grid, validating each row
 * against SPMS/backend rules before a bulk POST. This port keeps the
 * spreadsheet-grid UX — pick a period, tick vendors, fill stops/payment per
 * row — but validates and appends against the local mock store instead of a
 * real batch API.
 */
export function MultipleInvoicesModal({ onClose, onCreated }: MultipleInvoicesModalProps) {
  useModalBehavior(onClose, true);

  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rows, setRows] = useState<DraftRow[]>(() =>
    INVOICE_VENDORS.map((v) => ({ vendorId: v.userId, selected: false, totalStops: '', totalPayment: '' })),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vendorById = useMemo(() => new Map(INVOICE_VENDORS.map((v) => [v.userId, v])), []);

  function updateRow(vendorId: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.vendorId === vendorId ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError('Select at least one vendor.');
      return;
    }

    const toCreate: Array<Omit<Invoice, 'invoiceId'>> = [];
    for (const row of selected) {
      const vendor = vendorById.get(row.vendorId);
      if (!vendor) continue;
      const stops = Number(row.totalStops);
      const payment = Number(row.totalPayment);
      if (!row.totalStops || Number.isNaN(stops) || stops < 0) {
        setError(`Enter a valid number of stops for ${vendor.fullName}.`);
        return;
      }
      if (!row.totalPayment || Number.isNaN(payment) || payment <= 0) {
        setError(`Enter a valid total payment for ${vendor.fullName}.`);
        return;
      }
      if (invoiceExistsForPeriod(vendor.fullName, period)) {
        setError(`An invoice already exists for ${vendor.fullName} in this period.`);
        return;
      }
      const servicePartnerName = SERVICE_PARTNERS.find((sp) => sp.servicePartnerId === vendor.servicePartnerId)?.partnerName;
      const [year, month] = period.split('-').map(Number);
      toCreate.push({
        invoiceNumber: `INV-${period}-${vendor.userId}`,
        courier: vendor.fullName,
        invoiceCreatedOn: new Date().toISOString().slice(0, 10),
        totalPayment: Math.round(payment * 100) / 100,
        referenceDate: `${year}-${String(month).padStart(2, '0')}-01`,
        totalStops: stops,
        servicePartnerName,
        userId: vendor.userId,
      });
    }

    setSubmitting(true);
    const created = addInvoices(toCreate);
    setSubmitting(false);
    onCreated(created);
    onClose();
  }

  const selectedCount = rows.filter((r) => r.selected).length;

  return createPortal(
    <div className="fi-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fi-modal fi-modal--multi" role="dialog" aria-modal="true">
        <div className="fi-modal-header">
          <h2>New Multiple Invoices</h2>
          <button type="button" className="fi-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fi-modal-body">
            {error && <div className="fi-form-error">{error}</div>}

            <label className="fi-field fi-field--inline">
              <span>Period</span>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
            </label>

            <div className="fi-multi-table-wrap">
              <table className="fi-multi-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Vendor</th>
                    <th>Service Partner</th>
                    <th>Total Stops</th>
                    <th>Total Payment (£)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const vendor = vendorById.get(row.vendorId);
                    if (!vendor) return null;
                    const spNameLabel = SERVICE_PARTNERS.find((sp) => sp.servicePartnerId === vendor.servicePartnerId)?.partnerName;
                    return (
                      <tr key={row.vendorId} className={row.selected ? 'fi-multi-row-selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => updateRow(row.vendorId, { selected: e.target.checked })}
                          />
                        </td>
                        <td>{vendor.fullName}</td>
                        <td className="fi-muted">{spNameLabel}</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            className="fi-multi-input"
                            value={row.totalStops}
                            disabled={!row.selected}
                            onChange={(e) => updateRow(row.vendorId, { totalStops: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="fi-multi-input"
                            value={row.totalPayment}
                            disabled={!row.selected}
                            onChange={(e) => updateRow(row.vendorId, { totalPayment: e.target.value })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fi-modal-footer">
            <span className="fi-multi-count">{selectedCount} vendor(s) selected</span>
            <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="styled-button styled-button--primary" disabled={submitting || selectedCount === 0}>
              {submitting ? 'Creating…' : `Create ${selectedCount || ''} Invoice(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
