import { MOCK_REPORTS_POOL, MOCK_DEPOSITS } from './mock-data';

export interface DailyOperationsReportDTO {
  operationDate: string;
  routeName: string;
  courierName: string;
  vrn: string;
  percentageOtTwDl: number;
  departTime: string;
  arriveTime: string;
  calculatedWorkHours: number;
  totalStops: number;
  note: string;
  depositName: string;
  depositId: number;
  breakMinutes: number;
  loopName: string;
  routeSort: number;
  isSpms: boolean;
}

export async function fetchAllDailyOperationsReportsWithFilters(
  filters: { dateFrom?: string; dateTo?: string; depot?: string; search?: string },
  deposits: any[],
  page: number,
  pageSize: number,
  servicePartnerId?: number
) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const dateFrom = filters.dateFrom?.trim();
  const dateTo = filters.dateTo?.trim() || dateFrom;

  let filtered = MOCK_REPORTS_POOL.filter(r => {
    if (dateFrom && r.operationDate < dateFrom) return false;
    if (dateTo && r.operationDate > dateTo) return false;
    return true;
  });

  if (filters.depot && filters.depot !== 'All') {
    filtered = filtered.filter(r => r.depositName === filters.depot);
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim().toLowerCase();
    filtered = filtered.filter(r =>
      r.courierName.toLowerCase().includes(search) ||
      r.routeName.toLowerCase().includes(search) ||
      r.vrn.toLowerCase().includes(search)
    );
  }

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const paginatedData = filtered.slice(start, start + pageSize);

  return {
    data: paginatedData,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      pageSize
    }
  };
}

export async function fetchDepositsWithServiceTypesAndRoutes() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));

  return MOCK_DEPOSITS.map(deposit => ({
    ...deposit,
    serviceTypes: [
      {
        serviceTypeId: 1,
        name: 'Standard_Delivery',
        routes: [
          { routeName: 'MD7A', routeId: 1 },
          { routeName: 'MD7B', routeId: 2 },
          { routeName: 'MD7C', routeId: 3 }
        ]
      },
      {
        serviceTypeId: 2,
        name: 'Express',
        routes: [
          { routeName: 'EX1A', routeId: 4 },
          { routeName: 'EX1B', routeId: 5 }
        ]
      }
    ]
  }));
}
