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

  // Filter vendors by search
  const filteredVendors = useMemo(() => {
    const seenUserIds = new Set<number>();
    const q = searchTerm.toLowerCase().trim();

    return drivers
      .filter((vendor) => {
        if (seenUserIds.has(vendor.userId)) return false;

        const nameMatch = (vendor.fullName || '').toLowerCase().includes(q);
        const idMatch = String(vendor.userId).includes(q);

        if (q && !nameMatch && !idMatch) return false;

        seenUserIds.add(vendor.userId);
        return true;
      })
      .sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [drivers, searchTerm]);

  // Organize vendors by day
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

  const handleVendorDragStart = (e: React.DragEvent, vendor: Driver, dateStr?: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('vendor', JSON.stringify({ userId: vendor.userId, date: dateStr }));
    (e.currentTarget as HTMLElement).classList.add('dragging');
    onVendorDragStart?.(vendor.userId);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
  };

  if (!weekDates || weekDates.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden transition-all duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl shadow-inner">
            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 10a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
              Available Drivers
            </h3>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5 font-semibold uppercase tracking-wider">
              {filteredVendors.length} {filteredVendors.length === 1 ? 'driver' : 'drivers'} available
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 md:max-w-md lg:max-w-lg">
          <div className="relative group w-full">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors group-focus-within:text-indigo-600 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full h-10 pl-11 pr-4 bg-white/80 border border-slate-200 rounded-xl text-sm font-medium transition-all duration-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2.5 rounded-xl hover:bg-white/80 transition-all text-slate-500 hover:text-indigo-600 border border-transparent hover:border-slate-200 active:scale-95"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {!isCollapsed && (
        <div className={`bg-slate-50/50 ${alignWithWeekPlanner ? 'p-0' : 'p-4'}`}>
          <div
            className={`grid ${alignWithWeekPlanner ? 'gap-0' : 'gap-3'} ${
              alignWithWeekPlanner
                ? 'grid-cols-[120px_repeat(7,minmax(0,1fr))]'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7'
            }`}
          >
            {/* Spacer column for alignment */}
            {alignWithWeekPlanner && <div className="min-w-0" aria-hidden />}

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
                  className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-all duration-200 ${
                    isWeekendDay
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex flex-col gap-0.5">
                      <div
                        className={`font-bold text-xs uppercase tracking-wide ${
                          isWeekendDay ? 'text-amber-800' : 'text-slate-800'
                        }`}
                      >
                        {dayName}
                      </div>
                      <div
                        className={`text-[10px] font-medium ${
                          isWeekendDay ? 'text-amber-700' : 'text-slate-600'
                        }`}
                      >
                        {dateNum}
                      </div>
                    </div>
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${
                        isWeekendDay ? 'bg-amber-200 text-amber-800' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {dayVendors.length}
                    </div>
                  </div>

                  {/* Day vendors */}
                  <div className="flex flex-col gap-2 min-h-[80px] max-h-[350px] overflow-y-auto pr-1">
                    {regularVendors.length === 0 && spareVendors.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-3 italic">
                        No drivers
                      </div>
                    ) : (
                      <>
                        {/* Regular drivers */}
                        {regularVendors.map((driver) => (
                          <div
                            key={`${dateStr}-${driver.userId}`}
                            draggable
                            onDragStart={(e) => handleVendorDragStart(e, driver, dateStr)}
                            onDragEnd={handleDragEnd}
                            className="p-2 bg-slate-100 border border-slate-200 rounded-lg cursor-move hover:bg-indigo-50 hover:border-indigo-300 transition-all active:opacity-50"
                          >
                            <div className="font-semibold text-sm text-slate-900 truncate">
                              {driver.fullName}
                            </div>
                            <div className="text-xs text-slate-600 font-mono truncate">
                              {driver.vehicle || driver.plate || 'N/A'}
                            </div>
                          </div>
                        ))}

                        {/* Spare drivers section */}
                        {spareVendors.length > 0 && (
                          <div className="mt-2 border-t border-slate-200 pt-2">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                              Spare Drivers
                            </div>
                            <div className="flex flex-col gap-2">
                              {spareVendors.map((driver) => (
                                <div
                                  key={`spare-${dateStr}-${driver.userId}`}
                                  draggable
                                  onDragStart={(e) => handleVendorDragStart(e, driver, dateStr)}
                                  onDragEnd={handleDragEnd}
                                  className="p-2 bg-amber-100 border border-amber-300 rounded-lg cursor-move hover:bg-amber-200 hover:border-amber-400 transition-all active:opacity-50"
                                >
                                  <div className="font-semibold text-sm text-amber-900 truncate">
                                    {driver.fullName}
                                  </div>
                                  <div className="text-xs text-amber-800 font-mono truncate">
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
