import React, { useState, useMemo, memo } from 'react';

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
  alignWithWeekPlanner?: boolean;
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
  alignWithWeekPlanner = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="wp-available-drivers">
      {/* Header and Controls */}
      <div className="wp-available-drivers-header">
        <div className="wp-available-drivers-title-section">
          <div className="wp-available-drivers-icon">
            <svg className="wp-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 10a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
          </div>
          <div>
            <h3 className="wp-available-drivers-title">Available Drivers</h3>
            <p className="wp-available-drivers-subtitle">
              {filteredVendors.length} {filteredVendors.length === 1 ? 'driver' : 'drivers'} available
            </p>
          </div>
        </div>

        <div className="wp-available-drivers-controls">
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
            />
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="wp-collapse-btn"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <svg className="wp-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="wp-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {!isCollapsed && (
        <div className={`wp-available-drivers-content${alignWithWeekPlanner ? ' wp-align-week-planner' : ''}`}>
          <div className={`wp-drivers-grid${alignWithWeekPlanner ? ' wp-grid-align' : ''}`}>
            {/* Spacer column for alignment with week planner */}
            {alignWithWeekPlanner && <div className="wp-grid-spacer" aria-hidden />}

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
                          >
                            <div className="wp-driver-name">{driver.fullName}</div>
                            <div className="wp-driver-vehicle">
                              {driver.vehicle || driver.plate || 'N/A'}
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
                              >
                                <div className="wp-driver-name">{driver.fullName}</div>
                                <div className="wp-driver-vehicle">
                                  {driver.vehicle || driver.plate || 'N/A'}
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
      )}
    </div>
  );
};

const areEqual = (prev: AvailableDriversProps, next: AvailableDriversProps) => {
  return (
    prev.drivers === next.drivers &&
    prev.dayOffEntries === next.dayOffEntries &&
    prev.weekDates === next.weekDates
  );
};

export default memo(AvailableDrivers, areEqual);
