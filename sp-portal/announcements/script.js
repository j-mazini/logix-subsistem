/* =====================================================
   Announcements — Logixsphere SP portal
   Vanilla JS, class-based. Reads/writes through the shared AvisosStorage
   (see ../../avisos-storage.js): DHL broadcasts show up here read-only,
   and this SP's own announcements (source: 'SP') are full CRUD. Storage
   already scopes 'SP' records to their author, so everything this page
   receives from getAllAvisos()/getActiveAvisos() is either a DHL
   broadcast or one of THIS SP's own records — never another SP's.
   ===================================================== */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TYPE_ICONS = { Announcement: '📢', Delay: '⏳', Warning: '⚠️' };
const URGENCY_ICONS = { Low: '🔵', Normal: '🟢', High: '🟠', Critical: '🔴' };

class AnnouncementsApp {
  constructor() {
    this.currentSp = (window.SpHeaderIdentity && window.SpHeaderIdentity.getCurrentSp()) || '';
    this.search = '';
    this.filterOrigin = 'all';
    this.filterType = 'all';
    this.filterStatus = 'all';
    this.filterUrgency = 'all';
    this.editId = null;

    this.init();
  }

  init() {
    this.setupListeners();
    this.render();
    setTimeout(() => {
      document.getElementById('loadingOverlay').classList.remove('active');
    }, 300);
  }

  /* ==================== DATA ==================== */
  loadAnnouncements() {
    const raw = window.AvisosStorage ? AvisosStorage.getAllAvisos() : [];
    return raw.filter((a) => !a.deleted).map((a) => ({
      id: a.id,
      title: a.title || '',
      content: a.message || '',
      type: a.type || 'Announcement',
      urgency: a.urgency || 'Normal',
      audience: (Array.isArray(a.audience) && a.audience.length) ? a.audience : ['Depot', 'Loop', 'Route'],
      publishDate: a.publishDate ? new Date(`${a.publishDate}T00:00:00`) : new Date(a.createdAt || Date.now()),
      expirationDate: a.expireDate ? new Date(`${a.expireDate}T23:59:59`) : new Date(Date.now() + 7 * 86400000),
      isMine: a.source === 'SP',
    }));
  }

  getStatus(ann) {
    const now = new Date();
    if (ann.expirationDate <= now) return 'Expired';
    if (ann.publishDate <= now) return 'Active';
    return 'Scheduled';
  }

  formatDate(d) {
    return d.toLocaleDateString('en-GB');
  }

  /* ==================== LISTENERS ==================== */
  setupListeners() {
    document.getElementById('btnNewAnnouncement').addEventListener('click', () => this.openModal(null));

    ['searchInput'].forEach((id) => {
      document.getElementById(id).addEventListener('input', (e) => {
        this.search = e.target.value;
        this.render();
      });
    });

    document.getElementById('filterOrigin').addEventListener('change', (e) => { this.filterOrigin = e.target.value; this.render(); });
    document.getElementById('filterType').addEventListener('change', (e) => { this.filterType = e.target.value; this.render(); });
    document.getElementById('filterStatus').addEventListener('change', (e) => { this.filterStatus = e.target.value; this.render(); });
    document.getElementById('filterUrgency').addEventListener('change', (e) => { this.filterUrgency = e.target.value; this.render(); });
    document.querySelectorAll('.filter-audience').forEach((cb) => cb.addEventListener('change', () => this.render()));

    document.getElementById('clearFilters').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('filterOrigin').value = 'all';
      document.getElementById('filterType').value = 'all';
      document.getElementById('filterStatus').value = 'all';
      document.getElementById('filterUrgency').value = 'all';
      document.querySelectorAll('.filter-audience').forEach((cb) => { cb.checked = true; });
      this.search = '';
      this.filterOrigin = 'all';
      this.filterType = 'all';
      this.filterStatus = 'all';
      this.filterUrgency = 'all';
      this.render();
    });

    document.getElementById('annTableBody').addEventListener('click', (e) => this.handleTableClick(e));

    const form = document.getElementById('annForm');
    form.addEventListener('submit', (e) => this.handleSubmit(e));
    document.getElementById('annModalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('annModalCancel').addEventListener('click', () => this.closeModal());
    document.getElementById('annModalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'annModalBackdrop') this.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  /* ==================== FILTER + RENDER ==================== */
  getFilteredAnnouncements() {
    const search = this.search.trim().toLowerCase();
    const selectedAudience = Array.from(document.querySelectorAll('.filter-audience:checked')).map((cb) => cb.value);

    let rows = this.loadAnnouncements().filter((ann) => {
      if (search && !ann.title.toLowerCase().includes(search)) return false;
      if (this.filterOrigin === 'dhl' && ann.isMine) return false;
      if (this.filterOrigin === 'mine' && !ann.isMine) return false;
      if (this.filterType !== 'all' && ann.type !== this.filterType) return false;
      if (this.filterStatus !== 'all' && this.getStatus(ann) !== this.filterStatus) return false;
      if (this.filterUrgency !== 'all' && ann.urgency !== this.filterUrgency) return false;
      if (selectedAudience.length > 0 && !ann.audience.some((a) => selectedAudience.includes(a))) return false;
      return true;
    });

    const urgencyOrder = { Critical: 0, High: 1, Normal: 2, Low: 3 };
    rows.sort((a, b) => {
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (diff !== 0) return diff;
      return b.publishDate - a.publishDate;
    });
    return rows;
  }

  render() {
    const rows = this.getFilteredAnnouncements();
    const body = document.getElementById('annTableBody');
    const empty = document.getElementById('annEmptyState');
    const wrap = document.getElementById('annTableWrap');

    if (rows.length === 0) {
      body.innerHTML = '';
      empty.hidden = false;
      wrap.hidden = true;
      return;
    }
    empty.hidden = true;
    wrap.hidden = false;

    body.innerHTML = rows.map((ann) => {
      const status = this.getStatus(ann);
      const typeLabel = `${TYPE_ICONS[ann.type] || ''} ${ann.type}`;
      const urgencyLabel = `${URGENCY_ICONS[ann.urgency] || ''} ${ann.urgency}`;
      const audienceStr = ann.audience.map((a) => `<span class="ann-audience-tag">${escapeHtml(a)}</span>`).join('');
      const originBadge = ann.isMine
        ? '<span class="ann-origin-badge ann-origin-badge--mine"><i class="bi bi-person-fill"></i> You</span>'
        : '<span class="ann-origin-badge ann-origin-badge--dhl"><i class="bi bi-building"></i> DHL</span>';
      const actionsCell = ann.isMine
        ? `<div class="va-actions-cell">
             <button type="button" class="styled-button styled-button--outline styled-button--sm" data-edit="${ann.id}" title="Edit"><i class="bi bi-pencil"></i></button>
             <button type="button" class="styled-button styled-button--danger styled-button--sm" data-delete="${ann.id}" title="Delete"><i class="bi bi-trash"></i></button>
           </div>`
        : '<span class="va-cell-empty">—</span>';

      return `
        <tr>
          <td>${originBadge}</td>
          <td><strong>${escapeHtml(ann.title)}</strong></td>
          <td><span class="ann-badge ann-badge-type-${ann.type.toLowerCase()}">${typeLabel}</span></td>
          <td><span class="ann-badge ann-badge-urgency-${ann.urgency.toLowerCase()}">${urgencyLabel}</span></td>
          <td>${audienceStr}</td>
          <td>${this.formatDate(ann.publishDate)}</td>
          <td>${this.formatDate(ann.expirationDate)}</td>
          <td><span class="va-status-badge ${status.toLowerCase()}">${status}</span></td>
          <td class="text-center">${actionsCell}</td>
        </tr>
      `;
    }).join('');
  }

  /* ==================== TABLE ACTIONS ==================== */
  handleTableClick(e) {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) { this.openModal(editBtn.dataset.edit); return; }

    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      const ann = this.loadAnnouncements().find((a) => a.id === deleteBtn.dataset.delete);
      if (!ann || !ann.isMine) return;
      if (confirm('Delete this announcement? This cannot be undone.')) {
        AvisosStorage.deleteAviso(ann.id);
        this.render();
        this.showToast('Announcement deleted.', 'success');
      }
    }
  }

  /* ==================== MODAL ==================== */
  openModal(id) {
    const backdrop = document.getElementById('annModalBackdrop');
    const title = document.getElementById('annModalTitle');
    const editIdInput = document.getElementById('annEditId');
    const form = document.getElementById('annForm');

    if (id) {
      const ann = this.loadAnnouncements().find((a) => a.id === id);
      if (!ann || !ann.isMine) return;
      title.textContent = 'Edit Announcement';
      editIdInput.value = id;
      document.getElementById('annFormTitle').value = ann.title;
      document.getElementById('annFormContent').value = ann.content;
      document.getElementById('annFormType').value = ann.type;
      document.getElementById('annFormUrgency').value = ann.urgency;
      document.querySelectorAll('.form-audience').forEach((cb) => { cb.checked = ann.audience.includes(cb.value); });
      document.getElementById('annFormPublishDate').value = toDateStr(ann.publishDate);
      document.getElementById('annFormExpirationDate').value = toDateStr(ann.expirationDate);
    } else {
      title.textContent = 'New Announcement';
      editIdInput.value = '';
      form.reset();
      document.querySelectorAll('.form-audience').forEach((cb) => { cb.checked = true; });
      const now = new Date();
      const later = new Date(now.getTime() + 7 * 86400000);
      document.getElementById('annFormPublishDate').value = toDateStr(now);
      document.getElementById('annFormExpirationDate').value = toDateStr(later);
    }

    backdrop.hidden = false;
  }

  closeModal() {
    document.getElementById('annModalBackdrop').hidden = true;
  }

  handleSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('annForm');
    if (!form.reportValidity()) return;

    const selectedAudience = Array.from(document.querySelectorAll('.form-audience:checked')).map((cb) => cb.value);
    if (selectedAudience.length === 0) {
      this.showToast('Select at least one audience.', 'error');
      return;
    }

    const publishValue = document.getElementById('annFormPublishDate').value;
    const expirationValue = document.getElementById('annFormExpirationDate').value;
    const pub = new Date(`${publishValue}T00:00:00`);
    const exp = new Date(`${expirationValue}T00:00:00`);
    if (exp <= pub) {
      this.showToast('Expiration date must be after the publish date.', 'error');
      return;
    }

    const payload = {
      title: document.getElementById('annFormTitle').value.trim(),
      message: document.getElementById('annFormContent').value.trim(),
      type: document.getElementById('annFormType').value,
      urgency: document.getElementById('annFormUrgency').value,
      audience: selectedAudience,
      publishDate: publishValue,
      expireDate: expirationValue,
    };

    const editId = document.getElementById('annEditId').value;
    if (editId) {
      AvisosStorage.updateAviso(editId, payload);
      this.showToast('Announcement updated.', 'success');
    } else {
      payload.source = 'SP';
      payload.spName = this.currentSp;
      AvisosStorage.addAviso(payload);
      this.showToast('Announcement created.', 'success');
    }

    this.render();
    this.closeModal();
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
  window.announcementsApp = new AnnouncementsApp();
});
