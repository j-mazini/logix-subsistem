import { useEffect, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { getAllAvisos, addAviso, updateAviso, deleteAviso } from '../../data/announcementsData';
import '../../styles/legacy/announcements.css';

type AnnouncementType = 'Announcement' | 'Delay' | 'Warning';
type Urgency = 'Low' | 'Normal' | 'High' | 'Critical';
type AudienceKey = 'Depot' | 'Loop' | 'Route';
type Status = 'Scheduled' | 'Active' | 'Expired';
type ToastType = 'success' | 'error' | 'info';

interface AnnouncementView {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  urgency: Urgency;
  audience: string[];
  publishDate: Date;
  expirationDate: Date;
  isMine: boolean;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  hiding: boolean;
}

const TYPE_ICONS: Record<AnnouncementType, string> = { Announcement: '📢', Delay: '⏳', Warning: '⚠️' };
const URGENCY_ICONS: Record<Urgency, string> = { Low: '🔵', Normal: '🟢', High: '🟠', Critical: '🔴' };
const URGENCY_ORDER: Record<Urgency, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };
const AUDIENCE_KEYS: AudienceKey[] = ['Depot', 'Loop', 'Route'];

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB');
}

function getStatus(ann: AnnouncementView): Status {
  const now = new Date();
  if (ann.expirationDate <= now) return 'Expired';
  if (ann.publishDate <= now) return 'Active';
  return 'Scheduled';
}

function loadAnnouncements(sp: string): AnnouncementView[] {
  const raw = getAllAvisos(sp);
  return raw
    .filter((a) => !a.deleted)
    .map((a) => ({
      id: a.id,
      title: a.title || '',
      content: a.message || '',
      type: (a.type as AnnouncementType) || 'Announcement',
      urgency: (a.urgency as Urgency) || 'Normal',
      audience: Array.isArray(a.audience) && a.audience.length ? a.audience : ['Depot', 'Loop', 'Route'],
      publishDate: a.publishDate ? new Date(`${a.publishDate}T00:00:00`) : new Date(a.createdAt || Date.now()),
      expirationDate: a.expireDate ? new Date(`${a.expireDate}T23:59:59`) : new Date(Date.now() + 7 * 86400000),
      isMine: a.source === 'SP',
    }));
}

export function Announcements() {
  const sp = useCurrentSp();

  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const [search, setSearch] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'dhl' | 'mine'>('all');
  const [filterType, setFilterType] = useState<'all' | AnnouncementType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');
  const [filterUrgency, setFilterUrgency] = useState<'all' | Urgency>('all');
  const [audienceFilter, setAudienceFilter] = useState<Record<AudienceKey, boolean>>({ Depot: true, Loop: true, Route: true });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('New Announcement');
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<AnnouncementType>('Announcement');
  const [formUrgency, setFormUrgency] = useState<Urgency>('Normal');
  const [formAudience, setFormAudience] = useState<Record<AudienceKey, boolean>>({ Depot: true, Loop: true, Route: true });
  const [formPublishDate, setFormPublishDate] = useState('');
  const [formExpirationDate, setFormExpirationDate] = useState('');

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  useModalBehavior(() => setModalOpen(false), modalOpen);

  function showToast(message: string, type: ToastType = 'info') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, hiding: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, hiding: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 320);
    }, 3200);
  }

  // `version` is a dependency-free trigger: bumping it forces this render to
  // re-read localStorage via loadAnnouncements() below (mirrors the vanilla
  // script's explicit this.render() calls after each CRUD mutation).
  void version;
  const allAnnouncements = loadAnnouncements(sp);

  const searchLower = search.trim().toLowerCase();
  const selectedAudience = AUDIENCE_KEYS.filter((k) => audienceFilter[k]);

  let rows = allAnnouncements.filter((ann) => {
    if (searchLower && !ann.title.toLowerCase().includes(searchLower)) return false;
    if (filterOrigin === 'dhl' && ann.isMine) return false;
    if (filterOrigin === 'mine' && !ann.isMine) return false;
    if (filterType !== 'all' && ann.type !== filterType) return false;
    if (filterStatus !== 'all' && getStatus(ann) !== filterStatus) return false;
    if (filterUrgency !== 'all' && ann.urgency !== filterUrgency) return false;
    if (selectedAudience.length > 0 && !ann.audience.some((a) => selectedAudience.includes(a as AudienceKey))) return false;
    return true;
  });

  rows = rows.slice().sort((a, b) => {
    const diff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (diff !== 0) return diff;
    return b.publishDate.getTime() - a.publishDate.getTime();
  });

  function handleClearFilters() {
    setSearch('');
    setFilterOrigin('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterUrgency('all');
    setAudienceFilter({ Depot: true, Loop: true, Route: true });
  }

  function openModal(id: string | null) {
    if (id) {
      const ann = allAnnouncements.find((a) => a.id === id);
      if (!ann || !ann.isMine) return;
      setModalTitle('Edit Announcement');
      setEditId(id);
      setFormTitle(ann.title);
      setFormContent(ann.content);
      setFormType(ann.type);
      setFormUrgency(ann.urgency);
      setFormAudience({
        Depot: ann.audience.includes('Depot'),
        Loop: ann.audience.includes('Loop'),
        Route: ann.audience.includes('Route'),
      });
      setFormPublishDate(toDateStr(ann.publishDate));
      setFormExpirationDate(toDateStr(ann.expirationDate));
    } else {
      setModalTitle('New Announcement');
      setEditId(null);
      setFormTitle('');
      setFormContent('');
      setFormType('Announcement');
      setFormUrgency('Normal');
      setFormAudience({ Depot: true, Loop: true, Route: true });
      const now = new Date();
      const later = new Date(now.getTime() + 7 * 86400000);
      setFormPublishDate(toDateStr(now));
      setFormExpirationDate(toDateStr(later));
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    const ann = allAnnouncements.find((a) => a.id === id);
    if (!ann || !ann.isMine) return;
    if (window.confirm('Delete this announcement? This cannot be undone.')) {
      deleteAviso(id);
      setVersion((v) => v + 1);
      showToast('Announcement deleted.', 'success');
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!formEl.reportValidity()) return;

    const selected = AUDIENCE_KEYS.filter((k) => formAudience[k]);
    if (selected.length === 0) {
      showToast('Select at least one audience.', 'error');
      return;
    }

    const pub = new Date(`${formPublishDate}T00:00:00`);
    const exp = new Date(`${formExpirationDate}T00:00:00`);
    if (exp <= pub) {
      showToast('Expiration date must be after the publish date.', 'error');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      message: formContent.trim(),
      type: formType,
      urgency: formUrgency,
      audience: selected,
      publishDate: formPublishDate,
      expireDate: formExpirationDate,
    };

    if (editId) {
      updateAviso(editId, payload);
      showToast('Announcement updated.', 'success');
    } else {
      addAviso({ ...payload, source: 'SP', spName: sp });
      showToast('Announcement created.', 'success');
    }

    setVersion((v) => v + 1);
    closeModal();
  }

  return (
    <PortalLayout pageClassName="announcements-page" mainClassName="va-container container-fluid px-3 px-lg-4 py-4" title="Announcements">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading announcements…</p>
      </div>

      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-megaphone-fill" />
            <span>Messages from DHL plus your own announcements to depots, loops and routes.</span>
          </p>
        </div>
      </div>

      <section className="va-card">
        <div className="va-card-head">
          <div>
            <div className="va-card-title">All Announcements</div>
            <div className="va-card-subtitle">DHL broadcasts are read-only here; you can create, edit and remove your own.</div>
          </div>
          <div className="va-card-head-actions">
            <button type="button" className="styled-button styled-button--primary" id="btnNewAnnouncement" onClick={() => openModal(null)}>
              <i className="bi bi-plus-lg" /> New Announcement
            </button>
          </div>
        </div>

        <div className="ann-filters" id="annFilters">
          <div className="ann-filter-group ann-filter-group--grow">
            <label htmlFor="searchInput">Search</label>
            <input
              type="text"
              className="form-control"
              id="searchInput"
              placeholder="Search by title…"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ann-filter-group">
            <label htmlFor="filterOrigin">Origin</label>
            <select
              className="form-select filter-select"
              id="filterOrigin"
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value as 'all' | 'dhl' | 'mine')}
            >
              <option value="all">All</option>
              <option value="dhl">From DHL</option>
              <option value="mine">Mine</option>
            </select>
          </div>
          <div className="ann-filter-group">
            <label htmlFor="filterType">Type</label>
            <select
              className="form-select filter-select"
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | AnnouncementType)}
            >
              <option value="all">All</option>
              <option value="Announcement">Announcement</option>
              <option value="Delay">Delay</option>
              <option value="Warning">Warning</option>
            </select>
          </div>
          <div className="ann-filter-group">
            <label htmlFor="filterStatus">Status</label>
            <select
              className="form-select filter-select"
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | Status)}
            >
              <option value="all">All</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div className="ann-filter-group">
            <label htmlFor="filterUrgency">Urgency</label>
            <select
              className="form-select filter-select"
              id="filterUrgency"
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value as 'all' | Urgency)}
            >
              <option value="all">All</option>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div className="ann-filter-group">
            <label>Audience</label>
            <div className="ann-checkbox-group">
              {AUDIENCE_KEYS.map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    className="filter-audience"
                    value={key}
                    checked={audienceFilter[key]}
                    onChange={(e) => setAudienceFilter((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />{' '}
                  {key}
                </label>
              ))}
            </div>
          </div>
          <div className="ann-filter-actions">
            <button type="button" className="styled-button styled-button--outline styled-button--sm" id="clearFilters" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div id="annEmptyState" className="va-empty-state">
            <p className="va-empty-text">No announcements match your search.</p>
          </div>
        ) : (
          <div className="va-table-scroll" id="annTableWrap">
            <table className="va-table">
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Urgency</th>
                  <th>Audience</th>
                  <th>Publish</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody id="annTableBody">
                {rows.map((ann) => {
                  const status = getStatus(ann);
                  return (
                    <tr key={ann.id}>
                      <td>
                        {ann.isMine ? (
                          <span className="ann-origin-badge ann-origin-badge--mine">
                            <i className="bi bi-person-fill" /> You
                          </span>
                        ) : (
                          <span className="ann-origin-badge ann-origin-badge--dhl">
                            <i className="bi bi-building" /> DHL
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{ann.title}</strong>
                      </td>
                      <td>
                        <span className={`ann-badge ann-badge-type-${ann.type.toLowerCase()}`}>
                          {TYPE_ICONS[ann.type]} {ann.type}
                        </span>
                      </td>
                      <td>
                        <span className={`ann-badge ann-badge-urgency-${ann.urgency.toLowerCase()}`}>
                          {URGENCY_ICONS[ann.urgency]} {ann.urgency}
                        </span>
                      </td>
                      <td>
                        {ann.audience.map((a) => (
                          <span className="ann-audience-tag" key={a}>
                            {a}
                          </span>
                        ))}
                      </td>
                      <td>{formatDate(ann.publishDate)}</td>
                      <td>{formatDate(ann.expirationDate)}</td>
                      <td>
                        <span className={`va-status-badge ${status.toLowerCase()}`}>{status}</span>
                      </td>
                      <td className="text-center">
                        {ann.isMine ? (
                          <div className="va-actions-cell">
                            <button
                              type="button"
                              className="styled-button styled-button--outline styled-button--sm"
                              title="Edit"
                              onClick={() => openModal(ann.id)}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="styled-button styled-button--danger styled-button--sm"
                              title="Delete"
                              onClick={() => handleDelete(ann.id)}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        ) : (
                          <span className="va-cell-empty">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="va-modal-backdrop sp-modal-backdrop-anim"
          id="annModalBackdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="va-modal sp-modal-anim" role="dialog" aria-modal="true" aria-labelledby="annModalTitle">
            <div className="va-modal-header">
              <h2 className="va-modal-title" id="annModalTitle">
                {modalTitle}
              </h2>
              <button type="button" className="va-modal-close" id="annModalClose" aria-label="Close" onClick={closeModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="va-modal-body">
              <form id="annForm" noValidate onSubmit={handleSubmit}>
                <div className="ann-form-grid">
                  <div className="va-form-field ann-form-field--full">
                    <label className="va-form-label" htmlFor="annFormTitle">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="annFormTitle"
                      placeholder="E.g. Team meeting Friday"
                      required
                      maxLength={120}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                  </div>
                  <div className="va-form-field ann-form-field--full">
                    <label className="va-form-label" htmlFor="annFormContent">
                      Content *
                    </label>
                    <textarea
                      id="annFormContent"
                      rows={4}
                      placeholder="Announcement details…"
                      required
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                    />
                  </div>
                  <div className="va-form-field">
                    <label className="va-form-label" htmlFor="annFormType">
                      Type *
                    </label>
                    <select id="annFormType" required value={formType} onChange={(e) => setFormType(e.target.value as AnnouncementType)}>
                      <option value="Announcement">Announcement</option>
                      <option value="Delay">Delay</option>
                      <option value="Warning">Warning</option>
                    </select>
                  </div>
                  <div className="va-form-field">
                    <label className="va-form-label" htmlFor="annFormUrgency">
                      Urgency *
                    </label>
                    <select id="annFormUrgency" required value={formUrgency} onChange={(e) => setFormUrgency(e.target.value as Urgency)}>
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="va-form-field ann-form-field--full">
                    <label className="va-form-label">Audience * (select one or more)</label>
                    <div className="ann-checkbox-inline">
                      {AUDIENCE_KEYS.map((key) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            className="form-audience"
                            value={key}
                            checked={formAudience[key]}
                            onChange={(e) => setFormAudience((prev) => ({ ...prev, [key]: e.target.checked }))}
                          />{' '}
                          {key}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="va-form-field">
                    <label className="va-form-label" htmlFor="annFormPublishDate">
                      Publish Date *
                    </label>
                    <input
                      type="date"
                      id="annFormPublishDate"
                      required
                      value={formPublishDate}
                      onChange={(e) => setFormPublishDate(e.target.value)}
                    />
                  </div>
                  <div className="va-form-field">
                    <label className="va-form-label" htmlFor="annFormExpirationDate">
                      Expiration Date *
                    </label>
                    <input
                      type="date"
                      id="annFormExpirationDate"
                      required
                      value={formExpirationDate}
                      onChange={(e) => setFormExpirationDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="va-form-actions">
                  <button type="button" className="styled-button styled-button--outline" id="annModalCancel" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="styled-button styled-button--primary" id="annModalSave">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => (
          <div key={t.id} className={`app-toast ${t.type}${t.hiding ? ' hiding' : ''}`}>
            <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
