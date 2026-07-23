import { createPortal } from 'react-dom';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

export interface VehicleFormState {
  vrn: string;
  brand: string;
  model: string;
  registrationDate: string;
  color: string;
  fuelType: string;
  vehicleType: string;
  depot: string;
  status: string;
  wrappedVehicle: boolean;
  slamLock: boolean;
  camera: boolean;
  gps: boolean;
  bulkhead: boolean;
  doors270: boolean;
  additionalNotes: string;
}

const TECHNICAL_FIELDS = [
  ['wrappedVehicle', 'Wrapped'],
  ['slamLock', 'Slam Lock'],
  ['camera', 'Camera'],
  ['gps', 'GPS'],
  ['bulkhead', 'Bulkhead'],
  ['doors270', '270° Doors'],
] as const;

interface VehicleFormModalProps {
  open: boolean;
  isEditing: boolean;
  formData: VehicleFormState;
  onChange: (updater: (f: VehicleFormState) => VehicleFormState) => void;
  depots: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function VehicleFormModal({ open, isEditing, formData, onChange, depots, onClose, onSubmit }: VehicleFormModalProps) {
  useModalBehavior(onClose, open);

  if (!open) return null;

  return createPortal(
    <div className="vp-modal-backdrop" onClick={onClose}>
      <div className="vp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vehicleFormTitle">
        <div className="vp-modal-header">
          <h2 id="vehicleFormTitle">{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
          <button type="button" className="vp-modal-close" aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="vp-modal-body">
            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Basic Information</h3>
              <div className="vp-form-grid-2">
                <div>
                  <label className="vp-form-label" htmlFor="vrn">
                    Registration Plate <span className="vp-form-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="vrn"
                    className="vp-form-input"
                    placeholder="e.g., AB12CDE"
                    required
                    minLength={1}
                    value={formData.vrn}
                    onChange={(e) => onChange((f) => ({ ...f, vrn: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="brand">
                    Manufacturer <span className="vp-form-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="brand"
                    className="vp-form-input"
                    placeholder="e.g., Ford, Toyota, BMW"
                    required
                    value={formData.brand}
                    onChange={(e) => onChange((f) => ({ ...f, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="model">
                    Model <span className="vp-form-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="model"
                    className="vp-form-input"
                    placeholder="e.g., Focus, Corolla"
                    required
                    value={formData.model}
                    onChange={(e) => onChange((f) => ({ ...f, model: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="registrationDate">
                    Registration Date <span className="vp-form-required">*</span>
                  </label>
                  <input
                    type="date"
                    id="registrationDate"
                    className="vp-form-input"
                    required
                    value={formData.registrationDate}
                    onChange={(e) => onChange((f) => ({ ...f, registrationDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="color">
                    Color <span className="vp-form-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="color"
                    className="vp-form-input"
                    placeholder="e.g., Blue, Red, Black"
                    required
                    value={formData.color}
                    onChange={(e) => onChange((f) => ({ ...f, color: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="fuelType">
                    Fuel Type
                  </label>
                  <select
                    id="fuelType"
                    className="vp-form-select"
                    value={formData.fuelType}
                    onChange={(e) => onChange((f) => ({ ...f, fuelType: e.target.value }))}
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="vehicleType">
                    Vehicle Type
                  </label>
                  <select
                    id="vehicleType"
                    className="vp-form-select"
                    value={formData.vehicleType}
                    onChange={(e) => onChange((f) => ({ ...f, vehicleType: e.target.value }))}
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="Van">Van</option>
                    <option value="Car">Car</option>
                    <option value="Rigid">Rigid</option>
                    <option value="HGV">HGV</option>
                  </select>
                </div>
                <div>
                  <label className="vp-form-label" htmlFor="depot">
                    Depot <span className="vp-form-required">*</span>
                  </label>
                  <select
                    id="depot"
                    className="vp-form-select"
                    required
                    value={formData.depot}
                    onChange={(e) => onChange((f) => ({ ...f, depot: e.target.value }))}
                  >
                    {depots.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Status</h3>
              <div className="vp-form-grid-2">
                <div>
                  <label className="vp-form-label" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    className="vp-form-select"
                    value={formData.status}
                    onChange={(e) => onChange((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Technical Information</h3>
              <div className="vp-form-grid-4">
                {TECHNICAL_FIELDS.map(([key, label]) => (
                  <div className="vp-form-check" key={key}>
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData[key]}
                      onChange={(e) => onChange((f) => ({ ...f, [key]: e.target.checked }))}
                    />
                    <label htmlFor={key}>{label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="vp-form-section">
              <h3 className="vp-form-section-title">Additional Information</h3>
              <div>
                <label className="vp-form-label" htmlFor="additionalNotes">
                  Additional Notes
                </label>
                <textarea
                  id="additionalNotes"
                  className="vp-form-textarea"
                  rows={3}
                  placeholder="Optional notes..."
                  value={formData.additionalNotes}
                  onChange={(e) => onChange((f) => ({ ...f, additionalNotes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="vp-modal-footer">
            <button type="button" className="vp-modal-btn vp-modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="vp-modal-btn vp-modal-btn-save">
              Save Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
