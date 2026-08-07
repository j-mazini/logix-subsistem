/**
 * Ported from the reference app's app/(private)/subcontractor/types.ts.
 * Shape mirrors the BFF day-overview response for a single driver-day.
 */
export interface DayOverviewResponse {
  operationId: number;
  userId?: string | number;
  fullName?: string;
  email?: string;
  operationDate: string;
  status: string;
  note: string | null;
  dailyCash: {
    rate: number | null;
    dailyServiceCharge?: number;
    extra: number;
    adhocSort: number;
    routeSort: number;
  };
  route: {
    routeId: number;
    routeName: string;
  };
  timeWindows: {
    percentageOnTime: number;
  };
  deliveryDetails: {
    totalAfd: number;
    paidStops: {
      pu: number;
      ok: number;
      hn: number;
      pd: number | null;
    };
    unpaidStops: {
      nr: number;
      fp: number;
      rd: number;
      ba: number;
      nh: number;
      cm: number;
      ca?: number;
    };
    departTime: string | null;
    arriveTime: string | null;
  };
  dailyMetrics: {
    totalStops: number;
    sporh: number;
    breakMinutes: number;
  };
  operationCostModel?: number | null;
  costModel?: {
    costModelId: number;
    costModelName: string;
    costModelType?: string;
    modelEmployeesId?: number | null;
    minStops: number | null;
    maxStops: number | null;
    fixedPrice: number | null;
    pricePerStop: number | null;
    description?: string;
    validityStartDate?: string | null;
    validityEndDate?: string | null;
    isElectric?: boolean;
    modelAdhocEmployeesId?: number | null;
    dayRate?: number | null;
    baseDayRate?: number | null;
    baseBandLimit?: number | null;
    stopRate?: number | null;
    hourlyRate?: number | null;
    adhocValidityStartDate?: string | null;
    adhocValidityEndDate?: string | null;
  }[];
  avgPerStops?: number;
  total?: number;
  totalPaidStops?: number;
  isSpms: boolean;
}
