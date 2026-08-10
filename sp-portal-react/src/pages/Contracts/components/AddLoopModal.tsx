import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import styles from './ContractModals.module.css';

export interface AddLoopFormState {
  loopName: string;
}

interface AddLoopModalProps {
  open: boolean;
  depotName: string;
  formData: AddLoopFormState;
  onChange: (updater: (f: AddLoopFormState) => AddLoopFormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
}

/** Middle of the hierarchy: create an empty loop inside a depot, with no routes yet. */
export function AddLoopModal({ open, depotName, formData, onChange, onClose, onSubmit, error }: AddLoopModalProps) {
  useModalBehavior(onClose, open);

  if (!open) return null;

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.overlay}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="addLoopTitle">
          <div className={styles.modalHeader}>
            <div>
              <h2 id="addLoopTitle" className={styles.modalTitle}>Add New Loop</h2>
              <p className={styles.modalSubtitle}>{depotName}</p>
            </div>
            <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div>
                <label className={styles.formLabel} htmlFor="newLoopNameOnly">
                  Loop Name <span className={styles.formRequired}>*</span>
                </label>
                <input
                  type="text"
                  id="newLoopNameOnly"
                  className={styles.formInput}
                  placeholder="e.g., Loop 3"
                  autoFocus
                  required
                  value={formData.loopName}
                  onChange={(e) => onChange((f) => ({ ...f, loopName: e.target.value }))}
                />
                {error && <div className={styles.formError}>{error}</div>}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Add Loop
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
