import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

export interface AddRouteFormState {
  depotName: string;
  isNewDepot: boolean;
  loopName: string;
  isNewLoop: boolean;
  routeName: string;
  type: string;
  driver: string;
  target: string;
}

interface AddRouteModalProps {
  open: boolean;
  formData: AddRouteFormState;
  onChange: (updater: (f: AddRouteFormState) => AddRouteFormState) => void;
  depots: string[];
  loops: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error?: string;
}

export function AddRouteModal({ open, formData, onChange, depots, loops, onClose, onSubmit, error }: AddRouteModalProps) {
  useModalBehavior(onClose, open);

  if (!open) return null;

  return createPortal(
    <div className="vp-modal-backdrop" onClick={onClose}>
      <div className="vp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="addRouteTitle">
        <div className="vp-modal-header">
          <h2 id="addRouteTitle">Add New Route</h2>
          <button type="button" className="vp-modal-close" aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="vp-modal-body">
            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Depot</h3>
              <div className="vp-form-grid-2">
                <div>
                  <label className="vp-form-label" htmlFor="depotSelect">
                    Depot <span className="vp-form-required">*</span>
                  </label>
                  <select
                    id="depotSelect"
                    className="vp-form-select"
                    value={formData.isNewDepot ? '__new__' : formData.depotName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__new__') {
                        onChange((f) => ({ ...f, isNewDepot: true, depotName: '', loopName: '', isNewLoop: true }));
                      } else {
                        onChange((f) => ({ ...f, isNewDepot: false, depotName: value, loopName: '', isNewLoop: true }));
                      }
                    }}
                  >
                    <option value="">Select Depot</option>
                    {depots.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="__new__">+ New Depot…</option>
                  </select>
                </div>
                {formData.isNewDepot && (
                  <div>
                    <label className="vp-form-label" htmlFor="newDepotName">
                      New Depot Name <span className="vp-form-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="newDepotName"
                      className="vp-form-input"
                      placeholder="e.g., North Depot"
                      required
                      value={formData.depotName}
                      onChange={(e) => onChange((f) => ({ ...f, depotName: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Loop</h3>
              <div className="vp-form-grid-2">
                <div>
                  <label className="vp-form-label" htmlFor="loopSelect">
                    Loop <span className="vp-form-required">*</span>
                  </label>
                  <select
                    id="loopSelect"
                    className="vp-form-select"
                    disabled={formData.isNewDepot}
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
                    <label className="vp-form-label" htmlFor="newLoopName">
                      New Loop Name <span className="vp-form-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="newLoopName"
                      className="vp-form-input"
                      placeholder="e.g., Loop 3"
                      required
                      value={formData.loopName}
                      onChange={(e) => onChange((f) => ({ ...f, loopName: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Route Details</h3>
              <div className="vp-form-grid-2">
                <div>
                  <label className="vp-form-label" htmlFor="routeName">
                    Route Name <span className="vp-form-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="routeName"
                    className="vp-form-input"
                    placeholder="e.g., Route 12"
                    required
                    value={formData.routeName}
                    onChange={(e) => onChange((f) => ({ ...f, routeName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="routeType">
                    Type
                  </label>
                  <select
                    id="routeType"
                    className="vp-form-select"
                    value={formData.type}
                    onChange={(e) => onChange((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="Child">Child</option>
                    <option value="Standard">Standard</option>
                    <option value="Parent">Parent</option>
                  </select>
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="routeDriver">
                    Driver
                  </label>
                  <input
                    type="text"
                    id="routeDriver"
                    className="vp-form-input"
                    placeholder="Optional"
                    value={formData.driver}
                    onChange={(e) => onChange((f) => ({ ...f, driver: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="routeTarget">
                    Target
                  </label>
                  <input
                    type="number"
                    id="routeTarget"
                    className="vp-form-input"
                    min={0}
                    step={1}
                    placeholder="0"
                    value={formData.target}
                    onChange={(e) => onChange((f) => ({ ...f, target: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {error && <div className="vp-form-label" style={{ color: '#dc2626' }}>{error}</div>}
          </div>

          <div className="vp-modal-footer">
            <button type="button" className="vp-modal-btn vp-modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="vp-modal-btn vp-modal-btn-save">
              Add Route
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
