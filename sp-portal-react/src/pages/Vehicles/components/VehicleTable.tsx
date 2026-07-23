import { formatDateDisplay, type RawVehicle } from '../../../data/vehiclesData';
import type { SortDir, SortKey } from './types';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'vrn', label: 'VRN' },
  { key: 'brand', label: 'Manufacturer' },
  { key: 'model', label: 'Model' },
  { key: 'registrationDate', label: 'Registration Date' },
  { key: 'fuelType', label: 'Fuel Type' },
  { key: 'status', label: 'Status' },
];

function statusBadgeClass(s: string): string {
  if (s === 'Active') return 'vp-status-active';
  if (s === 'Inactive') return 'vp-status-inactive';
  if (s === 'Maintenance') return 'vp-status-maintenance';
  return 'vp-status-default';
}

interface VehicleTableProps {
  vehicles: RawVehicle[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (v: RawVehicle) => void;
  onEdit: (v: RawVehicle) => void;
  onDelete: (v: RawVehicle) => void;
  isDeletable: (id: number) => boolean;
}

export function VehicleTable({ vehicles, sortKey, sortDir, onSort, onRowClick, onEdit, onDelete, isDeletable }: VehicleTableProps) {
  return (
    <div className="vp-table-wrap">
      <table className="vp-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={sortKey === col.key ? `vp-th-active${sortDir === -1 ? ' vp-th-desc' : ''}` : ''}
                onClick={() => onSort(col.key)}
              >
                <span className="vp-th-content">
                  {col.label}
                  <i className="bi bi-caret-up-fill vp-th-sort-icon" />
                </span>
              </th>
            ))}
            <th className="vp-th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => {
            const status = v.status || 'Active';
            const vrnClass = `vp-vrn${v.fuelType === 'Electric' ? ' vp-vrn-electric' : ''}`;
            return (
              <tr key={v.id} role="button" tabIndex={0} onClick={() => onRowClick(v)}>
                <td>
                  <span className={vrnClass}>{v.vrn || '—'}</span>
                </td>
                <td>{v.brand || '—'}</td>
                <td>{v.model || '—'}</td>
                <td>{formatDateDisplay(v.registrationDate)}</td>
                <td>
                  {v.fuelType === 'Electric' ? (
                    <span className="vp-fuel-electric">
                      <i className="bi bi-lightning-charge-fill" title="Electric" /> Electric
                    </span>
                  ) : (
                    v.fuelType || '—'
                  )}
                </td>
                <td>
                  <span className={`vp-status-badge ${statusBadgeClass(status)}`}>{status}</span>
                </td>
                <td>
                  <div className="vp-row-actions">
                    <button
                      type="button"
                      className="vp-action-btn"
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
                        className="vp-action-btn vp-action-delete"
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {vehicles.length === 0 && <div className="vp-table-empty">No vehicles match the current filters.</div>}
    </div>
  );
}
