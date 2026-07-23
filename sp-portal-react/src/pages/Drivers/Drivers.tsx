import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/shared-pages.css';
import '../../styles/legacy/drivers.css';
import {
  getAllMockVendors,
  getDepotsForSp,
  getRoutesForSp,
  computeCourierId,
  formatDateOnly,
  parseYMD,
  getTrainingStatus,
  getSingleTrainingStatus,
  getDocumentItemStatus,
  getDocumentsStatus,
  isVendorPending,
  vendorTypeLabel,
  statusBadgeClass,
  filterAndSortVendors,
  type Vendor,
  type StatusFilter,
  type SortKey,
} from '../../data/driversData';

/**
 * Manual port of Bootstrap's bootstrap.bundle.min.js modal show/hide.
 * The static page loads that JS from a CDN; this SPA only loads Bootstrap's
 * CSS (see index.html), so modals here are toggled via plain React state +
 * the same `modal fade show` classes bootstrap's JS would apply, without the
 * fade-in transition or focus trap bootstrap's JS provides.
 */
const STEPS = ['personal', 'employment', 'training', 'compliance'] as const;
type Step = (typeof STEPS)[number];

interface VendorFormData {
  firstName: string;
  lastName: string;
  courierId: string;
  email: string;
  phone: string;
  dob: string;
  depot: string;
  vendorType: string;
  route: string;
  startDate: string;
  finishDate: string;
  cargoTrainingDate: string;
  dangerousGoodsTrainingDate: string;
  manualHandlingTrainingDate: string;
  dhlTrainingNumber: string;
  criminalRecordDate: string;
  dbsNumber: string;
  dvlaCheckDate: string;
  visaValidity: string;
  licenceExpiringDate: string;
  passportExpiringDate: string;
}

const EMPTY_FORM: VendorFormData = {
  firstName: '', lastName: '', courierId: '', email: '', phone: '', dob: '',
  depot: '', vendorType: '1', route: '', startDate: '', finishDate: '',
  cargoTrainingDate: '', dangerousGoodsTrainingDate: '', manualHandlingTrainingDate: '', dhlTrainingNumber: '',
  criminalRecordDate: '', dbsNumber: '', dvlaCheckDate: '', visaValidity: '', licenceExpiringDate: '', passportExpiringDate: '',
};

function vendorToForm(v: Vendor): VendorFormData {
  return {
    firstName: v.firstName || '',
    lastName: v.lastName || '',
    courierId: v.courierId || computeCourierId(v.firstName || '', v.lastName || ''),
    email: v.email || '',
    phone: v.phone || '',
    dob: v.dob || '',
    depot: v.depot || '',
    vendorType: (v.vendorType || '1').toString(),
    route: v.route || '',
    startDate: v.startDate || '',
    finishDate: v.finishDate || '',
    cargoTrainingDate: v.cargoTrainingDate || '',
    dangerousGoodsTrainingDate: v.dangerousGoodsTrainingDate || '',
    manualHandlingTrainingDate: v.manualHandlingTrainingDate || '',
    dhlTrainingNumber: v.dhlTrainingNumber || '',
    criminalRecordDate: v.criminalRecordDate || '',
    dbsNumber: v.dbsNumber || '',
    dvlaCheckDate: v.dvlaCheckDate || '',
    visaValidity: v.visaValidity || '',
    licenceExpiringDate: v.licenceExpiringDate || '',
    passportExpiringDate: v.passportExpiringDate || '',
  };
}

function stepPaneId(step: Step): string {
  return 'vendorStep' + step.charAt(0).toUpperCase() + step.slice(1);
}

export function Drivers() {
  const sp = useCurrentSp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [localVendors, setLocalVendors] = useState<Vendor[]>([]);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [modalStep, setModalStep] = useState<Step>('personal');
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM);

  const [deleteVendorId, setDeleteVendorId] = useState<number | null>(null);
  const [infoModal, setInfoModal] = useState<{ vendorId: number; type: 'training' | 'documents' } | null>(null);
  const [driverDetailId, setDriverDetailId] = useState<number | null>(null);

  useModalBehavior(() => setShowVendorModal(false), showVendorModal);
  useModalBehavior(() => setDeleteVendorId(null), deleteVendorId !== null);
  useModalBehavior(() => setInfoModal(null), infoModal !== null);
  useModalBehavior(() => setDriverDetailId(null), driverDetailId !== null);

  const allVendors = useMemo<Vendor[]>(() => {
    const mock = getAllMockVendors().filter((v) => v.serviceProvider === sp);
    const byId = new Map<number, Vendor>();
    mock.forEach((v) => byId.set(v.id, v));
    localVendors.forEach((v) => byId.set(v.id, v));
    return Array.from(byId.values());
  }, [sp, localVendors]);

  const filtered = useMemo(
    () => filterAndSortVendors(allVendors, search, statusFilter, sortKey, sortDir),
    [allVendors, search, statusFilter, sortKey, sortDir],
  );

  // updateMetrics() in the original also derives its counts from the
  // currently filtered/searched list, not the full roster.
  const today = new Date();
  const metricTotal = filtered.length;
  const metricActive = filtered.filter((v) => (v.status ? v.status === 'Active' : !v.finishDate || new Date(v.finishDate) > today)).length;
  const metricInactive = filtered.filter((v) => (v.status ? v.status === 'Inactive' : !!v.finishDate && new Date(v.finishDate) <= today)).length;
  const metricPending = filtered.filter(isVendorPending).length;

  const depots = useMemo(() => getDepotsForSp(sp), [sp]);
  const routes = useMemo(() => getRoutesForSp(sp), [sp]);

  const findVendor = (id: number) => allVendors.find((v) => v.id === id) || null;
  const isLocalVendor = (id: number) => localVendors.some((v) => v.id === id);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function openAddModal() {
    setEditingVendorId(null);
    setForm(EMPTY_FORM);
    setModalStep('personal');
    setShowVendorModal(true);
  }

  function openEditModal(id: number) {
    const v = findVendor(id);
    if (!v) return;
    setEditingVendorId(id);
    setForm(vendorToForm(v));
    setModalStep('personal');
    setShowVendorModal(true);
  }

  function updateForm<K extends keyof VendorFormData>(key: K, value: VendorFormData[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'firstName' || key === 'lastName') {
        next.courierId = computeCourierId(next.firstName, next.lastName);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.depot || !form.startDate) return;

    const fd = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      courierId: form.courierId || computeCourierId(form.firstName, form.lastName),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob || null,
      depot: form.depot,
      vendorType: form.vendorType,
      route: form.route || null,
      startDate: form.startDate,
      finishDate: form.finishDate || null,
      cargoTrainingDate: form.cargoTrainingDate || null,
      dangerousGoodsTrainingDate: form.dangerousGoodsTrainingDate || null,
      manualHandlingTrainingDate: form.manualHandlingTrainingDate || null,
      dhlTrainingNumber: form.dhlTrainingNumber.trim() || null,
      criminalRecordDate: form.criminalRecordDate || null,
      dbsNumber: form.dbsNumber.trim() || null,
      dvlaCheckDate: form.dvlaCheckDate || null,
      visaValidity: form.visaValidity || null,
      licenceExpiringDate: form.licenceExpiringDate || null,
      passportExpiringDate: form.passportExpiringDate || null,
    };

    if (editingVendorId !== null) {
      setLocalVendors((prev) => {
        const idx = prev.findIndex((x) => x.id === editingVendorId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...fd, id: editingVendorId, serviceProvider: sp };
          return next;
        }
        const existing = allVendors.find((x) => x.id === editingVendorId);
        if (existing) return [...prev, { ...existing, ...fd, id: existing.id, serviceProvider: sp }];
        return prev;
      });
    } else {
      const maxId = Math.max(0, ...getAllMockVendors().map((v) => v.id), ...localVendors.map((v) => v.id));
      setLocalVendors((prev) => [
        ...prev,
        {
          ...fd,
          id: maxId + 1,
          serviceProvider: sp,
          status: 'Active',
          cargoTraining: !!fd.cargoTrainingDate,
          dangerousGoodsTraining: !!fd.dangerousGoodsTrainingDate,
          manualHandlingTraining: !!fd.manualHandlingTrainingDate,
        } as Vendor,
      ]);
    }

    setShowVendorModal(false);
  }

  function confirmDelete() {
    if (deleteVendorId === null) return;
    setLocalVendors((prev) => prev.filter((v) => v.id !== deleteVendorId));
    setDeleteVendorId(null);
  }

  function exportExcel() {
    const headers = ['Name', 'Email', 'Vendor Type', 'Route', 'Status', 'Start Date'];
    const rows = filtered.map((v) =>
      [
        `${v.firstName || ''} ${v.lastName || ''}`,
        v.email || '',
        vendorTypeLabel(v),
        v.route || '',
        v.status || 'Active',
        v.startDate || '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), rows.join('\n')].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vendors-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!sp) {
    return (
      <PortalLayout mainClassName="vendor-admin-main sp-vendor-main pt-4" title="Vendors">
        <div id="spNotFound" className="alert alert-warning">
          Service Provider not set. Open with <code>?sp=YourCompany</code>.
        </div>
      </PortalLayout>
    );
  }

  const deleteVendor = deleteVendorId !== null ? findVendor(deleteVendorId) : null;
  const infoVendor = infoModal ? findVendor(infoModal.vendorId) : null;
  const driverDetailVendor = driverDetailId !== null ? findVendor(driverDetailId) : null;

  return (
    <PortalLayout mainClassName="vendor-admin-main sp-vendor-main pt-4" title="Vendors">
      <div id="spVendorContent">
        {/* ============ PAGE INFO ============ */}
        <div className="vendor-page-header mb-4">
          <div className="vendor-page-header-inner">
            <div className="vendor-page-header-row">
              <div className="vendor-page-header-title-block">
                <p className="vendor-page-subtitle">Vendor management and information</p>
                <div className="vendor-page-metrics">
                  <div className="vendor-page-metric">
                    <span className="vendor-page-metric-label">Total</span>
                    <span className="vendor-page-metric-value" id="metricTotal">{metricTotal}</span>
                  </div>
                  <div className="vendor-page-metric">
                    <span className="vendor-page-metric-label">Active</span>
                    <span className="vendor-page-metric-value" id="metricActive">{metricActive}</span>
                  </div>
                  <div className="vendor-page-metric">
                    <span className="vendor-page-metric-label">Inactive</span>
                    <span className="vendor-page-metric-value" id="metricInactive">{metricInactive}</span>
                  </div>
                  <div className="vendor-page-metric">
                    <span className="vendor-page-metric-label">Pending</span>
                    <span className="vendor-page-metric-value" id="metricPending">{metricPending}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VendorFilters */}
        <div className="vendor-filters-bar mb-4">
          <div className="vendor-filters-inner">
            <div className="vendor-filters-search-wrap">
              <input
                type="search"
                id="vendorSearch"
                className="vendor-filters-search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="vendor-filters-status-wrap">
              <strong className="vendor-filters-status-label">Status:</strong>
              <div className="vendor-filters-status-group" role="group">
                {(['all', 'active', 'inactive', 'expiring', 'pending'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`vendor-filters-status-btn${statusFilter === s ? ' active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="vendor-filters-actions">
              <button type="button" className="btn btn-primary vendor-filters-new" id="addVendorBtn" onClick={openAddModal}>
                New
              </button>
              <div className="dropdown">
                <button
                  type="button"
                  className="btn btn-outline-secondary vendor-filters-export"
                  id="vendorExportBtn"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Export
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      id="vendorExportPdf"
                      onClick={(e) => {
                        e.preventDefault();
                        window.print();
                      }}
                    >
                      PDF
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      id="vendorExportExcel"
                      onClick={(e) => {
                        e.preventDefault();
                        exportExcel();
                      }}
                    >
                      Excel
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* VendorTable */}
        <div className="vendor-table-wrap">
          <table className="vendor-table">
            <thead>
              <tr>
                {([
                  ['name', 'Name', 'vendor-th-left'],
                  ['vendorType', 'Vendor Type', ''],
                  ['route', 'Route', ''],
                  ['status', 'Status', ''],
                  ['startDate', 'Start Date', ''],
                ] as [SortKey, string, string][]).map(([key, label, extra]) => (
                  <th
                    key={key}
                    className={`vendor-th vendor-th-sort${extra ? ` ${extra}` : ''}${sortKey === key ? (sortDir === 1 ? ' asc' : ' desc') : ''}`}
                    onClick={() => handleSort(key)}
                  >
                    {label}
                  </th>
                ))}
                <th className="vendor-th vendor-th-sort">Training</th>
                <th className="vendor-th vendor-th-sort">Documents</th>
                <th className="vendor-th vendor-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="vendorTableBody">
              {filtered.map((v) => {
                const name = `${v.firstName || ''} ${v.lastName || ''}`;
                const t = getTrainingStatus(v);
                const d = getDocumentsStatus(v);
                const isLocal = isLocalVendor(v.id);
                const status = v.status || (!v.finishDate || new Date(v.finishDate) > new Date() ? 'Active' : 'Inactive');
                return (
                  <tr
                    key={v.id}
                    data-vendor-id={v.id}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDriverDetailId(v.id)}
                  >
                    <td className="vendor-td-name">
                      <span className="vendor-cell-name-strong">{name.trim() || '—'}</span>
                      <span className="vendor-cell-email">{v.email || ''}</span>
                    </td>
                    <td>{vendorTypeLabel(v)}</td>
                    <td>{v.route || '—'}</td>
                    <td>
                      <span className={`status-badge ${statusBadgeClass(v)}`}>{status}</span>
                    </td>
                    <td>{formatDateOnly(v.startDate) || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className={`vendor-badge-btn status-badge ${t.className}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoModal({ vendorId: v.id, type: 'training' });
                        }}
                      >
                        {t.label}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`vendor-badge-btn status-badge ${d.className}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoModal({ vendorId: v.id, type: 'documents' });
                        }}
                      >
                        {d.label}
                      </button>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center gap-1">
                        <button
                          type="button"
                          className="vendor-action-btn"
                          aria-label="Edit vendor"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(v.id);
                          }}
                        >
                          <i className="bi bi-pencil-fill" />
                        </button>
                        {isLocal && (
                          <button
                            type="button"
                            className="vendor-action-btn vendor-action-delete"
                            aria-label="Delete vendor"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteVendorId(v.id);
                            }}
                          >
                            <i className="bi bi-trash-fill" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div id="vendorEmptyState" className="vendor-table-empty">
              No vendors match the current filters.
            </div>
          )}
        </div>
      </div>

      {/* ===================== VendorModal (4-step) ===================== */}
      {showVendorModal &&
        createPortal(
          <>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={() => setShowVendorModal(false)} />
            <div
              className="modal fade show vendor-modal-liquid-glass sp-modal-anim"
              style={{ display: 'block' }}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vendorModalTitle"
            >
              <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                <div className="modal-content vendor-modal-content-lg">
                  <div className="modal-header vendor-modal-header-lg border-0 pb-0">
                    <h2 id="vendorModalTitle" className="modal-title">
                      {editingVendorId !== null ? 'Edit vendor' : 'New vendor'}
                    </h2>
                    <button
                      type="button"
                      className="btn-close vendor-modal-close-lg"
                      aria-label="Close"
                      onClick={() => setShowVendorModal(false)}
                    />
                  </div>
                  <div className="modal-body vendor-modal-body-lg pt-0">
                    <div className="vendor-modal-stepper vendor-modal-stepper-lg" id="vendorModalStepper">
                      {STEPS.map((step) => (
                        <button
                          key={step}
                          type="button"
                          className={`vendor-modal-step${modalStep === step ? ' active' : ''}`}
                          onClick={() => setModalStep(step)}
                        >
                          <i
                            className={`bi ${
                              step === 'personal'
                                ? 'bi-person'
                                : step === 'employment'
                                  ? 'bi-briefcase'
                                  : step === 'training'
                                    ? 'bi-book'
                                    : 'bi-shield-check'
                            }`}
                          />{' '}
                          {step === 'personal' ? 'Personal' : step === 'employment' ? 'Contract' : step === 'training' ? 'Training' : 'Compliance'}
                        </button>
                      ))}
                    </div>
                    <form id="vendorForm" className="vendor-form-lg" onSubmit={handleSubmit}>
                      <div id={stepPaneId('personal')} className={`vendor-modal-pane vendor-modal-pane-lg${modalStep !== 'personal' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vFirstName" className="form-label">First name</label>
                            <input type="text" id="vFirstName" className="form-control" required value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vLastName" className="form-label">Last name</label>
                            <input type="text" id="vLastName" className="form-control" required value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vCourierId" className="form-label">Courier ID</label>
                            <input type="text" id="vCourierId" className="form-control" readOnly maxLength={8} placeholder="Auto (first 7 of name + initials of surname)" value={form.courierId} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vEmail" className="form-label">Email</label>
                            <input type="email" id="vEmail" className="form-control" required value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vPhone" className="form-label">Phone</label>
                            <input type="text" id="vPhone" className="form-control" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDob" className="form-label">Date of birth</label>
                            <input type="date" id="vDob" className="form-control" value={form.dob} onChange={(e) => updateForm('dob', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div id={stepPaneId('employment')} className={`vendor-modal-pane vendor-modal-pane-lg${modalStep !== 'employment' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vDepot" className="form-label">Depot</label>
                            <select id="vDepot" className="form-select" required value={form.depot} onChange={(e) => updateForm('depot', e.target.value)}>
                              <option value="" disabled hidden></option>
                              {depots.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vVendorType" className="form-label">Vendor Type</label>
                            <select id="vVendorType" className="form-select" value={form.vendorType} onChange={(e) => updateForm('vendorType', e.target.value)}>
                              <option value="1">Driver</option>
                              <option value="2">Subcontractor</option>
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vRoute" className="form-label">Route</label>
                            <select id="vRoute" className="form-select" value={form.route} onChange={(e) => updateForm('route', e.target.value)}>
                              <option value="">— Select route —</option>
                              {routes.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vStartDate" className="form-label">Start date</label>
                            <input type="date" id="vStartDate" className="form-control" required value={form.startDate} onChange={(e) => updateForm('startDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vFinishDate" className="form-label">Finish date</label>
                            <input type="date" id="vFinishDate" className="form-control" value={form.finishDate} onChange={(e) => updateForm('finishDate', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div id={stepPaneId('training')} className={`vendor-modal-pane vendor-modal-pane-lg${modalStep !== 'training' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vCargoDate" className="form-label">Cargo training date</label>
                            <input type="date" id="vCargoDate" className="form-control" value={form.cargoTrainingDate} onChange={(e) => updateForm('cargoTrainingDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDangerousDate" className="form-label">Dangerous goods training date</label>
                            <input type="date" id="vDangerousDate" className="form-control" value={form.dangerousGoodsTrainingDate} onChange={(e) => updateForm('dangerousGoodsTrainingDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vManualDate" className="form-label">Manual handling training date</label>
                            <input type="date" id="vManualDate" className="form-control" value={form.manualHandlingTrainingDate} onChange={(e) => updateForm('manualHandlingTrainingDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDhlTrainingNumber" className="form-label">DHL Training Number</label>
                            <input type="text" id="vDhlTrainingNumber" className="form-control" value={form.dhlTrainingNumber} onChange={(e) => updateForm('dhlTrainingNumber', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div id={stepPaneId('compliance')} className={`vendor-modal-pane vendor-modal-pane-lg${modalStep !== 'compliance' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vCriminalRecordDate" className="form-label">Criminal record check date</label>
                            <input type="date" id="vCriminalRecordDate" className="form-control" value={form.criminalRecordDate} onChange={(e) => updateForm('criminalRecordDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDbsNumber" className="form-label">DBS Number</label>
                            <input type="text" id="vDbsNumber" className="form-control" value={form.dbsNumber} onChange={(e) => updateForm('dbsNumber', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDvlaCheckDate" className="form-label">DVLA check date</label>
                            <input type="date" id="vDvlaCheckDate" className="form-control" value={form.dvlaCheckDate} onChange={(e) => updateForm('dvlaCheckDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vVisaValidity" className="form-label">Visa validity</label>
                            <input type="date" id="vVisaValidity" className="form-control" value={form.visaValidity} onChange={(e) => updateForm('visaValidity', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vLicenceExpiring" className="form-label">Licence expiring date</label>
                            <input type="date" id="vLicenceExpiring" className="form-control" value={form.licenceExpiringDate} onChange={(e) => updateForm('licenceExpiringDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vPassportExpiring" className="form-label">Passport expiring date</label>
                            <input type="date" id="vPassportExpiring" className="form-control" value={form.passportExpiringDate} onChange={(e) => updateForm('passportExpiringDate', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="vendor-modal-footer vendor-modal-footer-lg mt-3 pt-3 border-top">
                        <button
                          type="button"
                          className={`btn btn-outline-secondary vendor-modal-btn-lg${STEPS.indexOf(modalStep) <= 0 ? ' hidden' : ''}`}
                          onClick={() => setModalStep(STEPS[Math.max(0, STEPS.indexOf(modalStep) - 1)])}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className={`btn btn-outline-primary vendor-modal-btn-lg${STEPS.indexOf(modalStep) >= STEPS.length - 1 ? ' hidden' : ''}`}
                          onClick={() => setModalStep(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(modalStep) + 1)])}
                        >
                          Next
                        </button>
                        <button
                          type="submit"
                          className={`btn btn-primary vendor-modal-btn-primary-lg${STEPS.indexOf(modalStep) < STEPS.length - 1 ? ' hidden' : ''}`}
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* ===================== Delete confirm modal ===================== */}
      {deleteVendorId !== null &&
        deleteVendor &&
        createPortal(
          <>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={() => setDeleteVendorId(null)} />
            <div
              className="modal fade show sp-modal-anim"
              style={{ display: 'block' }}
              tabIndex={-1}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="deleteConfirmModalLabel"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ position: 'relative' }}>
                  <button type="button" className="btn-close sp-danger-modal-close" aria-label="Close" onClick={() => setDeleteVendorId(null)} />
                  <div className="sp-danger-modal-body">
                    <div className="sp-danger-modal-icon">
                      <i className="bi bi-exclamation-triangle-fill" />
                    </div>
                    <h5 id="deleteConfirmModalLabel" className="sp-danger-modal-title">
                      Delete this vendor?
                    </h5>
                    <p className="sp-danger-modal-text">
                      You&apos;re about to remove{' '}
                      <strong>{`${deleteVendor.firstName || ''} ${deleteVendor.lastName || ''}`}</strong>
                      {deleteVendor.email ? ` (${deleteVendor.email})` : ''}.
                    </p>
                    <p className="sp-danger-modal-subtext">This action cannot be undone.</p>
                  </div>
                  <div className="modal-footer sp-danger-modal-footer border-top bg-light">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteVendorId(null)}>Cancel</button>
                    <button type="button" className="btn btn-danger d-inline-flex align-items-center gap-2" onClick={confirmDelete}>
                      <i className="bi bi-trash-fill" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* ===================== Training / Documents info modal ===================== */}
      {infoModal &&
        infoVendor &&
        createPortal(
          <>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={() => setInfoModal(null)} />
            <div className="modal fade show sp-modal-anim" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="infoModalTitle">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header border-bottom flex-wrap">
                    <div>
                      <p className="vendor-info-modal-driver-label mb-1">Driver</p>
                      <h5 className="vendor-info-modal-name mb-0" id="infoModalTitle">{`${infoVendor.firstName || ''} ${infoVendor.lastName || ''}`}</h5>
                      <p className="vendor-info-modal-email small text-muted mb-0">{infoVendor.email || ''}</p>
                    </div>
                    <div className="d-flex align-items-start gap-2">
                      <span className="vendor-info-modal-badge">{infoModal.type === 'training' ? 'Training Details' : 'Documents Details'}</span>
                      <button type="button" className="btn-close" aria-label="Close" onClick={() => setInfoModal(null)} />
                    </div>
                  </div>
                  <div className="modal-body p-4">
                    {infoModal.type === 'training' ? (
                      (() => {
                        const v = infoVendor;
                        const cargoStatus = getSingleTrainingStatus(v.cargoTrainingDate);
                        let cargoExpiry: string | null = null;
                        if (v.cargoTrainingDate) {
                          const d0 = parseYMD(v.cargoTrainingDate);
                          if (d0) {
                            const d = new Date(d0);
                            d.setFullYear(d.getFullYear() + 2);
                            cargoExpiry = formatDateOnly(d.toISOString().slice(0, 10));
                          }
                        }
                        const items = [
                          { label: 'Cargo Training', value: v.cargoTrainingDate ? formatDateOnly(v.cargoTrainingDate)! : 'Pending', detail: cargoExpiry ? `Expires: ${cargoExpiry}` : null, status: cargoStatus },
                          { label: 'Dangerous Goods Training', value: v.dangerousGoodsTrainingDate ? formatDateOnly(v.dangerousGoodsTrainingDate)! : 'Pending', detail: null, status: getSingleTrainingStatus(v.dangerousGoodsTrainingDate) },
                          { label: 'Manual Handling Training', value: v.manualHandlingTrainingDate ? formatDateOnly(v.manualHandlingTrainingDate)! : 'Pending', detail: null, status: getSingleTrainingStatus(v.manualHandlingTrainingDate) },
                          { label: 'DHL Training Number', value: v.dhlTrainingNumber || 'N/A', detail: null, status: null as string | null },
                        ];
                        return items.map((item) => {
                          const title = item.status === 'active' ? 'Complete' : item.status === 'warning' ? 'Expiring Soon' : item.status === 'expiring' ? 'Expired' : 'Pending';
                          return (
                            <div className="vendor-info-modal-item vendor-info-modal-item--has-flag" key={item.label}>
                              <div className="vendor-info-modal-item-label-wrap">
                                {item.status && <span className={`vendor-info-modal-flag vendor-info-modal-flag--${item.status}`} title={title} />}
                                <div className="vendor-info-modal-item-head">
                                  <span className="vendor-info-modal-item-label">{item.label}</span>
                                  {item.detail && <span className="vendor-info-modal-item-detail">{item.detail}</span>}
                                </div>
                              </div>
                              <div>
                                {item.status ? (
                                  <span className={`status-badge status-badge-${item.status}`}>{item.value}</span>
                                ) : (
                                  <span className="vendor-info-modal-item-value">{item.value}</span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()
                    ) : (
                      (() => {
                        const v = infoVendor;
                        const docItems = [
                          { label: 'Criminal Record Check', value: v.criminalRecordDate ? formatDateOnly(v.criminalRecordDate)! : 'Pending', status: getDocumentItemStatus('criminalRecord', v) },
                          { label: 'DVLA Check', value: v.dvlaCheckDate ? formatDateOnly(v.dvlaCheckDate)! : 'Pending', status: getDocumentItemStatus('dvlaCheck', v) },
                          { label: 'Visa Validity', value: v.visaValidity ? formatDateOnly(v.visaValidity)! : 'N/A', status: getDocumentItemStatus('visa', v) },
                          { label: 'Driving Licence Expiry', value: v.licenceExpiringDate ? formatDateOnly(v.licenceExpiringDate)! : 'N/A', status: getDocumentItemStatus('licence', v) },
                          { label: 'Passport Expiry', value: v.passportExpiringDate ? formatDateOnly(v.passportExpiringDate)! : 'N/A', status: getDocumentItemStatus('passport', v) },
                        ];
                        return docItems.map((item) => (
                          <div className="vendor-info-modal-item vendor-info-modal-item--has-flag" key={item.label}>
                            <div className="vendor-info-modal-item-label-wrap">
                              {item.status && <span className={`vendor-info-modal-flag vendor-info-modal-flag--${item.status}`} />}
                              <span className="vendor-info-modal-item-label">{item.label}</span>
                            </div>
                            <div>
                              {item.status ? (
                                <span className={`status-badge status-badge-${item.status === 'verified' ? 'verified' : item.status}`}>{item.value}</span>
                              ) : (
                                <span className="vendor-info-modal-item-value">{item.value}</span>
                              )}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* ===================== Driver Detail modal (custom, liquid glass) ===================== */}
      {driverDetailId !== null &&
        driverDetailVendor &&
        createPortal(
          <>
            <div className="driver-detail-modal-backdrop sp-modal-backdrop-anim" onClick={() => setDriverDetailId(null)} />
            <div className="driver-detail-modal-wrap" role="dialog" aria-modal="true" aria-labelledby="driverDetailModalTitle">
              <div className="driver-detail-modal liquid-glass-modal sp-modal-anim" onClick={(e) => e.stopPropagation()}>
                <div className="driver-detail-modal-header">
                  <div className="driver-detail-modal-header-inner">
                    <span className="driver-detail-modal-badge">Driver</span>
                    <h2 id="driverDetailModalTitle" className="driver-detail-modal-title">
                      {`${driverDetailVendor.firstName || ''} ${driverDetailVendor.lastName || ''}`.trim() || '—'}
                    </h2>
                  </div>
                  <button type="button" className="driver-detail-modal-close" aria-label="Close" onClick={() => setDriverDetailId(null)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
                <div className="driver-detail-modal-body">
                  <div className="driver-detail-qr-wrap">
                    <p className="driver-detail-qr-label">QR Code</p>
                    {/* The static page loads QRCode.js from a CDN (cdnjs qrcodejs);
                        this SPA doesn't bundle that library, so — same as the
                        original's own `typeof QRCode === 'undefined'` fallback
                        branch — it renders the "library not loaded" placeholder. */}
                    <div className="driver-detail-qr-box">QR library not loaded</div>
                  </div>
                  <div className="driver-detail-grid">
                    {[
                      {
                        title: 'Personal',
                        rows: [
                          ['Courier ID', driverDetailVendor.courierId || computeCourierId(driverDetailVendor.firstName || '', driverDetailVendor.lastName || '')],
                          ['First name', driverDetailVendor.firstName || '—'],
                          ['Last name', driverDetailVendor.lastName || '—'],
                          ['Email', driverDetailVendor.email || '—'],
                          ['Phone', driverDetailVendor.phone || '—'],
                          ['Date of birth', driverDetailVendor.dob ? formatDateOnly(driverDetailVendor.dob) || '—' : '—'],
                        ],
                      },
                      {
                        title: 'Contract',
                        rows: [
                          ['Depot', driverDetailVendor.depot || '—'],
                          ['Vendor Type', vendorTypeLabel(driverDetailVendor)],
                          ['Route', driverDetailVendor.route || '—'],
                          ['Start date', formatDateOnly(driverDetailVendor.startDate) || '—'],
                          ['Finish date', formatDateOnly(driverDetailVendor.finishDate) || '—'],
                          ['Status', driverDetailVendor.status || '—'],
                        ],
                      },
                      {
                        title: 'Training',
                        rows: [
                          ['Cargo training date', driverDetailVendor.cargoTrainingDate ? formatDateOnly(driverDetailVendor.cargoTrainingDate) || '—' : '—'],
                          ['Dangerous goods training date', driverDetailVendor.dangerousGoodsTrainingDate ? formatDateOnly(driverDetailVendor.dangerousGoodsTrainingDate) || '—' : '—'],
                          ['Manual handling training date', driverDetailVendor.manualHandlingTrainingDate ? formatDateOnly(driverDetailVendor.manualHandlingTrainingDate) || '—' : '—'],
                          ['DHL Training Number', driverDetailVendor.dhlTrainingNumber || '—'],
                        ],
                      },
                      {
                        title: 'Compliance',
                        rows: [
                          ['Criminal record check date', driverDetailVendor.criminalRecordDate ? formatDateOnly(driverDetailVendor.criminalRecordDate) || '—' : '—'],
                          ['DBS Number', driverDetailVendor.dbsNumber || '—'],
                          ['DVLA check date', driverDetailVendor.dvlaCheckDate ? formatDateOnly(driverDetailVendor.dvlaCheckDate) || '—' : '—'],
                          ['Visa validity', driverDetailVendor.visaValidity ? formatDateOnly(driverDetailVendor.visaValidity) || '—' : '—'],
                          ['Licence expiring date', driverDetailVendor.licenceExpiringDate ? formatDateOnly(driverDetailVendor.licenceExpiringDate) || '—' : '—'],
                          ['Passport expiring date', driverDetailVendor.passportExpiringDate ? formatDateOnly(driverDetailVendor.passportExpiringDate) || '—' : '—'],
                        ],
                      },
                    ].map((sec) => (
                      <section className="driver-detail-section" key={sec.title}>
                        <h3 className="driver-detail-section-title">{sec.title}</h3>
                        {sec.rows.map(([label, value]) => (
                          <div className="driver-detail-row" key={label}>
                            <span className="driver-detail-row-label">{label}</span>
                            <span className="driver-detail-row-value">{value}</span>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </PortalLayout>
  );
}
