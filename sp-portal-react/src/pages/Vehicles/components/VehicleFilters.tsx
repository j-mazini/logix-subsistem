import { useState } from 'react';

interface VehicleFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: 'all' | 'Active' | 'Inactive';
  onStatusFilterChange: (v: 'all' | 'Active' | 'Inactive') => void;
  fuelFilter: 'all' | 'Diesel' | 'Electric';
  onFuelFilterChange: (v: 'all' | 'Diesel' | 'Electric') => void;
  onAddClick: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export function VehicleFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  fuelFilter,
  onFuelFilterChange,
  onAddClick,
  onExportExcel,
  onExportPdf,
}: VehicleFiltersProps) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="vp-filters">
      <div className="vp-filters-field">
        <label className="vp-filters-label" htmlFor="vehicleSearch">
          Search
        </label>
        <input
          type="search"
          id="vehicleSearch"
          className="vp-search"
          placeholder="VRN, Brand, Model, Registration date..."
          autoComplete="off"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="vp-filters-field">
        <label className="vp-filters-label" htmlFor="vehicleStatusFilter">
          Status
        </label>
        <select
          id="vehicleStatusFilter"
          className="vp-select"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'Active' | 'Inactive')}
        >
          <option value="all">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="vp-filters-field">
        <label className="vp-filters-label" htmlFor="vehicleFuelFilter">
          Fuel type
        </label>
        <select
          id="vehicleFuelFilter"
          className="vp-select"
          aria-label="Filter by fuel type"
          value={fuelFilter}
          onChange={(e) => onFuelFilterChange(e.target.value as 'all' | 'Diesel' | 'Electric')}
        >
          <option value="all">All</option>
          <option value="Diesel">Diesel</option>
          <option value="Electric">Electric</option>
        </select>
      </div>

      <div className="vp-filters-actions">
        <button type="button" className="vp-btn vp-btn-primary" onClick={onAddClick}>
          <i className="bi bi-plus-lg" />
          New
        </button>
        <div className="vp-export">
          <button
            type="button"
            className="vp-btn vp-btn-outline"
            onClick={() => setExportOpen((o) => !o)}
            onBlur={() => setTimeout(() => setExportOpen(false), 150)}
          >
            Export
            <i className="bi bi-chevron-down" />
          </button>
          {exportOpen && (
            <div className="vp-export-menu">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportExcel();
                }}
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExportPdf();
                }}
              >
                PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
