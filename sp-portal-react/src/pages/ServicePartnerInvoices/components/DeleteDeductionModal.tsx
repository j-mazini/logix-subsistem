// Ported from the Next.js source's DeleteDeductionModal.tsx. Deletion is
// synchronous against the local mock store, so `deleting` only models the
// button's disabled-while-in-flight affordance for UX parity.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import { deleteDeduction, type Deduction } from '../../../data/servicePartnerInvoicesData';
import { formatDeductionReference, formatGbp } from '../utils/format';

interface Props {
  deduction: Deduction;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteDeductionModal({ deduction, onClose, onSuccess }: Props) {
  useModalBehavior(onClose, true);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = () => {
    setDeleting(true);
    deleteDeduction(deduction.service_partner_deduction_id);
    onSuccess();
    onClose();
  };

  return createPortal(
    <div className="spi-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="spi-modal spi-modal--xs" role="dialog" aria-modal="true">
        <div className="spi-modal-header">
          <h2>Delete Deduction</h2>
          <button type="button" className="spi-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="spi-modal-body">
          <div className="spi-alert spi-alert--danger">
            <i className="bi bi-exclamation-triangle-fill" />
            <p>Are you sure you want to delete this deduction? This action cannot be undone.</p>
          </div>

          <div className="spi-summary-box">
            <div className="spi-summary-row">
              <span>Reference</span>
              <span className="fw-semibold">
                {formatDeductionReference({
                  service_partner_deduction_id: deduction.service_partner_deduction_id,
                  deduction_amount: deduction.deduction_amount,
                  reimbursements_amount: deduction.reimbursements_amount,
                })}
              </span>
            </div>
            <div className="spi-summary-row">
              <span>Service Partner</span>
              <span className="fw-semibold">{deduction.service_partner_name || '—'}</span>
            </div>
            <div className="spi-summary-row">
              <span>Amount</span>
              <span className="fw-semibold spi-text-red">{formatGbp(deduction.deduction_amount)}</span>
            </div>
          </div>
        </div>
        <div className="spi-modal-footer">
          <button type="button" className="spi-btn spi-btn--outline" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="spi-btn spi-btn--danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
