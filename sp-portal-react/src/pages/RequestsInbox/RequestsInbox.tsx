import { useCallback, useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/shared-pages.css';
import '../../styles/legacy/requests-admin.css';
import '../../styles/legacy/requests-inbox.css';

/* =====================================================
   Requests Inbox — Logixsphere portal
   Port of app/(private)/requests-inbox from the Next.js source: a
   month-grouped Kanban (Pending / Approved / Denied) view of vendor
   requests, distinct from RequestsAdmin.tsx's flat Requests/History table
   view of the same underlying data shape. Purely mock/simulated data via a
   deterministic seeded PRNG, no backend.
   ===================================================== */

/* ---------- small deterministic PRNG helpers (verbatim port, see RequestsAdmin.tsx) ---------- */
function hashStringToSeed(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

/* ---------- types ---------- */
interface VendorType {
  vendorTypeId: number;
  nameType: string;
}
interface ServicePartner {
  servicePartnerId: number;
  partnerName: string;
}
interface Vendor {
  userId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  vendorTypeId: number;
  servicePartnerId: number | null;
}
type RequestType = 'DayOff' | 'HolyDay' | 'PrePayment';
interface VendorRequest {
  vendorRequestId: number;
  userId: number;
  requestType: RequestType;
  status: string;
  startDate: string | null;
  endDate: string | null;
  prePaymentValue: number | null;
  reason: string;
  notes: string;
  createdAt: string;
  updatedAt: string | null;
}
interface MasterData {
  vendorTypes: VendorType[];
  servicePartners: ServicePartner[];
  vendors: Vendor[];
}

/* ==================== MASTER (mock) DATA — same shape/seed spirit as RequestsAdmin.tsx ==================== */
function buildMasterData(): MasterData {
  const vendorTypes: VendorType[] = [
    { vendorTypeId: 1, nameType: 'Owner Driver' },
    { vendorTypeId: 2, nameType: 'Multi Drop' },
    { vendorTypeId: 3, nameType: 'Courier Company' },
    { vendorTypeId: 4, nameType: 'Van Owner' },
  ];

  const servicePartners: ServicePartner[] = [
    { servicePartnerId: 1, partnerName: 'Swift Logistics' },
    { servicePartnerId: 2, partnerName: 'Kent Express' },
    { servicePartnerId: 3, partnerName: 'Medway Movers' },
  ];

  const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
  const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
  const rng = rngForSeed('ri-vendors-v1');
  const vendors: Vendor[] = Array.from({ length: 10 }, (_, i) => {
    const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
    const vendorTypeId = vendorTypes[i % vendorTypes.length].vendorTypeId;
    const hasSp = rng() > 0.35;
    return {
      userId: 1000 + i,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[(i * 3) % lastNames.length],
      fullName,
      vendorTypeId,
      servicePartnerId: hasSp ? servicePartners[i % servicePartners.length].servicePartnerId : null,
    };
  });

  return { vendorTypes, servicePartners, vendors };
}

/* ==================== MOCK VENDOR REQUESTS ====================
   Spread across the current and previous few months (by createdAt) so the
   month-grouped Kanban and month picker have something to switch between. */
function generateMockRequests(vendors: Vendor[]): VendorRequest[] {
  const rng = rngForSeed('ri-requests-v1');
  const requestTypes: RequestType[] = ['DayOff', 'HolyDay', 'PrePayment'];
  const statuses = ['pending', 'pending', 'pending', 'pending', 'pending', 'approved', 'approved', 'approved', 'rejected', 'rejected'];
  const reasonsByType: Record<RequestType, string[]> = {
    DayOff: ['Personal matters', 'Family commitment', 'Feeling unwell', 'Appointment'],
    HolyDay: ['Annual leave', 'Family holiday abroad', 'Religious observance', 'Rest period'],
    PrePayment: ['Vehicle repair costs', 'Unexpected expense', 'Fuel shortfall', 'Emergency funds needed'],
  };
  const notesPool = ['Please review urgently', 'Discussed with team lead', 'Recurring request', ''];

  const requests: VendorRequest[] = [];
  let id = 6001;
  const count = 48;

  for (let i = 0; i < count; i++) {
    const vendor = vendors[i % vendors.length];
    const requestType = requestTypes[i % requestTypes.length];
    const status = statuses[Math.floor(rng() * statuses.length)];
    const createdDaysAgo = Math.floor(rng() * 110) + 1;
    const createdAt = new Date(Date.now() - createdDaysAgo * 86400000);

    let startDate: string | null = null;
    let endDate: string | null = null;
    let prePaymentValue: number | null = null;

    if (requestType === 'DayOff') {
      const d = new Date(createdAt.getTime() + Math.floor(rng() * 30) * 86400000);
      startDate = d.toISOString().slice(0, 10);
    } else if (requestType === 'HolyDay') {
      const d = new Date(createdAt.getTime() + Math.floor(rng() * 30) * 86400000);
      startDate = d.toISOString().slice(0, 10);
      const spanDays = 1 + Math.floor(rng() * 6);
      const dEnd = new Date(d.getTime() + spanDays * 86400000);
      endDate = dEnd.toISOString().slice(0, 10);
    } else if (requestType === 'PrePayment') {
      prePaymentValue = Math.round((50 + rng() * 450) * 100) / 100;
    }

    let updatedAt: string | null = null;
    if (status !== 'pending') {
      const updatedDaysAgo = Math.max(0, createdDaysAgo - Math.floor(rng() * createdDaysAgo));
      updatedAt = new Date(Date.now() - updatedDaysAgo * 86400000).toISOString();
    }

    requests.push({
      vendorRequestId: id++,
      userId: vendor.userId,
      requestType,
      status,
      startDate,
      endDate,
      prePaymentValue,
      reason: reasonsByType[requestType][Math.floor(rng() * reasonsByType[requestType].length)],
      notes: notesPool[Math.floor(rng() * notesPool.length)],
      createdAt: createdAt.toISOString(),
      updatedAt,
    });
  }

  requests.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return requests;
}

/* ==================== reference number, ported verbatim ==================== */
function generatePrePaymentReferenceNumber(vendorName: string, vendorRequestId: number): string {
  const prefix = 'PRP';
  let cleanName = vendorName.trim();
  if (cleanName.startsWith('#')) cleanName = cleanName.substring(1).trim();
  if (cleanName.toLowerCase().startsWith('vendor')) cleanName = cleanName.substring(6).trim();

  const nameParts = cleanName.split(/\s+/).filter((part) => part.length > 0 && /[a-zA-Z]/.test(part));
  let initials = '';
  if (nameParts.length > 0) {
    const firstName = nameParts[0];
    const lastNames = nameParts.length > 1 ? nameParts.slice(1).join('') : '';
    initials = (firstName.charAt(0).toUpperCase() + lastNames.toUpperCase()).replace(/[^A-Z]/g, '');
  }
  if (!initials || initials.length === 0) {
    initials = `VND${vendorRequestId}`;
  }

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = String(today.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;
  const seq = String(vendorRequestId).padStart(3, '0');
  return `${prefix}-${initials}-${dateStr}-${seq}`;
}

/* ==================== formatting / labelling helpers ==================== */
function getRequestTypeLabel(requestType: RequestType): string {
  if (requestType === 'DayOff') return 'Day Off';
  if (requestType === 'HolyDay') return 'Holiday';
  return 'Advance';
}
function isPendingStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'pending' || s === 'created' || s === 'sent' || s === 'open';
}
function isApprovedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'approved' || s === 'aceito';
}
function isRejectedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'rejected' || s === 'recusado' || s === 'reproved';
}

/** Formats a YYYY-MM-DD date string without shifting the day due to timezone. */
function formatRequestDate(dateStr: string | null | undefined): string {
  if (!dateStr || !String(dateStr).trim()) return '—';
  const trimmed = String(dateStr).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[parseInt(m, 10) - 1] ?? m;
    return `${d} ${month} ${y}`;
  }
  return trimmed;
}
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getRequestMonthKey(r: VendorRequest): string {
  const d = new Date(r.createdAt);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
function groupRequestsByMonth(requests: VendorRequest[]): [string, VendorRequest[]][] {
  const map = new Map<string, VendorRequest[]>();
  for (const r of requests) {
    const key = getRequestMonthKey(r);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

type CardVariant = 'pending' | 'approved' | 'rejected';

/* ==================== Vendors Off derived data ====================
   Rather than a second mock generator, derive per-day "who's off" entries
   from the DayOff/HolyDay requests already generated above — simpler and
   keeps the two views consistent with each other. */
interface DayOffItem {
  userId: number;
  date: string;
}
function expandDayOffItems(requests: VendorRequest[]): DayOffItem[] {
  const items: DayOffItem[] = [];
  for (const r of requests) {
    if (r.requestType !== 'DayOff' && r.requestType !== 'HolyDay') continue;
    if (!r.startDate) continue;
    const start = new Date(`${r.startDate}T00:00:00`);
    const end = new Date(`${r.endDate ?? r.startDate}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    const cursor = new Date(start);
    let guard = 0;
    while (cursor <= end && guard < 60) {
      items.push({ userId: r.userId, date: cursor.toISOString().slice(0, 10) });
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }
  return items;
}

function getWeeksOfMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks: Date[] = [];
  let currentDate = new Date(firstDay);
  const dayOfWeek = currentDate.getDay();
  const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  currentDate = new Date(currentDate.setDate(diff));

  while (currentDate <= lastDay) {
    weeks.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return weeks;
}

export function RequestsInbox() {
  const master = useMemo(() => buildMasterData(), []);
  const { servicePartners, vendors } = master;

  const [allRequests, setAllRequests] = useState<VendorRequest[]>(() => generateMockRequests(vendors));
  const dayOffItems = useMemo(() => expandDayOffItems(allRequests), [allRequests]);

  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [search, setSearch] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null);

  const [scheduleTermsModalOpen, setScheduleTermsModalOpen] = useState(false);
  const [requestForScheduleTerms, setRequestForScheduleTerms] = useState<VendorRequest | null>(null);
  const [installmentsInput, setInstallmentsInput] = useState('1');
  const [feeValueInput, setFeeValueInput] = useState('0');
  const [startMonthInput, setStartMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [vendorsOffOpen, setVendorsOffOpen] = useState(false);
  const [vendorsOffMonth, setVendorsOffMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));

  useModalBehavior(() => setSelectedRequest(null), selectedRequest !== null);
  useModalBehavior(() => setScheduleTermsModalOpen(false), scheduleTermsModalOpen);
  useModalBehavior(() => setVendorsOffOpen(false), vendorsOffOpen);

  function getVendorName(userId: number): string {
    const v = vendors.find((x) => x.userId === userId);
    return v ? v.fullName : `Vendor${userId}`;
  }
  function getVendorServicePartnerId(userId: number): number | null {
    const v = vendors.find((x) => x.userId === userId);
    return v ? v.servicePartnerId : null;
  }

  const selectedMonthKey = useMemo(
    () => `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`,
    [selectedMonth],
  );

  const scopedRequests = useMemo(() => {
    return allRequests.filter((r) => {
      if (getRequestMonthKey(r) !== selectedMonthKey) return false;
      if (selectedServicePartnerId !== '') {
        const spId = getVendorServicePartnerId(r.userId);
        if (spId == null || String(spId) !== selectedServicePartnerId) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequests, selectedMonthKey, selectedServicePartnerId, vendors]);

  const searchedRequests = useMemo(() => {
    if (!search.trim()) return scopedRequests;
    const q = search.toLowerCase().trim();
    return scopedRequests.filter((r) => {
      const name = getVendorName(r.userId).toLowerCase();
      const type = getRequestTypeLabel(r.requestType).toLowerCase();
      return name.includes(q) || type.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedRequests, search, vendors]);

  const pending = useMemo(() => searchedRequests.filter((r) => isPendingStatus(r.status)), [searchedRequests]);
  const approved = useMemo(() => searchedRequests.filter((r) => isApprovedStatus(r.status)), [searchedRequests]);
  const rejected = useMemo(() => searchedRequests.filter((r) => isRejectedStatus(r.status)), [searchedRequests]);

  const pendingByMonth = useMemo(() => groupRequestsByMonth(pending), [pending]);
  const approvedByMonth = useMemo(() => groupRequestsByMonth(approved), [approved]);
  const rejectedByMonth = useMemo(() => groupRequestsByMonth(rejected), [rejected]);

  const dashboardCounts = useMemo(() => {
    let advance = 0;
    let dayOff = 0;
    let holiday = 0;
    for (const r of scopedRequests) {
      if (r.requestType === 'PrePayment') advance += 1;
      else if (r.requestType === 'DayOff') dayOff += 1;
      else holiday += 1;
    }
    return { advance, dayOff, holiday, total: advance + dayOff + holiday };
  }, [scopedRequests]);

  const pendingCount = useMemo(() => scopedRequests.filter((r) => isPendingStatus(r.status)).length, [scopedRequests]);
  const approvedCount = useMemo(() => scopedRequests.filter((r) => isApprovedStatus(r.status)).length, [scopedRequests]);
  const rejectedCount = useMemo(() => scopedRequests.filter((r) => isRejectedStatus(r.status)).length, [scopedRequests]);

  const applyApproval = useCallback(
    (request: VendorRequest, installments?: string, feeValue?: number, startMonth?: string) => {
      setLoadingAction('approve');
      const updatedAt = new Date().toISOString();
      const notesSuffix =
        request.requestType === 'PrePayment' && (installments || feeValue || startMonth)
          ? ` [Schedule: ${installments ?? '1'} installment(s) from ${startMonth ?? '-'}, fee £${feeValue ?? 0}]`
          : '';
      setAllRequests((prev) =>
        prev.map((r) =>
          r.vendorRequestId === request.vendorRequestId
            ? { ...r, status: 'approved', updatedAt, notes: notesSuffix ? `${r.notes || ''}${notesSuffix}`.trim() : r.notes }
            : r,
        ),
      );
      setLoadingAction(null);
      setSelectedRequest(null);
    },
    [],
  );

  const handleApprove = useCallback(
    (request: VendorRequest) => {
      if (request.requestType === 'PrePayment') {
        setRequestForScheduleTerms(request);
        setInstallmentsInput('1');
        setFeeValueInput('0');
        const now = new Date();
        setStartMonthInput(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        setSelectedRequest(null);
        setScheduleTermsModalOpen(true);
        return;
      }
      applyApproval(request);
    },
    [applyApproval],
  );

  const handleReject = useCallback((request: VendorRequest) => {
    setLoadingAction('reject');
    const updatedAt = new Date().toISOString();
    setAllRequests((prev) =>
      prev.map((r) => (r.vendorRequestId === request.vendorRequestId ? { ...r, status: 'rejected', updatedAt } : r)),
    );
    setLoadingAction(null);
    setSelectedRequest(null);
  }, []);

  const handleConfirmScheduleTerms = useCallback(() => {
    if (!requestForScheduleTerms) return;
    const feeValue = feeValueInput ? Number.parseFloat(feeValueInput) : 0;
    void generatePrePaymentReferenceNumber(getVendorName(requestForScheduleTerms.userId), requestForScheduleTerms.vendorRequestId);
    applyApproval(requestForScheduleTerms, installmentsInput, feeValue, startMonthInput);
    setScheduleTermsModalOpen(false);
    setRequestForScheduleTerms(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestForScheduleTerms, installmentsInput, feeValueInput, startMonthInput, applyApproval]);

  function closeScheduleTermsModal() {
    setScheduleTermsModalOpen(false);
    setRequestForScheduleTerms(null);
    setInstallmentsInput('1');
    setFeeValueInput('0');
  }

  function shiftMonth(base: Date, delta: number): Date {
    return new Date(base.getFullYear(), base.getMonth() + delta, 1);
  }

  return (
    <PortalLayout pageClassName="requests-inbox-page" mainClassName="va-container container-fluid px-3 px-lg-4 py-4" title="Requests Inbox">
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-inbox-fill" />
            <span>Kanban-style review of pending, approved and denied vendor requests.</span>
          </p>
        </div>
      </div>

      {/* ============ TOOLBAR ============ */}
      <div className="ri-toolbar">
        <div className="ri-toolbar-row">
          <label className="ra-filter" htmlFor="riMonth">
            <span className="ra-filter-label">Month</span>
            <input
              id="riMonth"
              type="month"
              className="form-select filter-select"
              value={selectedMonthKey}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                if (y && m) setSelectedMonth(new Date(y, m - 1, 1));
              }}
            />
          </label>
          {servicePartners.length > 0 && (
            <label className="ra-filter" htmlFor="riServicePartner">
              <span className="ra-filter-label">Service Partner</span>
              <select
                id="riServicePartner"
                className="form-select filter-select"
                value={selectedServicePartnerId}
                onChange={(e) => setSelectedServicePartnerId(e.target.value)}
              >
                <option value="">All Service Partners</option>
                {servicePartners.map((sp) => (
                  <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                    {sp.partnerName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="ra-filter ri-search-filter" htmlFor="riSearch">
            <span className="ra-filter-label">Search</span>
            <input
              id="riSearch"
              type="search"
              className="form-select filter-select"
              placeholder="Vendor name or request type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="styled-button styled-button--outline ri-vendors-off-btn"
            onClick={() => {
              setVendorsOffMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setVendorsOffOpen(true);
            }}
          >
            <i className="bi bi-people" /> Vendors Off
          </button>
        </div>
      </div>

      {/* ============ DASHBOARD TILES ============ */}
      <div className="ri-status-tiles">
        <div className="ri-tile ri-tile--pending">
          <div className="ri-tile-head"><i className="bi bi-clock" /><span>Pending</span></div>
          <p className="ri-tile-value">{pendingCount}</p>
        </div>
        <div className="ri-tile ri-tile--approved">
          <div className="ri-tile-head"><i className="bi bi-check-circle" /><span>Approved</span></div>
          <p className="ri-tile-value">{approvedCount}</p>
        </div>
        <div className="ri-tile ri-tile--rejected">
          <div className="ri-tile-head"><i className="bi bi-x-circle" /><span>Rejected</span></div>
          <p className="ri-tile-value">{rejectedCount}</p>
        </div>
      </div>
      <div className="ri-type-tiles">
        <div className="ri-tile">
          <div className="ri-tile-head"><i className="bi bi-wallet2" /><span>Advance</span></div>
          <p className="ri-tile-value">{dashboardCounts.advance}</p>
        </div>
        <div className="ri-tile">
          <div className="ri-tile-head"><i className="bi bi-calendar-event" /><span>Day Off</span></div>
          <p className="ri-tile-value">{dashboardCounts.dayOff}</p>
        </div>
        <div className="ri-tile">
          <div className="ri-tile-head"><i className="bi bi-calendar2-week" /><span>Holiday</span></div>
          <p className="ri-tile-value">{dashboardCounts.holiday}</p>
        </div>
        <div className="ri-tile ri-tile--total">
          <div className="ri-tile-head"><i className="bi bi-grid" /><span>Total</span></div>
          <p className="ri-tile-value">{dashboardCounts.total}</p>
        </div>
      </div>

      {/* ============ KANBAN ============ */}
      <div className="ri-kanban">
        <KanbanColumn
          title="Pending"
          subtitle="Awaiting your decision"
          icon="bi-clock"
          variant="pending"
          count={pending.length}
          byMonth={pendingByMonth}
          getVendorName={getVendorName}
          onCardClick={setSelectedRequest}
          onApprove={handleApprove}
          onReject={handleReject}
          loadingAction={loadingAction}
        />
        <KanbanColumn
          title="Approved"
          subtitle="Already approved requests"
          icon="bi-check-circle"
          variant="approved"
          count={approved.length}
          byMonth={approvedByMonth}
          getVendorName={getVendorName}
          onCardClick={setSelectedRequest}
        />
        <KanbanColumn
          title="Denied"
          subtitle="Denied requests"
          icon="bi-x-circle"
          variant="rejected"
          count={rejected.length}
          byMonth={rejectedByMonth}
          getVendorName={getVendorName}
          onCardClick={setSelectedRequest}
        />
      </div>

      {/* ============ MODAL: Request Detail ============ */}
      <div
        className={`va-modal-backdrop${selectedRequest ? ' sp-modal-backdrop-anim' : ''}`}
        hidden={!selectedRequest}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedRequest(null);
        }}
      >
        {selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            vendorName={getVendorName(selectedRequest.userId)}
            onClose={() => setSelectedRequest(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            loadingAction={loadingAction}
          />
        )}
      </div>

      {/* ============ MODAL: Pre-Payment Schedule Terms & Fees ============ */}
      <div
        className={`va-modal-backdrop${scheduleTermsModalOpen ? ' sp-modal-backdrop-anim' : ''}`}
        hidden={!scheduleTermsModalOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeScheduleTermsModal();
        }}
      >
        <div className={`va-modal va-modal-small${scheduleTermsModalOpen ? ' sp-modal-anim' : ''}`} role="dialog" aria-modal="true">
          <div className="va-modal-header">
            <h2 className="va-modal-title">Pre-Payment — Schedule Terms & Fees</h2>
            <button type="button" className="va-modal-close" aria-label="Close" onClick={closeScheduleTermsModal}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="va-modal-body">
            <p className="va-modal-desc">
              Enter the installment conditions (schedule terms) and fees for this advance payment.
            </p>
            <div className="va-form-field ri-form-field">
              <label className="va-form-label" htmlFor="riInstallments">Schedule Terms (Installments)</label>
              <select id="riInstallments" value={installmentsInput} onChange={(e) => setInstallmentsInput(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={String(num)}>
                    {num} {num === 1 ? 'installment' : 'installments'}
                  </option>
                ))}
              </select>
              <p className="va-form-hint">Select the number of installments (1-12).</p>
            </div>
            <div className="va-form-field ri-form-field">
              <label className="va-form-label" htmlFor="riStartMonth">Start Month</label>
              <input id="riStartMonth" type="month" value={startMonthInput} onChange={(e) => setStartMonthInput(e.target.value)} />
              <p className="va-form-hint">Month when the first installment will be deducted.</p>
            </div>
            <div className="va-form-field ri-form-field">
              <label className="va-form-label" htmlFor="riFeeValue">Fees</label>
              <select id="riFeeValue" value={feeValueInput} onChange={(e) => setFeeValueInput(e.target.value)}>
                <option value="0">£0</option>
                <option value="25">£25</option>
                <option value="40">£40</option>
              </select>
              <p className="va-form-hint">Fees charged on installments.</p>
            </div>
            <div className="va-form-actions">
              <button type="button" className="styled-button styled-button--outline" onClick={closeScheduleTermsModal}>
                Cancel
              </button>
              <button
                type="button"
                className="styled-button styled-button--success"
                onClick={handleConfirmScheduleTerms}
                disabled={loadingAction === 'approve'}
              >
                {loadingAction === 'approve' ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MODAL: Vendors Off ============ */}
      <div
        className={`va-modal-backdrop${vendorsOffOpen ? ' sp-modal-backdrop-anim' : ''}`}
        hidden={!vendorsOffOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setVendorsOffOpen(false);
        }}
      >
        {vendorsOffOpen && (
          <VendorsOffModal
            month={vendorsOffMonth}
            onPrevMonth={() => setVendorsOffMonth((m) => shiftMonth(m, -1))}
            onNextMonth={() => setVendorsOffMonth((m) => shiftMonth(m, 1))}
            onClose={() => setVendorsOffOpen(false)}
            dayOffItems={dayOffItems}
            getVendorName={getVendorName}
          />
        )}
      </div>
    </PortalLayout>
  );
}

/* ==================== Kanban column + card ==================== */

function KanbanColumn({
  title,
  subtitle,
  icon,
  variant,
  count,
  byMonth,
  getVendorName,
  onCardClick,
  onApprove,
  onReject,
  loadingAction,
}: {
  title: string;
  subtitle: string;
  icon: string;
  variant: CardVariant;
  count: number;
  byMonth: [string, VendorRequest[]][];
  getVendorName: (userId: number) => string;
  onCardClick: (request: VendorRequest) => void;
  onApprove?: (request: VendorRequest) => void;
  onReject?: (request: VendorRequest) => void;
  loadingAction?: 'approve' | 'reject' | null;
}) {
  return (
    <div className={`ri-column ri-column--${variant}`}>
      <div className="ri-column-head">
        <div className="ri-column-head-left">
          <div className="ri-column-icon"><i className={`bi ${icon}`} /></div>
          <div>
            <h2 className="ri-column-title">{title}</h2>
            <p className="ri-column-subtitle">{subtitle}</p>
          </div>
        </div>
        <span className="ri-column-count">{count}</span>
      </div>
      <div className="ri-column-body">
        {count === 0 ? (
          <div className="ri-empty">
            <i className={`bi ${icon}`} />
            <p>No {title.toLowerCase()} requests</p>
          </div>
        ) : (
          byMonth.map(([monthKey, list]) => (
            <div key={monthKey} className="ri-month-group">
              <h3 className="ri-month-label">{formatMonthLabel(monthKey)}</h3>
              <div className="ri-card-grid">
                {list.map((r) => (
                  <RequestCard
                    key={r.vendorRequestId}
                    request={r}
                    variant={variant}
                    vendorName={getVendorName(r.userId)}
                    onClick={() => onCardClick(r)}
                    onApprove={onApprove}
                    onReject={onReject}
                    loadingAction={loadingAction}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RequestCard({
  request,
  variant,
  vendorName,
  onClick,
  onApprove,
  onReject,
  loadingAction,
}: {
  request: VendorRequest;
  variant: CardVariant;
  vendorName: string;
  onClick: () => void;
  onApprove?: (request: VendorRequest) => void;
  onReject?: (request: VendorRequest) => void;
  loadingAction?: 'approve' | 'reject' | null;
}) {
  const isAdv = request.requestType === 'PrePayment';
  const summary = isAdv
    ? `${vendorName} · £${Number(request.prePaymentValue || 0).toFixed(2)}`
    : `${vendorName}${request.startDate ? ` · ${formatRequestDate(request.startDate)}` : ''}${
        request.startDate && request.endDate && request.startDate !== request.endDate ? ` – ${formatRequestDate(request.endDate)}` : ''
      }`;
  const showActions = variant === 'pending' && isPendingStatus(request.status) && (onApprove || onReject);

  return (
    <div className={`ri-card ri-card--${variant}`} role="article" aria-label={`${getRequestTypeLabel(request.requestType)} — ${vendorName}`}>
      <button type="button" className="ri-card-main" onClick={onClick}>
        <div className="ri-card-top">
          <span className="ri-card-type">{getRequestTypeLabel(request.requestType)}</span>
          <span className="ri-card-status">{request.status}</span>
        </div>
        <div className="ri-card-summary">{summary}</div>
        <div className="ri-card-meta">{formatDateTime(request.createdAt)}</div>
      </button>
      {showActions && (
        <div className="ri-card-actions">
          {onApprove && (
            <button
              type="button"
              className="styled-button styled-button--success styled-button--sm"
              disabled={loadingAction === 'approve'}
              onClick={(e) => {
                e.stopPropagation();
                onApprove(request);
              }}
            >
              {loadingAction === 'approve' ? '…' : 'Approve'}
            </button>
          )}
          {onReject && (
            <button
              type="button"
              className="styled-button styled-button--danger styled-button--sm"
              disabled={loadingAction === 'reject'}
              onClick={(e) => {
                e.stopPropagation();
                onReject(request);
              }}
            >
              {loadingAction === 'reject' ? '…' : 'Deny'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== Request detail modal ==================== */

function RequestDetailModal({
  request,
  vendorName,
  onClose,
  onApprove,
  onReject,
  loadingAction,
}: {
  request: VendorRequest;
  vendorName: string;
  onClose: () => void;
  onApprove?: (request: VendorRequest) => void;
  onReject?: (request: VendorRequest) => void;
  loadingAction?: 'approve' | 'reject' | null;
}) {
  const isAdv = request.requestType === 'PrePayment';
  const canAct = isPendingStatus(request.status) && (onApprove || onReject);

  return (
    <div className="va-modal sp-modal-anim" role="dialog" aria-modal="true">
      <div className="va-modal-header">
        <h2 className="va-modal-title">
          {getRequestTypeLabel(request.requestType)} — {vendorName}
        </h2>
        <button type="button" className="va-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="va-modal-body">
        <section className="ri-detail-section">
          <h3 className="ri-detail-section-title">Summary</h3>
          <dl className="va-detail-grid">
            <div className="va-detail-row">
              <dt className="va-detail-label">Type</dt>
              <dd className="va-detail-value">{getRequestTypeLabel(request.requestType)}</dd>
            </div>
            <div className="va-detail-row">
              <dt className="va-detail-label">Vendor</dt>
              <dd className="va-detail-value">{vendorName}</dd>
            </div>
            <div className="va-detail-row">
              <dt className="va-detail-label">Status</dt>
              <dd className="va-detail-value">
                <span
                  className={`va-status-badge ${isApprovedStatus(request.status) ? 'approved' : isRejectedStatus(request.status) ? 'rejected' : 'pending'}`}
                >
                  {request.status}
                </span>
              </dd>
            </div>
            <div className="va-detail-row">
              <dt className="va-detail-label">Request ID</dt>
              <dd className="va-detail-value">{request.vendorRequestId}</dd>
            </div>
            <div className="va-detail-row">
              <dt className="va-detail-label">Submitted on</dt>
              <dd className="va-detail-value">{formatDateTime(request.createdAt)}</dd>
            </div>
            {request.updatedAt && (
              <div className="va-detail-row">
                <dt className="va-detail-label">Updated on</dt>
                <dd className="va-detail-value">{formatDateTime(request.updatedAt)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="ri-detail-section">
          <h3 className="ri-detail-section-title">Details</h3>
          <dl className="va-detail-grid">
            {isAdv ? (
              <div className="va-detail-row">
                <dt className="va-detail-label">Amount</dt>
                <dd className="va-detail-value">£{Number(request.prePaymentValue || 0).toFixed(2)}</dd>
              </div>
            ) : request.requestType === 'DayOff' ? (
              <div className="va-detail-row">
                <dt className="va-detail-label">Day off date</dt>
                <dd className="va-detail-value">{formatRequestDate(request.startDate)}</dd>
              </div>
            ) : (
              <>
                <div className="va-detail-row">
                  <dt className="va-detail-label">Start date</dt>
                  <dd className="va-detail-value">{formatRequestDate(request.startDate)}</dd>
                </div>
                <div className="va-detail-row">
                  <dt className="va-detail-label">End date</dt>
                  <dd className="va-detail-value">{formatRequestDate(request.endDate)}</dd>
                </div>
              </>
            )}
            <div className="va-detail-row va-detail-row--full">
              <dt className="va-detail-label">Reason</dt>
              <dd className="va-detail-value">{request.reason || '—'}</dd>
            </div>
            <div className="va-detail-row va-detail-row--full">
              <dt className="va-detail-label">Notes</dt>
              <dd className="va-detail-value">{request.notes || '—'}</dd>
            </div>
          </dl>
        </section>

        {canAct && (
          <div className="va-form-actions">
            {onApprove && (
              <button
                type="button"
                className="styled-button styled-button--success"
                disabled={loadingAction === 'approve'}
                onClick={() => onApprove(request)}
              >
                {loadingAction === 'approve' ? 'Approving…' : 'Approve'}
              </button>
            )}
            {onReject && (
              <button
                type="button"
                className="styled-button styled-button--danger"
                disabled={loadingAction === 'reject'}
                onClick={() => onReject(request)}
              >
                {loadingAction === 'reject' ? 'Denying…' : 'Deny'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== Vendors Off modal ==================== */

function VendorsOffModal({
  month,
  onPrevMonth,
  onNextMonth,
  onClose,
  dayOffItems,
  getVendorName,
}: {
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onClose: () => void;
  dayOffItems: DayOffItem[];
  getVendorName: (userId: number) => string;
}) {
  const monthLabel = month.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const weeks = useMemo(() => getWeeksOfMonth(month), [month]);

  return (
    <div className="va-modal va-modal-large sp-modal-anim" role="dialog" aria-modal="true">
      <div className="va-modal-header">
        <h2 className="va-modal-title">Vendors Off</h2>
        <button type="button" className="va-modal-close" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="va-modal-body">
        <p className="va-modal-desc">View all vendors with time off, organized by week and month.</p>

        <div className="ri-vo-carousel">
          <button type="button" className="styled-button styled-button--outline styled-button--sm" onClick={onPrevMonth}>
            <i className="bi bi-chevron-left" /> Previous
          </button>
          <h3 className="ri-vo-month">{monthLabel}</h3>
          <button type="button" className="styled-button styled-button--outline styled-button--sm" onClick={onNextMonth}>
            Next <i className="bi bi-chevron-right" />
          </button>
        </div>

        <div className="ri-vo-weeks">
          {weeks.map((weekStart, idx) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            const weekItems = dayOffItems.filter((item) => {
              const d = new Date(`${item.date}T00:00:00`);
              return d >= weekStart && d <= weekEnd;
            });

            return (
              <div key={idx} className="ri-vo-week">
                <h4 className="ri-vo-week-title">
                  Week {idx + 1}: {weekLabel}
                </h4>
                {weekItems.length === 0 ? (
                  <div className="ri-vo-week-empty">No vendors off this week</div>
                ) : (
                  <VendorsOffWeekGrid weekStart={weekStart} items={weekItems} getVendorName={getVendorName} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VendorsOffWeekGrid({
  weekStart,
  items,
  getVendorName,
}: {
  weekStart: Date;
  items: DayOffItem[];
  getVendorName: (userId: number) => string;
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const itemsByDate = new Map<string, DayOffItem[]>();
  for (const item of items) {
    const list = itemsByDate.get(item.date) ?? [];
    list.push(item);
    itemsByDate.set(item.date, list);
  }

  return (
    <div className="ri-vo-grid">
      {weekDays.map((date, idx) => {
        const dateStr = date.toISOString().slice(0, 10);
        const dayItems = itemsByDate.get(dateStr) ?? [];
        const isWeekend = idx >= 5;
        return (
          <div key={dateStr} className={`ri-vo-day${isWeekend ? ' ri-vo-day--weekend' : ''}`}>
            <div className="ri-vo-day-head">
              <span className="ri-vo-day-name">{dayNames[idx]}</span>
              <span className="ri-vo-day-num">{date.getDate()}</span>
            </div>
            <div className="ri-vo-day-body">
              {dayItems.length === 0 ? (
                <span className="ri-vo-day-empty">—</span>
              ) : (
                dayItems.map((item, i) => (
                  <div key={`${item.userId}-${i}`} className="ri-vo-chip" title={getVendorName(item.userId)}>
                    {getVendorName(item.userId)}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
