import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import styles from './ContractModals.module.css';

interface AddDepotModalProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
}

/** Top of the hierarchy: create an empty depot, with no loops or routes yet. */
export function AddDepotModal({ open, value, onChange, onClose, onSubmit, error }: AddDepotModalProps) {
  useModalBehavior(onClose, open);

  if (!open) return null;

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.overlay}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="addDepotTitle">
          <div className={styles.modalHeader}>
            <h2 id="addDepotTitle" className={styles.modalTitle}>Add New Depot</h2>
            <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div>
                <label className={styles.formLabel} htmlFor="newDepotNameOnly">
                  Depot Name <span className={styles.formRequired}>*</span>
                </label>
                <input
                  type="text"
                  id="newDepotNameOnly"
                  className={styles.formInput}
                  placeholder="e.g., North Depot"
                  autoFocus
                  required
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                />
                {error && <div className={styles.formError}>{error}</div>}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Add Depot
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
