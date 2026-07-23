import { formatDateDisplay, type RawVehicle } from '../../../data/vehiclesData';

interface VehicleCardGridProps {
  vehicles: RawVehicle[];
  onCardClick: (v: RawVehicle) => void;
  onEdit: (v: RawVehicle) => void;
  onDelete: (v: RawVehicle) => void;
  isDeletable: (id: number) => boolean;
}

export function VehicleCardGrid({ vehicles, onCardClick, onEdit, onDelete, isDeletable }: VehicleCardGridProps) {
  if (vehicles.length === 0) {
    return <div className="vp-card-empty">No vehicles match the current filters.</div>;
  }

  return (
    <div className="vp-card-grid">
      {vehicles.map((v) => {
        const status = v.status || 'Active';
        return (
          <div key={v.id} className="vp-card" onClick={() => onCardClick(v)}>
            <div className="vp-card-header">
              <div>
                <div className="vp-card-title">
                  {v.fuelType === 'Electric' && <i className="bi bi-lightning-charge-fill" style={{ color: '#16a34a' }} />}
                  {v.brand || '—'} {v.model || ''}
                </div>
                <div className="vp-card-subtitle">{v.vrn || '—'}</div>
              </div>
              <div className="vp-card-actions">
                <button
                  type="button"
                  className="vp-card-edit"
                  aria-label="Edit vehicle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(v);
                  }}
                >
                  <i className="bi bi-pencil-fill" />
                </button>
                {isDeletable(v.id) && (
                  <button
                    type="button"
                    className="vp-card-delete"
                    aria-label="Delete vehicle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(v);
                    }}
                  >
                    <i className="bi bi-trash-fill" />
                  </button>
                )}
              </div>
            </div>
            <div className="vp-card-info">
              <div className="vp-card-info-row">
                <span className="vp-card-info-label">Registration</span>
                <span className="vp-card-info-value">{formatDateDisplay(v.registrationDate)}</span>
              </div>
              <div className="vp-card-info-row">
                <span className="vp-card-info-label">Fuel</span>
                <span className="vp-card-info-value">{v.fuelType || '—'}</span>
              </div>
              <div className="vp-card-info-row">
                <span className="vp-card-info-label">Depot</span>
                <span className="vp-card-info-value">{v.depot || '—'}</span>
              </div>
              <div className="vp-card-info-row">
                <span className="vp-card-info-label">Status</span>
                <span className="vp-card-info-value">{status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
