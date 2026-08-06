import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/shared-pages.css';
import '../../styles/legacy/requests-admin.css';

/* =====================================================
   Requests Management (Vendor Requests) — Logixsphere portal
   Port of sp-portal/requests-admin/script.js. Purely mock/simulated data
   generated locally (the original script never reads window.DHL_MOCK_DATA
   for this page — it builds its own vendors/vendorTypes/servicePartners/
   requests from a deterministic seeded PRNG), so no data module is needed
   here beyond this file.
   ===================================================== */

/* ---------- small deterministic PRNG helpers (verbatim port) ---------- */
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
  scheduleTerms: string;
  referenceNumber: string | null;
  createdAt: string;
  updatedAt: string | null;
}
interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  hiding: boolean;
}
interface MasterData {
  vendorTypes: VendorType[];
  servicePartners: ServicePartner[];
  vendors: Vendor[];
}

/* ==================== MASTER (mock) DATA ==================== */
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
  const rng = rngForSeed('va-vendors-v1');
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

/* ==================== MOCK VENDOR REQUESTS ==================== */
function generateMockRequests(vendors: Vendor[]): VendorRequest[] {
  const rng = rngForSeed('va-requests-v1');
  const requestTypes: RequestType[] = ['DayOff', 'HolyDay', 'PrePayment'];
  const statuses = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'approved', 'approved', 'approved', 'rejected', 'rejected'];
  const reasonsByType: Record<RequestType, string[]> = {
    DayOff: ['Personal matters', 'Family commitment', 'Feeling unwell', 'Appointment'],
    HolyDay: ['Annual leave', 'Family holiday abroad', 'Religious observance', 'Rest period'],
    PrePayment: ['Vehicle repair costs', 'Unexpected expense', 'Fuel shortfall', 'Emergency funds needed'],
  };
  const notesPool = ['Please review urgently', 'Discussed with team lead', 'Recurring request', ''];

  const requests: VendorRequest[] = [];
  let id = 5001;
  const count = 21;

  for (let i = 0; i < count; i++) {
    const vendor = vendors[i % vendors.length];
    const requestType = requestTypes[i % requestTypes.length];
    const status = statuses[Math.floor(rng() * statuses.length)];
    const createdDaysAgo = Math.floor(rng() * 30) + 1;
    const createdAt = new Date(Date.now() - createdDaysAgo * 86400000);

    let startDate: string | null = null;
    let endDate: string | null = null;
    let prePaymentValue: number | null = null;

    if (requestType === 'DayOff') {
      const d = new Date(Date.now() + Math.floor(rng() * 30 - 5) * 86400000);
      startDate = d.toISOString().slice(0, 10);
    } else if (requestType === 'HolyDay') {
      const d = new Date(Date.now() + Math.floor(rng() * 40 - 5) * 86400000);
      startDate = d.toISOString().slice(0, 10);
      const spanDays = 2 + Math.floor(rng() * 7);
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
      scheduleTerms: '',
      referenceNumber: null,
      createdAt: createdAt.toISOString(),
      updatedAt,
    });
  }

  requests.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return requests;
}

/* ==================== FORMATTING helpers ==================== */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function getRequestTypeLabel(requestType: RequestType): string {
  if (requestType === 'DayOff') return 'Day Off';
  if (requestType === 'HolyDay') return 'Holiday';
  if (requestType === 'PrePayment') return 'Pre-Payment';
  return requestType;
}
function getDatesCell(r: VendorRequest): string {
  if (r.requestType === 'DayOff' && r.startDate) return formatDate(r.startDate);
  if (r.requestType === 'HolyDay' && r.startDate && r.endDate) return `${formatDate(r.startDate)} - ${formatDate(r.endDate)}`;
  return '-';
}
function getAmountCell(r: VendorRequest): string {
  if (r.requestType === 'PrePayment' && r.prePaymentValue) return `£${Number(r.prePaymentValue).toFixed(2)}`;
  return '-';
}
function getStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected' || s === 'reproved') return 'rejected';
  return 'other';
}
function renderCellValue(value: string | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return <span className="va-cell-empty">-</span>;
  }
  return String(value);
}

// Reference number for PrePayment deductions, generated on approval:
// PRP-INITIALS-DDMMYY-SEQ (verbatim port of the Next.js source's
// generatePrePaymentReferenceNumber — same format used by the Deductions
// and Invoices pages' mock "PRP-..." entries elsewhere in this app).
function generatePrePaymentReferenceNumber(vendorName: string, vendorRequestId: number): string {
  const prefix = 'PRP';

  let cleanName = vendorName.trim();
  if (cleanName.startsWith('#')) {
    cleanName = cleanName.substring(1).trim();
  }
  if (cleanName.toLowerCase().startsWith('vendor')) {
    cleanName = cleanName.substring(6).trim();
  }

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

export function RequestsAdmin() {
  const master = useMemo(() => buildMasterData(), []);
  const { vendorTypes, servicePartners, vendors } = master;

  const [allRequests, setAllRequests] = useState<VendorRequest[]>(() => generateMockRequests(vendors));
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [filterRequestType, setFilterRequestType] = useState<'all' | RequestType>('all');
  const [filterServicePartnerId, setFilterServicePartnerId] = useState('');
  const [filterRecordType, setFilterRecordType] = useState('all');
  const [filterVendorType, setFilterVendorType] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [scheduleTermsInput, setScheduleTermsInput] = useState('');
  const [viewingRequest, setViewingRequest] = useState<VendorRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useModalBehavior(() => closeScheduleTermsModal(), selectedRequest !== null);
  useModalBehavior(() => setViewingRequest(null), viewingRequest !== null);

  function getVendorName(userId: number): string {
    const v = vendors.find((x) => x.userId === userId);
    return v ? v.fullName : `Vendor${userId}`;
  }
  function getVendorTypeName(userId: number): string {
    const v = vendors.find((x) => x.userId === userId);
    if (!v) return '';
    const t = vendorTypes.find((vt) => vt.vendorTypeId === v.vendorTypeId);
    return t ? t.nameType : '';
  }
  function getVendorServicePartnerId(userId: number): number | null {
    const v = vendors.find((x) => x.userId === userId);
    return v ? v.servicePartnerId : null;
  }

  // Service Partner scoping, ported from the Next.js source's
  // `selectedServicePartnerId` select: there it's passed as a param to the
  // requests fetch, so it narrows both tabs at once (not just Requests).
  const bySelectedServicePartner = (rows: VendorRequest[]) => {
    if (filterServicePartnerId === '') return rows;
    const spId = Number(filterServicePartnerId);
    return rows.filter((r) => getVendorServicePartnerId(r.userId) === spId);
  };

  const pendingRequests = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let rows = allRequests.filter((r) => {
      if (r.status.toLowerCase() !== 'pending') return false;
      // Default listing is scoped to the current month, by submission date.
      const created = new Date(r.createdAt);
      return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
    });

    rows = bySelectedServicePartner(rows);
    if (filterRequestType !== 'all') {
      rows = rows.filter((r) => r.requestType === filterRequestType);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequests, filterRequestType, filterServicePartnerId, vendors]);

  const historyRequests = useMemo(() => {
    let rows = allRequests.filter((r) => r.status.toLowerCase() !== 'pending');
    rows = bySelectedServicePartner(rows);
    if (filterRecordType !== 'all') {
      rows = rows.filter((r) => r.requestType === filterRecordType);
    }
    if (filterVendorType !== 'all') {
      rows = rows.filter((r) => getVendorTypeName(r.userId) === filterVendorType);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequests, filterRecordType, filterVendorType, filterServicePartnerId, vendors, vendorTypes]);

  const pendingCount = pendingRequests.length;

  function showToast(message: string, type: ToastItem['type'] = 'info') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, hiding: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, hiding: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 320);
    }, 3200);
  }

  function refresh() {
    showToast('Requests refreshed.', 'info');
  }

  function handleApproveClick(request: VendorRequest) {
    if (request.requestType === 'PrePayment') {
      setSelectedRequest(request);
      setScheduleTermsInput('');
    } else {
      handleApprove(request);
    }
  }

  function handleApprove(request: VendorRequest, scheduleTerms?: string) {
    const trimmed = typeof scheduleTerms === 'string' ? scheduleTerms.trim() : '';
    const updatedAt = new Date().toISOString();
    // PrePayment approvals get a deduction reference number, same
    // PRP-INITIALS-DDMMYY-SEQ format used by the Deductions/Invoices pages.
    const referenceNumber =
      request.requestType === 'PrePayment'
        ? generatePrePaymentReferenceNumber(getVendorName(request.userId), request.vendorRequestId)
        : null;
    setAllRequests((prev) =>
      prev.map((r) =>
        r.vendorRequestId === request.vendorRequestId
          ? {
              ...r,
              status: 'approved',
              updatedAt,
              scheduleTerms: trimmed !== '' ? trimmed : r.scheduleTerms,
              referenceNumber: referenceNumber ?? r.referenceNumber,
            }
          : r,
      ),
    );
    closeScheduleTermsModal();
    showToast('The request has been approved successfully.', 'success');
  }

  function handleReject(request: VendorRequest) {
    const updatedAt = new Date().toISOString();
    setAllRequests((prev) =>
      prev.map((r) => (r.vendorRequestId === request.vendorRequestId ? { ...r, status: 'rejected', updatedAt } : r)),
    );
    showToast('The request has been rejected.', 'success');
  }

  function confirmScheduleTermsApproval() {
    if (!selectedRequest) return;
    handleApprove(selectedRequest, scheduleTermsInput);
    setSelectedRequest(null);
  }

  function closeScheduleTermsModal() {
    setSelectedRequest(null);
  }

  return (
    <PortalLayout pageClassName="requests-admin-page" mainClassName="va-container container-fluid px-3 px-lg-4 py-4" title="Requests Management">
      {/* ============ LOADING SCREEN ============ */}
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading vendor requests…</p>
      </div>

      {/* ============ PAGE INFO ============ */}
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-inbox" />
            <span>Review and manage vendor requests.</span>
          </p>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="va-tabs" role="tablist">
        <button
          type="button"
          className={`va-tab${activeTab === 'requests' ? ' active' : ''}`}
          id="tabBtnRequests"
          data-tab="requests"
          role="tab"
          aria-selected={activeTab === 'requests'}
          onClick={() => setActiveTab('requests')}
        >
          Requests (<span id="pendingCountLabel">{pendingCount}</span>)
        </button>
        <button
          type="button"
          className={`va-tab${activeTab === 'history' ? ' active' : ''}`}
          id="tabBtnHistory"
          data-tab="history"
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* ============ REQUESTS TAB ============ */}
      <section className="va-tab-panel" id="panelRequests" hidden={activeTab !== 'requests'}>
        {/* Panel head carries the title, the scope note and the controls —
            same arrangement as LogixSphere's requests-admin. */}
        <div className="va-card">
          <div className="va-card-head">
            <div>
              <div className="va-card-title">Pending Requests</div>
              <div className="va-card-subtitle">Pending requests submitted this month.</div>
            </div>
            <div className="va-card-head-actions">
              {servicePartners.length > 0 && (
                <label className="ra-filter" htmlFor="filterServicePartner">
                  <span className="ra-filter-label">Service Partner</span>
                  <select
                    className="form-select filter-select"
                    id="filterServicePartner"
                    value={filterServicePartnerId}
                    onChange={(e) => setFilterServicePartnerId(e.target.value)}
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
              <label className="ra-filter" htmlFor="filterRequestType">
                <span className="ra-filter-label">Request Type</span>
                <select
                  className="form-select filter-select"
                  id="filterRequestType"
                  value={filterRequestType}
                  onChange={(e) => setFilterRequestType(e.target.value as 'all' | RequestType)}
                >
                  <option value="all">All types</option>
                  <option value="DayOff">Day Off</option>
                  <option value="HolyDay">Holiday</option>
                  <option value="PrePayment">Pre-Payment</option>
                </select>
              </label>
              <button type="button" className="styled-button styled-button--outline" id="btnRefreshRequests" onClick={refresh}>
                <i className="bi bi-arrow-clockwise" /> Refresh
              </button>
            </div>
          </div>


          {pendingRequests.length === 0 ? (
            <div id="requestsEmptyState" className="va-empty-state">
              <p className="va-empty-text">No pending requests found.</p>
            </div>
          ) : (
            <div className="va-table-scroll" id="requestsTableWrap">
              <table className="va-table">
                <thead>
                  <tr>
                    <th>Request Type</th>
                    <th>Vendor</th>
                    <th>Date(s)</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Notes</th>
                    <th>Created At</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="requestsTableBody">
                  {pendingRequests.map((r) => (
                    <tr data-request-id={r.vendorRequestId} key={r.vendorRequestId}>
                      <td className="fw-semibold">{getRequestTypeLabel(r.requestType)}</td>
                      <td>{getVendorName(r.userId)}</td>
                      <td>{getDatesCell(r)}</td>
                      <td>{getAmountCell(r)}</td>
                      <td>
                        <span className="va-cell-truncate" title={r.reason || ''}>
                          {renderCellValue(r.reason)}
                        </span>
                      </td>
                      <td>
                        <span className="va-cell-truncate" title={r.notes || ''}>
                          {renderCellValue(r.notes)}
                        </span>
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td>
                        <div className="va-actions-cell">
                          <button
                            type="button"
                            className="styled-button styled-button--success styled-button--sm"
                            data-approve={r.vendorRequestId}
                            onClick={() => handleApproveClick(r)}
                          >
                            <i className="bi bi-check-circle" /> Approve
                          </button>
                          <button
                            type="button"
                            className="styled-button styled-button--danger styled-button--sm"
                            data-reject={r.vendorRequestId}
                            onClick={() => handleReject(r)}
                          >
                            <i className="bi bi-x-circle" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ============ HISTORY TAB ============ */}
      <section className="va-tab-panel" id="panelHistory" hidden={activeTab !== 'history'}>
        <div className="va-card">
          <div className="va-card-head">
            <div>
              <div className="va-card-title">Request History</div>
              <div className="va-card-subtitle">View all processed requests.</div>
            </div>
            <div className="va-card-head-actions">
              <select
                className="form-select filter-select"
                id="filterRecordType"
                value={filterRecordType}
                onChange={(e) => setFilterRecordType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="DayOff">Day Off</option>
                <option value="HolyDay">Holiday</option>
                <option value="PrePayment">Pre-Payment</option>
              </select>
              <select
                className="form-select filter-select"
                id="filterVendorType"
                value={filterVendorType}
                onChange={(e) => setFilterVendorType(e.target.value)}
              >
                <option value="all">All Vendor Types</option>
                {vendorTypes.map((vt) => (
                  <option key={vt.vendorTypeId} value={vt.nameType}>
                    {vt.nameType}
                  </option>
                ))}
              </select>
              <button type="button" className="styled-button styled-button--outline" id="btnRefreshHistory" onClick={refresh}>
                <i className="bi bi-arrow-clockwise" /> Refresh
              </button>
            </div>
          </div>

          {historyRequests.length === 0 ? (
            <div id="historyEmptyState" className="va-empty-state">
              <p className="va-empty-text">No requests found.</p>
            </div>
          ) : (
            <div className="va-table-scroll" id="historyTableWrap">
              <table className="va-table">
                <thead>
                  <tr>
                    <th>Request Type</th>
                    <th>Vendor</th>
                    <th>Date(s)</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Notes</th>
                    <th className="text-center">Status</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody id="historyTableBody">
                  {historyRequests.map((r) => (
                    <tr
                      key={r.vendorRequestId}
                      className="va-row-clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewingRequest(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingRequest(r);
                        }
                      }}
                    >
                      <td className="fw-semibold">{getRequestTypeLabel(r.requestType)}</td>
                      <td>{getVendorName(r.userId)}</td>
                      <td>{getDatesCell(r)}</td>
                      <td>{getAmountCell(r)}</td>
                      <td>
                        <span className="va-cell-truncate" title={r.reason || ''}>
                          {renderCellValue(r.reason)}
                        </span>
                      </td>
                      <td>
                        <span className="va-cell-truncate" title={r.notes || ''}>
                          {renderCellValue(r.notes)}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`va-status-badge ${getStatusClass(r.status)}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        {r.updatedAt ? formatDateTime(r.updatedAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ============ MODAL: Pre-Payment Schedule Terms ============ */}
      <div
        className={`va-modal-backdrop${selectedRequest ? ' sp-modal-backdrop-anim' : ''}`}
        id="scheduleTermsModalBackdrop"
        hidden={!selectedRequest}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeScheduleTermsModal();
        }}
      >
        <div
          className={`va-modal va-modal-small${selectedRequest ? ' sp-modal-anim' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scheduleTermsModalTitle"
        >
          <div className="va-modal-header">
            <h2 className="va-modal-title" id="scheduleTermsModalTitle">Pre-Payment Schedule Terms</h2>
            <button type="button" className="va-modal-close" id="btnCloseScheduleTermsModal" aria-label="Close" onClick={closeScheduleTermsModal}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="va-modal-body">
            <p className="va-modal-desc">Enter the schedule terms for this pre-payment request. This will determine how the payment is deducted.</p>
            <div className="va-form-field">
              <label className="va-form-label" htmlFor="scheduleTermsInput">
                Schedule Terms
              </label>
              <textarea
                id="scheduleTermsInput"
                rows={4}
                placeholder="e.g., 4 installments of £50 each"
                value={scheduleTermsInput}
                onChange={(e) => setScheduleTermsInput(e.target.value)}
              />
              <p className="va-form-hint">Leave empty for automatic deduction schedule based on £200 per installment.</p>
            </div>
            <div className="va-form-actions">
              <button type="button" className="styled-button styled-button--outline" id="btnCancelScheduleTerms" onClick={closeScheduleTermsModal}>
                Cancel
              </button>
              <button type="button" className="styled-button styled-button--success" id="btnConfirmScheduleTerms" onClick={confirmScheduleTermsApproval}>
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ MODAL: Request Details (History row click) ============ */}
      <div
        className={`va-modal-backdrop${viewingRequest ? ' sp-modal-backdrop-anim' : ''}`}
        id="requestDetailsModalBackdrop"
        hidden={!viewingRequest}
        onClick={(e) => {
          if (e.target === e.currentTarget) setViewingRequest(null);
        }}
      >
        {viewingRequest && (
          <div
            className={`va-modal va-modal-small${viewingRequest ? ' sp-modal-anim' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="requestDetailsModalTitle"
          >
            <div className="va-modal-header">
              <h2 className="va-modal-title" id="requestDetailsModalTitle">
                {getRequestTypeLabel(viewingRequest.requestType)} Request
              </h2>
              <button type="button" className="va-modal-close" aria-label="Close" onClick={() => setViewingRequest(null)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="va-modal-body">
              <dl className="va-detail-grid">
                <div className="va-detail-row">
                  <dt className="va-detail-label">Vendor</dt>
                  <dd className="va-detail-value">{getVendorName(viewingRequest.userId)}</dd>
                </div>
                <div className="va-detail-row">
                  <dt className="va-detail-label">Status</dt>
                  <dd className="va-detail-value">
                    <span className={`va-status-badge ${getStatusClass(viewingRequest.status)}`}>
                      {viewingRequest.status.charAt(0).toUpperCase() + viewingRequest.status.slice(1).toLowerCase()}
                    </span>
                  </dd>
                </div>
                <div className="va-detail-row">
                  <dt className="va-detail-label">Date(s)</dt>
                  <dd className="va-detail-value">{getDatesCell(viewingRequest)}</dd>
                </div>
                <div className="va-detail-row">
                  <dt className="va-detail-label">Amount</dt>
                  <dd className="va-detail-value">{getAmountCell(viewingRequest)}</dd>
                </div>
                <div className="va-detail-row va-detail-row--full">
                  <dt className="va-detail-label">Reason</dt>
                  <dd className="va-detail-value">{renderCellValue(viewingRequest.reason)}</dd>
                </div>
                <div className="va-detail-row va-detail-row--full">
                  <dt className="va-detail-label">Notes</dt>
                  <dd className="va-detail-value">{renderCellValue(viewingRequest.notes)}</dd>
                </div>
                {viewingRequest.requestType === 'PrePayment' && viewingRequest.referenceNumber && (
                  <div className="va-detail-row">
                    <dt className="va-detail-label">Reference Number</dt>
                    <dd className="va-detail-value">{viewingRequest.referenceNumber}</dd>
                  </div>
                )}
                {viewingRequest.requestType === 'PrePayment' && viewingRequest.scheduleTerms && (
                  <div className="va-detail-row va-detail-row--full">
                    <dt className="va-detail-label">Schedule Terms</dt>
                    <dd className="va-detail-value">{viewingRequest.scheduleTerms}</dd>
                  </div>
                )}
                <div className="va-detail-row">
                  <dt className="va-detail-label">Created At</dt>
                  <dd className="va-detail-value">{formatDateTime(viewingRequest.createdAt)}</dd>
                </div>
                <div className="va-detail-row">
                  <dt className="va-detail-label">Updated At</dt>
                  <dd className="va-detail-value">{viewingRequest.updatedAt ? formatDateTime(viewingRequest.updatedAt) : '-'}</dd>
                </div>
              </dl>
              <div className="va-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setViewingRequest(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => (
          <div className={`app-toast ${t.type}${t.hiding ? ' hiding' : ''}`} key={t.id}>
            <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
