import type { DailyPerformanceData } from './types';

/** Determines the TW (time-window) color band from a percentage (0-100). */
export const getTWColorClass = (percentage: number): string => {
  if (percentage >= 90 && percentage <= 100) {
    return 'success';
  } else if (percentage >= 80 && percentage < 90) {
    return 'warning';
  } else if (percentage >= 70 && percentage < 80) {
    return 'orange';
  } else if (percentage < 60) {
    return 'danger';
  }
  return ''; // No specific color for 60-70%
};

/** Whether the arrival time should be highlighted (arrived before 5pm). */
export const shouldHighlightArrivalTime = (arriveTime: string | null): boolean => {
  if (!arriveTime) return false;

  try {
    const cleanTimeString = arriveTime.replace(/Z|[+-]\d{2}:\d{2}$/g, '');
    const arriveDate = new Date(`1970-01-01T${cleanTimeString.length <= 8 ? cleanTimeString : cleanTimeString.slice(-8)}`);
    const hours = arriveDate.getHours();
    return hours < 17;
  } catch {
    return false;
  }
};

/** Vehicle icon based on the vehicle model text. */
export const getVehicleIcon = (vehicleModel: string): string => {
  const model = vehicleModel.toLowerCase();

  if (model.includes('van') || model.includes('bullet') || model.includes('transit')) {
    return 'bi-truck';
  } else if (model.includes('car') || model.includes('sedan')) {
    return 'bi-car-front';
  } else if (model.includes('bike') || model.includes('motorcycle')) {
    return 'bi-bicycle';
  } else if (model.includes('cargo')) {
    return 'bi-box-seam';
  }

  return 'bi-truck';
};

/** Whether the operation represents a "day off". */
export const isDayOff = (operation: DailyPerformanceData): boolean => {
  return (
    operation.status?.toLowerCase().includes('day off') ||
    operation.status?.toLowerCase().includes('dayoff') ||
    operation.note?.toLowerCase().includes('day off') ||
    operation.note?.toLowerCase().includes('dayoff') ||
    operation.route.routeName.toUpperCase() === 'DAY OFF' ||
    operation.route.routeName.toUpperCase() === 'OFF'
  );
};

/** Whether the metrics/timeline/failed-deliveries cards should be shown. */
export const shouldShowMetrics = (operation: DailyPerformanceData): boolean => {
  const isDayOffOperation = isDayOff(operation);
  return (
    !isDayOffOperation &&
    operation.route.routeName.charAt(0) !== 'B' &&
    operation.route.routeName.charAt(0) !== 'S' &&
    operation.route.routeName.charAt(0) !== 'O'
  );
};

/** Formats a 0-1 ratio as a rounded percentage string ("--:--" when zero). */
export const formatPercentage = (value: number): string => {
  if (value === 0) return '--:--';
  return `${Math.round(value * 100)}%`;
};

/** Formats a time string ("HH:mm:ss" or ISO) down to "HH:mm". */
export const formatTime = (timeString: string | null): string => {
  if (!timeString) return '--:--';

  if (timeString.includes(':') && timeString.split(':').length >= 2) {
    const timeParts = timeString.split(':');
    return `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
  }

  try {
    const cleanTimeString = timeString.replace(/Z|[+-]\d{2}:\d{2}$/g, '');
    const date = new Date(cleanTimeString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '--:--';
  }
};

/** yyyy-MM-dd formatting without pulling in date-fns for this one call site. */
export const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
