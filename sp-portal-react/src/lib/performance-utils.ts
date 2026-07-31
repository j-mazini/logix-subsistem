export const DEPOT_SORT_HOURS = 0.5;

export function parseWorkedHoursToDecimal(hours: string | number): number {
  if (typeof hours === 'number') return hours;
  if (!hours) return 0;

  const parts = String(hours).split(':');
  if (parts.length === 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h + m / 60;
  }

  return parseFloat(String(hours)) || 0;
}

export function formatHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

export function getVendorExtraHoursOnly(hours: string | number | undefined | null): number {
  if (!hours) return 0;
  const decimal = parseWorkedHoursToDecimal(hours);
  return Math.max(0, decimal - DEPOT_SORT_HOURS);
}

export function hasSortY(data: any): boolean {
  return data && data.sortY > 0;
}

export function getDepotFromRouteName(routeName) {
  if (!routeName) return '';
  return routeName.substring(0, 2);
}

// --- Daily performance insight metrics (SPR / SPOR-H / AFD) ---
// Ported from the Next.js source's lib/performance-utils.ts. Kept separate from
// the DEPOT_SORT_HOURS/getVendorExtraHoursOnly above, which use a different
// (simpler, per-hour) shape already relied on by DailyOperationsReports.

interface PerformancePaidStops {
  pu: number;
  ok: number;
  hn: number;
  pd: number | null;
}

interface PerformanceUnpaidStops {
  nr: number;
  fp: number;
  rd: number;
  ba: number;
  nh: number;
  cm: number;
  ca: number;
}

interface PerformanceOperation {
  deliveryDetails: {
    paidStops: PerformancePaidStops;
    unpaidStops: PerformanceUnpaidStops;
    departTime: string | null;
    arriveTime: string | null;
  };
  dailyMetrics: {
    breakMinutes: number;
  };
}

/** Converts a "HH:mm" / "HH:mm:ss" time string to minutes since midnight, or -1 if unparseable. */
export const timeStringToMinutes = (timeString: string): number => {
  try {
    const timeParts = timeString.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      return hours * 60 + minutes;
    }
    return -1;
  } catch {
    return -1;
  }
};

/** SPR (Stops Per Route) — total of paid stops + unpaid stops. */
export const calculateSPR = (operation: PerformanceOperation): number => {
  const paidStops = operation.deliveryDetails.paidStops;
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalPaidStops = paidStops.pu + paidStops.ok + paidStops.hn + (paidStops.pd || 0);
  const totalUnpaidStops = unpaidStops.nr + unpaidStops.fp + unpaidStops.rd +
    unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  return totalPaidStops + totalUnpaidStops;
};

/** SPOR-H (Stops Per Hour), based on depart/arrive time minus break minutes. */
export const calculateSPORH = (operation: PerformanceOperation): number => {
  const departTime = operation.deliveryDetails.departTime;
  const arriveTime = operation.deliveryDetails.arriveTime;

  if (!departTime || !arriveTime) return 0;

  const departTimeMinutes = timeStringToMinutes(departTime);
  const arriveTimeMinutes = timeStringToMinutes(arriveTime);

  if (departTimeMinutes === -1 || arriveTimeMinutes === -1) return 0;

  let workTimeMinutes = arriveTimeMinutes - departTimeMinutes;

  if (workTimeMinutes < 0) {
    workTimeMinutes += 24 * 60;
  }

  const breakMinutes = operation.dailyMetrics.breakMinutes || 0;
  const effectiveWorkMinutes = workTimeMinutes - breakMinutes;

  if (effectiveWorkMinutes <= 0) return 0;

  const totalStops = calculateSPR(operation);

  return (totalStops / effectiveWorkMinutes) * 60;
};

/** AFD (Attempted Failed Deliveries) percentage, with the source's custom rounding rule. */
export const calculateAFD = (operation: PerformanceOperation): number => {
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalFailedDeliveries =
    unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca +
    unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  const spr = calculateSPR(operation);
  const totalDeliveries = spr + totalFailedDeliveries;

  if (totalDeliveries === 0) return 0;

  const percentage = (totalFailedDeliveries / totalDeliveries) * 100;

  const decimalPart = percentage - Math.floor(percentage);
  const decimalAsInt = Math.round(decimalPart * 100);

  if (decimalAsInt <= 10) {
    return Math.floor(percentage);
  } else {
    return Math.ceil(percentage);
  }
};
