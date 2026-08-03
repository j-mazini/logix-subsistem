import React, { useMemo, useState } from 'react';
import { useModalBehavior } from '../../../hooks/useModalBehavior';

export interface FlexRouteOption {
  id: number;
  name: string;
}

interface FlexRouteModalProps {
  onClose: () => void;
  onApply: (selectedIds: Set<number>) => void;
  depotName: string;
  routes: FlexRouteOption[];
  initiallySelected: Set<number>;
}

/**
 * Manage Flex Routes — simplified port of Next.js week-planner's Modals/FlexRouteSelectionModal.tsx
 * ("manage" mode only). Flex routes, once shown, become ordinary rows in the depot grid — reusing
 * the exact same drag-drop/edit machinery as core routes — so this modal only needs to toggle
 * which extra routes are currently visible, not source's separate vendor/vehicle/date "add" flow.
 */
const FlexRouteModal: React.FC<FlexRouteModalProps> = ({ onClose, onApply, depotName, routes, initiallySelected }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set(initiallySelected));
  const [searchTerm, setSearchTerm] = useState('');

  useModalBehavior(onClose);

  const filteredRoutes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return routes;
    return routes.filter((r) => r.name.toLowerCase().includes(term));
  }, [routes, searchTerm]);

  const allFilteredSelected = filteredRoutes.length > 0 && filteredRoutes.every((r) => selected.has(r.id));

  function toggleRoute(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredRoutes.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      filteredRoutes.forEach((r) => next.add(r.id));
      return next;
    });
  }

  return (
    <div className="wp-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="flexRouteModalTitle">
      <div className="wp-modal-header">
        <h2 className="wp-modal-title" id="flexRouteModalTitle">
          <i className="bi bi-signpost-split me-2" />
          Manage Flex Routes — {depotName}
        </h2>
        <button type="button" className="dom-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="wp-modal-body">
        <p className="wp-modal-meta">Choose which flex routes to show for this depot. Routes stay in the planner once shown; hide a row with its × to remove it from view again.</p>

        <input
          type="text"
          placeholder="Search flex routes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="wp-flex-search"
        />

        <div className="wp-flex-list-header">
          <span>
            {filteredRoutes.length} route{filteredRoutes.length === 1 ? '' : 's'} found
          </span>
          {filteredRoutes.length > 0 && (
            <button type="button" className="styled-button styled-button--outline" onClick={toggleSelectAll}>
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className="wp-flex-list">
          {filteredRoutes.length === 0 ? (
            <div className="wp-types-empty">No flex routes found.</div>
          ) : (
            filteredRoutes.map((route) => {
              const isSelected = selected.has(route.id);
              return (
                <label key={route.id} className={`wp-flex-row${isSelected ? ' is-selected' : ''}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleRoute(route.id)} />
                  <span className="wp-flex-row-name">{route.name}</span>
                  {isSelected && <span className="wp-types-badge wp-types-badge--yes">Active</span>}
                </label>
              );
            })
          )}
        </div>
      </div>
      <div className="dom-form-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="styled-button styled-button--outline" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="styled-button styled-button--primary" onClick={() => onApply(selected)}>
          Apply ({selected.size})
        </button>
      </div>
    </div>
  );
};

export default FlexRouteModal;
