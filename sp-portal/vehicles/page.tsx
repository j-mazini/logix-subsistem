'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { BeamSidebar } from '../components/BeamSidebar';
import { useBodyClass } from '../components/useBodyClass';
import { useMotionRefinements } from '../components/useMotionRefinements';
import { getCurrentSp, MOCK_VEHICLES, MOCK_CONTRACTS, type MockVehicle } from '../components/mockData';
import '../styles/vendor-admin-view.css';
import '../styles/shared-pages.css';
import '../styles/sp-portal-shared.css';
import '../styles/liquid-glass.css';
import '../styles/modern-ui.css';
import '../styles/refinements-v2.css';
import '../styles/refinements-v3-motion.css';
import './vehicles.css';

interface Vehicle extends Partial<MockVehicle> {
  id: number;
  vrn?: string;
  brand?: string;
  model?: string;
  registrationDate?: string;
  color?: string;
  fuelType?: string;
  vehicleType?: string;
  depot?: string;
  status?: string;
  wrappedVehicle?: boolean;
  slamLock?: boolean;
  camera?: boolean;
  gps?: boolean;
  bulkhead?: boolean;
  doors270?: boolean;
  additionalNotes?: string;
  serviceProvider?: string;
  vin?: string | null;
}

type SortKey = 'vrn' | 'brand' | 'model' | 'registrationDate' | 'fuelType' | 'status';

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return '—';
  const parts = String(dateStr).trim().split('-');
  if (parts.length < 3) return dateStr;
  const day = parts[2].split('T')[0].split(' ')[0];
  return `${day || parts[2]}/${parts[1]}/${parts[0]}`;
}

function getCurrentDateYMD() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM: Vehicle = {
  id: 0, vrn: '', brand: '', model: '', registrationDate: '', color: '', fuelType: 'Diesel', vehicleType: '', depot: '', status: 'Active',
  wrappedVehicle: false, slamLock: false, camera: false, gps: false, bulkhead: false, doors270: false, additionalNotes: '',
};

export default function VehiclesPage() {
  useBodyClass('has-beam-sidebar sp-portal');
  useMotionRefinements();

  const searchParams = useSearchParams();
  const [spName, setSpName] = useState('');
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fuelFilter, setFuelFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('vrn');
  const [sortDir, setSortDir] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Add New Vehicle');
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [form, setForm] = useState<Vehicle>(EMPTY_FORM);

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [detailVehicleId, setDetailVehicleId] = useState<number | null>(null);
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

  const allVehicles = useMemo((): Vehicle[] => {
    const mock = MOCK_VEHICLES.filter((v) => v.serviceProvider === spName);
    const byId = new Map<number, Vehicle>();
    mock.forEach((v) => byId.set(v.id, { ...v, status: 'Active' }));
    localVehicles.forEach((v) => byId.set(v.id, v));
    return [...byId.values()];
  }, [spName, localVehicles]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = allVehicles.filter((v) => {
      const vrn = (v.vrn || '').toLowerCase();
      const brand = (v.brand || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      if (q && !vrn.includes(q) && !brand.includes(q) && !model.includes(q)) return false;
      if (statusFilter !== 'all' && (v.status || 'Active') !== statusFilter) return false;
      if (fuelFilter !== 'all' && (v.fuelType || '') !== fuelFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const av = String(a[sortKey] ?? (sortKey === 'status' ? 'Active' : '')).toLowerCase();
      const bv = String(b[sortKey] ?? (sortKey === 'status' ? 'Active' : '')).toLowerCase();
      return sortDir * (av < bv ? -1 : av > bv ? 1 : 0);
    });
    return list;
  }, [allVehicles, searchQuery, statusFilter, fuelFilter, sortKey, sortDir]);

  const metrics = useMemo(() => {
    const total = allVehicles.length;
    const active = allVehicles.filter((v) => (v.status || 'Active') === 'Active').length;
    const inactive = allVehicles.filter((v) => v.status === 'Inactive').length;
    const available = allVehicles.filter((v) => v.status === 'Available').length;
    return { total, active, inactive, available };
  }, [allVehicles]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function openAddModal() {
    setEditingVehicleId(null);
    setFormTitle('Add New Vehicle');
    setForm({ ...EMPTY_FORM, registrationDate: getCurrentDateYMD(), depot: depots[0] || '' });
    setFormOpen(true);
  }

  function openEditModal(vehicleId: number) {
    const v = allVehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    setEditingVehicleId(vehicleId);
    setFormTitle('Edit Vehicle');
    setForm({
      ...EMPTY_FORM,
      ...v,
      fuelType: (v.fuelType || 'Diesel') === 'Electric' ? 'Electric' : 'Diesel',
    });
    setFormOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vrn || !form.brand || !form.model || !form.registrationDate || !form.color || !form.depot) return;

    if (editingVehicleId !== null) {
      setLocalVehicles((prev) => {
        const idx = prev.findIndex((x) => x.id === editingVehicleId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...form, id: editingVehicleId, serviceProvider: spName };
          return next;
        }
        const existing = allVehicles.find((x) => x.id === editingVehicleId);
        if (existing) return [...prev, { ...existing, ...form, id: existing.id, serviceProvider: spName }];
        return prev;
      });
    } else {
      const maxId = Math.max(0, ...MOCK_VEHICLES.map((v) => v.id), ...localVehicles.map((v) => v.id));
      setLocalVehicles((prev) => [...prev, { ...form, id: maxId + 1, serviceProvider: spName, vin: null }]);
    }
    setFormOpen(false);
  }

  function confirmDelete() {
    if (deleteTargetId == null) return;
    setLocalVehicles((prev) => prev.filter((v) => v.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  const deleteTarget = deleteTargetId != null ? allVehicles.find((v) => v.id === deleteTargetId) : null;
  const detailVehicle = detailVehicleId != null ? allVehicles.find((v) => v.id === detailVehicleId) : null;

  useEffect(() => {
    if (!detailVehicle) {
      setQrDataUrl('');
      return;
    }
    const qrText = `Registration Plate: ${detailVehicle.vrn || '—'}\nVehicle ID: ${detailVehicle.id}`;
    QRCode.toDataURL(qrText, { width: 180, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [detailVehicle]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && detailVehicleId != null) setDetailVehicleId(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detailVehicleId]);

  function exportExcel() {
    const headers = ['VRN', 'Manufacturer', 'Model', 'Registration Date', 'Fuel Type', 'Status'];
    const rows = filteredSorted.map((v) =>
      [v.vrn || '', v.brand || '', v.model || '', formatDateDisplay(v.registrationDate), v.fuelType || '', v.status || 'Active']
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), rows.join('\n')].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vehicles-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportOpen(false);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'vrn', label: 'VRN' },
    { key: 'brand', label: 'Manufacturer' },
    { key: 'model', label: 'Model' },
    { key: 'registrationDate', label: 'Registration Date' },
    { key: 'fuelType', label: 'Fuel Type' },
    { key: 'status', label: 'Status' },
  ];

  const spInitials = spName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className="sidebar-gap" id="sidebarGap" aria-hidden="true" />
      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <div className="liquid-glass-page-bg" aria-hidden="true" />
        <div className="page-container">
          <div className="page-inner">
            <main className="vendor-admin-main pt-4">
              {!spName && (
                <div className="alert alert-warning">
                  Service Provider not set. Open with <code>?sp=YourCompany</code>.
                </div>
              )}

              {spName && (
                <div id="spVehicleContent">
                  <div className="admin-header d-flex flex-wrap align-items-center gap-2">
                    <h1 className="admin-header-title">Vehicles</h1>
                    <div className="admin-header-search flex-grow-1">
                      <input type="search" className="form-control" placeholder="VRN, Brand, Model, Registration date..." autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="admin-header-user-pill d-flex align-items-center">
                      <span className="admin-header-user-avatar admin-header-user-avatar-fallback">{spInitials}</span>
                      <span className="admin-header-user-name">{spName}</span>
                    </div>
                  </div>

                  <div className="vendor-page-metrics mb-3" aria-label="Vehicle counts">
                    <div className="vendor-page-metric"><span className="vendor-page-metric-label">Total</span><span className="vendor-page-metric-value">{metrics.total}</span></div>
                    <div className="vendor-page-metric"><span className="vendor-page-metric-label">Active</span><span className="vendor-page-metric-value">{metrics.active}</span></div>
                    <div className="vendor-page-metric"><span className="vendor-page-metric-label">Inactive</span><span className="vendor-page-metric-value">{metrics.inactive}</span></div>
                    <div className="vendor-page-metric"><span className="vendor-page-metric-label">Available</span><span className="vendor-page-metric-value">{metrics.available}</span></div>
                  </div>

                  <div className="admin-filters" id="adminFilters">
                    <div className="admin-filters-row row g-2 align-items-end flex-wrap">
                      <div className="col-auto">
                        <label className="admin-filter-label form-label">Status</label>
                        <select className="admin-filter-select form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <option value="all">All</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="col-auto">
                        <label className="admin-filter-label form-label">Fuel type</label>
                        <select className="admin-filter-select form-select form-select-sm" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                          <option value="all">All</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                        </select>
                      </div>
                      <div className="col-auto">
                        <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>New</button>
                      </div>
                      <div className="col-auto">
                        <div className="dropdown">
                          <button type="button" className="admin-filter-clear btn btn-outline-secondary btn-sm" onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen}>Export</button>
                          <ul className={`dropdown-menu dropdown-menu-end${exportOpen ? ' show' : ''}`}>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); exportExcel(); }}>Excel</a></li>
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); setExportOpen(false); window.print(); }}>PDF</a></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrap table-responsive">
                    <table className="table table-hover align-middle vehicles-table">
                      <thead>
                        <tr>
                          {columns.map((col) => (
                            <th key={col.key} className={`text-center vehicles-th-sort${sortKey === col.key ? (sortDir === 1 ? ' asc' : ' desc') : ''}`} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer' }}>
                              {col.label}
                            </th>
                          ))}
                          <th className="text-center vehicles-th-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSorted.map((v) => {
                          const status = v.status || 'Active';
                          const isLocal = localVehicles.some((lv) => lv.id === v.id);
                          const vrnClass = `vehicles-vrn-plate${v.fuelType === 'Electric' ? ' vehicles-vrn-electric' : ''}`;
                          const statusClass = status === 'Active' ? 'status-badge-active' : status === 'Inactive' ? 'status-badge-inactive' : status === 'Maintenance' ? 'status-badge-maintenance' : 'status-badge-default';
                          return (
                            <tr key={v.id} role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => setDetailVehicleId(v.id)}>
                              <td><span className={vrnClass}>{v.vrn || '—'}</span></td>
                              <td>{v.brand || '—'}</td>
                              <td>{v.model || '—'}</td>
                              <td>{formatDateDisplay(v.registrationDate)}</td>
                              <td>
                                {v.fuelType === 'Electric' ? (
                                  <span className="d-inline-flex align-items-center justify-content-center gap-1"><i className="bi bi-lightning-charge-fill text-success" title="Electric" /> Electric</span>
                                ) : (
                                  v.fuelType || '—'
                                )}
                              </td>
                              <td><span className={`status-badge ${statusClass}`}>{status}</span></td>
                              <td>
                                <div className="d-flex justify-content-center gap-1">
                                  <button type="button" className="vehicles-action-btn" aria-label="Edit vehicle" onClick={(e) => { e.stopPropagation(); openEditModal(v.id); }}>
                                    <i className="bi bi-pencil-fill" />
                                  </button>
                                  {isLocal && (
                                    <button type="button" className="vehicles-action-btn vehicles-action-delete" aria-label="Delete vehicle" onClick={(e) => { e.stopPropagation(); setDeleteTargetId(v.id); }}>
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
                    {filteredSorted.length === 0 && <div className="vehicles-table-empty">No vehicles match the current filters.</div>}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {formOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
            <div className="modal-content vehicle-modal-content">
              <div className="modal-header vehicle-modal-header border-0">
                <h5 className="modal-title">{formTitle}</h5>
                <button type="button" className="vehicle-modal-close btn-close" aria-label="Close" onClick={() => setFormOpen(false)} />
              </div>
              <div className="modal-body vehicle-modal-body">
                <form onSubmit={handleFormSubmit}>
                  <div className="vehicle-modal-section">
                    <h6 className="vehicle-modal-section-title">Basic Information</h6>
                    <div className="vehicle-modal-grid-2 row g-4">
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Registration Plate <span className="required">*</span></label>
                        <input type="text" className="vehicle-modal-input form-control" placeholder="e.g., AB12CDE" required value={form.vrn} onChange={(e) => setForm({ ...form, vrn: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Manufacturer <span className="required">*</span></label>
                        <input type="text" className="vehicle-modal-input form-control" placeholder="e.g., Ford, Toyota, BMW" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Model <span className="required">*</span></label>
                        <input type="text" className="vehicle-modal-input form-control" placeholder="e.g., Focus, Corolla" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Registration Date <span className="required">*</span></label>
                        <input type="date" className="vehicle-modal-input form-control" required value={form.registrationDate} onChange={(e) => setForm({ ...form, registrationDate: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Color <span className="required">*</span></label>
                        <input type="text" className="vehicle-modal-input form-control" placeholder="e.g., Blue, Red, Black" required value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Fuel Type</label>
                        <select className="vehicle-modal-select form-select" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Vehicle Type</label>
                        <select className="vehicle-modal-select form-select" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                          <option value="">Select Vehicle Type</option>
                          <option value="Van">Van</option>
                          <option value="Car">Car</option>
                          <option value="Rigid">Rigid</option>
                          <option value="HGV">HGV</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Depot <span className="required">*</span></label>
                        <select className="vehicle-modal-select form-select" required value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })}>
                          {depots.map((d) => (
                            <option value={d} key={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="vehicle-modal-section">
                    <h6 className="vehicle-modal-section-title">Status</h6>
                    <div className="vehicle-modal-grid-2 row g-4">
                      <div className="col-md-6">
                        <label className="vehicle-modal-label">Status</label>
                        <select className="vehicle-modal-select form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="vehicle-modal-section">
                    <h6 className="vehicle-modal-section-title">Technical Information</h6>
                    <div className="vehicle-modal-grid-4 row g-4">
                      {([
                        ['wrappedVehicle', 'Wrapped'],
                        ['slamLock', 'Slam Lock'],
                        ['camera', 'Camera'],
                        ['gps', 'GPS'],
                        ['bulkhead', 'Bulkhead'],
                        ['doors270', '270° Doors'],
                      ] as const).map(([key, label]) => (
                        <div className="col-6 col-md-4" key={key}>
                          <div className="vehicle-modal-check-wrap">
                            <input type="checkbox" className="form-check-input" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} id={key} />
                            <label htmlFor={key}>{label}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="vehicle-modal-section">
                    <h6 className="vehicle-modal-section-title">Additional Information</h6>
                    <div>
                      <label className="vehicle-modal-label">Additional Notes</label>
                      <textarea className="vehicle-modal-textarea form-control" rows={3} placeholder="Optional notes..." value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })} />
                    </div>
                  </div>

                  <div className="vehicle-modal-footer border-top mt-3 pt-3">
                    <button type="button" className="btn-cancel btn btn-outline-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
                    <button type="submit" className="btn-save btn btn-primary">Save Vehicle</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vehicle Modal */}
      {deleteTargetId != null && deleteTarget && (
        <div className="modal fade vehicle-delete-modal show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setDeleteTargetId(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-2">Are you sure you want to delete the vehicle with VRN <span className={`vehicles-vrn-plate${deleteTarget.fuelType === 'Electric' ? ' vehicles-vrn-electric' : ''}`}>{deleteTarget.vrn || '—'}</span>?</p>
                <p className="text-danger small mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-top bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTargetId(null)}>Cancel</button>
                <button type="button" className="btn btn-danger d-inline-flex align-items-center gap-2" onClick={confirmDelete}>
                  <i className="bi bi-trash-fill" />
                  <span>Delete Vehicle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {detailVehicle && (
        <>
          <div className="vehicle-detail-modal-backdrop" aria-hidden="true" onClick={() => setDetailVehicleId(null)} />
          <div className="vehicle-detail-modal-wrap" role="dialog" aria-modal="true">
            <div className="vehicle-detail-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vehicle-detail-modal-header">
                <div className="vehicle-detail-modal-header-inner">
                  <span className="vehicle-detail-modal-badge">Vehicle</span>
                  <h2 className="vehicle-detail-modal-title">{`${detailVehicle.brand || ''} ${(detailVehicle.model || '').trim()}`.trim() || detailVehicle.vrn || '—'}</h2>
                </div>
                <button type="button" className="vehicle-detail-modal-close" aria-label="Close" onClick={() => setDetailVehicleId(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="vehicle-detail-modal-body">
                <div className="vehicle-detail-qr-wrap">
                  <p className="vehicle-detail-qr-label">QR Code</p>
                  <div className="vehicle-detail-qr-box">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {qrDataUrl && <img src={qrDataUrl} alt="Vehicle QR code" width={180} height={180} />}
                  </div>
                </div>
                <div className="vehicle-detail-grid">
                  {[
                    { title: 'General', rows: [
                      { label: 'Vehicle ID', value: String(detailVehicle.id) },
                      { label: 'Registration Plate', value: detailVehicle.vrn || '—' },
                      { label: 'VIN', value: detailVehicle.vin || '—' },
                      { label: 'Brand', value: detailVehicle.brand || '—' },
                      { label: 'Model', value: detailVehicle.model || '—' },
                      { label: 'Color', value: detailVehicle.color || '—' },
                      { label: 'Registration Date', value: formatDateDisplay(detailVehicle.registrationDate) },
                      { label: 'Fuel Type', value: detailVehicle.fuelType || '—' },
                      { label: 'Vehicle Type', value: detailVehicle.vehicleType || '—' },
                      { label: 'Depot', value: detailVehicle.depot || '—' },
                      { label: 'Status', value: detailVehicle.status || 'Active' },
                    ] },
                    { title: 'Technical', rows: [
                      { label: 'Wrapped', value: detailVehicle.wrappedVehicle ? 'Yes' : 'No' },
                      { label: 'Slam Lock', value: detailVehicle.slamLock ? 'Yes' : 'No' },
                      { label: 'Camera', value: detailVehicle.camera ? 'Yes' : 'No' },
                      { label: 'GPS', value: detailVehicle.gps ? 'Yes' : 'No' },
                      { label: 'Bulkhead', value: detailVehicle.bulkhead ? 'Yes' : 'No' },
                      { label: '270° Doors', value: detailVehicle.doors270 ? 'Yes' : 'No' },
                    ] },
                  ].map((sec) => (
                    <section className="vehicle-detail-section" key={sec.title}>
                      <h3 className="vehicle-detail-section-title">{sec.title}</h3>
                      {sec.rows.map((r) => (
                        <div className="vehicle-detail-row" key={r.label}>
                          <span className="vehicle-detail-row-label">{r.label}</span>
                          <span className="vehicle-detail-row-value">{r.value}</span>
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
