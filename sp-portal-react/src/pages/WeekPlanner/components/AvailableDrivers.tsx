import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';

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

const formatDate = (date: Date, format: string): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  if (format === 'yyyy-mm-dd') return `${y}-${m}-${d}`;
  if (format === 'dd/mm') return `${d}/${m}`;
  return `${d}/${m}`;
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const AvailableDrivers: React.FC<AvailableDriversProps> = ({
  drivers = [],
  weekDates = [],
  dayOffEntries = [],
  onVendorDragStart,
  isOpen = false,
  onToggle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter vendors by search term, remove duplicates, sort alphabetically
  const filteredVendors = useMemo(() => {
    const seenUserIds = new Set<number>();
    const q = searchTerm.toLowerCase().trim();

    const filtered = drivers.filter((vendor) => {
      if (seenUserIds.has(vendor.userId)) return false;

      const nameMatch = (vendor.fullName || '').toLowerCase().includes(q);
      const idMatch = String(vendor.userId).includes(q);

      if (q && !nameMatch && !idMatch) return false;

      seenUserIds.add(vendor.userId);
      return true;
    });

    return filtered.sort((a, b) => {
      const nameA = (a.fullName || '').toLowerCase();
      const nameB = (b.fullName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [drivers, searchTerm]);

  // Organize vendors by day, filtering out day-off entries
  const vendorsByDay = useMemo(() => {
    const result: Record<string, Driver[]> = {};

    weekDates.forEach((date) => {
      const dateStr = formatDate(date, 'yyyy-mm-dd');
      const dayVendors = filteredVendors.filter((vendor) => {
        const hasDateOff = dayOffEntries.some(
          (entry) => entry.userId === vendor.userId && entry.date === dateStr
        );
        return !hasDateOff;
      });
      result[dateStr] = dayVendors;
    });

    return result;
  }, [filteredVendors, weekDates, dayOffEntries]);

  const handleVendorDragStart = (e: React.DragEvent, driver: Driver, dateStr?: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('vendor', JSON.stringify({ userId: driver.userId, date: dateStr }));
    (e.currentTarget as HTMLElement).classList.add('dragging');
    onVendorDragStart?.(driver.userId);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  };

  if (!weekDates || weekDates.length === 0) {
    return null;
  }

  return (
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
          <div className="wp-drawer-title-section">
            <svg className="wp-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 10a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            <div>
              <h3 className="wp-drawer-title">Available Drivers</h3>
              <p className="wp-drawer-subtitle">
                {filteredVendors.length} {filteredVendors.length === 1 ? 'driver' : 'drivers'} available
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className="wp-drawer-close-btn"
            aria-label="Close"
          >
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

        {/* Drawer Content Grid */}
        <div className="wp-drawer-content">

            {/* Day columns */}
            {weekDates.map((dayDate) => {
              const dateStr = formatDate(dayDate, 'yyyy-mm-dd');
              const dayName = dayDate.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
              const dateNum = formatDate(dayDate, 'dd/mm');
              const isWeekendDay = isWeekend(dayDate);
              const dayVendors = vendorsByDay[dateStr] || [];

              // Separate regular and spare drivers
              const isSpareDriver = (driver: Driver) => Number(driver.vendorTypeId ?? 0) === 7;
              const spareVendors = dayVendors.filter(isSpareDriver);
              const regularVendors = dayVendors.filter((d) => !isSpareDriver(d));

              return (
                <div
                  key={dateStr}
                  className={`wp-day-column${isWeekendDay ? ' wp-weekend' : ''}`}
                >
                  {/* Day header */}
                  <div className="wp-day-header">
                    <div className="wp-day-info">
                      <div className={`wp-day-name${isWeekendDay ? ' wp-weekend' : ''}`}>
                        {dayName}
                      </div>
                      <div className={`wp-day-date${isWeekendDay ? ' wp-weekend' : ''}`}>
                        {dateNum}
                      </div>
                    </div>
                    <div className={`wp-day-count${isWeekendDay ? ' wp-weekend' : ''}`}>
                      {dayVendors.length}
                    </div>
                  </div>

                  {/* Day vendors list */}
                  <div className="wp-day-vendors">
                    {regularVendors.length === 0 && spareVendors.length === 0 ? (
                      <div className="wp-day-empty">No drivers</div>
                    ) : (
                      <>
                        {/* Regular drivers */}
                        {regularVendors.map((driver) => (
                          <div
                            key={`${dateStr}-${driver.userId}`}
                            draggable
                            onDragStart={(e) => handleVendorDragStart(e, driver, dateStr)}
                            onDragEnd={handleDragEnd}
                            className="wp-driver-card"
                            title={`${driver.fullName} • ${driver.vehicle || driver.plate || 'N/A'}`}
                          >
                            <div className="wp-driver-icon">
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM20 8H4c-1.1 0-2 .9-2 2v8h2v3c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3h12v3c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-3h2v-8c0-1.1-.9-2-2-2z"/>
                              </svg>
                            </div>
                            <div className="wp-driver-info">
                              <div className="wp-driver-name">{driver.fullName}</div>
                              <div className="wp-driver-vehicle">
                                {driver.vehicle || driver.plate || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Spare drivers section */}
                        {spareVendors.length > 0 && (
                          <div className="wp-spare-section">
                            <div className="wp-spare-label">Spare Drivers</div>
                            {spareVendors.map((driver) => (
                              <div
                                key={`spare-${dateStr}-${driver.userId}`}
                                draggable
                                onDragStart={(e) => handleVendorDragStart(e, driver, dateStr)}
                                onDragEnd={handleDragEnd}
                                className="wp-driver-card wp-spare"
                                title={`${driver.fullName} • ${driver.vehicle || driver.plate || 'N/A'} (Spare)`}
                              >
                                <div className="wp-driver-icon">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                </div>
                                <div className="wp-driver-info">
                                  <div className="wp-driver-name">{driver.fullName}</div>
                                  <div className="wp-driver-vehicle">
                                    {driver.vehicle || driver.plate || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
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
