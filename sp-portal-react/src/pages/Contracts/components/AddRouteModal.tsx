import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';
import styles from './ContractModals.module.css';

export interface AddRouteFormState {
  loopName: string;
  isNewLoop: boolean;
  routeName: string;
  type: string;
  driver: string;
  target: string;
}

interface AddRouteModalProps {
  open: boolean;
  depotName: string;
  formData: AddRouteFormState;
  onChange: (updater: (f: AddRouteFormState) => AddRouteFormState) => void;
  loops: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
}

/**
 * Bottom of the hierarchy: create a route inside a known depot. The depot is
 * always fixed by the modal that opened this one (a depot card or its loop
 * tile) — only the loop and route details are ever chosen here, mirroring
 * AddLoopModal's "one level at a time" shape.
 */
export function AddRouteModal({ open, depotName, formData, onChange, loops, onClose, onSubmit, error }: AddRouteModalProps) {
  useModalBehavior(onClose, open);

  if (!open) return null;

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.overlay}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="addRouteTitle">
          <div className={styles.modalHeader}>
            <div>
              <h2 id="addRouteTitle" className={styles.modalTitle}>Add New Route</h2>
              <p className={styles.modalSubtitle}>{depotName}</p>
            </div>
            <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGrid2}>
                <div>
                  <label className={styles.formLabel} htmlFor="loopSelect">
                    Loop <span className={styles.formRequired}>*</span>
                  </label>
                  <select
                    id="loopSelect"
                    className={styles.formSelect}
                    value={formData.isNewLoop ? '__new__' : formData.loopName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__new__') {
                        onChange((f) => ({ ...f, isNewLoop: true, loopName: '' }));
                      } else {
                        onChange((f) => ({ ...f, isNewLoop: false, loopName: value }));
                      }
                    }}
                  >
                    <option value="">Select Loop</option>
                    {loops.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                    <option value="__new__">+ New Loop…</option>
                  </select>
                </div>
                {formData.isNewLoop && (
                  <div>
                    <label className={styles.formLabel} htmlFor="newLoopName">
                      New Loop Name <span className={styles.formRequired}>*</span>
                    </label>
                    <input
                      type="text"
                      id="newLoopName"
                      className={styles.formInput}
                      placeholder="e.g., Loop 3"
                      required
                      value={formData.loopName}
                      onChange={(e) => onChange((f) => ({ ...f, loopName: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <label className={styles.formLabel} htmlFor="routeName">
                    Route Name <span className={styles.formRequired}>*</span>
                  </label>
                  <input
                    type="text"
                    id="routeName"
                    className={styles.formInput}
                    placeholder="e.g., Route 12"
                    required
                    value={formData.routeName}
                    onChange={(e) => onChange((f) => ({ ...f, routeName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={styles.formLabel} htmlFor="routeType">
                    Type
                  </label>
                  <select
                    id="routeType"
                    className={styles.formSelect}
                    value={formData.type}
                    onChange={(e) => onChange((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="Child">Child</option>
                    <option value="Standard">Standard</option>
                    <option value="Parent">Parent</option>
                  </select>
                </div>
                <div>
                  <label className={styles.formLabel} htmlFor="routeDriver">
                    Driver
                  </label>
                  <input
                    type="text"
                    id="routeDriver"
                    className={styles.formInput}
                    placeholder="Optional"
                    value={formData.driver}
                    onChange={(e) => onChange((f) => ({ ...f, driver: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={styles.formLabel} htmlFor="routeTarget">
                    Target
                  </label>
                  <input
                    type="number"
                    id="routeTarget"
                    className={styles.formInput}
                    min={0}
                    step={1}
                    placeholder="0"
                    value={formData.target}
                    onChange={(e) => onChange((f) => ({ ...f, target: e.target.value }))}
                  />
                </div>
              </div>

              {error && <div className={styles.formError}>{error}</div>}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Add Route
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
