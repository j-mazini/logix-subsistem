import { format as formatDate } from "date-fns";
import { DailyPerformanceData } from './types';

export const getTWColorClass = (percentage: number): string => {
  if (percentage >= 90 && percentage <= 100) {
    return "success";
  } else if (percentage >= 80 && percentage < 90) {
    return "warning";
  } else if (percentage >= 70 && percentage < 80) {
    return "orange";
  } else if (percentage < 60) {
    return "danger";
  }
  return "";
};

export const shouldHighlightArrivalTime = (arriveTime: string | null): boolean => {
  if (!arriveTime) return false;

  try {
    const cleanTimeString = arriveTime.replace(/Z|[+-]\d{2}:\d{2}$/g, '');
    const arriveDate = new Date(cleanTimeString);
    const hours = arriveDate.getHours();

    return hours < 17;
  } catch {
    return false;
  }
};

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

export const isDayOff = (operation: DailyPerformanceData): boolean => {
  return (
    operation.status?.toLowerCase().includes('day off') ||
    operation.status?.toLowerCase().includes('dayoff') ||
    operation.note?.toLowerCase().includes('day off') ||
    operation.note?.toLowerCase().includes('dayoff') ||
    operation.route.routeName.toUpperCase() === "DAY OFF" ||
    operation.route.routeName.toUpperCase() === "OFF"
  );
};

export const shouldShowMetrics = (operation: DailyPerformanceData): boolean => {
  const isDayOffOperation = isDayOff(operation);
  return !isDayOffOperation &&
         operation.route.routeName.charAt(0) !== 'B' &&
         operation.route.routeName.charAt(0) !== 'S' &&
         operation.route.routeName.charAt(0) !== 'O';
};

export const formatPercentage = (value: number): string => {
  if (value === 0) return "--:--";
  return `${Math.round(value * 100)}%`;
};

export const formatTime = (timeString: string | null): string => {
  if (!timeString) return "--:--";

  if (timeString.includes(":") && timeString.split(":").length >= 2) {
    const timeParts = timeString.split(":");
    return `${timeParts[0]}:${timeParts[1]}`;
  }

  try {
    const cleanTimeString = timeString.replace(/Z|[+-]\d{2}:\d{2}$/g, '');
    const date = formatDate(new Date(cleanTimeString), "HH:mm");
    return date;
  } catch {
    return "--:--";
  }
};
