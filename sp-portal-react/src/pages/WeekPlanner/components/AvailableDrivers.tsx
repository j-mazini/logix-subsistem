import React, { useState, useCallback, useMemo, memo } from 'react';
import '../../../styles/legacy/available-drivers.css';

interface Driver {
  id: number;
  userId: number;
  name: string;
  fullName: string;
  vehicle: string;
  plate: string;
  vendorTypeId?: number;
  routeSort?: 'yes' | 'no';
}

interface AvailableDriversProps {
  drivers: Driver[];
  onDragStart?: (driver: Driver, dateStr?: string) => void;
  dayOffEntries?: Array<{ userId: number; date: string }>;
  weekDates?: Date[];
}

const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateDMY = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
};

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
};

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Available Drivers component - matches LogixSphere structure
 * Displays drivers organized by day of week with drag-and-drop support
 */
const AvailableDrivers: React.FC<AvailableDriversProps> = ({
  drivers,
  onDragStart,
  dayOffEntries = [],
  weekDates = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter drivers by search term
  const filteredDrivers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const seen = new Set<number>();

    return drivers
      .filter((driver) => {
        if (seen.has(driver.userId)) return false;

        const nameMatch = (driver.fullName || driver.name || '').toLowerCase().includes(q);
        const idMatch = String(driver.userId).includes(q);

        if (q && !nameMatch && !idMatch) return false;

        seen.add(driver.userId);
        return true;
      })
      .sort((a, b) => {
        const nameA = (a.fullName || a.name || '').toLowerCase();
        const nameB = (b.fullName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [drivers, searchTerm]);

  // Organize drivers by day
  const driversByDay = useMemo(() => {
    const result: Record<string, Driver[]> = {};

    weekDates.forEach((date) => {
      const dateStr = formatDateISO(date);
      const daysDrivers = filteredDrivers.filter((driver) => {
        const hasDateOff = dayOffEntries.some((entry) => entry.userId === driver.userId && entry.date === dateStr);
        return !hasDateOff;
      });
      result[dateStr] = daysDrivers;
    });

    return result;
  }, [filteredDrivers, weekDates, dayOffEntries]);

  const handleDragStart = useCallback(
    (event: React.DragEvent, driver: Driver, dateStr?: string) => {
      event.dataTransfer.effectAllowed = 'copy';
      (event.currentTarget as HTMLElement).classList.add('dragging');
      onDragStart?.(driver, dateStr);
    },
    [onDragStart]
  );

  const handleDragEnd = useCallback((event: React.DragEvent) => {
    (event.currentTarget as HTMLElement).classList.remove('dragging');
  }, []);

  return (
    <div className="available-drivers-container">
      {/* Header */}
      <div className="available-drivers-header">
        <div className="available-drivers-title-section">
          <div className="available-drivers-icon-badge">
            <i className="bi bi-people" />
          </div>
          <div>
            <h3 className="available-drivers-title">Available Drivers</h3>
            <p className="available-drivers-subtitle">
              {filteredDrivers.length} {filteredDrivers.length === 1 ? 'driver' : 'drivers'} available
            </p>
          </div>
        </div>

        <div className="available-drivers-controls">
          <div className="available-drivers-search">
            <i className="bi bi-search" />
            <input
              type="text"
              placeholder="Search by name, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="available-drivers-search-input"
            />
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="available-drivers-collapse-btn"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <i className="bi bi-chevron-down" />
            ) : (
              <i className="bi bi-chevron-up" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="available-drivers-content">
          {weekDates.length > 0 ? (
            <div className="available-drivers-grid">
              {/* Spacer column for alignment */}
              <div className="available-drivers-spacer" aria-hidden />

              {weekDates.map((date) => {
                const dateStr = formatDateISO(date);
                const dayName = getDayName(date);
                const dateNum = formatDateDMY(date);
                const isWeekendDay = isWeekend(date);
                const dayDrivers = driversByDay[dateStr] || [];

                const isSpareDriver = (driver: Driver) =>
                  Number(driver.vendorTypeId ?? 0) === 7;
                const spareDrivers = dayDrivers.filter(isSpareDriver);
                const regularDrivers = dayDrivers.filter((d) => !isSpareDriver(d));

                return (
                  <div
                    key={dateStr}
                    className={`available-drivers-day-column ${isWeekendDay ? 'weekend' : ''}`}
                  >
                    {/* Day header */}
                    <div className="available-drivers-day-header">
                      <div className="available-drivers-day-info">
                        <div className="available-drivers-day-name">{dayName}</div>
                        <div className="available-drivers-day-date">{dateNum}</div>
                      </div>
                      <div className={`available-drivers-day-count ${isWeekendDay ? 'weekend' : ''}`}>
                        {dayDrivers.length}
                      </div>
                    </div>

                    {/* Drivers list */}
                    <div className="available-drivers-day-list">
                      {regularDrivers.length === 0 && spareDrivers.length === 0 ? (
                        <div className="available-drivers-empty">No drivers</div>
                      ) : (
                        <>
                          {/* Regular drivers */}
                          {regularDrivers.map((driver) => (
                            <div
                              key={`driver-${dateStr}-${driver.userId}`}
                              className="available-driver-card"
                              draggable
                              onDragStart={(e) => handleDragStart(e, driver, dateStr)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="available-driver-card-name">
                                {driver.fullName || driver.name}
                              </div>
                              <div className="available-driver-card-vehicle">
                                {driver.vehicle || driver.plate || 'N/A'}
                              </div>
                            </div>
                          ))}

                          {/* Spare drivers section */}
                          {spareDrivers.length > 0 && (
                            <div className="available-drivers-spare-section">
                              <div className="available-drivers-spare-label">Spare Drivers</div>
                              <div className="available-drivers-spare-list">
                                {spareDrivers.map((driver) => (
                                  <div
                                    key={`spare-${dateStr}-${driver.userId}`}
                                    className="available-driver-card spare"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, driver, dateStr)}
                                    onDragEnd={handleDragEnd}
                                  >
                                    <div className="available-driver-card-name">
                                      {driver.fullName || driver.name}
                                    </div>
                                    <div className="available-driver-card-vehicle">
                                      {driver.vehicle || driver.plate || 'N/A'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : filteredDrivers.length > 0 ? (
            <div className="available-drivers-fallback-grid">
              {filteredDrivers.map((driver) => (
                <div
                  key={`fallback-${driver.userId}`}
                  className="available-driver-card fallback"
                  draggable
                  onDragStart={(e) => handleDragStart(e, driver)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="available-driver-card-name">
                    {driver.fullName || driver.name}
                  </div>
                  <div className="available-driver-card-vehicle">
                    {driver.vehicle || driver.plate || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="available-drivers-no-data">
              <i className="bi bi-people-slash" />
              <p>No drivers available</p>
            </div>
          )}
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
