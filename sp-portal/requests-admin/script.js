/* =====================================================
   Requests Management (Vendor Requests) — Logixsphere portal
   Vanilla JS, class-based, mock/simulated data (no backend)
   ===================================================== */

/* ---------- small deterministic PRNG helpers ---------- */
function hashStringToSeed(str) {
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
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function renderCellValue(value) {
  if (value === null || value === undefined) return '<span class="va-cell-empty">-</span>';
  const str = String(value);
  return str.trim() === '' ? '<span class="va-cell-empty">-</span>' : escapeHtml(str);
}

class RequestsAdminApp {
  constructor() {
    this.activeTab = 'requests';
    this.selectedServicePartnerId = '';
    this.filterRecordType = 'all';
    this.filterVendorType = 'all';
    this.processingRequestId = null;

    this.selectedRequest = null;

    this.buildMasterData();
    this.generateMockRequests();
    this.init();
  }

  /* ==================== INIT ==================== */
  init() {
    this.populateFilterOptions();
    this.setupListeners();
    this.render();

    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 400);
  }

  /* ==================== MASTER (mock) DATA ==================== */
  buildMasterData() {
    this.vendorTypes = [
      { vendorTypeId: 1, nameType: 'Owner Driver' },
      { vendorTypeId: 2, nameType: 'Multi Drop' },
      { vendorTypeId: 3, nameType: 'Courier Company' },
      { vendorTypeId: 4, nameType: 'Van Owner' },
    ];

    this.servicePartners = [
      { servicePartnerId: 1, partnerName: 'Swift Logistics' },
      { servicePartnerId: 2, partnerName: 'Kent Express' },
      { servicePartnerId: 3, partnerName: 'Medway Movers' },
    ];

    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Tomasz'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Kowalski', 'Nowak', 'Murphy'];
    const rng = rngForSeed('va-vendors-v1');
    this.vendors = Array.from({ length: 10 }, (_, i) => {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
      const vendorTypeId = this.vendorTypes[i % this.vendorTypes.length].vendorTypeId;
      const hasSp = rng() > 0.35;
      return {
        userId: 1000 + i,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[(i * 3) % lastNames.length],
        fullName,
        vendorTypeId,
        servicePartnerId: hasSp ? this.servicePartners[i % this.servicePartners.length].servicePartnerId : null,
      };
    });
  }

  getVendorName(userId) {
    const v = this.vendors.find((x) => x.userId === userId);
    return v ? v.fullName : `Vendor${userId}`;
  }
  getVendorTypeName(userId) {
    const v = this.vendors.find((x) => x.userId === userId);
    if (!v) return '';
    const t = this.vendorTypes.find((vt) => vt.vendorTypeId === v.vendorTypeId);
    return t ? t.nameType : '';
  }

  /* ==================== MOCK VENDOR REQUESTS ==================== */
  generateMockRequests() {
    const rng = rngForSeed('va-requests-v1');
    const requestTypes = ['DayOff', 'HolyDay', 'PrePayment'];
    const statuses = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'approved', 'approved', 'approved', 'rejected', 'rejected'];
    const reasonsByType = {
      DayOff: ['Personal matters', 'Family commitment', 'Feeling unwell', 'Appointment'],
      HolyDay: ['Annual leave', 'Family holiday abroad', 'Religious observance', 'Rest period'],
      PrePayment: ['Vehicle repair costs', 'Unexpected expense', 'Fuel shortfall', 'Emergency funds needed'],
    };
    const notesPool = ['Please review urgently', 'Discussed with team lead', 'Recurring request', ''];

    const requests = [];
    let id = 5001;
    const count = 21;

    for (let i = 0; i < count; i++) {
      const vendor = this.vendors[i % this.vendors.length];
      const requestType = requestTypes[i % requestTypes.length];
      const status = statuses[Math.floor(rng() * statuses.length)];
      const createdDaysAgo = Math.floor(rng() * 30) + 1;
      const createdAt = new Date(Date.now() - createdDaysAgo * 86400000);

      let startDate = null;
      let endDate = null;
      let prePaymentValue = null;

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

      let updatedAt = null;
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
    this.allRequests = requests;
  }

  /* ==================== FILTER OPTIONS ==================== */
  populateFilterOptions() {
    const spSel = document.getElementById('filterServicePartner');
    this.servicePartners.forEach((sp) => {
      const opt = document.createElement('option');
      opt.value = String(sp.servicePartnerId);
      opt.textContent = sp.partnerName;
      spSel.appendChild(opt);
    });

    const vtSel = document.getElementById('filterVendorType');
    this.vendorTypes.forEach((vt) => {
      const opt = document.createElement('option');
      opt.value = vt.nameType;
      opt.textContent = vt.nameType;
      vtSel.appendChild(opt);
    });
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.getElementById('tabBtnRequests').addEventListener('click', () => this.setTab('requests'));
    document.getElementById('tabBtnHistory').addEventListener('click', () => this.setTab('history'));

    document.getElementById('filterServicePartner').addEventListener('change', (e) => {
      this.selectedServicePartnerId = e.target.value;
      this.render();
    });
    document.getElementById('btnRefreshRequests').addEventListener('click', () => this.refresh());

    document.getElementById('filterRecordType').addEventListener('change', (e) => {
      this.filterRecordType = e.target.value;
      this.render();
    });
    document.getElementById('filterVendorType').addEventListener('change', (e) => {
      this.filterVendorType = e.target.value;
      this.render();
    });
    document.getElementById('btnRefreshHistory').addEventListener('click', () => this.refresh());

    document.getElementById('requestsTableBody').addEventListener('click', (e) => this.handleRequestsTableClick(e));

    document.getElementById('btnCloseScheduleTermsModal').addEventListener('click', () => this.closeScheduleTermsModal());
    document.getElementById('btnCancelScheduleTerms').addEventListener('click', () => this.closeScheduleTermsModal());
    document.getElementById('btnConfirmScheduleTerms').addEventListener('click', () => this.confirmScheduleTermsApproval());
    document.getElementById('scheduleTermsModalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'scheduleTermsModalBackdrop') this.closeScheduleTermsModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeScheduleTermsModal();
    });
  }

  setTab(tab) {
    this.activeTab = tab;
    document.getElementById('tabBtnRequests').classList.toggle('active', tab === 'requests');
    document.getElementById('tabBtnHistory').classList.toggle('active', tab === 'history');
    document.getElementById('tabBtnRequests').setAttribute('aria-selected', String(tab === 'requests'));
    document.getElementById('tabBtnHistory').setAttribute('aria-selected', String(tab === 'history'));
    document.getElementById('panelRequests').hidden = tab !== 'requests';
    document.getElementById('panelHistory').hidden = tab !== 'history';
  }

  refresh() {
    this.render();
    this.showToast('Requests refreshed.', 'info');
  }

  /* ==================== DATA HELPERS ==================== */
  getPendingRequests() {
    let rows = this.allRequests.filter((r) => r.status.toLowerCase() === 'pending');
    if (this.selectedServicePartnerId !== '') {
      rows = rows.filter((r) => {
        const v = this.vendors.find((x) => x.userId === r.userId);
        return v && String(v.servicePartnerId) === this.selectedServicePartnerId;
      });
    }
    return rows;
  }

  getHistoryRequests() {
    let rows = this.allRequests.filter((r) => r.status.toLowerCase() !== 'pending');
    if (this.filterRecordType !== 'all') {
      rows = rows.filter((r) => r.requestType === this.filterRecordType);
    }
    if (this.filterVendorType !== 'all') {
      rows = rows.filter((r) => this.getVendorTypeName(r.userId) === this.filterVendorType);
    }
    return rows;
  }

  /* ==================== FORMATTING ==================== */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  getRequestTypeLabel(requestType) {
    if (requestType === 'DayOff') return 'Day Off';
    if (requestType === 'HolyDay') return 'Holiday';
    if (requestType === 'PrePayment') return 'Pre-Payment';
    return requestType;
  }
  getDatesCell(r) {
    if (r.requestType === 'DayOff' && r.startDate) return this.formatDate(r.startDate);
    if (r.requestType === 'HolyDay' && r.startDate && r.endDate) return `${this.formatDate(r.startDate)} - ${this.formatDate(r.endDate)}`;
    return '-';
  }
  getAmountCell(r) {
    if (r.requestType === 'PrePayment' && r.prePaymentValue) return `£${Number(r.prePaymentValue).toFixed(2)}`;
    return '-';
  }
  getStatusClass(status) {
    const s = status.toLowerCase();
    if (s === 'approved') return 'approved';
    if (s === 'rejected' || s === 'reproved') return 'rejected';
    return 'other';
  }

  /* ==================== RENDER ==================== */
  render() {
    const pending = this.getPendingRequests();
    document.getElementById('pendingCountLabel').textContent = String(this.allRequests.filter((r) => r.status.toLowerCase() === 'pending').length);
    this.renderRequestsTable(pending);
    this.renderHistoryTable(this.getHistoryRequests());
  }

  renderRequestsTable(rows) {
    const body = document.getElementById('requestsTableBody');
    const emptyState = document.getElementById('requestsEmptyState');
    const wrap = document.getElementById('requestsTableWrap');

    if (rows.length === 0) {
      body.innerHTML = '';
      emptyState.hidden = false;
      wrap.hidden = true;
      return;
    }
    emptyState.hidden = true;
    wrap.hidden = false;

    body.innerHTML = rows.map((r) => {
      const isProcessing = this.processingRequestId === r.vendorRequestId;
      return `
        <tr data-request-id="${r.vendorRequestId}">
          <td class="fw-semibold">${escapeHtml(this.getRequestTypeLabel(r.requestType))}</td>
          <td>${escapeHtml(this.getVendorName(r.userId))}</td>
          <td>${this.getDatesCell(r)}</td>
          <td>${this.getAmountCell(r)}</td>
          <td><span class="va-cell-truncate" title="${escapeHtml(r.reason || '')}">${renderCellValue(r.reason)}</span></td>
          <td><span class="va-cell-truncate" title="${escapeHtml(r.notes || '')}">${renderCellValue(r.notes)}</span></td>
          <td class="text-secondary" style="font-size:0.78rem;">${this.formatDateTime(r.createdAt)}</td>
          <td>
            <div class="va-actions-cell">
              <button type="button" class="styled-button styled-button--success styled-button--sm" data-approve="${r.vendorRequestId}" ${isProcessing ? 'disabled' : ''}>
                <i class="bi bi-check-circle"></i> Approve
              </button>
              <button type="button" class="styled-button styled-button--danger styled-button--sm" data-reject="${r.vendorRequestId}" ${isProcessing ? 'disabled' : ''}>
                <i class="bi bi-x-circle"></i> Reject
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderHistoryTable(rows) {
    const body = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmptyState');
    const wrap = document.getElementById('historyTableWrap');

    if (rows.length === 0) {
      body.innerHTML = '';
      emptyState.hidden = false;
      wrap.hidden = true;
      return;
    }
    emptyState.hidden = true;
    wrap.hidden = false;

    body.innerHTML = rows.map((r) => `
      <tr>
        <td class="fw-semibold">${escapeHtml(this.getRequestTypeLabel(r.requestType))}</td>
        <td>${escapeHtml(this.getVendorName(r.userId))}</td>
        <td>${this.getDatesCell(r)}</td>
        <td>${this.getAmountCell(r)}</td>
        <td><span class="va-cell-truncate" title="${escapeHtml(r.reason || '')}">${renderCellValue(r.reason)}</span></td>
        <td><span class="va-cell-truncate" title="${escapeHtml(r.notes || '')}">${renderCellValue(r.notes)}</span></td>
        <td class="text-center"><span class="va-status-badge ${this.getStatusClass(r.status)}">${escapeHtml(r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase())}</span></td>
        <td class="text-secondary" style="font-size:0.78rem;">${this.formatDateTime(r.createdAt)}</td>
        <td class="text-secondary" style="font-size:0.78rem;">${r.updatedAt ? this.formatDateTime(r.updatedAt) : '-'}</td>
      </tr>
    `).join('');
  }

  /* ==================== ACTIONS ==================== */
  handleRequestsTableClick(e) {
    const approveBtn = e.target.closest('[data-approve]');
    if (approveBtn) {
      const request = this.allRequests.find((r) => r.vendorRequestId === Number(approveBtn.dataset.approve));
      if (request) this.handleApproveClick(request);
      return;
    }
    const rejectBtn = e.target.closest('[data-reject]');
    if (rejectBtn) {
      const request = this.allRequests.find((r) => r.vendorRequestId === Number(rejectBtn.dataset.reject));
      if (request) this.handleReject(request);
    }
  }

  handleApproveClick(request) {
    if (request.requestType === 'PrePayment') {
      this.selectedRequest = request;
      document.getElementById('scheduleTermsInput').value = '';
      document.getElementById('scheduleTermsModalBackdrop').hidden = false;
    } else {
      this.handleApprove(request);
    }
  }

  handleApprove(request, scheduleTerms) {
    this.processingRequestId = request.vendorRequestId;
    this.render();

    request.status = 'approved';
    request.updatedAt = new Date().toISOString();
    if (typeof scheduleTerms === 'string' && scheduleTerms.trim() !== '') {
      request.scheduleTerms = scheduleTerms.trim();
    }

    this.processingRequestId = null;
    this.closeScheduleTermsModal();
    this.showToast('The request has been approved successfully.', 'success');
    this.render();
  }

  handleReject(request) {
    this.processingRequestId = request.vendorRequestId;
    this.render();

    request.status = 'rejected';
    request.updatedAt = new Date().toISOString();

    this.processingRequestId = null;
    this.showToast('The request has been rejected.', 'success');
    this.render();
  }

  confirmScheduleTermsApproval() {
    if (!this.selectedRequest) return;
    const scheduleTerms = document.getElementById('scheduleTermsInput').value;
    this.handleApprove(this.selectedRequest, scheduleTerms);
    this.selectedRequest = null;
  }

  closeScheduleTermsModal() {
    document.getElementById('scheduleTermsModalBackdrop').hidden = true;
    this.selectedRequest = null;
  }

  /* ==================== TOASTS ==================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
    toast.innerHTML = `<i class="bi ${icon}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new RequestsAdminApp();
  window.requestsAdminApp = app;
});
