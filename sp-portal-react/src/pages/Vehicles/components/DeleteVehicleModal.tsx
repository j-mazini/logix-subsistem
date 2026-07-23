import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

interface DeleteVehicleModalProps {
  vrn: string;
  isElectric: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteVehicleModal({ vrn, isElectric, onCancel, onConfirm }: DeleteVehicleModalProps) {
  useModalBehavior(onCancel);

  return createPortal(
    <div className="vp-modal-backdrop" onClick={onCancel}>
      <div className="vp-modal vp-modal-sm vp-modal-danger" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="deleteVehicleTitle">
        <button type="button" className="vp-modal-close vp-modal-close-floating" aria-label="Close" onClick={onCancel}>
          <i className="bi bi-x-lg" />
        </button>
        <div className="vp-modal-body vp-modal-danger-body">
          <div className="vp-modal-danger-icon">
            <i className="bi bi-exclamation-triangle-fill" />
          </div>
          <h5 id="deleteVehicleTitle" className="vp-modal-danger-title">
            Delete this vehicle?
          </h5>
          <p className="vp-modal-danger-text">
            You&apos;re about to remove{' '}
            <span className={`vp-vrn${isElectric ? ' vp-vrn-electric' : ''}`}>{vrn || '—'}</span> from the fleet.
          </p>
          <p className="vp-modal-danger-subtext">This action cannot be undone.</p>
        </div>
        <div className="vp-modal-footer">
          <button type="button" className="vp-modal-btn vp-modal-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="vp-modal-btn vp-modal-btn-delete" onClick={onConfirm} autoFocus>
            <i className="bi bi-trash-fill" />
            <span>Delete Vehicle</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
