/* Ported from dhl-vetting-tracker (BA Express Driver Vetting SOP v2.0 — Checklist Master Data).
 * Extended with editing, notes, history, bulk actions, export, and officer assignment. */
const CHECKLIST_TEMPLATE = [
  {
    title: 'Driver Registration & Application Form',
    subtitle: 'Application Form data capture, conditional DVLA/Right to Work rules, first review and confirmation email.',
    sla: 'Same day',
    items: [
      { title: 'Application Form data collected', required: true, detail: 'Name, phone, email, role type, date of birth, UK postcode/address, National Insurance Number, Right to Work and DVLA Share Code captured from the Application Form.' },
      { title: 'Right to Work check', required: true, conditional: true, conditionNote: 'British/Irish does not require a Share Code. Online RTW routes require the Share Code.' },
      { title: 'Driving Licence check', required: true, conditional: true, conditionNote: 'DVLA is not required when Role Type = Bicycle Courier.' },
      { title: 'Registration data reviewed and exported', required: true, detail: 'Review the captured registration information against the Central Driver Record before sending confirmation.' },
      { title: 'Confirmation e-mail sent to candidate', required: true, detail: 'Send the approved access message through the agreed communication channel.' },
      { title: 'BA Application Form downloaded and signature status confirmed', required: true },
      { title: 'Driver registration completed', required: true, detail: 'Create or confirm the driver record before starting vetting.' }
    ]
  },
  {
    title: 'Interview',
    subtitle: 'Pre-interview information, interview scoring, work history review, DBS/reference checks and final interview decision.',
    sla: 'Before or on interview day',
    items: [
      { sectionHeader: '2.1 Pre-Interview', title: 'Interview Information Recorded', required: true, detail: 'Interview Date, Start Time, End Time, Location, Interviewer and Supervisor recorded.' },
      { title: 'Payment mode and company behaviour document downloaded', required: true, detail: 'Placeholder for the payment mode and company behaviour briefing document.' },
      { sectionHeader: '2.2 Interview', title: 'Core Competencies Scored', required: true },
      { title: 'Online test released and score reviewed', required: true, detail: 'Redirect to the online test module. Once the candidate completes the released test, the score appears in this checklist.' },
      { title: 'DBS collected or requested', required: true },
      { title: 'Work References recorded', required: true, detail: 'Employment history is submitted by the driver in the candidate portal (Work history form). References can be collected orally or by letter/e-mail; gaps of 28 days or more are flagged in the 5-year history review.' },
      { title: '5 years history reviewed', required: true },
      { title: 'Interview Notes recorded', required: true },
      { title: 'Red Flags reviewed', required: true },
      { title: 'Finish interview', required: true },
      { sectionHeader: '2.3 Post Interview', title: 'Work Reference Check', required: true },
      { title: 'DBS', required: true },
      { title: 'APHIDS', conditional: true, conditionNote: 'Required for depots or routes that require aviation/security clearance.' },
      { title: 'Final decision', required: true },
      { title: 'Approval e-mail', required: true, detail: 'Copy and send the approval e-mail after the final decision is approved.' }
    ]
  },
  {
    title: 'Suitability Assessment',
    subtitle: 'Criminal declaration, declaration of suitability and observations.',
    sla: 'Same day as interview',
    items: [
      { title: 'Criminal record declaration recorded', required: true },
      { title: 'Declaration of Suitability signed', required: true },
      { title: 'Observations recorded', required: true }
    ]
  },
  {
    title: 'DHL Courses & Finalisation',
    subtitle: 'DHL courses, original document collection, payment mode, DHL folder and final application completion.',
    sla: 'Before driver start',
    items: [
      { title: 'Training courses booked and status recorded', required: true },
      { title: 'Original documents collected and recorded', required: true },
      { title: 'Cost model recorded', required: true },
      { title: 'DHL folder organised, physical copies present and delivered', required: true },
      { title: 'Driver application completed', required: true }
    ]
  }
];

const CHECKLIST_TOTAL_ITEMS = CHECKLIST_TEMPLATE.reduce((total, step) => total + step.items.length, 0);
const VETTING_OFFICERS = ['Sarah Thompson', 'Michael Chen', 'Emma Rodriguez', 'James Wilson', 'Priya Patel'];

class VettingAdmin {
  constructor() {
    this.candidates = [];
    this.currentStageFilter = 'All';
    this.searchQuery = '';
    this.currentCandidate = null;
    this.selectedCandidates = new Set();
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

    // Additional modals
    this.editModal = new bootstrap.Modal(document.getElementById('editModal'));
    this.notesModal = new bootstrap.Modal(document.getElementById('notesModal'));
    this.timelineModal = new bootstrap.Modal(document.getElementById('timelineModal'));
    this.approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
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

    this.btnSaveChecklist.addEventListener('click', () => this.saveChecklist());

    // Export button
    document.getElementById('btnExport')?.addEventListener('click', () => this.exportCSV());

    // Bulk action buttons
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

  generateMockData() {
    const names = ['Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
                   'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa'];
    const vendors = ['FedEx', 'UPS', 'DPD', 'TNT'];
    const stages = ['Application', 'Pre-screen', 'Interview', 'Documents', 'Active', 'Rejected'];

    this.candidates = names.map((name, i) => {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const submittedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      return {
        id: `driver-${i + 1}`,
        name,
        email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
        phone: `+44 7${Math.floor(Math.random() * 900000000 + 100000000)}`,
        vendor: vendors[Math.floor(Math.random() * vendors.length)],
        stage,
        submittedAt: submittedAt.toISOString(),
        daysInStage: Math.floor(Math.random() * 30),
        slaBreached: Math.random() > 0.7,
        checklist: this.buildChecklist(stage),
        notes: [
          { text: 'Initial review completed', author: 'Sarah Thompson', timestamp: new Date(submittedAt.getTime() + 86400000).toISOString() }
        ],
        history: [
          { action: 'Created', field: 'stage', oldValue: null, newValue: 'Application', author: 'System', timestamp: submittedAt.toISOString() }
        ],
        assignedOfficer: VETTING_OFFICERS[Math.floor(Math.random() * VETTING_OFFICERS.length)],
        tags: ['priority' + (i % 3 === 0 ? '-high' : i % 3 === 1 ? '-medium' : '-low')]
      };
    });
  }

  buildChecklist(stage) {
    const progressRatio = { 'Application': 0.15, 'Pre-screen': 0.35, 'Interview': 0.6, 'Documents': 0.85, 'Active': 1, 'Rejected': 0.45 }[stage] || 0.3;
    return CHECKLIST_TEMPLATE.map(step => ({
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
      return;
    }

    this.candidatesBody.innerHTML = filtered.map(c => `
      <tr>
        <td>
          <input type="checkbox" class="candidate-checkbox" data-id="${c.id}" onchange="vettingApp.toggleCandidate('${c.id}')" />
        </td>
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
        <td class="th-hidden"><span class="officer-badge">${c.assignedOfficer}</span></td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-edit" onclick="vettingApp.openEditModal('${c.id}')" title="Edit">✎</button>
            <button class="btn-action btn-notes" onclick="vettingApp.openNotesModal('${c.id}')" title="Notes">💬</button>
            <button class="btn-action btn-timeline" onclick="vettingApp.openTimelineModal('${c.id}')" title="Timeline">⏱</button>
            <button class="btn-checklist" onclick="vettingApp.showChecklist('${c.id}')">Checklist</button>
          </div>
        </td>
      </tr>
    `).join('');

    this.updateBulkActionButtons();
  }

  initials(name) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDatetime(iso) {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

  openEditModal(candidateId) {
    this.currentCandidate = this.candidates.find(c => c.id === candidateId);
    if (!this.currentCandidate) return;

    document.getElementById('editName').value = this.currentCandidate.name;
    document.getElementById('editEmail').value = this.currentCandidate.email;
    document.getElementById('editPhone').value = this.currentCandidate.phone;
    document.getElementById('editVendor').value = this.currentCandidate.vendor;
    document.getElementById('editStage').value = this.currentCandidate.stage;
    document.getElementById('editOfficer').value = this.currentCandidate.assignedOfficer;

    this.editModal.show();
  }

  saveEdit() {
    if (!this.currentCandidate) return;

    const oldStage = this.currentCandidate.stage;
    this.currentCandidate.name = document.getElementById('editName').value;
    this.currentCandidate.email = document.getElementById('editEmail').value;
    this.currentCandidate.phone = document.getElementById('editPhone').value;
    this.currentCandidate.vendor = document.getElementById('editVendor').value;
    this.currentCandidate.stage = document.getElementById('editStage').value;
    this.currentCandidate.assignedOfficer = document.getElementById('editOfficer').value;

    if (oldStage !== this.currentCandidate.stage) {
      this.currentCandidate.history.push({
        action: 'Updated',
        field: 'stage',
        oldValue: oldStage,
        newValue: this.currentCandidate.stage,
        author: 'Current User',
        timestamp: new Date().toISOString()
      });
    }

    this.editModal.hide();
    this.render();
  }

  openNotesModal(candidateId) {
    this.currentCandidate = this.candidates.find(c => c.id === candidateId);
    if (!this.currentCandidate) return;

    const notesList = document.getElementById('notesList');
    notesList.innerHTML = (this.currentCandidate.notes || []).map(note => `
      <div class="note-item">
        <p class="note-text">${note.text}</p>
        <p class="note-meta">${note.author} • ${this.formatDatetime(note.timestamp)}</p>
      </div>
    `).join('');

    document.getElementById('newNoteText').value = '';
    this.notesModal.show();
  }

  addNote() {
    if (!this.currentCandidate) return;
    const text = document.getElementById('newNoteText').value.trim();
    if (!text) return;

    if (!this.currentCandidate.notes) this.currentCandidate.notes = [];
    this.currentCandidate.notes.push({
      text,
      author: 'Current User',
      timestamp: new Date().toISOString()
    });

    this.openNotesModal(this.currentCandidate.id);
  }

  openTimelineModal(candidateId) {
    this.currentCandidate = this.candidates.find(c => c.id === candidateId);
    if (!this.currentCandidate) return;

    const timeline = document.getElementById('timelineContent');
    timeline.innerHTML = (this.currentCandidate.history || []).map(entry => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <p class="timeline-action"><strong>${entry.action}</strong> ${entry.field}</p>
          <p class="timeline-detail">${entry.oldValue || '—'} → ${entry.newValue || '—'}</p>
          <p class="timeline-meta">${entry.author} • ${this.formatDatetime(entry.timestamp)}</p>
        </div>
      </div>
    `).join('');

    this.timelineModal.show();
  }

  showChecklist(candidateId) {
    this.currentCandidate = this.candidates.find(c => c.id === candidateId);
    if (!this.currentCandidate) return;

    const steps = this.currentCandidate.checklist;
    const doneCount = steps.reduce((n, step) => n + step.items.filter(it => it.complete).length, 0);

    this.modalCandidateName.textContent = `${this.currentCandidate.name} — ${this.currentCandidate.email} · ${doneCount}/${CHECKLIST_TOTAL_ITEMS} complete`;
    this.checklistBody.innerHTML = steps.map((step, s) => {
      const stepDone = step.items.filter(it => it.complete).length;
      return `
        <div class="checklist-step">
          <div class="checklist-step-header">
            <div>
              <p class="checklist-step-title">${step.title}</p>
              <p class="checklist-step-subtitle">${step.subtitle}</p>
            </div>
            <div class="checklist-step-meta">
              ${step.sla ? `<span class="checklist-sla-badge">SLA: ${step.sla}</span>` : ''}
              <span class="checklist-step-progress">${stepDone}/${step.items.length}</span>
            </div>
          </div>
          <div class="checklist-items">
            ${step.items.map((item, i) => `
              ${item.sectionHeader ? `<p class="checklist-section-header">${item.sectionHeader}</p>` : ''}
              <label class="checklist-item">
                <input type="checkbox" data-step="${s}" data-item="${i}" ${item.complete ? 'checked' : ''} />
                <div class="checklist-label">
                  <p class="checklist-title">
                    ${item.title}
                    ${item.required ? '<span class="checklist-badge checklist-badge-required">Required</span>' : ''}
                    ${item.conditional ? '<span class="checklist-badge checklist-badge-conditional">Conditional</span>' : ''}
                  </p>
                  ${item.detail ? `<p class="checklist-desc">${item.detail}</p>` : ''}
                  ${item.conditional && item.conditionNote ? `<p class="checklist-condition-note">${item.conditionNote}</p>` : ''}
                </div>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    this.checklistModal.show();
  }

  saveChecklist() {
    if (!this.currentCandidate) return;
    const checkboxes = document.querySelectorAll('#checklistBody input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const step = this.currentCandidate.checklist[Number(cb.dataset.step)];
      const item = step && step.items[Number(cb.dataset.item)];
      if (item) item.complete = cb.checked;
    });
    this.checklistModal.hide();
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
      this.formatDate(c.submittedAt)
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
        c.history.push({
          action: 'Bulk Updated',
          field: 'stage',
          oldValue: oldStage,
          newValue: 'Active',
          author: 'Current User',
          timestamp: new Date().toISOString()
        });
      }
    });
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
        c.history.push({
          action: 'Bulk Updated',
          field: 'stage',
          oldValue: oldStage,
          newValue: 'Rejected',
          author: 'Current User',
          timestamp: new Date().toISOString()
        });
      }
    });
    this.clearSelection();
    this.render();
  }
}

let vettingApp;
document.addEventListener('DOMContentLoaded', () => {
  vettingApp = new VettingAdmin();

  // Additional event listeners for modals
  document.getElementById('btnSaveEdit')?.addEventListener('click', () => vettingApp.saveEdit());
  document.getElementById('btnAddNote')?.addEventListener('click', () => vettingApp.addNote());
  document.getElementById('newNoteText')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) vettingApp.addNote();
  });
});
