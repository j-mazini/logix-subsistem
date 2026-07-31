/**
 * Unified types for the vendor requests inbox (admin).
 * Types: Day Off, Holiday, Advance.
 */

export type RequestType = "day_off" | "holiday" | "advance";

export type RequestStatus = "pending" | "approved" | "rejected";

/** Advance request - from prepayment-requests API */
export interface AdvanceRequest {
  type: "advance";
  id: string | number;
  userId: number;
  amount: number;
  reason?: string;
  notes?: string;
  status: RequestStatus | string;
  createdAt: string;
  updatedAt?: string;
}

/** Day Off or Holiday request - grouped from day off entries */
export interface DayOffOrHolidayRequest {
  type: "day_off" | "holiday";
  id: string;
  userId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
  status: RequestStatus | string;
  createdAt?: string;
}

export type AdminRequest = AdvanceRequest | DayOffOrHolidayRequest;

export function isAdvance(r: AdminRequest): r is AdvanceRequest {
  return r.type === "advance";
}

export function isDayOffOrHoliday(r: AdminRequest): r is DayOffOrHolidayRequest {
  return r.type === "day_off" || r.type === "holiday";
}

export function requestTypeLabel(type: RequestType): string {
  switch (type) {
    case "advance":
      return "Advance";
    case "day_off":
      return "Day Off";
    case "holiday":
      return "Holiday";
    default:
      return String(type);
  }
}

export function normalizeStatus(s: string | undefined): RequestStatus | string {
  if (!s) return "pending";
  const lower = String(s).toLowerCase();
  if (lower === "approved" || lower === "aceito") return "approved";
  if (lower === "rejected" || lower === "recusado" || lower === "reproved") return "rejected";
  return lower;
}
