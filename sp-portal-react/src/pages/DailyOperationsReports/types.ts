export interface Filters {
  dateFrom: string;
  dateTo: string;
  depot: string;
  loop: string;
  search: string;
}

export interface TransformedReportData {
  date: string;
  route: string;
  vendor: string;
  vrn: string;
  tw: number | null;
  depart: string | null;
  arrive: string | null;
  workHours: string | number | null;
  stops: number;
  note: string;
  depot: string;
  breakTime: string | null;
  depositId?: number;
  depositName?: string;
  loop?: string | null;
  /** Sort = y when truthy (used for sort time and flag) */
  routeSort?: number | string | null;
  /** Work Hours column value: base + sort (once per depot/day when Sort=Yes) */
  workHoursWithSort?: number;
  /** When false, Stops column is highlighted (data did not come from SPMS). */
  isSpms?: boolean;
}


