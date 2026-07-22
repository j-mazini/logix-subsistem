/**
 * SP Portal – Driver Vetting candidates list (sp-portal/vetting-admin/index.html).
 * Owns the table, stats, filters, search, bulk actions, and mock-data seeding. The
 * per-candidate checklist/case review lives on its own page (checklist.html) — "Review"
 * opens it in a new tab so the list and the review workspace are two separate screens.
 */
(function () {
  'use strict';

  const S = window.VettingShared;

  class VettingList {
    constructor() {
      this.candidates = [];
      this.currentStageFilter = 'All';
      this.searchQuery = '';
      this.selectedCandidates = new Set();
      this.init();
    }

    init() {
      this.cacheDOM();
      this.loadState();
      this.bindEvents();

      window.addEventListener('storage', (e) => {
        if (e.key === S.STORAGE_KEY) {
          this.candidates = S.loadCandidates() || [];
          this.render();
        }
      });

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
    }

    bindEvents() {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.setStageFilter(e.target.dataset.stage));
      });

      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      });

      document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
        card.addEventListener('click', (e) => this.setStageFilter(e.currentTarget.dataset.filter));
      });

      document.getElementById('btnExport')?.addEventListener('click', () => this.exportCSV());
      document.getElementById('btnBulkApprove')?.addEventListener('click', () => this.bulkApprove());
      document.getElementById('btnBulkReject')?.addEventListener('click', () => this.bulkReject());
      document.getElementById('btnClearSelection')?.addEventListener('click', () => this.clearSelection());
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

    /* ============ Persistence + mock data seeding (this page owns first-time seeding) ============ */

    loadState() {
      const existing = S.loadCandidates();
      if (existing) {
        this.candidates = existing;
        return;
      }
      this.generateMockData();
      S.saveCandidates(this.candidates);
    }

    persist() {
      S.saveCandidates(this.candidates);
    }

    generateMockData() {
      const names = ['Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
                     'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa'];
      const vendors = ['FedEx', 'UPS', 'DPD', 'TNT'];
      const stages = ['Application', 'Pre-screen', 'Interview', 'Documents', 'Active', 'Rejected'];

      this.candidates = names.map((name, i) => {
        const stage = stages[Math.floor(Math.random() * stages.length)];
        const submittedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const progressRatio = { 'Application': 0.15, 'Pre-screen': 0.35, 'Interview': 0.6, 'Documents': 0.85, 'Active': 1, 'Rejected': 0.45 }[stage] || 0.3;
        const stepCount = S.CHECKLIST_TEMPLATE.length;
        const approvedSteps = Math.max(0, Math.min(stepCount, Math.round(progressRatio * stepCount) - 1));

        return {
          id: `driver-${i + 1}`,
          source: 'drivers',
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
          phone: `+44 7${Math.floor(Math.random() * 900000000 + 100000000)}`,
          vendor: vendors[Math.floor(Math.random() * vendors.length)],
          role: S.ROLE_OPTIONS[i % S.ROLE_OPTIONS.length],
          nationality: 'British',
          dob: new Date(Date.now() - (20 + Math.floor(Math.random() * 25)) * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          postcode: 'SW1A 1AA',
          nin: 'AB123456C',
          address: '1 Example Street, London',
          stage,
          submittedAt: submittedAt.toISOString(),
          daysInStage: Math.floor(Math.random() * 30),
          slaBreached: Math.random() > 0.7,
          checklist: this.buildChecklist(stage),
          assignedOfficer: S.VETTING_OFFICERS[Math.floor(Math.random() * S.VETTING_OFFICERS.length)],

          accessGranted: approvedSteps >= 1,
          applicationOnHold: false,
          applicationHoldReason: '',
          applicationRejected: stage === 'Rejected',
          rejectionNotes: stage === 'Rejected' ? 'Did not meet minimum eligibility requirements.' : '',
          workHistoryReleased: false,
          suitability: null,
          caseNotes: '',
          stepApprovals: Array.from({ length: stepCount }, (_, s) => s < approvedSteps),
          stepRejections: Array.from({ length: stepCount }, () => false),
          stepApprovalMeta: Array.from({ length: stepCount }, (_, s) => (s < approvedSteps ? { approvedAt: submittedAt.toISOString(), approvedBy: 'Sarah Thompson' } : null)),
          firstAccessTemporaryPassword: null,
          auditLog: [{ field: 'stage', oldValue: null, newValue: 'Application', reason: null, actor: 'System', at: submittedAt.toISOString() }]
        };
      });
    }

    buildChecklist(stage) {
      const progressRatio = { 'Application': 0.15, 'Pre-screen': 0.35, 'Interview': 0.6, 'Documents': 0.85, 'Active': 1, 'Rejected': 0.45 }[stage] || 0.3;
      return S.CHECKLIST_TEMPLATE.map(step => ({
        title: step.title,
        subtitle: step.subtitle,
        sla: step.sla,
        items: step.items.map(item => ({ ...item, complete: Math.random() < progressRatio }))
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

      this.statTotal.textContent = stats.total;
      this.statInProgress.textContent = stats.inProgress;
      this.statApproved.textContent = stats.approved;
      this.statRejected.textContent = stats.rejected;

      if (filtered.length === 0) {
        this.candidatesBody.innerHTML = `<tr><td colspan="8" class="empty-cell">No candidates found</td></tr>`;
      } else {
        this.candidatesBody.innerHTML = filtered.map(c => `
          <tr>
            <td>
              <input type="checkbox" class="candidate-checkbox" data-id="${c.id}" onchange="vettingApp.toggleCandidate('${c.id}')" />
            </td>
            <td>
              <div class="candidate-cell">
                <div class="candidate-initials">${S.initials(c.name)}</div>
                <div class="candidate-info">
                  <p class="candidate-name">${c.name}</p>
                  <p class="candidate-email">${c.email}</p>
                </div>
              </div>
            </td>
            <td class="th-hidden">${c.phone}</td>
            <td><span class="stage-badge badge-${c.stage.toLowerCase().replace(/\s+/g, '-')}">${c.stage}</span></td>
            <td class="th-hidden">${S.formatDate(c.submittedAt)}</td>
            <td>
              ${c.stage === 'Active' || c.stage === 'Rejected' ?
                '<span class="sla-ok">—</span>' :
                (c.slaBreached ?
                  `<span class="sla-breached"><span class="sla-dot-danger"></span>${c.daysInStage}d</span>` :
                  `<span class="sla-normal"><span class="sla-dot-ok"></span>${c.daysInStage}d</span>`)}
            </td>
            <td class="th-hidden"><span class="officer-badge">${c.assignedOfficer}</span></td>
            <td>
              <div class="actions-cell">
                <button class="btn-checklist" onclick="vettingApp.openCandidateChecklist('${c.id}')">Review</button>
              </div>
            </td>
          </tr>
        `).join('');
      }

      this.updateBulkActionButtons();
    }

    toggleCandidate(candidateId) {
      if (this.selectedCandidates.has(candidateId)) {
        this.selectedCandidates.delete(candidateId);
      } else {
        this.selectedCandidates.add(candidateId);
      }
      this.updateBulkActionButtons();
    }

    updateBulkActionButtons() {
      const bulkPanel = document.getElementById('bulkPanel');
      const selectionCount = document.getElementById('selectionCount');
      if (bulkPanel) {
        bulkPanel.style.display = this.selectedCandidates.size > 0 ? 'block' : 'none';
        if (selectionCount) selectionCount.textContent = this.selectedCandidates.size;
      }
    }

    clearSelection() {
      this.selectedCandidates.clear();
      document.querySelectorAll('.candidate-checkbox').forEach(cb => cb.checked = false);
      this.updateBulkActionButtons();
    }

    /** "Review" opens the candidate's checklist/case page in a new browser tab. */
    openCandidateChecklist(id) {
      const url = new URL('checklist.html', window.location.href);
      url.searchParams.set('candidate', id);
      window.open(url.toString(), '_blank', 'noopener=false');
    }

    exportCSV() {
      const filtered = this.getFilteredCandidates();
      const headers = ['Name', 'Email', 'Phone', 'Vendor', 'Stage', 'Days in Stage', 'Assigned Officer', 'Submitted At'];
      const rows = filtered.map(c => [
        c.name,
        c.email,
        c.phone,
        c.vendor,
        c.stage,
        c.daysInStage,
        c.assignedOfficer,
        S.formatDate(c.submittedAt)
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vetting-candidates-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }

    bulkApprove() {
      if (this.selectedCandidates.size === 0) return;
      this.selectedCandidates.forEach(id => {
        const c = this.candidates.find(x => x.id === id);
        if (c) {
          const oldStage = c.stage;
          c.stage = 'Active';
          S.logAudit(c, 'stage', oldStage, 'Active', 'Bulk approve');
        }
      });
      this.persist();
      this.clearSelection();
      this.render();
    }

    bulkReject() {
      if (this.selectedCandidates.size === 0) return;
      this.selectedCandidates.forEach(id => {
        const c = this.candidates.find(x => x.id === id);
        if (c) {
          const oldStage = c.stage;
          c.stage = 'Rejected';
          c.applicationRejected = true;
          S.logAudit(c, 'stage', oldStage, 'Rejected', 'Bulk reject');
        }
      });
      this.persist();
      this.clearSelection();
      this.render();
    }
  }

  let vettingApp;
  document.addEventListener('DOMContentLoaded', () => {
    vettingApp = new VettingList();
    window.vettingApp = vettingApp;
  });
})();
