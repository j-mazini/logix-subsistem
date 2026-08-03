/**
 * Vendor requests — mock API layer.
 *
 * Stand-in for the Next.js source's `lib/vendor-requests-api.ts` (VendorRequest
 * CRUD over HTTP) and `lib/vendors-api.ts` / `hooks/useDayOffItems.ts`. Same
 * shapes and function names, backed by an in-memory store so mutations
 * (approve/reject from RequestsAdmin, submissions from the Invoices/Requests
 * pages) persist for the lifetime of the tab instead of resetting on refetch —
 * all pages share this one store.
 */

const NETWORK_DELAY_MS = 200;
const delay = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

export type VendorRequestType = 'DayOff' | 'HolyDay' | 'PrePayment';
export type VendorRequestStatus = 'pending' | 'approved' | 'rejected' | string;

export interface VendorRequest {
  vendorRequestId: number;
  userId: number;
  requestType: VendorRequestType;
  startDate?: string;
  endDate?: string;
  prePaymentValue?: string;
  notes?: string;
  reason?: string;
  status: VendorRequestStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateVendorRequestDTO {
  userId: number;
  requestType: VendorRequestType;
  startDate?: string;
  endDate?: string;
  prePaymentValue?: string;
  notes?: string;
  reason?: string;
  status?: string;
}

export interface FetchVendorRequestsParams {
  userId?: number;
  servicePartnerId?: number;
  month?: number;
  year?: number;
}

export interface MockVendor {
  userId: number;
  firstName: string;
  lastName: string;
  servicePartnerId: number | null;
}

export const MOCK_VENDORS: MockVendor[] = [
  { userId: 201, firstName: 'James', lastName: 'Okafor', servicePartnerId: null },
  { userId: 202, firstName: 'Priya', lastName: 'Chandra', servicePartnerId: null },
  { userId: 203, firstName: 'Marcus', lastName: 'Webb', servicePartnerId: null },
  { userId: 204, firstName: 'Elena', lastName: 'Popescu', servicePartnerId: null },
  { userId: 205, firstName: 'Tomasz', lastName: 'Nowak', servicePartnerId: null },
  { userId: 206, firstName: 'Grace', lastName: 'Mensah', servicePartnerId: null },
];

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function seedRequests(): VendorRequest[] {
  const now = new Date();
  let id = 1;
  const requests: VendorRequest[] = [];

  // Pending — this month
  requests.push({
    vendorRequestId: id++,
    userId: 201,
    requestType: 'PrePayment',
    prePaymentValue: '150.00',
    reason: 'Vehicle repair',
    notes: 'Needed before next shift',
    status: 'pending',
    createdAt: daysAgo(1).toISOString(),
  });
  requests.push({
    vendorRequestId: id++,
    userId: 202,
    requestType: 'DayOff',
    startDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5)),
    endDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5)),
    reason: 'Medical appointment',
    status: 'pending',
    createdAt: daysAgo(2).toISOString(),
  });
  requests.push({
    vendorRequestId: id++,
    userId: 203,
    requestType: 'HolyDay',
    startDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10)),
    endDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)),
    reason: 'Family holiday',
    status: 'pending',
    createdAt: daysAgo(3).toISOString(),
  });
  requests.push({
    vendorRequestId: id++,
    userId: 204,
    requestType: 'PrePayment',
    prePaymentValue: '80.00',
    reason: 'Fuel advance',
    status: 'pending',
    createdAt: daysAgo(0.5).toISOString(),
  });

  // Approved — this month
  requests.push({
    vendorRequestId: id++,
    userId: 205,
    requestType: 'DayOff',
    startDate: toDateStr(daysAgo(6)),
    endDate: toDateStr(daysAgo(6)),
    reason: 'Personal',
    status: 'approved',
    createdAt: daysAgo(10).toISOString(),
    updatedAt: daysAgo(9).toISOString(),
  });
  requests.push({
    vendorRequestId: id++,
    userId: 206,
    requestType: 'PrePayment',
    prePaymentValue: '200.00',
    reason: 'Emergency advance',
    status: 'approved',
    createdAt: daysAgo(14).toISOString(),
    updatedAt: daysAgo(13).toISOString(),
  });

  // Rejected — this month
  requests.push({
    vendorRequestId: id++,
    userId: 201,
    requestType: 'HolyDay',
    startDate: toDateStr(daysAgo(-2)),
    endDate: toDateStr(daysAgo(-6)),
    reason: 'Last-minute trip',
    notes: 'Too close to peak season',
    status: 'rejected',
    createdAt: daysAgo(16).toISOString(),
    updatedAt: daysAgo(15).toISOString(),
  });

  // Previous month — mostly resolved
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 12);
  requests.push({
    vendorRequestId: id++,
    userId: 203,
    requestType: 'DayOff',
    startDate: toDateStr(lastMonth),
    endDate: toDateStr(lastMonth),
    reason: 'Personal',
    status: 'approved',
    createdAt: lastMonth.toISOString(),
    updatedAt: lastMonth.toISOString(),
  });
  requests.push({
    vendorRequestId: id++,
    userId: 202,
    requestType: 'PrePayment',
    prePaymentValue: '120.00',
    reason: 'Advance payment',
    status: 'approved',
    createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 20).toISOString(),
    updatedAt: new Date(now.getFullYear(), now.getMonth() - 1, 21).toISOString(),
  });

  // Mock driver persona (id 101, "Sam Carter" / TBX — see
  // app/(private)/mockAuth.ts) gets its own small history so the Invoices
  // page's "History" tab isn't empty on first load.
  requests.push({
    vendorRequestId: id++,
    userId: 101,
    requestType: 'DayOff',
    startDate: toDateStr(daysAgo(8)),
    endDate: toDateStr(daysAgo(8)),
    reason: 'Personal',
    status: 'approved',
    createdAt: daysAgo(12).toISOString(),
    updatedAt: daysAgo(11).toISOString(),
  });
  requests.push({
    vendorRequestId: id++,
    userId: 101,
    requestType: 'PrePayment',
    prePaymentValue: '100.00',
    reason: 'Fuel advance',
    status: 'pending',
    createdAt: daysAgo(2).toISOString(),
  });

  return requests;
}

let VENDOR_REQUESTS_STORE: VendorRequest[] = seedRequests();
let nextVendorRequestId = VENDOR_REQUESTS_STORE.reduce((max, r) => Math.max(max, r.vendorRequestId), 0) + 1;

export async function fetchVendorRequests(params: FetchVendorRequestsParams): Promise<VendorRequest[]> {
  await delay();
  const { userId, month, year } = params;
  let results = [...VENDOR_REQUESTS_STORE];
  if (userId != null) {
    results = results.filter((r) => r.userId === userId);
  }
  if (month != null && year != null) {
    results = results.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  }
  return results;
}

export async function createVendorRequest(dto: CreateVendorRequestDTO): Promise<VendorRequest> {
  await delay();
  const record: VendorRequest = {
    vendorRequestId: nextVendorRequestId++,
    userId: dto.userId,
    requestType: dto.requestType,
    startDate: dto.startDate,
    endDate: dto.endDate,
    prePaymentValue: dto.prePaymentValue,
    notes: dto.notes,
    reason: dto.reason,
    status: dto.status ?? 'pending',
    createdAt: new Date().toISOString(),
  };
  VENDOR_REQUESTS_STORE = [...VENDOR_REQUESTS_STORE, record];
  return record;
}

export async function fetchVendors(): Promise<MockVendor[]> {
  await delay(100);
  return MOCK_VENDORS;
}

export async function approveVendorRequestWithoutDayOffInsert(
  vr: VendorRequest,
  _scheduleTerms?: string,
  _feeValue?: number,
  _referenceNumber?: string,
  _startMonth?: string
): Promise<void> {
  await delay();
  VENDOR_REQUESTS_STORE = VENDOR_REQUESTS_STORE.map((r) =>
    r.vendorRequestId === vr.vendorRequestId
      ? { ...r, status: 'approved', updatedAt: new Date().toISOString() }
      : r
  );
}

export async function rejectVendorRequest(vendorRequestId: number): Promise<void> {
  await delay();
  VENDOR_REQUESTS_STORE = VENDOR_REQUESTS_STORE.map((r) =>
    r.vendorRequestId === vendorRequestId
      ? { ...r, status: 'rejected', updatedAt: new Date().toISOString() }
      : r
  );
}

export interface DayOffItem {
  weekPlannerId?: number;
  userId: number;
  fullName?: string;
  date: string;
  status?: string;
  notes?: string;
}

export async function fetchAllDayOffItems(startDate: string, endDate: string): Promise<DayOffItem[]> {
  await delay(150);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const items: DayOffItem[] = [];

  for (const r of VENDOR_REQUESTS_STORE) {
    if (r.requestType === 'PrePayment' || r.status !== 'approved') continue;
    const s = new Date(r.startDate || r.createdAt);
    const e = new Date(r.endDate || r.startDate || r.createdAt);
    const cursor = new Date(s);
    while (cursor <= e) {
      if (cursor >= start && cursor <= end) {
        items.push({ userId: r.userId, date: toDateStr(cursor), status: r.status });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return items;
}
