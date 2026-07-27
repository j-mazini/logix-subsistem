// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { hasSortY, getDepotFromRouteName, DEPOT_SORT_HOURS } from '@/lib/performance-utils';
import { formatWorkHours, formatValue } from '../utils';

function formatDecimalHoursAsHMM(hours: number): string {
  if (hours <= 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function buildWorkHoursTooltip(
  depart: string | null | undefined,
  arrive: string | null | undefined,
  routeSort: number | string | null | undefined,
  route: string | null | undefined
): string {
  const parts: string[] = [];
  parts.push(`Depart: ${depart ?? '---'}`);
  parts.push(`Arrive: ${arrive ?? '---'}`);
  if (hasSortY(routeSort)) {
    const depot = getDepotFromRouteName(route ?? null);
    const sortHours = depot && DEPOT_SORT_HOURS[depot] != null ? formatDecimalHoursAsHMM(DEPOT_SORT_HOURS[depot]) : '?';
    parts.push(`Sort: Yes (${depot ?? '?'} +${sortHours})`);
  } else {
    parts.push('Sort: No');
  }
  return parts.join(' · ');
}

interface TableCellWorkHoursProps {
  workHours: string | number | null | undefined;
  /** When set, display this value (base + sort once per depot/day) instead of workHours */
  workHoursWithSort?: number;
  depart?: string | null;
  arrive?: string | null;
  routeSort?: number | string | null;
  route?: string | null;
  /** Total work hours sum to show on click */
  totalWorkHoursIncludingSort?: number;
}

export const TableCellWorkHours: React.FC<TableCellWorkHoursProps> = ({
  workHours,
  workHoursWithSort,
  depart,
  arrive,
  routeSort,
  route,
  totalWorkHoursIncludingSort,
}) => {
  const [showSumPopover, setShowSumPopover] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!showSumPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSumPopover(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSumPopover(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSumPopover]);

  const tooltip = buildWorkHoursTooltip(depart, arrive, routeSort, route);
  const displayValue =
    workHoursWithSort != null
      ? formatDecimalHoursAsHMM(workHoursWithSort)
      : workHours != null
        ? formatValue(workHours)
        : null;
  const hoursNum = workHoursWithSort ?? formatWorkHours(workHours) ?? 0;
  const isRed = hoursNum < 10;
  const isGreen = hoursNum > 10;
  const totalFormatted =
    totalWorkHoursIncludingSort != null ? formatDecimalHoursAsHMM(totalWorkHoursIncludingSort) : null;

  if (displayValue == null) return <span title={tooltip}>---</span>;

  return (
    <span ref={wrapperRef} className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        className={`cursor-pointer select-none ${
          isRed ? 'text-[#dc3545] font-semibold' : isGreen ? 'text-[#28a745] font-semibold' : ''
        }`}
        title={tooltip}
        onClick={() => totalFormatted != null && setShowSumPopover((v) => !v)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && totalFormatted != null) {
            e.preventDefault();
            setShowSumPopover((v) => !v);
          }
        }}
      >
        {displayValue}
      </span>
      {showSumPopover && totalFormatted != null && (
        <div
          className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-lg shadow-lg whitespace-nowrap"
          role="tooltip"
        >
          Total hours: {totalFormatted}
        </div>
      )}
    </span>
  );
};

