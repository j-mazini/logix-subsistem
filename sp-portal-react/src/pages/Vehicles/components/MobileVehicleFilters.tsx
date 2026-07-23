interface MobileVehicleFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: 'all' | 'Active' | 'Inactive';
  onStatusFilterChange: (v: 'all' | 'Active' | 'Inactive') => void;
  fuelFilter: 'all' | 'Diesel' | 'Electric';
  onFuelFilterChange: (v: 'all' | 'Diesel' | 'Electric') => void;
  onAddClick: () => void;
}

export function MobileVehicleFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  fuelFilter,
  onFuelFilterChange,
  onAddClick,
}: MobileVehicleFiltersProps) {
  return (
    <div className="vp-mobile-filters">
      <input
        type="search"
        className="vp-mobile-search"
        placeholder="VRN, Brand, Model..."
        autoComplete="off"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="vp-mobile-grid">
        <select
          className="vp-mobile-select"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'Active' | 'Inactive')}
        >
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          className="vp-mobile-select"
          aria-label="Filter by fuel type"
          value={fuelFilter}
          onChange={(e) => onFuelFilterChange(e.target.value as 'all' | 'Diesel' | 'Electric')}
        >
          <option value="all">All fuel types</option>
          <option value="Diesel">Diesel</option>
          <option value="Electric">Electric</option>
        </select>
      </div>
      <button type="button" className="vp-mobile-new-btn" onClick={onAddClick}>
        <i className="bi bi-plus-lg" />
        New Vehicle
      </button>
    </div>
  );
}
