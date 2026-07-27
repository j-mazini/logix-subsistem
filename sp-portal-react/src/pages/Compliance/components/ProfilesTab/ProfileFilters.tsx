import { ProfileFilters } from '../../types/compliance';

interface ProfileFiltersComponentProps {
  filters: ProfileFilters;
  onUpdateFilters: (filters: Partial<ProfileFilters>) => void;
}

/**
 * Filter controls for the profiles list
 */
export function ProfileFiltersComponent({
  filters,
  onUpdateFilters,
}: ProfileFiltersComponentProps) {
  return (
    <div className="profiles-filters">
      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.status}
          onChange={(e) => onUpdateFilters({ status: e.target.value as any })}
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="in-progress">In progress</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Role</label>
        <select
          value={filters.role}
          onChange={(e) => onUpdateFilters({ role: e.target.value as any })}
        >
          <option value="all">All</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
          <option value="vendor">Vendor</option>
        </select>
      </div>

      <div className="filter-group flex-grow">
        <label>Search</label>
        <div className="search-input">
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder="Name, email, phone…"
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
          />
        </div>
      </div>

      <div className="filter-group">
        <label>Sort by</label>
        <select
          value={filters.sortBy}
          onChange={(e) => onUpdateFilters({ sortBy: e.target.value as any })}
        >
          <option value="name">Name</option>
          <option value="date">Date</option>
          <option value="score">Score</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Order</label>
        <select
          value={filters.sortOrder}
          onChange={(e) => onUpdateFilters({ sortOrder: e.target.value as any })}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>
  );
}
