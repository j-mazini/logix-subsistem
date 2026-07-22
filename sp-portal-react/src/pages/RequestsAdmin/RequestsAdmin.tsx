import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
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

export function RequestsAdmin() {
  const master = useMemo(() => buildMasterData(), []);
  const { vendorTypes, servicePartners, vendors } = master;

  const [allRequests, setAllRequests] = useState<VendorRequest[]>(() => generateMockRequests(vendors));
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [filterRecordType, setFilterRecordType] = useState('all');
  const [filterVendorType, setFilterVendorType] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<VendorRequest | null>(null);
  const [scheduleTermsInput, setScheduleTermsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeScheduleTermsModal();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const pendingRequests = useMemo(() => {
    let rows = allRequests.filter((r) => r.status.toLowerCase() === 'pending');
    if (selectedServicePartnerId !== '') {
      rows = rows.filter((r) => {
        const v = vendors.find((x) => x.userId === r.userId);
        return v && String(v.servicePartnerId) === selectedServicePartnerId;
      });
    }
    return rows;
  }, [allRequests, selectedServicePartnerId, vendors]);

  const historyRequests = useMemo(() => {
    let rows = allRequests.filter((r) => r.status.toLowerCase() !== 'pending');
    if (filterRecordType !== 'all') {
      rows = rows.filter((r) => r.requestType === filterRecordType);
    }
    if (filterVendorType !== 'all') {
      rows = rows.filter((r) => getVendorTypeName(r.userId) === filterVendorType);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequests, filterRecordType, filterVendorType, vendors, vendorTypes]);

  const pendingCount = useMemo(() => allRequests.filter((r) => r.status.toLowerCase() === 'pending').length, [allRequests]);

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
    setAllRequests((prev) =>
      prev.map((r) =>
        r.vendorRequestId === request.vendorRequestId
          ? { ...r, status: 'approved', updatedAt, scheduleTerms: trimmed !== '' ? trimmed : r.scheduleTerms }
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
        <div className="va-card">
          <div className="va-card-head">
            <div>
              <div className="va-card-title">Pending Requests</div>
              <div className="va-card-subtitle">Review and approve or reject pending requests.</div>
            </div>
            <div className="va-card-head-actions">
              <select
                className="form-select filter-select"
                id="filterServicePartner"
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
                    <tr key={r.vendorRequestId}>
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
        className="va-modal-backdrop"
        id="scheduleTermsModalBackdrop"
        hidden={!selectedRequest}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeScheduleTermsModal();
        }}
      >
        <div className="va-modal va-modal-small">
          <div className="va-modal-header">
            <h2 className="va-modal-title">Pre-Payment Schedule Terms</h2>
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
