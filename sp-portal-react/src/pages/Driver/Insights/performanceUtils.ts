/**
 * Ported from the reference app's lib/performance-utils.ts (SPR/SPOR-H/AFD
 * formulas only — the depot/vendor "extra worked hours" helpers at the
 * bottom of that file aren't used by this page, so they're dropped here).
 */
import type { DailyMetrics, DeliveryDetails } from './types';

interface PerformanceOperation {
  deliveryDetails: DeliveryDetails;
  dailyMetrics: DailyMetrics;
}

/** Helper to convert a "HH:mm" / "HH:mm:ss" time string to minutes since midnight. */
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

/** SPR (Stops Per Route) = total paid stops + total unpaid stops. */
export const calculateSPR = (operation: PerformanceOperation): number => {
  const paidStops = operation.deliveryDetails.paidStops;
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalPaidStops = paidStops.pu + paidStops.ok + paidStops.hn + (paidStops.pd || 0);
  const totalUnpaidStops =
    unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

  return totalPaidStops + totalUnpaidStops;
};

/** SPOR-H (Stops Per Hour) = SPR / effective worked hours (arrival - departure - break). */
export const calculateSPORH = (operation: PerformanceOperation): number => {
  const departTime = operation.deliveryDetails.departTime;
  const arriveTime = operation.deliveryDetails.arriveTime;

  if (!departTime || !arriveTime) return 0;

  const departTimeMinutes = timeStringToMinutes(departTime);
  const arriveTimeMinutes = timeStringToMinutes(arriveTime);

  if (departTimeMinutes === -1 || arriveTimeMinutes === -1) return 0;

  let workTimeMinutes = arriveTimeMinutes - departTimeMinutes;
  if (workTimeMinutes < 0) workTimeMinutes += 24 * 60;

  const breakMinutes = operation.dailyMetrics.breakMinutes || 0;
  const effectiveWorkMinutes = workTimeMinutes - breakMinutes;

  if (effectiveWorkMinutes <= 0) return 0;

  const totalStops = calculateSPR(operation);
  return (totalStops / effectiveWorkMinutes) * 60;
};

/** AFD (Attempted Failed Deliveries) percentage, with the reference's custom rounding rules. */
export const calculateAFD = (operation: PerformanceOperation): number => {
  const unpaidStops = operation.deliveryDetails.unpaidStops;

  const totalFailedDeliveries =
    unpaidStops.nr + unpaidStops.fp + unpaidStops.rd + unpaidStops.ca + unpaidStops.ba + unpaidStops.nh + unpaidStops.cm;

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
