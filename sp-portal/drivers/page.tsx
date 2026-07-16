'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { BeamSidebar } from '../components/BeamSidebar';
import { useBodyClass } from '../components/useBodyClass';
import { useMotionRefinements } from '../components/useMotionRefinements';
import { getCurrentSp, MOCK_VENDORS, MOCK_CONTRACTS, type MockVendor } from '../components/mockData';
import '../styles/vendor-admin-view.css';
import '../styles/sp-portal-shared.css';
import '../styles/liquid-glass.css';
import '../styles/modern-ui.css';
import '../styles/refinements-v2.css';
import '../styles/refinements-v3-motion.css';
import './drivers.css';

interface Vendor extends MockVendor {
  courierId?: string;
}

type SortKey = 'name' | 'vendorType' | 'route' | 'status' | 'startDate';
type StatusFilter = 'all' | 'active' | 'inactive' | 'expiring' | 'pending';

const STEPS = ['personal', 'employment', 'training', 'compliance'] as const;
type Step = (typeof STEPS)[number];
const SORT_DAYS_EXPIRING = 30;

function computeCourierId(firstName: string, lastName: string) {
  const first = (firstName || '').replace(/\s/g, '').toUpperCase().slice(0, 7);
  const need = 8 - first.length;
  const lastRaw = (lastName || '').trim();
  const initials = lastRaw.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase();
  const rest = lastRaw.replace(/\s/g, '').toUpperCase();
  const part2 = (initials + rest).slice(0, need);
  return (first + part2).slice(0, 8);
}

function formatDateOnly(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}
function parseYMD(s?: string | null) {
  if (!s) return null;
  const parts = String(s).split('-');
  if (parts.length < 3) return null;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}
function isExpired(expiryDate: Date | null) {
  if (!expiryDate) return false;
  return expiryDate.getTime() < Date.now();
}
function isExpiringSoon(expiryDate: Date | null, days = SORT_DAYS_EXPIRING) {
  if (!expiryDate) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return expiryDate.getTime() <= limit.getTime() && expiryDate.getTime() >= Date.now();
}
function getTrainingExpiryDate(v: Vendor) {
  const dates = [parseYMD(v.cargoTrainingDate), parseYMD(v.dangerousGoodsTrainingDate), parseYMD(v.manualHandlingTrainingDate)].filter(Boolean) as Date[];
  if (dates.length === 0) return null;
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  latest.setFullYear(latest.getFullYear() + 2);
  return latest;
}
function getTrainingStatus(v: Vendor) {
  const expiry = getTrainingExpiryDate(v);
  if (!expiry) return { label: 'Incomplete', cls: 'status-badge-incomplete' };
  if (isExpired(expiry)) return { label: 'Expired', cls: 'status-badge-expiring' };
  if (isExpiringSoon(expiry)) return { label: 'Expiring Soon', cls: 'status-badge-warning' };
  return { label: 'Complete', cls: 'status-badge-active' };
}
function getSingleTrainingStatus(trainingDate?: string | null): 'pending' | 'expiring' | 'warning' | 'active' {
  if (!trainingDate) return 'pending';
  const d = parseYMD(trainingDate);
  if (!d) return 'pending';
  const expiry = new Date(d);
  expiry.setFullYear(expiry.getFullYear() + 2);
  if (isExpired(expiry)) return 'expiring';
  if (isExpiringSoon(expiry)) return 'warning';
  return 'active';
}
function getDocumentItemStatus(key: 'criminalRecord' | 'dvlaCheck' | 'visa' | 'licence' | 'passport', v: Vendor): string | null {
  if (key === 'criminalRecord' || key === 'dvlaCheck') {
    const date = key === 'criminalRecord' ? v.criminalRecordDate : v.dvlaCheckDate;
    return date ? 'verified' : 'pending';
  }
  const dateStr = key === 'visa' ? v.visaValidity : key === 'licence' ? v.licenceExpiringDate : v.passportExpiringDate;
  if (!dateStr) return null;
  const d = parseYMD(dateStr) || new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  if (isExpired(d)) return 'expiring';
  if (isExpiringSoon(d)) return 'warning';
  return 'active';
}
function getDocumentsStatus(v: Vendor) {
  if (!v.criminalRecordDate || !v.dvlaCheckDate) return { label: 'Pending', cls: 'status-badge-pending' };
  const items: Date[] = [];
  if (v.dvlaCheckDate) {
    const dvlaExp = new Date(v.dvlaCheckDate);
    dvlaExp.setMonth(dvlaExp.getMonth() + 6);
    items.push(dvlaExp);
  }
  if (v.licenceExpiringDate) items.push(new Date(v.licenceExpiringDate));
  if (v.passportExpiringDate) items.push(new Date(v.passportExpiringDate));
  if (v.visaValidity) items.push(new Date(v.visaValidity));
  if (items.length === 0) return { label: 'Verified', cls: 'status-badge-active' };
  const minExp = new Date(Math.min(...items.map((d) => d.getTime())));
  if (isExpired(minExp)) return { label: 'Expired', cls: 'status-badge-expiring' };
  if (isExpiringSoon(minExp)) return { label: 'Expiring Soon', cls: 'status-badge-warning' };
  return { label: 'Verified', cls: 'status-badge-active' };
}
function isVendorExpiring(v: Vendor) {
  const t = getTrainingStatus(v);
  const d = getDocumentsStatus(v);
  return t.label === 'Expiring Soon' || t.label === 'Expired' || d.label === 'Expiring Soon' || d.label === 'Expired';
}
function isVendorPending(v: Vendor) {
  return !v.criminalRecordDate || !v.dvlaCheckDate;
}
function vendorTypeLabel(v: Vendor) {
  return v.vendorType === '2' ? 'Subcontractor' : 'Driver';
}
function statusBadgeClass(v: Vendor) {
  if (v.status === 'Active') return 'status-badge-active';
  if (v.status === 'Inactive') return 'status-badge-inactive';
  if (v.status === 'Pending') return 'status-badge-pending';
  return 'status-badge-default';
}

const EMPTY_FORM: Vendor = {
  id: 0, firstName: '', lastName: '', email: '', phone: '', dob: '', depot: '', route: null, serviceProvider: '', vendorType: '1', paymentModel: '1',
  startDate: '', finishDate: null, status: 'Active', cargoTraining: false, dangerousGoodsTraining: false, manualHandlingTraining: false,
  cargoTrainingDate: '', dangerousGoodsTrainingDate: '', manualHandlingTrainingDate: '', dhlTrainingNumber: '', criminalRecordDate: '',
  dbsNumber: '', dvlaCheckDate: '', visaValidity: null, licenceExpiringDate: '', passportExpiringDate: '',
};

export default function DriversPage() {
  useBodyClass('has-beam-sidebar sp-portal');
  useMotionRefinements();

  const searchParams = useSearchParams();
  const [spName, setSpName] = useState('');
  const [localVendors, setLocalVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('New vendor');
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [form, setForm] = useState<Vendor>(EMPTY_FORM);

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [infoModal, setInfoModal] = useState<{ vendorId: number; type: 'training' | 'documents' } | null>(null);
  const [detailVendorId, setDetailVendorId] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    setSpName(getCurrentSp(searchParams));
  }, [searchParams]);

  const depots = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    MOCK_CONTRACTS.forEach((c) => {
      if (c.serviceProvider !== spName) return;
      c.depots.forEach((d) => {
        if (d.name && !seen.has(d.name)) {
          seen.add(d.name);
          out.push(d.name);
        }
      });
    });
    return out.sort();
  }, [spName]);

  const routes = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    MOCK_CONTRACTS.forEach((c) => {
      if (c.serviceProvider !== spName) return;
      c.depots.forEach((d) => d.loops.forEach((l) => l.routes.forEach((r) => {
        if (r.name && !seen.has(r.name)) {
          seen.add(r.name);
          out.push(r.name);
        }
      })));
    });
    return out.sort();
  }, [spName]);

  const allVendors = useMemo((): Vendor[] => {
    const mock = MOCK_VENDORS.filter((v) => v.serviceProvider === spName);
    const byId = new Map<number, Vendor>();
    mock.forEach((v) => byId.set(v.id, v));
    localVendors.forEach((v) => byId.set(v.id, v));
    return [...byId.values()];
  }, [spName, localVendors]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const today = new Date();
    let list = allVendors.filter((v) => {
      const name = `${v.firstName || ''} ${v.lastName || ''}`.toLowerCase();
      const email = (v.email || '').toLowerCase();
      if (q && !name.includes(q) && !email.includes(q)) return false;
      if (statusFilter === 'active') {
        if (v.status) { if (v.status !== 'Active') return false; }
        else if (v.finishDate && new Date(v.finishDate) <= today) return false;
      }
      if (statusFilter === 'inactive') {
        if (v.status) { if (v.status !== 'Inactive') return false; }
        else if (!v.finishDate || new Date(v.finishDate) > today) return false;
      }
      if (statusFilter === 'pending' && !isVendorPending(v)) return false;
      if (statusFilter === 'expiring' && (!isVendorExpiring(v) || (v.status && v.status !== 'Active'))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let va = '';
      let vb = '';
      switch (sortKey) {
        case 'name': va = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase(); vb = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase(); break;
        case 'vendorType': va = String(a.vendorType || ''); vb = String(b.vendorType || ''); break;
        case 'route': va = String(a.route || '').toLowerCase(); vb = String(b.route || '').toLowerCase(); break;
        case 'status': va = (a.status || '').toLowerCase(); vb = (b.status || '').toLowerCase(); break;
        case 'startDate': va = a.startDate || ''; vb = b.startDate || ''; break;
      }
      return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
    });
    return list;
  }, [allVendors, searchQuery, statusFilter, sortKey, sortDir]);

  const metrics = useMemo(() => {
    const list = filteredSorted;
    const today = new Date();
    const total = list.length;
    const active = list.filter((v) => (v.status ? v.status === 'Active' : !v.finishDate || new Date(v.finishDate) > today)).length;
    const inactive = list.filter((v) => (v.status ? v.status === 'Inactive' : !!v.finishDate && new Date(v.finishDate) <= today)).length;
    const pending = list.filter(isVendorPending).length;
    return { total, active, inactive, pending };
  }, [filteredSorted]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function openAddModal() {
    setEditingVendorId(null);
    setFormTitle('New vendor');
    setForm({ ...EMPTY_FORM, depot: depots[0] || '' });
    setCurrentStep('personal');
    setFormOpen(true);
  }

  function openEditModal(vendorId: number) {
    const v = allVendors.find((x) => x.id === vendorId);
    if (!v) return;
    setEditingVendorId(vendorId);
    setFormTitle('Edit vendor');
    setForm({ ...v });
    setCurrentStep('personal');
    setFormOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.depot || !form.startDate) return;
    const courierId = form.courierId || computeCourierId(form.firstName, form.lastName);

    if (editingVendorId !== null) {
      setLocalVendors((prev) => {
        const idx = prev.findIndex((x) => x.id === editingVendorId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...form, courierId, id: editingVendorId, serviceProvider: spName };
          return next;
        }
        const existing = allVendors.find((x) => x.id === editingVendorId);
        if (existing) return [...prev, { ...existing, ...form, courierId, id: existing.id, serviceProvider: spName }];
        return prev;
      });
    } else {
      const maxId = Math.max(0, ...MOCK_VENDORS.map((v) => v.id), ...localVendors.map((v) => v.id));
      setLocalVendors((prev) => [...prev, {
        ...form, courierId, id: maxId + 1, serviceProvider: spName, status: 'Active',
        cargoTraining: !!form.cargoTrainingDate, dangerousGoodsTraining: !!form.dangerousGoodsTrainingDate, manualHandlingTraining: !!form.manualHandlingTrainingDate,
      }]);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    if (deleteTargetId == null) return;
    setLocalVendors((prev) => prev.filter((v) => v.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  const deleteTarget = deleteTargetId != null ? allVendors.find((v) => v.id === deleteTargetId) : null;
  const detailVendor = detailVendorId != null ? allVendors.find((v) => v.id === detailVendorId) : null;
  const infoVendor = infoModal ? allVendors.find((v) => v.id === infoModal.vendorId) : null;

  useEffect(() => {
    if (!detailVendor) {
      setQrDataUrl('');
      return;
    }
    const courierId = detailVendor.courierId || computeCourierId(detailVendor.firstName || '', detailVendor.lastName || '');
    const qrText = `Courier ID: ${courierId}\nRoute: ${detailVendor.route || '—'}`;
    QRCode.toDataURL(qrText, { width: 180, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [detailVendor]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && detailVendorId != null) setDetailVendorId(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailVendorId]);

  function exportExcel() {
    const headers = ['Name', 'Email', 'Vendor Type', 'Route', 'Status', 'Start Date'];
    const rows = filteredSorted.map((v) =>
      [`${v.firstName || ''} ${v.lastName || ''}`, v.email || '', vendorTypeLabel(v), v.route || '', v.status || 'Active', v.startDate || '']
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), rows.join('\n')].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vendors-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportOpen(false);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'vendorType', label: 'Vendor Type' },
    { key: 'route', label: 'Route' },
    { key: 'status', label: 'Status' },
    { key: 'startDate', label: 'Start Date' },
  ];

  const spInitials = spName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const stepIdx = STEPS.indexOf(currentStep);

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className="sidebar-gap" id="sidebarGap" aria-hidden="true" />
      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <div className="liquid-glass-page-bg" aria-hidden="true" />
        <div className="page-container">
          <div className="page-inner">
            <main className="vendor-admin-main sp-vendor-main pt-4">
              {!spName && (
                <div className="alert alert-warning">
                  Service Provider not set. Open with <code>?sp=YourCompany</code>.
                </div>
              )}

              {spName && (
                <div id="spVendorContent">
                  <div className="vendor-page-header mb-4">
                    <div className="vendor-page-header-inner">
                      <div className="vendor-page-header-row">
                        <div className="vendor-page-header-title-block">
                          <h1 className="vendor-page-title">Vendors</h1>
                          <p className="vendor-page-subtitle">Vendor management and information</p>
                          <div className="vendor-page-metrics">
                            <div className="vendor-page-metric"><span className="vendor-page-metric-label">Total</span><span className="vendor-page-metric-value">{metrics.total}</span></div>
                            <div className="vendor-page-metric"><span className="vendor-page-metric-label">Active</span><span className="vendor-page-metric-value">{metrics.active}</span></div>
                            <div className="vendor-page-metric"><span className="vendor-page-metric-label">Inactive</span><span className="vendor-page-metric-value">{metrics.inactive}</span></div>
                            <div className="vendor-page-metric"><span className="vendor-page-metric-label">Pending</span><span className="vendor-page-metric-value">{metrics.pending}</span></div>
                          </div>
                        </div>
                        <div className="vendor-page-header-user">
                          <span className="admin-header-user-avatar admin-header-user-avatar-fallback">{spInitials}</span>
                          <span className="admin-header-user-name">{spName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="vendor-filters-bar mb-4">
                    <div className="vendor-filters-inner">
                      <div className="vendor-filters-search-wrap">
                        <input type="search" className="vendor-filters-search" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                      <div className="vendor-filters-status-wrap">
                        <strong className="vendor-filters-status-label">Status:</strong>
                        <div className="vendor-filters-status-group" role="group">
                          {(['all', 'active', 'inactive', 'expiring', 'pending'] as StatusFilter[]).map((s) => (
                            <button key={s} type="button" className={`vendor-filters-status-btn${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="vendor-filters-actions">
                        <button type="button" className="btn btn-primary vendor-filters-new" onClick={openAddModal}>New</button>
                        <div className="dropdown">
                          <button type="button" className="btn btn-outline-secondary vendor-filters-export" onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen}>Export</button>
                          <ul className={`dropdown-menu dropdown-menu-end${exportOpen ? ' show' : ''}`}>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setExportOpen(false); window.print(); }}>PDF</a></li>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); exportExcel(); }}>Excel</a></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="vendor-table-wrap">
                    <table className="vendor-table">
                      <thead>
                        <tr>
                          {columns.map((col, i) => (
                            <th key={col.key} className={`vendor-th vendor-th-sort${i === 0 ? ' vendor-th-left' : ''}${sortKey === col.key ? (sortDir === 1 ? ' asc' : ' desc') : ''}`} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer' }}>
                              {col.label}
                            </th>
                          ))}
                          <th className="vendor-th vendor-th-sort">Training</th>
                          <th className="vendor-th vendor-th-sort">Documents</th>
                          <th className="vendor-th vendor-th-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSorted.map((v) => {
                          const name = `${v.firstName || ''} ${v.lastName || ''}`;
                          const t = getTrainingStatus(v);
                          const d = getDocumentsStatus(v);
                          const isLocal = localVendors.some((lv) => lv.id === v.id);
                          const status = v.status || (!v.finishDate || new Date(v.finishDate) > new Date() ? 'Active' : 'Inactive');
                          return (
                            <tr key={v.id} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => setDetailVendorId(v.id)}>
                              <td className="vendor-td-name">
                                <span className="vendor-cell-name-strong">{name.trim() || '—'}</span>
                                <span className="vendor-cell-email">{v.email}</span>
                              </td>
                              <td>{vendorTypeLabel(v)}</td>
                              <td>{v.route || '—'}</td>
                              <td><span className={`status-badge ${statusBadgeClass(v)}`}>{status}</span></td>
                              <td>{formatDateOnly(v.startDate) || '—'}</td>
                              <td><button type="button" className={`vendor-badge-btn status-badge ${t.cls}`} onClick={(e) => { e.stopPropagation(); setInfoModal({ vendorId: v.id, type: 'training' }); }}>{t.label}</button></td>
                              <td><button type="button" className={`vendor-badge-btn status-badge ${d.cls}`} onClick={(e) => { e.stopPropagation(); setInfoModal({ vendorId: v.id, type: 'documents' }); }}>{d.label}</button></td>
                              <td>
                                <div className="d-flex justify-content-center gap-1">
                                  <button type="button" className="vendor-action-btn" aria-label="Edit vendor" onClick={(e) => { e.stopPropagation(); openEditModal(v.id); }}><i className="bi bi-pencil-fill" /></button>
                                  {isLocal && (
                                    <button type="button" className="vendor-action-btn vendor-action-delete" aria-label="Delete vendor" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(v.id); }}><i className="bi bi-trash-fill" /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredSorted.length === 0 && <div className="vendor-table-empty">No vendors match the current filters.</div>}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Add/Edit Vendor Modal (4-step) */}
      {formOpen && (
        <div className="modal fade vendor-modal-liquid-glass show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content vendor-modal-content-lg">
              <div className="modal-header vendor-modal-header-lg border-0 pb-0">
                <h2 className="modal-title">{formTitle}</h2>
                <button type="button" className="btn-close vendor-modal-close-lg" aria-label="Close" onClick={() => setFormOpen(false)} />
              </div>
              <div className="modal-body vendor-modal-body-lg pt-0">
                <div className="vendor-modal-stepper vendor-modal-stepper-lg">
                  {STEPS.map((s) => (
                    <button key={s} type="button" className={`vendor-modal-step${currentStep === s ? ' active' : ''}`} onClick={() => setCurrentStep(s)}>
                      <i className={`bi bi-${s === 'personal' ? 'person' : s === 'employment' ? 'briefcase' : s === 'training' ? 'book' : 'shield-check'}`} /> {s.charAt(0).toUpperCase() + s.slice(1) === 'Employment' ? 'Contract' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <form className="vendor-form-lg" onSubmit={handleFormSubmit}>
                  {currentStep === 'personal' && (
                    <div className="vendor-modal-pane vendor-modal-pane-lg">
                      <div className="row g-3">
                        <div className="col-md-6"><label className="form-label">First name</label><input type="text" className="form-control" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Last name</label><input type="text" className="form-control" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Courier ID</label><input type="text" className="form-control" readOnly maxLength={8} placeholder="Auto (first 7 of name + initials of surname)" value={form.courierId || computeCourierId(form.firstName, form.lastName)} /></div>
                        <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Phone</label><input type="text" className="form-control" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Date of birth</label><input type="date" className="form-control" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                      </div>
                    </div>
                  )}
                  {currentStep === 'employment' && (
                    <div className="vendor-modal-pane vendor-modal-pane-lg">
                      <div className="row g-3">
                        <div className="col-md-6"><label className="form-label">Depot</label>
                          <select className="form-select" required value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })}>
                            {depots.map((d) => <option value={d} key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="col-md-6"><label className="form-label">Vendor Type</label>
                          <select className="form-select" value={form.vendorType} onChange={(e) => setForm({ ...form, vendorType: e.target.value })}>
                            <option value="1">Driver</option>
                            <option value="2">Subcontractor</option>
                          </select>
                        </div>
                        <div className="col-md-6"><label className="form-label">Route</label>
                          <select className="form-select" value={form.route || ''} onChange={(e) => setForm({ ...form, route: e.target.value || null })}>
                            <option value="">— Select route —</option>
                            {routes.map((r) => <option value={r} key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="col-md-6"><label className="form-label">Start date</label><input type="date" className="form-control" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Finish date</label><input type="date" className="form-control" value={form.finishDate || ''} onChange={(e) => setForm({ ...form, finishDate: e.target.value || null })} /></div>
                      </div>
                    </div>
                  )}
                  {currentStep === 'training' && (
                    <div className="vendor-modal-pane vendor-modal-pane-lg">
                      <div className="row g-3">
                        <div className="col-md-6"><label className="form-label">Cargo training date</label><input type="date" className="form-control" value={form.cargoTrainingDate || ''} onChange={(e) => setForm({ ...form, cargoTrainingDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Dangerous goods training date</label><input type="date" className="form-control" value={form.dangerousGoodsTrainingDate || ''} onChange={(e) => setForm({ ...form, dangerousGoodsTrainingDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Manual handling training date</label><input type="date" className="form-control" value={form.manualHandlingTrainingDate || ''} onChange={(e) => setForm({ ...form, manualHandlingTrainingDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">DHL Training Number</label><input type="text" className="form-control" value={form.dhlTrainingNumber || ''} onChange={(e) => setForm({ ...form, dhlTrainingNumber: e.target.value })} /></div>
                      </div>
                    </div>
                  )}
                  {currentStep === 'compliance' && (
                    <div className="vendor-modal-pane vendor-modal-pane-lg">
                      <div className="row g-3">
                        <div className="col-md-6"><label className="form-label">Criminal record check date</label><input type="date" className="form-control" value={form.criminalRecordDate || ''} onChange={(e) => setForm({ ...form, criminalRecordDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">DBS Number</label><input type="text" className="form-control" value={form.dbsNumber || ''} onChange={(e) => setForm({ ...form, dbsNumber: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">DVLA check date</label><input type="date" className="form-control" value={form.dvlaCheckDate || ''} onChange={(e) => setForm({ ...form, dvlaCheckDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Visa validity</label><input type="date" className="form-control" value={form.visaValidity || ''} onChange={(e) => setForm({ ...form, visaValidity: e.target.value || null })} /></div>
                        <div className="col-md-6"><label className="form-label">Licence expiring date</label><input type="date" className="form-control" value={form.licenceExpiringDate || ''} onChange={(e) => setForm({ ...form, licenceExpiringDate: e.target.value })} /></div>
                        <div className="col-md-6"><label className="form-label">Passport expiring date</label><input type="date" className="form-control" value={form.passportExpiringDate || ''} onChange={(e) => setForm({ ...form, passportExpiringDate: e.target.value })} /></div>
                      </div>
                    </div>
                  )}

                  <div className="vendor-modal-footer vendor-modal-footer-lg mt-3 pt-3 border-top">
                    <button type="button" className={`btn btn-outline-secondary vendor-modal-btn-lg${stepIdx <= 0 ? ' hidden' : ''}`} onClick={() => setCurrentStep(STEPS[stepIdx - 1])}>Previous</button>
                    <button type="button" className={`btn btn-outline-primary vendor-modal-btn-lg${stepIdx >= STEPS.length - 1 ? ' hidden' : ''}`} onClick={() => setCurrentStep(STEPS[stepIdx + 1])}>Next</button>
                    <button type="submit" className={`btn btn-primary vendor-modal-btn-primary-lg${stepIdx < STEPS.length - 1 ? ' hidden' : ''}`}>Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTargetId != null && deleteTarget && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill text-warning" />
                  <span>Confirm Deletion</span>
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setDeleteTargetId(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-3">Are you sure you want to delete the vendor <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?</p>
                <p className="text-muted small mb-0">{deleteTarget.email ? `Email: ${deleteTarget.email}` : ''}</p>
                <div className="vendor-delete-warning mt-3 p-3 rounded">
                  <div className="d-flex align-items-center gap-2 text-warning-emphasis">
                    <i className="bi bi-info-circle" />
                    <span className="small">This action cannot be undone.</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTargetId(null)}>Cancel</button>
                <button type="button" className="btn btn-danger d-inline-flex align-items-center gap-2" onClick={confirmDelete}>
                  <i className="bi bi-trash-fill" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal (Training / Documents) */}
      {infoModal && infoVendor && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom flex-wrap">
                <div>
                  <p className="vendor-info-modal-driver-label mb-1">Driver</p>
                  <h5 className="vendor-info-modal-name mb-0">{infoVendor.firstName} {infoVendor.lastName}</h5>
                  <p className="vendor-info-modal-email small text-muted mb-0">{infoVendor.email}</p>
                </div>
                <div className="d-flex align-items-start gap-2">
                  <span className="vendor-info-modal-badge">{infoModal.type === 'training' ? 'Training Details' : 'Documents Details'}</span>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setInfoModal(null)} />
                </div>
              </div>
              <div className="modal-body p-4">
                {infoModal.type === 'training' ? (
                  [
                    { label: 'Cargo Training', value: infoVendor.cargoTrainingDate ? formatDateOnly(infoVendor.cargoTrainingDate) : 'Pending', status: getSingleTrainingStatus(infoVendor.cargoTrainingDate) },
                    { label: 'Dangerous Goods Training', value: infoVendor.dangerousGoodsTrainingDate ? formatDateOnly(infoVendor.dangerousGoodsTrainingDate) : 'Pending', status: getSingleTrainingStatus(infoVendor.dangerousGoodsTrainingDate) },
                    { label: 'Manual Handling Training', value: infoVendor.manualHandlingTrainingDate ? formatDateOnly(infoVendor.manualHandlingTrainingDate) : 'Pending', status: getSingleTrainingStatus(infoVendor.manualHandlingTrainingDate) },
                    { label: 'DHL Training Number', value: infoVendor.dhlTrainingNumber || 'N/A', status: null },
                  ].map((item) => (
                    <div className="vendor-info-modal-item vendor-info-modal-item--has-flag" key={item.label}>
                      <div className="vendor-info-modal-item-label-wrap">
                        {item.status && <span className={`vendor-info-modal-flag vendor-info-modal-flag--${item.status}`} />}
                        <div className="vendor-info-modal-item-head">
                          <span className="vendor-info-modal-item-label">{item.label}</span>
                        </div>
                      </div>
                      <div>{item.status ? <span className={`status-badge status-badge-${item.status}`}>{item.value}</span> : <span className="vendor-info-modal-item-value">{item.value}</span>}</div>
                    </div>
                  ))
                ) : (
                  [
                    { label: 'Criminal Record Check', value: infoVendor.criminalRecordDate ? formatDateOnly(infoVendor.criminalRecordDate) : 'Pending', status: getDocumentItemStatus('criminalRecord', infoVendor) },
                    { label: 'DVLA Check', value: infoVendor.dvlaCheckDate ? formatDateOnly(infoVendor.dvlaCheckDate) : 'Pending', status: getDocumentItemStatus('dvlaCheck', infoVendor) },
                    { label: 'Visa Validity', value: infoVendor.visaValidity ? formatDateOnly(infoVendor.visaValidity) : 'N/A', status: getDocumentItemStatus('visa', infoVendor) },
                    { label: 'Driving Licence Expiry', value: infoVendor.licenceExpiringDate ? formatDateOnly(infoVendor.licenceExpiringDate) : 'N/A', status: getDocumentItemStatus('licence', infoVendor) },
                    { label: 'Passport Expiry', value: infoVendor.passportExpiringDate ? formatDateOnly(infoVendor.passportExpiringDate) : 'N/A', status: getDocumentItemStatus('passport', infoVendor) },
                  ].map((item) => (
                    <div className="vendor-info-modal-item vendor-info-modal-item--has-flag" key={item.label}>
                      <div className="vendor-info-modal-item-label-wrap">
                        {item.status && <span className={`vendor-info-modal-flag vendor-info-modal-flag--${item.status}`} />}
                        <span className="vendor-info-modal-item-label">{item.label}</span>
                      </div>
                      <div>{item.status ? <span className={`status-badge status-badge-${item.status === 'verified' ? 'verified' : item.status}`}>{item.value}</span> : <span className="vendor-info-modal-item-value">{item.value}</span>}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Driver Detail Modal */}
      {detailVendor && (
        <>
          <div className="driver-detail-modal-backdrop" aria-hidden="true" onClick={() => setDetailVendorId(null)} />
          <div className="driver-detail-modal-wrap" role="dialog" aria-modal="true">
            <div className="driver-detail-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
              <div className="driver-detail-modal-header">
                <div className="driver-detail-modal-header-inner">
                  <span className="driver-detail-modal-badge">Driver</span>
                  <h2 className="driver-detail-modal-title">{`${detailVendor.firstName || ''} ${detailVendor.lastName || ''}`.trim() || '—'}</h2>
                </div>
                <button type="button" className="driver-detail-modal-close" aria-label="Close" onClick={() => setDetailVendorId(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="driver-detail-modal-body">
                <div className="driver-detail-qr-wrap">
                  <p className="driver-detail-qr-label">QR Code</p>
                  <div className="driver-detail-qr-box">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {qrDataUrl && <img src={qrDataUrl} alt="Driver QR code" width={180} height={180} />}
                  </div>
                </div>
                <div className="driver-detail-grid">
                  {[
                    { title: 'Personal', rows: [
                      { label: 'Courier ID', value: detailVendor.courierId || computeCourierId(detailVendor.firstName || '', detailVendor.lastName || '') },
                      { label: 'First name', value: detailVendor.firstName || '—' },
                      { label: 'Last name', value: detailVendor.lastName || '—' },
                      { label: 'Email', value: detailVendor.email || '—' },
                      { label: 'Phone', value: detailVendor.phone || '—' },
                      { label: 'Date of birth', value: detailVendor.dob ? formatDateOnly(detailVendor.dob) || '—' : '—' },
                    ] },
                    { title: 'Contract', rows: [
                      { label: 'Depot', value: detailVendor.depot || '—' },
                      { label: 'Vendor Type', value: vendorTypeLabel(detailVendor) },
                      { label: 'Route', value: detailVendor.route || '—' },
                      { label: 'Start date', value: formatDateOnly(detailVendor.startDate) || '—' },
                      { label: 'Finish date', value: formatDateOnly(detailVendor.finishDate) || '—' },
                      { label: 'Status', value: detailVendor.status || '—' },
                    ] },
                    { title: 'Training', rows: [
                      { label: 'Cargo training date', value: detailVendor.cargoTrainingDate ? formatDateOnly(detailVendor.cargoTrainingDate) || '—' : '—' },
                      { label: 'Dangerous goods training date', value: detailVendor.dangerousGoodsTrainingDate ? formatDateOnly(detailVendor.dangerousGoodsTrainingDate) || '—' : '—' },
                      { label: 'Manual handling training date', value: detailVendor.manualHandlingTrainingDate ? formatDateOnly(detailVendor.manualHandlingTrainingDate) || '—' : '—' },
                      { label: 'DHL Training Number', value: detailVendor.dhlTrainingNumber || '—' },
                    ] },
                    { title: 'Compliance', rows: [
                      { label: 'Criminal record check date', value: detailVendor.criminalRecordDate ? formatDateOnly(detailVendor.criminalRecordDate) || '—' : '—' },
                      { label: 'DBS Number', value: detailVendor.dbsNumber || '—' },
                      { label: 'DVLA check date', value: detailVendor.dvlaCheckDate ? formatDateOnly(detailVendor.dvlaCheckDate) || '—' : '—' },
                      { label: 'Visa validity', value: detailVendor.visaValidity ? formatDateOnly(detailVendor.visaValidity) || '—' : '—' },
                      { label: 'Licence expiring date', value: detailVendor.licenceExpiringDate ? formatDateOnly(detailVendor.licenceExpiringDate) || '—' : '—' },
                      { label: 'Passport expiring date', value: detailVendor.passportExpiringDate ? formatDateOnly(detailVendor.passportExpiringDate) || '—' : '—' },
                    ] },
                  ].map((sec) => (
                    <section className="driver-detail-section" key={sec.title}>
                      <h3 className="driver-detail-section-title">{sec.title}</h3>
                      {sec.rows.map((r) => (
                        <div className="driver-detail-row" key={r.label}>
                          <span className="driver-detail-row-label">{r.label}</span>
                          <span className="driver-detail-row-value">{r.value}</span>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
