export interface Vehicle {
  vehicleId: number;
  vehicleModel: string;
  vehicleRegistrationPlate: string;
}

export interface Operation {
  operationId: number;
  routeId: number;
  routeName: string;
  amountTotal: string;
  totalStops: number;
  totalPaidStops: number;
  totalUnpaidStops: number;
  departTime: string | null;
  arriveTime: string | null;
  workedHours: string | null;
  breakMinutes: number;
  extra: number;
  adhocSort: number;
  routeSort: number;
  rate: number;
  operationCostModel: number;
  costModelName: string;
  status: string;
  vehicle?: Vehicle;
}

export interface DailyEarning {
  date: string;
  dateName: string;
  amount: string;
  operations?: Operation[];
  totalAmount?: string | null;
  calculatedAmount?: string;
}

export interface MonthOverview {
  currentMonth: {
    name: string;
    daysWorked: number;
    totalPaidStops: number;
    total: number;
    avgPerStops: number;
    averagePerDay: number;
  };
  dailyEarnings: DailyEarning[];
}

export interface PaidStops {
  pu: number;
  ok: number;
  hn: number;
  pd: number | null;
}

export interface UnpaidStops {
  nr: number;
  fp: number;
  rd: number;
  ba: number;
  nh: number;
  cm: number;
  ca?: number;
}

export interface DailyOverview {
  operationId: number;
  routeId: number;
  routeName: string;
  amountTotal: string;
  totalStops: number;
  totalPaidStops: number;
  totalUnpaidStops: number;
  departTime: string | null;
  arriveTime: string | null;
  workedHours: string | null;
  breakMinutes: number;
  extra: number;
  adhocSort: number;
  routeSort: number;
  rate: number;
  operationCostModel: number;
  costModelName: string;
  status: string;
  dateName: string;
  vehicle?: Vehicle;
  paidStops?: PaidStops;
  unpaidStops?: UnpaidStops;
  isSpms?: boolean | null;
  note?: string;
}
