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
  avgPerStops?: number;
  total?: number;
  totalPaidStops?: number;
  isSpms: boolean;
}
