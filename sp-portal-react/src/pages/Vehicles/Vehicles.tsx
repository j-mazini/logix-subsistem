import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from '../../layout/AdminHeaderUserPill';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import {
  getRawVehicles,
  getDepotsForSp,
  formatDateDisplay,
  getCurrentDateYMD,
  type RawVehicle,
} from '../../data/vehiclesData';
import '../../styles/legacy/shared-pages.css';
import '../../styles/legacy/vehicles.css';

type SortKey = 'vrn' | 'brand' | 'model' | 'registrationDate' | 'fuelType' | 'status';

interface FormState {
  vrn: string;
  brand: string;
  model: string;
  registrationDate: string;
  color: string;
  fuelType: string;
  vehicleType: string;
  depot: string;
  status: string;
  wrappedVehicle: boolean;
  slamLock: boolean;
  camera: boolean;
  gps: boolean;
  bulkhead: boolean;
  doors270: boolean;
  additionalNotes: string;
}

const BLANK_FORM: FormState = {
  vrn: '',
  brand: '',
  model: '',
  registrationDate: '',
  color: '',
  fuelType: 'Diesel',
  vehicleType: '',
  depot: '',
  status: 'Active',
  wrappedVehicle: false,
  slamLock: false,
  camera: false,
  gps: false,
  bulkhead: false,
  doors270: false,
  additionalNotes: '',
};

function statusBadgeClass(s: string): string {
  if (s === 'Active') return 'status-badge-active';
  if (s === 'Inactive') return 'status-badge-inactive';
  if (s === 'Maintenance') return 'status-badge-maintenance';
  return 'status-badge-default';
}

function vehicleToForm(v: RawVehicle): FormState {
  return {
    vrn: v.vrn || '',
    brand: v.brand || '',
    model: v.model || '',
    registrationDate: v.registrationDate || '',
    color: v.color || '',
    fuelType: (v.fuelType || 'Diesel') === 'Electric' ? 'Electric' : 'Diesel',
    vehicleType: v.vehicleType || '',
    depot: v.depot || '',
    status: v.status || 'Active',
    wrappedVehicle: !!v.wrappedVehicle,
    slamLock: !!v.slamLock,
    camera: !!v.camera,
    gps: !!v.gps,
    bulkhead: !!v.bulkhead,
    doors270: !!v.doors270,
    additionalNotes: v.additionalNotes || '',
  };
}

export function Vehicles() {
  const sp = useCurrentSp();
  const menuControls = useAdminHeaderPill();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [fuelFilter, setFuelFilter] = useState<'all' | 'Diesel' | 'Electric'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('vrn');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  // Vehicles added/edited in this session, keyed by id — overlays the mock
  // data exactly like vehicles.js's module-level `localVehicles` array did.
  const [localVehicles, setLocalVehicles] = useState<RawVehicle[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState<FormState>(BLANK_FORM);
  const [deleteTarget, setDeleteTarget] = useState<RawVehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<RawVehicle | null>(null);

  const depots = useMemo(() => getDepotsForSp(sp), [sp]);

  const allVehicles = useMemo(() => {
    const mock = getRawVehicles().filter((v) => v.serviceProvider === sp);
    const byId: Record<number, RawVehicle> = {};
    mock.forEach((v) => {
      byId[v.id] = { ...v, status: v.status === undefined ? 'Active' : v.status };
    });
    localVehicles.forEach((v) => {
      byId[v.id] = v;
    });
    return Object.values(byId);
  }, [sp, localVehicles]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allVehicles.filter((v) => {
      const vrn = (v.vrn || '').toLowerCase();
      const brand = (v.brand || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      if (q && vrn.indexOf(q) === -1 && brand.indexOf(q) === -1 && model.indexOf(q) === -1) return false;
      if (statusFilter !== 'all' && (v.status || 'Active') !== statusFilter) return false;
      if (fuelFilter !== 'all' && (v.fuelType || '') !== fuelFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let va: string;
      let vb: string;
      switch (sortKey) {
        case 'vrn':
          va = (a.vrn || '').toLowerCase();
          vb = (b.vrn || '').toLowerCase();
          break;
        case 'brand':
          va = (a.brand || '').toLowerCase();
          vb = (b.brand || '').toLowerCase();
          break;
        case 'model':
          va = (a.model || '').toLowerCase();
          vb = (b.model || '').toLowerCase();
          break;
        case 'registrationDate':
          va = a.registrationDate || '';
          vb = b.registrationDate || '';
          break;
        case 'fuelType':
          va = (a.fuelType || '').toLowerCase();
          vb = (b.fuelType || '').toLowerCase();
          break;
        case 'status':
          va = (a.status || 'Active').toLowerCase();
          vb = (b.status || 'Active').toLowerCase();
          break;
        default:
          va = '';
          vb = '';
      }
      return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
    });
    return list;
  }, [allVehicles, search, statusFilter, fuelFilter, sortKey, sortDir]);

  const metricTotal = allVehicles.length;
  const metricActive = allVehicles.filter((v) => (v.status || 'Active') === 'Active').length;
  const metricInactive = allVehicles.filter((v) => (v.status || '') === 'Inactive').length;
  const metricAvailable = allVehicles.filter((v) => (v.status || '') === 'Available').length;

  function isLocal(id: number) {
    return localVehicles.some((lv) => lv.id === id);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function sortThClass(key: SortKey) {
    if (sortKey !== key) return 'text-center vehicles-th-sort';
    return `text-center vehicles-th-sort ${sortDir === 1 ? 'asc' : 'desc'}`;
  }

  function openAddModal() {
    setEditingId(null);
    setFormData({ ...BLANK_FORM, registrationDate: getCurrentDateYMD(), depot: depots[0] || '' });
    setShowFormModal(true);
  }

  function openEditModal(v: RawVehicle) {
    setEditingId(v.id);
    setFormData(vehicleToForm(v));
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = formData;
    if (!fd.vrn.trim() || !fd.brand.trim() || !fd.model.trim() || !fd.registrationDate || !fd.color.trim() || !fd.depot) return;

    const cleaned = {
      vrn: fd.vrn.trim(),
      brand: fd.brand.trim(),
      model: fd.model.trim(),
      registrationDate: fd.registrationDate,
      color: fd.color.trim(),
      fuelType: fd.fuelType,
      vehicleType: fd.vehicleType || undefined,
      depot: fd.depot,
      status: fd.status,
      wrappedVehicle: fd.wrappedVehicle,
      slamLock: fd.slamLock,
      camera: fd.camera,
      gps: fd.gps,
      bulkhead: fd.bulkhead,
      doors270: fd.doors270,
      additionalNotes: fd.additionalNotes.trim() || undefined,
    };

    if (editingId !== null) {
      setLocalVehicles((prev) => {
        const idx = prev.findIndex((x) => x.id === editingId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...cleaned, id: editingId, serviceProvider: sp };
          return next;
        }
        const existing = allVehicles.find((x) => x.id === editingId);
        if (existing) {
          return [...prev, { ...existing, ...cleaned, id: existing.id, serviceProvider: sp }];
        }
        return prev;
      });
    } else {
      const maxId = Math.max(0, ...getRawVehicles().map((v) => v.id), ...localVehicles.map((v) => v.id));
      setLocalVehicles((prev) => [...prev, { ...cleaned, id: maxId + 1, serviceProvider: sp, vin: null }]);
    }

    setShowFormModal(false);
  }

  function openDeleteModal(v: RawVehicle) {
    setDeleteTarget(v);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setLocalVehicles((prev) => prev.filter((v) => v.id !== id));
    setDeleteTarget(null);
  }

  function openDetailModal(v: RawVehicle) {
    setDetailVehicle(v);
  }

  function closeDetailModal() {
    setDetailVehicle(null);
  }

  function exportExcel() {
    const list = filteredSorted;
    const headers = ['VRN', 'Manufacturer', 'Model', 'Registration Date', 'Fuel Type', 'Status'];
    const rows = list.map((v) =>
      [v.vrn || '', v.brand || '', v.model || '', formatDateDisplay(v.registrationDate), v.fuelType || '', v.status || 'Active']
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), rows.join('\n')].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vehicles-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!sp) {
    return (
      <PortalLayout mainClassName="vendor-admin-main pt-4" title="Vehicles">
        <div id="spNotFound" className="alert alert-warning">
          Service Provider not set. Open with <code>?sp=YourCompany</code>.
        </div>
      </PortalLayout>
    );
  }

  const header = (
    <>
      <div className="admin-header d-flex flex-wrap align-items-center gap-2">
        <h1 className="admin-header-title">Vehicles</h1>
        <div className="admin-header-search flex-grow-1">
          <input
            type="search"
            id="vehicleSearch"
            className="form-control"
            placeholder="VRN, Brand, Model, Registration date..."
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AdminHeaderPill sp={sp} controls={menuControls} />
      </div>
      <AdminHeaderMenu sp={sp} controls={menuControls} />
    </>
  );

  return (
    <PortalLayout mainClassName="vendor-admin-main pt-4" header={header}>
      <div id="spVehicleContent">
        <div className="vendor-page-metrics mb-3" aria-label="Vehicle counts">
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Total</span>
            <span className="vendor-page-metric-value">{metricTotal}</span>
          </div>
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Active</span>
            <span className="vendor-page-metric-value">{metricActive}</span>
          </div>
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Inactive</span>
            <span className="vendor-page-metric-value">{metricInactive}</span>
          </div>
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Available</span>
            <span className="vendor-page-metric-value">{metricAvailable}</span>
          </div>
        </div>

        <div className="admin-filters" id="adminFilters">
          <div className="admin-filters-row row g-2 align-items-end flex-wrap">
            <div className="col-auto">
              <label className="admin-filter-label form-label" htmlFor="vehicleStatusFilter">
                Status
              </label>
              <select
                id="vehicleStatusFilter"
                className="admin-filter-select form-select form-select-sm"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive')}
              >
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="col-auto">
              <label className="admin-filter-label form-label" htmlFor="vehicleFuelFilter">
                Fuel type
              </label>
              <select
                id="vehicleFuelFilter"
                className="admin-filter-select form-select form-select-sm"
                aria-label="Filter by fuel type"
                value={fuelFilter}
                onChange={(e) => setFuelFilter(e.target.value as 'all' | 'Diesel' | 'Electric')}
              >
                <option value="all">All</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div className="col-auto">
              <button type="button" className="btn btn-primary btn-sm" id="addVehicleBtn" onClick={openAddModal}>
                New
              </button>
            </div>
            <div className="col-auto">
              <div className="dropdown">
                <button
                  type="button"
                  className="admin-filter-clear btn btn-outline-secondary btn-sm"
                  id="vehicleExportBtn"
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
                      id="vehicleExportExcel"
                      onClick={(e) => {
                        e.preventDefault();
                        exportExcel();
                      }}
                    >
                      Excel
                    </a>
                  </li>
                  <li>
                    <a
                      className="dropdown-item"
                      href="#"
                      id="vehicleExportPdf"
                      onClick={(e) => {
                        e.preventDefault();
                        window.print();
                      }}
                    >
                      PDF
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="table-wrap table-responsive">
          <table className="table table-hover align-middle vehicles-table">
            <thead>
              <tr>
                <th className={sortThClass('vrn')} onClick={() => handleSort('vrn')}>
                  VRN
                </th>
                <th className={sortThClass('brand')} onClick={() => handleSort('brand')}>
                  Manufacturer
                </th>
                <th className={sortThClass('model')} onClick={() => handleSort('model')}>
                  Model
                </th>
                <th className={sortThClass('registrationDate')} onClick={() => handleSort('registrationDate')}>
                  Registration Date
                </th>
                <th className={sortThClass('fuelType')} onClick={() => handleSort('fuelType')}>
                  Fuel Type
                </th>
                <th className={sortThClass('status')} onClick={() => handleSort('status')}>
                  Status
                </th>
                <th className="text-center vehicles-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody id="vehicleTableBody">
              {filteredSorted.map((v) => {
                const status = v.status || 'Active';
                const vrnClass = `vehicles-vrn-plate${v.fuelType === 'Electric' ? ' vehicles-vrn-electric' : ''}`;
                return (
                  <tr
                    key={v.id}
                    data-vehicle-id={v.id}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDetailModal(v)}
                  >
                    <td>
                      <span className={vrnClass}>{v.vrn || '—'}</span>
                    </td>
                    <td>{v.brand || '—'}</td>
                    <td>{v.model || '—'}</td>
                    <td>{formatDateDisplay(v.registrationDate)}</td>
                    <td>
                      {v.fuelType === 'Electric' ? (
                        <span className="d-inline-flex align-items-center justify-content-center gap-1">
                          <i className="bi bi-lightning-charge-fill text-success" title="Electric" /> Electric
                        </span>
                      ) : (
                        v.fuelType || '—'
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${statusBadgeClass(status)}`}>{status}</span>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center gap-1">
                        <button
                          type="button"
                          className="vehicles-action-btn"
                          aria-label="Edit vehicle"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(v);
                          }}
                        >
                          <i className="bi bi-pencil-fill" />
                        </button>
                        {isLocal(v.id) && (
                          <button
                            type="button"
                            className="vehicles-action-btn vehicles-action-delete"
                            aria-label="Delete vehicle"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(v);
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
          {filteredSorted.length === 0 && (
            <div id="vehicleEmptyState" className="vehicles-table-empty">
              No vehicles match the current filters.
            </div>
          )}
        </div>
      </div>

      {/* VehicleModal (Add/Edit) — Bootstrap's .modal is position:fixed, so
          this portals past the liquid-glass-page-bg's backdrop-filter
          containing block (same issue/fix as Dashboard's modal). Only
          Bootstrap's CSS is loaded here (no bootstrap.bundle.min.js), so
          show/hide is a conditional render instead of the JS plugin. */}
      {showFormModal &&
        createPortal(
          <>
            <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} aria-labelledby="vehicleModalTitle" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
                <div className="modal-content vehicle-modal-content">
                <div className="modal-header vehicle-modal-header border-0">
                  <h5 id="vehicleModalTitle" className="modal-title">
                    {editingId !== null ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h5>
                  <button type="button" className="vehicle-modal-close btn-close" aria-label="Close" onClick={closeFormModal} />
                </div>
                <div className="modal-body vehicle-modal-body">
                  <form id="vehicleForm" onSubmit={handleFormSubmit}>
                    <div className="vehicle-modal-section">
                      <h6 className="vehicle-modal-section-title">Basic Information</h6>
                      <div className="vehicle-modal-grid-2 row g-4">
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="vrn">
                            Registration Plate <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            id="vrn"
                            className="vehicle-modal-input form-control"
                            placeholder="e.g., AB12CDE"
                            required
                            minLength={1}
                            value={formData.vrn}
                            onChange={(e) => setFormData((f) => ({ ...f, vrn: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="brand">
                            Manufacturer <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            id="brand"
                            className="vehicle-modal-input form-control"
                            placeholder="e.g., Ford, Toyota, BMW"
                            required
                            value={formData.brand}
                            onChange={(e) => setFormData((f) => ({ ...f, brand: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="model">
                            Model <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            id="model"
                            className="vehicle-modal-input form-control"
                            placeholder="e.g., Focus, Corolla"
                            required
                            value={formData.model}
                            onChange={(e) => setFormData((f) => ({ ...f, model: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="registrationDate">
                            Registration Date <span className="required">*</span>
                          </label>
                          <input
                            type="date"
                            id="registrationDate"
                            className="vehicle-modal-input form-control"
                            required
                            value={formData.registrationDate}
                            onChange={(e) => setFormData((f) => ({ ...f, registrationDate: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="color">
                            Color <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            id="color"
                            className="vehicle-modal-input form-control"
                            placeholder="e.g., Blue, Red, Black"
                            required
                            value={formData.color}
                            onChange={(e) => setFormData((f) => ({ ...f, color: e.target.value }))}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="fuelType">
                            Fuel Type
                          </label>
                          <select
                            id="fuelType"
                            className="vehicle-modal-select form-select"
                            value={formData.fuelType}
                            onChange={(e) => setFormData((f) => ({ ...f, fuelType: e.target.value }))}
                          >
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="vehicleType">
                            Vehicle Type
                          </label>
                          <select
                            id="vehicleType"
                            className="vehicle-modal-select form-select"
                            value={formData.vehicleType}
                            onChange={(e) => setFormData((f) => ({ ...f, vehicleType: e.target.value }))}
                          >
                            <option value="">Select Vehicle Type</option>
                            <option value="Van">Van</option>
                            <option value="Car">Car</option>
                            <option value="Rigid">Rigid</option>
                            <option value="HGV">HGV</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="depot">
                            Depot <span className="required">*</span>
                          </label>
                          <select
                            id="depot"
                            className="vehicle-modal-select form-select"
                            required
                            value={formData.depot}
                            onChange={(e) => setFormData((f) => ({ ...f, depot: e.target.value }))}
                          >
                            {depots.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="vehicle-modal-section">
                      <h6 className="vehicle-modal-section-title">Status</h6>
                      <div className="vehicle-modal-grid-2 row g-4">
                        <div className="col-md-6">
                          <label className="vehicle-modal-label" htmlFor="status">
                            Status
                          </label>
                          <select
                            id="status"
                            className="vehicle-modal-select form-select"
                            value={formData.status}
                            onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="vehicle-modal-section">
                      <h6 className="vehicle-modal-section-title">Technical Information</h6>
                      <div className="vehicle-modal-grid-4 row g-4">
                        {(
                          [
                            ['wrappedVehicle', 'Wrapped'],
                            ['slamLock', 'Slam Lock'],
                            ['camera', 'Camera'],
                            ['gps', 'GPS'],
                            ['bulkhead', 'Bulkhead'],
                            ['doors270', '270° Doors'],
                          ] as const
                        ).map(([key, label]) => (
                          <div className="col-6 col-md-4" key={key}>
                            <div className="vehicle-modal-check-wrap">
                              <input
                                type="checkbox"
                                id={key}
                                className="form-check-input"
                                checked={formData[key]}
                                onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.checked }))}
                              />
                              <label htmlFor={key}>{label}</label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="vehicle-modal-section">
                      <h6 className="vehicle-modal-section-title">Additional Information</h6>
                      <div>
                        <label className="vehicle-modal-label" htmlFor="additionalNotes">
                          Additional Notes
                        </label>
                        <textarea
                          id="additionalNotes"
                          className="vehicle-modal-textarea form-control"
                          rows={3}
                          placeholder="Optional notes..."
                          value={formData.additionalNotes}
                          onChange={(e) => setFormData((f) => ({ ...f, additionalNotes: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="vehicle-modal-footer border-top mt-3 pt-3">
                      <button type="button" className="btn-cancel btn btn-outline-secondary" onClick={closeFormModal}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-save btn btn-primary" id="vehicleFormSubmit">
                        Save Vehicle
                      </button>
                    </div>
                  </form>
                </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" onClick={closeFormModal} />
          </>,
          document.body,
        )}

      {/* DeleteVehicleModal */}
      {deleteTarget &&
        createPortal(
          <>
            <div className="modal fade show vehicle-delete-modal" style={{ display: 'block' }} tabIndex={-1} aria-labelledby="deleteVehicleModalTitle" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title" id="deleteVehicleModalTitle">
                      Confirm Delete
                    </h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setDeleteTarget(null)} />
                  </div>
                  <div className="modal-body">
                    <p className="mb-2">
                      Are you sure you want to delete the vehicle with VRN{' '}
                      <span className={`vehicles-vrn-plate${deleteTarget.fuelType === 'Electric' ? ' vehicles-vrn-electric' : ''}`}>
                        {deleteTarget.vrn || '—'}
                      </span>
                      ?
                    </p>
                    <p className="text-danger small mb-0">This action cannot be undone.</p>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-danger d-inline-flex align-items-center gap-2" onClick={confirmDelete}>
                      <i className="bi bi-trash-fill" />
                      <span>Delete Vehicle</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" onClick={() => setDeleteTarget(null)} />
          </>,
          document.body,
        )}

      {/* Vehicle Detail Modal — QR library isn't loaded in this SPA (same
          as the original's own fallback branch when `typeof QRCode ===
          'undefined'`), so the QR box always shows that fallback text. */}
      {detailVehicle &&
        createPortal(
          <>
            <div className="vehicle-detail-modal-backdrop" onClick={closeDetailModal} />
            <div className="vehicle-detail-modal-wrap" role="dialog" aria-modal="true" aria-labelledby="vehicleDetailModalTitle">
              <div className="vehicle-detail-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vehicle-detail-modal-header">
                  <div className="vehicle-detail-modal-header-inner">
                    <span className="vehicle-detail-modal-badge">Vehicle</span>
                    <h2 id="vehicleDetailModalTitle" className="vehicle-detail-modal-title">
                      {`${detailVehicle.brand || ''} ${(detailVehicle.model || '').trim()}`.trim() || detailVehicle.vrn || '—'}
                    </h2>
                  </div>
                  <button type="button" className="vehicle-detail-modal-close" aria-label="Close" onClick={closeDetailModal}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
                <div className="vehicle-detail-modal-body">
                  <div className="vehicle-detail-qr-wrap">
                    <p className="vehicle-detail-qr-label">QR Code</p>
                    <div className="vehicle-detail-qr-box">QR library not loaded</div>
                  </div>
                  <div className="vehicle-detail-grid">
                    <section className="vehicle-detail-section">
                      <h3 className="vehicle-detail-section-title">General</h3>
                      {[
                        ['Vehicle ID', String(detailVehicle.id)],
                        ['Registration Plate', detailVehicle.vrn || '—'],
                        ['VIN', detailVehicle.vin || '—'],
                        ['Brand', detailVehicle.brand || '—'],
                        ['Model', detailVehicle.model || '—'],
                        ['Color', detailVehicle.color || '—'],
                        ['Registration Date', formatDateDisplay(detailVehicle.registrationDate)],
                        ['Fuel Type', detailVehicle.fuelType || '—'],
                        ['Vehicle Type', detailVehicle.vehicleType || '—'],
                        ['Depot', detailVehicle.depot || '—'],
                        ['Status', detailVehicle.status || 'Active'],
                      ].map(([label, value]) => (
                        <div className="vehicle-detail-row" key={label}>
                          <span className="vehicle-detail-row-label">{label}</span>
                          <span className="vehicle-detail-row-value">{value}</span>
                        </div>
                      ))}
                    </section>
                    <section className="vehicle-detail-section">
                      <h3 className="vehicle-detail-section-title">Technical</h3>
                      {[
                        ['Wrapped', detailVehicle.wrappedVehicle ? 'Yes' : 'No'],
                        ['Slam Lock', detailVehicle.slamLock ? 'Yes' : 'No'],
                        ['Camera', detailVehicle.camera ? 'Yes' : 'No'],
                        ['GPS', detailVehicle.gps ? 'Yes' : 'No'],
                        ['Bulkhead', detailVehicle.bulkhead ? 'Yes' : 'No'],
                        ['270° Doors', detailVehicle.doors270 ? 'Yes' : 'No'],
                      ].map(([label, value]) => (
                        <div className="vehicle-detail-row" key={label}>
                          <span className="vehicle-detail-row-label">{label}</span>
                          <span className="vehicle-detail-row-value">{value}</span>
                        </div>
                      ))}
                    </section>
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
