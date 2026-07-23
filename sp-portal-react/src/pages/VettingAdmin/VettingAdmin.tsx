import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/vetting-admin.css';

/* ============================ Checklist template (ported from script.js's CHECKLIST_TEMPLATE) ============================ */
interface ChecklistItemTemplate {
  sectionHeader?: string;
  title: string;
  required?: boolean;
  conditional?: boolean;
  conditionNote?: string;
  detail?: string;
}
interface ChecklistStepTemplate {
  title: string;
  subtitle: string;
  sla: string;
  items: ChecklistItemTemplate[];
}

const CHECKLIST_TEMPLATE: ChecklistStepTemplate[] = [
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
      { title: 'Driver registration completed', required: true, detail: 'Create or confirm the driver record before starting vetting.' },
    ],
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
      { title: 'Approval e-mail', required: true, detail: 'Copy and send the approval e-mail after the final decision is approved.' },
    ],
  },
  {
    title: 'Suitability Assessment',
    subtitle: 'Criminal declaration, declaration of suitability and observations.',
    sla: 'Same day as interview',
    items: [
      { title: 'Criminal record declaration recorded', required: true },
      { title: 'Declaration of Suitability signed', required: true },
      { title: 'Observations recorded', required: true },
    ],
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
      { title: 'Driver application completed', required: true },
    ],
  },
];

const CHECKLIST_TOTAL_ITEMS = CHECKLIST_TEMPLATE.reduce((total, step) => total + step.items.length, 0);
const VETTING_OFFICERS = ['Sarah Thompson', 'Michael Chen', 'Emma Rodriguez', 'James Wilson', 'Priya Patel'];
const STAGES = ['Application', 'Pre-screen', 'Interview', 'Documents', 'Active', 'Rejected'];

interface ChecklistItem extends ChecklistItemTemplate {
  complete: boolean;
}
interface ChecklistStep {
  title: string;
  subtitle: string;
  sla: string;
  items: ChecklistItem[];
}
interface CandidateNote {
  text: string;
  author: string;
  timestamp: string;
}
interface HistoryEntry {
  action: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  author: string;
  timestamp: string;
}
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  vendor: string;
  stage: string;
  submittedAt: string;
  daysInStage: number;
  slaBreached: boolean;
  checklist: ChecklistStep[];
  notes: CandidateNote[];
  history: HistoryEntry[];
  assignedOfficer: string;
  tags: string[];
}

function buildChecklist(stage: string): ChecklistStep[] {
  const ratios: Record<string, number> = { Application: 0.15, 'Pre-screen': 0.35, Interview: 0.6, Documents: 0.85, Active: 1, Rejected: 0.45 };
  const progressRatio = ratios[stage] || 0.3;
  return CHECKLIST_TEMPLATE.map((step) => ({
    title: step.title,
    subtitle: step.subtitle,
    sla: step.sla,
    items: step.items.map((item) => ({ ...item, complete: Math.random() < progressRatio })),
  }));
}

/** Port of script.js's generateMockData(). Runs once (lazy useState initializer). */
function generateMockData(): Candidate[] {
  const names = [
    'Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
    'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa',
  ];
  const vendors = ['FedEx', 'UPS', 'DPD', 'TNT'];

  return names.map((name, i) => {
    const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
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
      checklist: buildChecklist(stage),
      notes: [{ text: 'Initial review completed', author: 'Sarah Thompson', timestamp: new Date(submittedAt.getTime() + 86400000).toISOString() }],
      history: [{ action: 'Created', field: 'stage', oldValue: null, newValue: 'Application', author: 'System', timestamp: submittedAt.toISOString() }],
      assignedOfficer: VETTING_OFFICERS[Math.floor(Math.random() * VETTING_OFFICERS.length)],
      tags: [`priority${i % 3 === 0 ? '-high' : i % 3 === 1 ? '-medium' : '-low'}`],
    };
  });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type ModalKind = 'checklist' | 'edit' | 'notes' | 'timeline' | null;

export function VettingAdmin() {
  const [candidates, setCandidates] = useState<Candidate[]>(() => generateMockData());
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Staged edits — the original only commits checklist/edit-form changes to
  // the underlying candidate on "Save"; closing without saving discards them
  // (showChecklist()/openEditModal() always rebuild the modal from the live
  // candidate record on each open).
  const [checklistDraft, setChecklistDraft] = useState<ChecklistStep[]>([]);
  const [editDraft, setEditDraft] = useState({ name: '', email: '', phone: '', vendor: '', stage: '', officer: '' });
  const [newNoteText, setNewNoteText] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const current = candidates.find((c) => c.id === currentId) || null;

  // Escape-to-close + scroll lock — all four modal kinds share the same
  // close handler, so one hook call covers them.
  useModalBehavior(closeModal, modalKind !== null);

  const filtered = candidates.filter((c) => {
    if (stageFilter !== 'All' && c.stage !== stageFilter) return false;
    const q = searchQuery.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
    return true;
  });

  const stats = {
    total: candidates.length,
    inProgress: candidates.filter((c) => c.stage !== 'Active' && c.stage !== 'Rejected').length,
    approved: candidates.filter((c) => c.stage === 'Active').length,
    rejected: candidates.filter((c) => c.stage === 'Rejected').length,
  };

  function toggleCandidate(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function closeModal() {
    setModalKind(null);
    setCurrentId(null);
  }

  function openEditModal(c: Candidate) {
    setCurrentId(c.id);
    setEditDraft({ name: c.name, email: c.email, phone: c.phone, vendor: c.vendor, stage: c.stage, officer: c.assignedOfficer });
    setModalKind('edit');
  }

  function saveEdit() {
    if (!current) return;
    const oldStage = current.stage;
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== current.id) return c;
        const updated = { ...c, name: editDraft.name, email: editDraft.email, phone: editDraft.phone, vendor: editDraft.vendor, stage: editDraft.stage, assignedOfficer: editDraft.officer };
        if (oldStage !== editDraft.stage) {
          updated.history = [
            ...c.history,
            { action: 'Updated', field: 'stage', oldValue: oldStage, newValue: editDraft.stage, author: 'Current User', timestamp: new Date().toISOString() },
          ];
        }
        return updated;
      }),
    );
    closeModal();
  }

  function openNotesModal(c: Candidate) {
    setCurrentId(c.id);
    setNewNoteText('');
    setModalKind('notes');
  }

  function addNote() {
    if (!current) return;
    const text = newNoteText.trim();
    if (!text) return;
    setCandidates((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, notes: [...c.notes, { text, author: 'Current User', timestamp: new Date().toISOString() }] } : c)),
    );
    setNewNoteText('');
  }

  function openTimelineModal(c: Candidate) {
    setCurrentId(c.id);
    setModalKind('timeline');
  }

  function showChecklist(c: Candidate) {
    setCurrentId(c.id);
    setChecklistDraft(c.checklist);
    setModalKind('checklist');
  }

  function toggleChecklistItem(stepIdx: number, itemIdx: number, checked: boolean) {
    setChecklistDraft((prev) => {
      const next = prev.map((step) => ({ ...step, items: [...step.items] }));
      next[stepIdx].items[itemIdx] = { ...next[stepIdx].items[itemIdx], complete: checked };
      return next;
    });
  }

  function saveChecklist() {
    if (!current) return;
    setCandidates((prev) => prev.map((c) => (c.id === current.id ? { ...c, checklist: checklistDraft } : c)));
    closeModal();
  }

  function exportCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Vendor', 'Stage', 'Days in Stage', 'Assigned Officer', 'Submitted At'];
    const rows = filtered.map((c) => [c.name, c.email, c.phone, c.vendor, c.stage, c.daysInStage, c.assignedOfficer, formatDate(c.submittedAt)]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vetting-candidates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function bulkApprove() {
    if (selected.size === 0) return;
    setCandidates((prev) =>
      prev.map((c) => {
        if (!selected.has(c.id)) return c;
        const oldStage = c.stage;
        return { ...c, stage: 'Active', history: [...c.history, { action: 'Bulk Updated', field: 'stage', oldValue: oldStage, newValue: 'Active', author: 'Current User', timestamp: new Date().toISOString() }] };
      }),
    );
    clearSelection();
  }

  function bulkReject() {
    if (selected.size === 0) return;
    setCandidates((prev) =>
      prev.map((c) => {
        if (!selected.has(c.id)) return c;
        const oldStage = c.stage;
        return { ...c, stage: 'Rejected', history: [...c.history, { action: 'Bulk Updated', field: 'stage', oldValue: oldStage, newValue: 'Rejected', author: 'Current User', timestamp: new Date().toISOString() }] };
      }),
    );
    clearSelection();
  }

  return (
    <PortalLayout pageClassName="vetting-admin-page" mainClassName="vetting-container container-fluid px-3 px-lg-4 py-4" title="Driver Vetting">
      {/* Loading overlay — position:fixed, portaled past the
          liquid-glass-page-bg's backdrop-filter containing block. */}
      {createPortal(
        <div className={`loading-overlay${loading ? ' active' : ' hidden'}`}>
          <div className="spinner" />
          <p>Loading vetting data…</p>
        </div>,
        document.body,
      )}

      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-check-circle" />
            <span>Manage driver applications and vetting status.</span>
          </p>
        </div>
      </div>

      <section className="stats-grid">
        <button type="button" className={`stat-card${stageFilter === 'All' ? ' stat-card-active' : ''}`} onClick={() => setStageFilter('All')}>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-label">All candidates</p>
        </button>
        <button type="button" className="stat-card">
          <p className="stat-value stat-amber">{stats.inProgress}</p>
          <p className="stat-label">In progress</p>
        </button>
        <button type="button" className={`stat-card${stageFilter === 'Active' ? ' stat-card-active' : ''}`} onClick={() => setStageFilter('Active')}>
          <p className="stat-value stat-success">{stats.approved}</p>
          <p className="stat-label">Approved</p>
        </button>
        <button type="button" className={`stat-card${stageFilter === 'Rejected' ? ' stat-card-active' : ''}`} onClick={() => setStageFilter('Rejected')}>
          <p className="stat-value stat-danger">{stats.rejected}</p>
          <p className="stat-label">Rejected</p>
        </button>
      </section>

      <div className="filters-section">
        <div className="filter-buttons-wrap">
          {['All', 'Application', 'Pre-screen', 'Interview', 'Documents', 'Active', 'Rejected'].map((stage) => (
            <button
              key={stage}
              type="button"
              className={`filter-btn${stageFilter === stage ? ' filter-btn-active' : ''}`}
              onClick={() => setStageFilter(stage)}
            >
              {stage}
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <i className="bi bi-search" />
          <input
            type="text"
            id="searchInput"
            className="search-input"
            placeholder="Search name, email, phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="button" className="styled-button styled-button--primary" id="btnExport" style={{ marginLeft: 'auto' }} onClick={exportCSV}>
          <i className="bi bi-download" /> Export
        </button>
      </div>

      {/* Bulk actions panel — original toggles this via inline style.display
          rather than mount/unmount, kept identical here. */}
      <div className="bulk-panel" id="bulkPanel" style={{ display: selected.size > 0 ? 'block' : 'none' }}>
        <div className="bulk-info">
          <span>{selected.size}</span> candidate(s) selected
        </div>
        <div className="bulk-actions">
          <button type="button" className="styled-button styled-button--success" onClick={bulkApprove}>
            ✓ Approve
          </button>
          <button type="button" className="styled-button styled-button--danger" onClick={bulkReject}>
            ✕ Reject
          </button>
          <button type="button" className="styled-button styled-button--outline" onClick={clearSelection}>
            Clear
          </button>
        </div>
      </div>

      <div className="table-shell">
        <table className="candidates-table">
          <thead>
            <tr>
              {/* Decorative in the original too: script.js never wires up a
                  change listener for #selectAll, so it's left inert here. */}
              <th style={{ width: 40 }}>
                <input type="checkbox" id="selectAll" />
              </th>
              <th>Candidate</th>
              <th className="th-hidden">Phone</th>
              <th>Stage</th>
              <th className="th-hidden">Submitted</th>
              <th>SLA</th>
              <th className="th-hidden">Officer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="candidatesBody">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No candidates found
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" className="candidate-checkbox" checked={selected.has(c.id)} onChange={() => toggleCandidate(c.id)} />
                  </td>
                  <td>
                    <div className="candidate-cell">
                      <div className="candidate-initials">{initials(c.name)}</div>
                      <div className="candidate-info">
                        <p className="candidate-name">{c.name}</p>
                        <p className="candidate-email">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="th-hidden">{c.phone}</td>
                  <td>
                    <span className={`stage-badge badge-${c.stage.toLowerCase().replace(/\s+/g, '-')}`}>{c.stage}</span>
                  </td>
                  <td className="th-hidden">{formatDate(c.submittedAt)}</td>
                  <td>
                    {c.stage === 'Active' || c.stage === 'Rejected' ? (
                      <span className="sla-ok">—</span>
                    ) : c.slaBreached ? (
                      <span className="sla-breached">
                        <span className="sla-dot-danger" />
                        {c.daysInStage}d
                      </span>
                    ) : (
                      <span className="sla-normal">
                        <span className="sla-dot-ok" />
                        {c.daysInStage}d
                      </span>
                    )}
                  </td>
                  <td className="th-hidden">
                    <span className="officer-badge">{c.assignedOfficer}</span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn-action btn-edit" title="Edit" onClick={() => openEditModal(c)}>
                        ✎
                      </button>
                      <button type="button" className="btn-action btn-notes" title="Notes" onClick={() => openNotesModal(c)}>
                        💬
                      </button>
                      <button type="button" className="btn-action btn-timeline" title="Timeline" onClick={() => openTimelineModal(c)}>
                        ⏱
                      </button>
                      <button type="button" className="btn-checklist" onClick={() => showChecklist(c)}>
                        Checklist
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============ CHECKLIST MODAL ============ */}
      {modalKind === 'checklist' &&
        current &&
        createPortal(
          <>
            <div className="modal fade show sp-modal-anim" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="checklistModalTitle">
              <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title" id="checklistModalTitle">Vetting Checklist</h5>
                      <p className="modal-subtitle">
                        {current.name} — {current.email} · {checklistDraft.reduce((n, step) => n + step.items.filter((it) => it.complete).length, 0)}/{CHECKLIST_TOTAL_ITEMS} complete
                      </p>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                  </div>
                  <div className="modal-body">
                    {checklistDraft.map((step, s) => {
                      const stepDone = step.items.filter((it) => it.complete).length;
                      return (
                        <div className="checklist-step" key={step.title}>
                          <div className="checklist-step-header">
                            <div>
                              <p className="checklist-step-title">{step.title}</p>
                              <p className="checklist-step-subtitle">{step.subtitle}</p>
                            </div>
                            <div className="checklist-step-meta">
                              {step.sla && <span className="checklist-sla-badge">SLA: {step.sla}</span>}
                              <span className="checklist-step-progress">
                                {stepDone}/{step.items.length}
                              </span>
                            </div>
                          </div>
                          <div className="checklist-items">
                            {step.items.map((item, i) => (
                              <div key={i}>
                                {item.sectionHeader && <p className="checklist-section-header">{item.sectionHeader}</p>}
                                <label className="checklist-item">
                                  <input type="checkbox" checked={item.complete} onChange={(e) => toggleChecklistItem(s, i, e.target.checked)} />
                                  <div className="checklist-label">
                                    <p className="checklist-title">
                                      {item.title}
                                      {item.required && <span className="checklist-badge checklist-badge-required">Required</span>}
                                      {item.conditional && <span className="checklist-badge checklist-badge-conditional">Conditional</span>}
                                    </p>
                                    {item.detail && <p className="checklist-desc">{item.detail}</p>}
                                    {item.conditional && item.conditionNote && <p className="checklist-condition-note">{item.conditionNote}</p>}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="styled-button styled-button--outline" onClick={closeModal}>
                      Close
                    </button>
                    <button type="button" className="styled-button styled-button--primary" onClick={saveChecklist}>
                      Save Progress
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={closeModal} />
          </>,
          document.body,
        )}

      {/* ============ EDIT MODAL ============ */}
      {modalKind === 'edit' &&
        current &&
        createPortal(
          <>
            <div className="modal fade show sp-modal-anim" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="editCandidateModalTitle">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="editCandidateModalTitle">Edit Candidate</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input type="text" className="form-control" value={editDraft.name} onChange={(e) => setEditDraft((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={editDraft.email} onChange={(e) => setEditDraft((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Phone</label>
                      <input type="tel" className="form-control" value={editDraft.phone} onChange={(e) => setEditDraft((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Vendor</label>
                      <input type="text" className="form-control" value={editDraft.vendor} onChange={(e) => setEditDraft((f) => ({ ...f, vendor: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Stage</label>
                      <select className="form-select" value={editDraft.stage} onChange={(e) => setEditDraft((f) => ({ ...f, stage: e.target.value }))}>
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Assigned Officer</label>
                      <select className="form-select" value={editDraft.officer} onChange={(e) => setEditDraft((f) => ({ ...f, officer: e.target.value }))}>
                        {VETTING_OFFICERS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="styled-button styled-button--outline" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="button" className="styled-button styled-button--primary" onClick={saveEdit}>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={closeModal} />
          </>,
          document.body,
        )}

      {/* ============ NOTES MODAL ============ */}
      {modalKind === 'notes' &&
        current &&
        createPortal(
          <>
            <div className="modal fade show sp-modal-anim" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="notesModalTitle">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="notesModalTitle">Notes & Comments</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                  </div>
                  <div className="modal-body">
                    <div className="notes-list" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: '1rem' }}>
                      {current.notes.map((note, i) => (
                        <div className="note-item" key={i}>
                          <p className="note-text">{note.text}</p>
                          <p className="note-meta">
                            {note.author} • {formatDatetime(note.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="input-group">
                      <textarea
                        className="form-control"
                        placeholder="Add a note..."
                        rows={3}
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) addNote();
                        }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="styled-button styled-button--outline" onClick={closeModal}>
                      Close
                    </button>
                    <button type="button" className="styled-button styled-button--primary" onClick={addNote}>
                      Add Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={closeModal} />
          </>,
          document.body,
        )}

      {/* ============ TIMELINE MODAL ============ */}
      {modalKind === 'timeline' &&
        current &&
        createPortal(
          <>
            <div className="modal fade show sp-modal-anim" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="timelineModalTitle">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="timelineModalTitle">Activity Timeline</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                  </div>
                  <div className="modal-body">
                    <div className="timeline">
                      {current.history.map((entry, i) => (
                        <div className="timeline-item" key={i}>
                          <div className="timeline-dot" />
                          <div className="timeline-content">
                            <p className="timeline-action">
                              <strong>{entry.action}</strong> {entry.field}
                            </p>
                            <p className="timeline-detail">
                              {entry.oldValue || '—'} → {entry.newValue || '—'}
                            </p>
                            <p className="timeline-meta">
                              {entry.author} • {formatDatetime(entry.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="styled-button styled-button--outline" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={closeModal} />
          </>,
          document.body,
        )}
    </PortalLayout>
  );
}
