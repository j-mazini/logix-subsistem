class VettingAdmin {
  constructor() {
    this.candidates = [];
    this.currentStageFilter = 'All';
    this.searchQuery = '';
    this.currentCandidate = null;
    this.checklistState = {};
    this.init();
  }

  init() {
    this.cacheDOM();
    this.generateMockData();
    this.bindEvents();
    this.render();
    this.hideLoadingOverlay();
  }

  cacheDOM() {
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.candidatesBody = document.getElementById('candidatesBody');
    this.searchInput = document.getElementById('searchInput');
    this.statTotal = document.getElementById('statTotal');
    this.statInProgress = document.getElementById('statInProgress');
    this.statApproved = document.getElementById('statApproved');
    this.statRejected = document.getElementById('statRejected');
    this.checklistModal = new bootstrap.Modal(document.getElementById('checklistModal'));
    this.checklistBody = document.getElementById('checklistBody');
    this.modalCandidateName = document.getElementById('modalCandidateName');
    this.btnSaveChecklist = document.getElementById('btnSaveChecklist');
  }

  bindEvents() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setStageFilter(e.target.dataset.stage));
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.render();
    });

    // Stat cards
    document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
      card.addEventListener('click', (e) => this.setStageFilter(e.currentTarget.dataset.filter));
    });

    // Save checklist
    this.btnSaveChecklist.addEventListener('click', () => this.saveChecklist());
  }

  setStageFilter(stage) {
    this.currentStageFilter = stage;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('filter-btn-active', btn.dataset.stage === stage);
    });
    document.querySelectorAll('.stat-card').forEach(card => {
      card.classList.toggle('stat-card-active', card.dataset.filter === stage);
    });
    this.render();
  }

  generateMockData() {
    const names = ['Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
                   'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa'];
    const vendors = ['FedEx', 'UPS', 'DPD', 'TNT'];
    const stages = ['Application', 'Pre-screen', 'Interview', 'Documents', 'Active', 'Rejected'];

    this.candidates = names.map((name, i) => ({
      id: `driver-${i + 1}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      phone: `+44 7${Math.floor(Math.random() * 900000000 + 100000000)}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      stage: stages[Math.floor(Math.random() * stages.length)],
      submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      daysInStage: Math.floor(Math.random() * 30),
      slaBreached: Math.random() > 0.7,
      checklist: [
        { item: 'ID Verification', complete: Math.random() > 0.3 },
        { item: 'Address Verification', complete: Math.random() > 0.3 },
        { item: 'Background Check', complete: Math.random() > 0.4 },
        { item: 'Driving License Check', complete: Math.random() > 0.2 },
        { item: 'Insurance Verification', complete: Math.random() > 0.5 },
        { item: 'Reference Check', complete: Math.random() > 0.4 },
      ]
    }));
  }

  hideLoadingOverlay() {
    setTimeout(() => {
      this.loadingOverlay.classList.add('hidden');
    }, 500);
  }

  getFilteredCandidates() {
    return this.candidates.filter(c => {
      if (this.currentStageFilter !== 'All' && c.stage !== this.currentStageFilter) return false;
      if (this.searchQuery && !c.name.toLowerCase().includes(this.searchQuery) &&
          !c.email.toLowerCase().includes(this.searchQuery) &&
          !c.phone.includes(this.searchQuery)) return false;
      return true;
    });
  }

  getStats() {
    return {
      total: this.candidates.length,
      inProgress: this.candidates.filter(c => c.stage !== 'Active' && c.stage !== 'Rejected').length,
      approved: this.candidates.filter(c => c.stage === 'Active').length,
      rejected: this.candidates.filter(c => c.stage === 'Rejected').length,
    };
  }

  render() {
    const filtered = this.getFilteredCandidates();
    const stats = this.getStats();

    // Update stats
    this.statTotal.textContent = stats.total;
    this.statInProgress.textContent = stats.inProgress;
    this.statApproved.textContent = stats.approved;
    this.statRejected.textContent = stats.rejected;

    // Render table
    if (filtered.length === 0) {
      this.candidatesBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No candidates found</td></tr>`;
      return;
    }

    this.candidatesBody.innerHTML = filtered.map(c => `
      <tr>
        <td>
          <div class="candidate-cell">
            <div class="candidate-initials">${this.initials(c.name)}</div>
            <div class="candidate-info">
              <p class="candidate-name">${c.name}</p>
              <p class="candidate-email">${c.email}</p>
            </div>
          </div>
        </td>
        <td class="th-hidden">${c.phone}</td>
        <td><span class="stage-badge badge-${c.stage.toLowerCase().replace(/\s+/g, '-')}">${c.stage}</span></td>
        <td class="th-hidden">${this.formatDate(c.submittedAt)}</td>
        <td>
          ${c.stage === 'Active' || c.stage === 'Rejected' ?
            '<span class="sla-ok">—</span>' :
            (c.slaBreached ?
              `<span class="sla-breached"><span class="sla-dot-danger"></span>${c.daysInStage}d</span>` :
              `<span class="sla-normal"><span class="sla-dot-ok"></span>${c.daysInStage}d</span>`)}
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn-checklist" onclick="vettingApp.showChecklist('${c.id}')">Checklist</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  showChecklist(candidateId) {
    this.currentCandidate = this.candidates.find(c => c.id === candidateId);
    if (!this.currentCandidate) return;

    this.modalCandidateName.textContent = `${this.currentCandidate.name} — ${this.currentCandidate.email}`;
    this.checklistBody.innerHTML = `
      <div class="checklist-items">
        ${this.currentCandidate.checklist.map((item, i) => `
          <label class="checklist-item">
            <input type="checkbox" data-item="${i}" ${item.complete ? 'checked' : ''} />
            <div class="checklist-label">
              <p class="checklist-title">${item.item}</p>
            </div>
          </label>
        `).join('')}
      </div>
    `;
    this.checklistModal.show();
  }

  saveChecklist() {
    if (!this.currentCandidate) return;
    const checkboxes = document.querySelectorAll('#checklistBody input[type="checkbox"]');
    checkboxes.forEach((cb, i) => {
      if (this.currentCandidate.checklist[i]) {
        this.currentCandidate.checklist[i].complete = cb.checked;
      }
    });
    this.checklistModal.hide();
  }
}

// Initialize app when DOM is ready
let vettingApp;
document.addEventListener('DOMContentLoaded', () => {
  vettingApp = new VettingAdmin();
});

/* --- OLD CODE BELOW REMOVED --- */
class OldVettingAdmin_Deprecated {
  loadApplications() {
    // Mock data - in production, fetch from API/database
    this.applications = [
      {
        id: 'APP-001',
        driverName: 'John Smith',
        vendorId: 'DHL',
        vendor: 'DHL Express',
        appliedDate: '2026-07-10',
        status: 'pending',
        backgroundCheck: { status: 'clear', date: '2026-07-12' },
        documents: {
          drivingLicense: { status: 'verified', date: '2026-07-10' },
          insurance: { status: 'pending', date: null },
          crb: { status: 'clear', date: '2026-07-11' },
          references: { status: 'verified', date: '2026-07-12' }
        },
        email: 'john.smith@email.com',
        phone: '+44 7700 900 123',
        experienceYears: 8,
        licenseExpiry: '2028-03-15'
      },
      {
        id: 'APP-002',
        driverName: 'Sarah Johnson',
        vendorId: 'FEDEX',
        vendor: 'FedEx',
        appliedDate: '2026-07-08',
        status: 'in-review',
        backgroundCheck: { status: 'pending', date: null },
        documents: {
          drivingLicense: { status: 'verified', date: '2026-07-08' },
          insurance: { status: 'verified', date: '2026-07-09' },
          crb: { status: 'pending', date: null },
          references: { status: 'pending', date: null }
        },
        email: 'sarah.j@email.com',
        phone: '+44 7700 900 456',
        experienceYears: 5,
        licenseExpiry: '2027-09-22'
      },
      {
        id: 'APP-003',
        driverName: 'Michael Chen',
        vendorId: 'DHL',
        vendor: 'DHL Express',
        appliedDate: '2026-07-05',
        status: 'approved',
        backgroundCheck: { status: 'clear', date: '2026-07-06' },
        documents: {
          drivingLicense: { status: 'verified', date: '2026-07-05' },
          insurance: { status: 'verified', date: '2026-07-05' },
          crb: { status: 'clear', date: '2026-07-06' },
          references: { status: 'verified', date: '2026-07-07' }
        },
        email: 'm.chen@email.com',
        phone: '+44 7700 900 789',
        experienceYears: 12,
        licenseExpiry: '2029-01-10'
      },
      {
        id: 'APP-004',
        driverName: 'Emma Wilson',
        vendorId: 'AMAZON',
        vendor: 'Amazon Logistics',
        appliedDate: '2026-07-01',
        status: 'rejected',
        backgroundCheck: { status: 'failed', date: '2026-07-02' },
        documents: {
          drivingLicense: { status: 'verified', date: '2026-07-01' },
          insurance: { status: 'expired', date: null },
          crb: { status: 'failed', date: '2026-07-02' },
          references: { status: 'incomplete', date: null }
        },
        email: 'emma.w@email.com',
        phone: '+44 7700 900 321',
        experienceYears: 2,
        licenseExpiry: '2025-11-30',
        rejectionReason: 'Failed background check'
      }
    ];

    this.populateVendorFilter();
    this.updateStats();
    this.applyFilters();
  }

  populateVendorFilter() {
    const vendors = [...new Set(this.applications.map(app => app.vendor))];
    this.filterVendor.innerHTML = '<option value="">All vendors</option>';
    vendors.forEach(vendor => {
      const option = document.createElement('option');
      option.value = this.applications.find(a => a.vendor === vendor).vendorId;
      option.textContent = vendor;
      this.filterVendor.appendChild(option);
    });
  }

  updateStats() {
    this.pendingCount.textContent = this.applications.filter(a => a.status === 'pending').length;
    this.approvedCount.textContent = this.applications.filter(a => a.status === 'approved').length;
    this.rejectedCount.textContent = this.applications.filter(a => a.status === 'rejected').length;
  }

  applyFilters() {
    const status = this.filterStatus.value;
    const vendor = this.filterVendor.value;
    const search = this.searchDriver.value.toLowerCase();

    this.filteredApplications = this.applications.filter(app => {
      const matchStatus = !status || app.status === status;
      const matchVendor = !vendor || app.vendorId === vendor;
      const matchSearch = !search ||
        app.driverName.toLowerCase().includes(search) ||
        app.id.toLowerCase().includes(search);

      return matchStatus && matchVendor && matchSearch;
    });

    this.renderTable();
  }

  renderTable() {
    if (this.filteredApplications.length === 0) {
      this.emptyState.removeAttribute('hidden');
      this.applicationsTableBody.innerHTML = '';
      return;
    }

    this.emptyState.setAttribute('hidden', '');
    this.applicationsTableBody.innerHTML = '';

    this.filteredApplications.forEach(app => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="driver-info">
          <div class="driver-name">${this.escapeHtml(app.driverName)}</div>
          <div class="driver-id">${app.id}</div>
        </td>
        <td>${this.escapeHtml(app.vendor)}</td>
        <td>${this.formatDate(app.appliedDate)}</td>
        <td>
          <span class="status-badge ${app.status}">
            ${app.status.replace('-', ' ')}
          </span>
        </td>
        <td>
          <div class="check-badge ${this.getBackgroundCheckClass(app.backgroundCheck.status)}">
            <i class="bi bi-${this.getBackgroundCheckIcon(app.backgroundCheck.status)}"></i>
            <span>${this.capitalizeFirst(app.backgroundCheck.status)}</span>
          </div>
        </td>
        <td>
          <span class="doc-count">${this.countVerifiedDocs(app.documents)}/4</span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="styled-button styled-button--primary btn-view" data-app-id="${app.id}">
              <i class="bi bi-eye"></i> View
            </button>
            ${app.status === 'pending' || app.status === 'in-review' ? `
              <button class="styled-button styled-button--success btn-approve" data-app-id="${app.id}">
                <i class="bi bi-check-circle"></i> Approve
              </button>
              <button class="styled-button styled-button--danger btn-reject" data-app-id="${app.id}">
                <i class="bi bi-x-circle"></i> Reject
              </button>
            ` : ''}
          </div>
        </td>
      `;

      row.querySelector('.btn-view').addEventListener('click', () => this.viewApplication(app.id));
      row.querySelector('.btn-approve')?.addEventListener('click', () => this.quickApprove(app.id));
      row.querySelector('.btn-reject')?.addEventListener('click', () => this.quickReject(app.id));

      this.applicationsTableBody.appendChild(row);
    });
  }

  viewApplication(appId) {
    this.currentApplication = this.applications.find(a => a.id === appId);
    if (!this.currentApplication) return;

    const app = this.currentApplication;
    this.vettingModalTitle.textContent = `${app.driverName} - ${app.id}`;

    this.vettingModalBody.innerHTML = `
      <div class="vetting-details">
        <div class="detail-card">
          <div class="detail-card-title">Driver Name</div>
          <div class="detail-card-value">${this.escapeHtml(app.driverName)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">Vendor</div>
          <div class="detail-card-value">${this.escapeHtml(app.vendor)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">Email</div>
          <div class="detail-card-value"><a href="mailto:${app.email}">${app.email}</a></div>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">Phone</div>
          <div class="detail-card-value"><a href="tel:${app.phone}">${app.phone}</a></div>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">Experience</div>
          <div class="detail-card-value">${app.experienceYears} years</div>
        </div>
        <div class="detail-card">
          <div class="detail-card-title">License Expiry</div>
          <div class="detail-card-value">${this.formatDate(app.licenseExpiry)}</div>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h6 style="font-weight: 600; margin-bottom: 1rem;">Background Checks</h6>
        <div class="vetting-details">
          ${this.renderBackgroundChecks(app.documents)}
        </div>
      </div>

      ${app.status === 'rejected' ? `
        <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
          <strong style="color: #dc2626;">Rejection Reason:</strong>
          <p style="margin: 0.5rem 0 0;">${this.escapeHtml(app.rejectionReason)}</p>
        </div>
      ` : ''}
    `;

    // Update modal buttons visibility
    const isActionable = app.status === 'pending' || app.status === 'in-review';
    this.btnApprove.hidden = !isActionable;
    this.btnReject.hidden = !isActionable;

    this.vettingModal.show();
  }

  renderBackgroundChecks(documents) {
    return Object.entries(documents).map(([key, doc]) => `
      <div class="detail-card">
        <div class="detail-card-title">${this.formatDocName(key)}</div>
        <div class="check-badge ${this.getCheckClass(doc.status)}">
          <i class="bi bi-${this.getCheckIcon(doc.status)}"></i>
          <span>${this.capitalizeFirst(doc.status)}</span>
        </div>
        ${doc.date ? `<div style="font-size: 0.8rem; color: var(--text-light); margin-top: 0.5rem;">${this.formatDate(doc.date)}</div>` : ''}
      </div>
    `).join('');
  }

  approveApplication() {
    if (!this.currentApplication) return;
    this.currentApplication.status = 'approved';
    this.updateStats();
    this.applyFilters();
    this.vettingModal.hide();
    this.showNotification('Application approved successfully', 'success');
  }

  rejectApplication() {
    if (!this.currentApplication) return;
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    this.currentApplication.status = 'rejected';
    this.currentApplication.rejectionReason = reason;
    this.updateStats();
    this.applyFilters();
    this.vettingModal.hide();
    this.showNotification('Application rejected', 'danger');
  }

  quickApprove(appId) {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return;
    this.currentApplication = app;
    this.approveApplication();
  }

  quickReject(appId) {
    const app = this.applications.find(a => a.id === appId);
    if (!app) return;
    this.currentApplication = app;
    this.rejectApplication();
  }

  // Utility methods
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDocName(key) {
    const names = {
      drivingLicense: 'Driving License',
      insurance: 'Insurance',
      crb: 'CRB Check',
      references: 'References'
    };
    return names[key] || key;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  countVerifiedDocs(documents) {
    return Object.values(documents).filter(d => d.status === 'verified' || d.status === 'clear').length;
  }

  getBackgroundCheckClass(status) {
    const map = {
      'clear': 'complete',
      'failed': 'failed',
      'pending': 'incomplete'
    };
    return map[status] || 'incomplete';
  }

  getBackgroundCheckIcon(status) {
    const map = {
      'clear': 'check-circle-fill',
      'failed': 'x-circle-fill',
      'pending': 'hourglass-split'
    };
    return map[status] || 'question-circle';
  }

  getCheckClass(status) {
    const map = {
      'verified': 'complete',
      'clear': 'complete',
      'failed': 'failed',
      'expired': 'failed',
      'incomplete': 'incomplete',
      'pending': 'incomplete'
    };
    return map[status] || 'incomplete';
  }

  getCheckIcon(status) {
    const map = {
      'verified': 'check-circle-fill',
      'clear': 'check-circle-fill',
      'failed': 'x-circle-fill',
      'expired': 'exclamation-circle-fill',
      'incomplete': 'hourglass-split',
      'pending': 'hourglass-split'
    };
    return map[status] || 'question-circle';
  }

  showNotification(message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.insertBefore(alert, document.body.firstChild);
    setTimeout(() => alert.remove(), 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new VettingAdmin();
});

// Initialize app when DOM is ready
let vettingApp;
document.addEventListener('DOMContentLoaded', () => {
  vettingApp = new VettingAdmin();
});
