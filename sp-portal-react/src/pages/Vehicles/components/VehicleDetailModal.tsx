import { createPortal } from 'react-dom';
import { formatDateDisplay, type RawVehicle } from '../../../data/vehiclesData';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

interface VehicleDetailModalProps {
  vehicle: RawVehicle;
  onClose: () => void;
}

export function VehicleDetailModal({ vehicle, onClose }: VehicleDetailModalProps) {
  useModalBehavior(onClose);


  const generalRows: [string, string][] = [
    ['Vehicle ID', String(vehicle.id)],
    ['Registration Plate', vehicle.vrn || '—'],
    ['VIN', vehicle.vin || '—'],
    ['Brand', vehicle.brand || '—'],
    ['Model', vehicle.model || '—'],
    ['Color', vehicle.color || '—'],
    ['Registration Date', formatDateDisplay(vehicle.registrationDate)],
    ['Fuel Type', vehicle.fuelType || '—'],
    ['Vehicle Type', vehicle.vehicleType || '—'],
    ['Depot', vehicle.depot || '—'],
    ['Status', vehicle.status || 'Active'],
  ];

  const technicalRows: [string, string][] = [
    ['Wrapped', vehicle.wrappedVehicle ? 'Yes' : 'No'],
    ['Slam Lock', vehicle.slamLock ? 'Yes' : 'No'],
    ['Camera', vehicle.camera ? 'Yes' : 'No'],
    ['GPS', vehicle.gps ? 'Yes' : 'No'],
    ['Bulkhead', vehicle.bulkhead ? 'Yes' : 'No'],
    ['270° Doors', vehicle.doors270 ? 'Yes' : 'No'],
  ];

  return createPortal(
    <div className="vp-modal-backdrop" onClick={onClose}>
      <div className="vp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vehicleDetailTitle">
        <div className="vp-modal-header">
          <h2 id="vehicleDetailTitle">{`${vehicle.brand || ''} ${(vehicle.model || '').trim()}`.trim() || vehicle.vrn || '—'}</h2>
          <button type="button" className="vp-modal-close" aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="vp-detail-body">
          <div className="vp-detail-grid">
            <section>
              <h3 className="vp-detail-section-title">General</h3>
              {generalRows.map(([label, value]) => (
                <div className="vp-detail-row" key={label}>
                  <span className="vp-detail-row-label">{label}</span>
                  <span className="vp-detail-row-value">{value}</span>
                </div>
              ))}
            </section>
            <section>
              <h3 className="vp-detail-section-title">Technical</h3>
              {technicalRows.map(([label, value]) => (
                <div className="vp-detail-row" key={label}>
                  <span className="vp-detail-row-label">{label}</span>
                  <span className="vp-detail-row-value">{value}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
