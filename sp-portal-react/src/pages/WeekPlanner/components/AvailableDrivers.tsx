import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Driver {
  id: number;
  userId: number;
  name: string;
  fullName: string;
  vehicle: string;
  plate: string;
  vendorTypeId?: number;
}

interface AvailableDriversProps {
  drivers: Driver[];
  weekDates?: Date[];
  dayOffEntries?: Array<{ userId: number; date: string }>;
  onVendorDragStart?: (userId: number) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

type RosterFilter = 'all' | 'regular' | 'spare' | 'off';

const formatDate = (date: Date, format: string): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  if (format === 'yyyy-mm-dd') return `${y}-${m}-${d}`;
  if (format === 'dd/mm') return `${d}/${m}`;
  return `${d}/${m}`;
};

const dayShortName = (date: Date): string => date.toLocaleDateString('en-GB', { weekday: 'short' });

const isSpareDriver = (driver: Driver) => Number(driver.vendorTypeId ?? 0) === 7;

/** Deterministic accent color per driver, purely for the avatar chip. */
const AVATAR_PALETTE = ['#4338ca', '#0f766e', '#b45309', '#be185d', '#1d4ed8', '#7c2d12', '#15803d', '#6d28d9'];
function avatarColor(name: string): string {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}
function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const AvailableDrivers: React.FC<AvailableDriversProps> = ({
  drivers = [],
  weekDates = [],
  dayOffEntries = [],
  onVendorDragStart,
  isOpen = false,
  onToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [selectedDay, setSelectedDay] = useState(''); // '' = whole week

  const handleToggle = useCallback(() => {
    onToggle?.(!isOpen);
  }, [isOpen, onToggle]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleToggle();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleToggle]);

  // Dedupe by vendor, sort alphabetically
  const allVendors = useMemo(() => {
    const seenUserIds = new Set<number>();
    const deduped = drivers.filter((vendor) => {
      if (seenUserIds.has(vendor.userId)) return false;
      seenUserIds.add(vendor.userId);
      return true;
    });
    return deduped.sort((a, b) => (a.fullName || '').toLowerCase().localeCompare((b.fullName || '').toLowerCase()));
  }, [drivers]);

  // Days within the current week this vendor is registered as off, for a compact inline badge.
  const offDaysByVendor = useMemo(() => {
    const result: Record<number, string[]> = {};
    if (weekDates.length === 0 || dayOffEntries.length === 0) return result;

    weekDates.forEach((date) => {
      const dateStr = formatDate(date, 'yyyy-mm-dd');
      dayOffEntries.forEach((entry) => {
        if (entry.date !== dateStr) return;
        (result[entry.userId] ||= []).push(dayShortName(date));
      });
    });
    return result;
  }, [weekDates, dayOffEntries]);

  // Same off-days, keyed by ISO date instead of label — powers the day filter below.
  const offDatesByVendor = useMemo(() => {
    const result: Record<number, Set<string>> = {};
    dayOffEntries.forEach((entry) => {
      (result[entry.userId] ||= new Set()).add(entry.date);
    });
    return result;
  }, [dayOffEntries]);

  const dayOptions = useMemo(
    () =>
      weekDates.map((date) => ({
        value: formatDate(date, 'yyyy-mm-dd'),
        label: `${dayShortName(date)} ${formatDate(date, 'dd/mm')}`,
      })),
    [weekDates],
  );

  const counts = useMemo(
    () => ({
      all: allVendors.length,
      regular: allVendors.filter((d) => !isSpareDriver(d)).length,
      spare: allVendors.filter(isSpareDriver).length,
      off: allVendors.filter((d) => (offDaysByVendor[d.userId]?.length ?? 0) > 0).length,
    }),
    [allVendors, offDaysByVendor],
  );

  const visibleVendors = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allVendors.filter((vendor) => {
      if (selectedDay && offDatesByVendor[vendor.userId]?.has(selectedDay)) return false;
      if (q) {
        const nameMatch = (vendor.fullName || '').toLowerCase().includes(q);
        const idMatch = String(vendor.userId).includes(q);
        if (!nameMatch && !idMatch) return false;
      }
      if (filter === 'regular') return !isSpareDriver(vendor);
      if (filter === 'spare') return isSpareDriver(vendor);
      if (filter === 'off') return (offDaysByVendor[vendor.userId]?.length ?? 0) > 0;
      return true;
    });
  }, [allVendors, searchTerm, filter, offDaysByVendor, selectedDay, offDatesByVendor]);

  const handleVendorDragStart = (e: React.DragEvent, driver: Driver) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('vendor', JSON.stringify({ userId: driver.userId }));
    (e.currentTarget as HTMLElement).classList.add('dragging');
    onVendorDragStart?.(driver.userId);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  };

  if (!weekDates || weekDates.length === 0) {
    return null;
  }

  const selectedDayLabel = dayOptions.find((d) => d.value === selectedDay)?.label ?? '';

  const filters: { key: RosterFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'regular', label: 'Regular' },
    { key: 'spare', label: 'Spare' },
    { key: 'off', label: 'Off this week' },
  ];

  return createPortal(
    <>
      {/* Toggle Button - Fixed top right */}
      <button
        onClick={handleToggle}
        className={`wp-drivers-toggle-btn${isOpen ? ' wp-open' : ''}`}
        aria-label={isOpen ? 'Close drivers panel' : 'Open drivers panel'}
        title="Available Drivers"
      >
        <svg className="wp-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 10a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
        <span className="wp-btn-label">{isOpen ? 'Hide' : 'Show'} Drivers</span>
        <span className="wp-btn-badge">{drivers.length}</span>
      </button>

      {/* Drawer Overlay - Non-blocking */}
      <div
        className={`wp-drivers-overlay${isOpen ? ' wp-open' : ''}`}
        onClick={handleToggle}
        aria-hidden="true"
      />

      {/* Drawer Panel - Fixed at top */}
      <div className={`wp-drivers-drawer${isOpen ? ' wp-open' : ''}`}>
        {/* Drawer Header */}
        <div className="wp-drawer-header">
          <div>
            <h3 className="wp-drawer-title">Available Drivers</h3>
            <p className="wp-drawer-subtitle">
              <b>{visibleVendors.length}</b> free to assign {selectedDayLabel ? `on ${selectedDayLabel}` : 'this week'}
            </p>
          </div>
          <button onClick={handleToggle} className="wp-drawer-close-btn" aria-label="Close">
            <svg className="wp-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="wp-drawer-search">
          <div className="wp-search-wrapper">
            <div className="wp-search-icon">
              <svg className="wp-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="wp-search-input"
              autoFocus
            />
          </div>
        </div>

        {/* Day filter */}
        <div className="wp-roster-day-row">
          <label htmlFor="wpDriversDaySelect" className="wp-roster-day-label">
            Day
          </label>
          <select
            id="wpDriversDaySelect"
            className="wp-roster-day-select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="">Whole week</option>
            {dayOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter chips */}
        <div className="wp-roster-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`wp-roster-filter${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="wp-roster-filter-n">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {/* Drawer Content — single flat, filterable roster */}
        <div className="wp-drawer-content">
          {visibleVendors.length === 0 ? (
            <div className="wp-day-empty">No drivers match your search.</div>
          ) : (
            <div className="wp-drivers-list">
              {visibleVendors.map((driver) => {
                const offDays = offDaysByVendor[driver.userId];
                const spare = isSpareDriver(driver);
                return (
                  <div
                    key={driver.userId}
                    draggable
                    onDragStart={(e) => handleVendorDragStart(e, driver)}
                    onDragEnd={handleDragEnd}
                    className="wp-driver-row"
                    title={`${driver.fullName} • ${driver.vehicle || driver.plate || 'N/A'}`}
                  >
                    <div className="wp-driver-avatar" style={{ background: avatarColor(driver.fullName) }}>
                      {initials(driver.fullName)}
                    </div>
                    <div className="wp-driver-info">
                      <div className="wp-driver-name">{driver.fullName}</div>
                      <div className="wp-driver-meta">
                        {driver.vehicle && <span>{driver.vehicle}</span>}
                        {driver.plate && <span className="wp-driver-plate">{driver.plate}</span>}
                      </div>
                    </div>
                    {spare && <span className="wp-roster-badge wp-roster-badge--spare">Spare</span>}
                    {offDays && offDays.length > 0 && (
                      <span className="wp-roster-badge wp-roster-badge--off" title={`Off this week: ${offDays.join(', ')}`}>
                        Off {offDays.join(', ')}
                      </span>
                    )}
                    <svg className="wp-driver-handle" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <circle cx="7" cy="5" r="1.4" />
                      <circle cx="13" cy="5" r="1.4" />
                      <circle cx="7" cy="10" r="1.4" />
                      <circle cx="13" cy="10" r="1.4" />
                      <circle cx="7" cy="15" r="1.4" />
                      <circle cx="13" cy="15" r="1.4" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="wp-drawer-foot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 13h5m-9 8V5a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
          </svg>
          Drag a driver onto any route or Ad-Hoc cell to assign
        </div>
      </div>
    </>,
    document.body,
  );
};

const areEqual = (prev: AvailableDriversProps, next: AvailableDriversProps) => {
  return (
    prev.drivers === next.drivers &&
    prev.dayOffEntries === next.dayOffEntries &&
    prev.weekDates === next.weekDates &&
    prev.isOpen === next.isOpen
  );
};

export default memo(AvailableDrivers, areEqual);
