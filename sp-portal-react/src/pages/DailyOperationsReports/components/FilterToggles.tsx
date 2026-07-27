// @ts-nocheck
import React, { memo } from 'react';

const labelClass = 'text-[11px] font-semibold uppercase text-gray-500 tracking-wider';

function Chip({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
        ${active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-white/80 text-gray-600 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
        }
      `}
    >
      {label}
    </button>
  );
}

interface FilterTogglesProps {
  depotFilter: string;
  loopFilter: string;
  uniqueDepots: string[];
  uniqueLoops: string[];
  onToggleFilter: (key: 'depot' | 'loop', value: string) => void;
  variant?: 'standalone' | 'embedded';
}

export const FilterToggles = memo<FilterTogglesProps>(({
  depotFilter,
  loopFilter,
  uniqueDepots,
  uniqueLoops,
  onToggleFilter,
  variant = 'standalone',
}) => {
  const isEmbedded = variant === 'embedded';
  const chipRowClass = isEmbedded
    ? 'flex flex-wrap items-center gap-6 pt-3'
    : 'flex flex-wrap items-center gap-6 px-5 py-3 bg-gray-50/80 border-t border-gray-100';

  return (
    <div className={chipRowClass}>
      <div className="flex items-center gap-2">
        <span className={labelClass}>Depot</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="All" active={depotFilter === 'All'} onClick={() => onToggleFilter('depot', 'All')} />
          <Chip label="Off" active={depotFilter === 'Off'} onClick={() => onToggleFilter('depot', 'Off')} />
          {uniqueDepots.filter(d => d.toUpperCase() !== 'OFF').map((depot) => (
            <Chip
              key={depot}
              label={depot}
              active={depotFilter === depot}
              onClick={() => onToggleFilter('depot', depot)}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={labelClass}>Loop</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="All" active={loopFilter === 'All'} onClick={() => onToggleFilter('loop', 'All')} />
          {uniqueLoops.map((loop) => (
            <Chip
              key={loop}
              label={loop}
              active={loopFilter === loop}
              onClick={() => onToggleFilter('loop', loop)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

FilterToggles.displayName = 'FilterToggles';

