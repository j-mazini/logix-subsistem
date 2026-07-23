import { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from '../../layout/AdminHeaderUserPill';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import { getRawVehicles, getDepotsForSp, formatDateDisplay, getCurrentDateYMD, type RawVehicle } from '../../data/vehiclesData';
import '../../styles/legacy/vehicles-lsphere.css';
import { VehiclePageHeader } from './components/VehiclePageHeader';
import { VehicleFilters } from './components/VehicleFilters';
import { MobileVehicleFilters } from './components/MobileVehicleFilters';
import { VehicleTable } from './components/VehicleTable';
import { VehicleCardGrid } from './components/VehicleCardGrid';
import { Pagination } from './components/Pagination';
import { VehicleFormModal, type VehicleFormState } from './components/VehicleFormModal';
import { DeleteVehicleModal } from './components/DeleteVehicleModal';
import { VehicleDetailModal } from './components/VehicleDetailModal';
import type { SortDir, SortKey } from './components/types';

const BLANK_FORM: VehicleFormState = {
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

function vehicleToForm(v: RawVehicle): VehicleFormState {
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

  // Page-scoped body class: vehicles-lsphere.css's `body.vehicles-page`
  // rule flips the shell to the light LogixSphere theme (same technique
  // as Route Balance) — this page never imports the portal dark CSS.
  useEffect(() => {
    document.body.classList.add('vehicles-page');
    return () => {
      document.body.classList.remove('vehicles-page');
    };
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [fuelFilter, setFuelFilter] = useState<'all' | 'Diesel' | 'Electric'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('vrn');
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Vehicles added/edited in this session, keyed by id — overlays the mock
  // data exactly like vehicles.js's module-level `localVehicles` array did.
  const [localVehicles, setLocalVehicles] = useState<RawVehicle[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState<VehicleFormState>(BLANK_FORM);
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

  // Reset to page 1 whenever the filtered set changes shape.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, fuelFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / itemsPerPage));
  const pageSafe = Math.min(currentPage, totalPages);
  const pagedVehicles = useMemo(
    () => filteredSorted.slice((pageSafe - 1) * itemsPerPage, pageSafe * itemsPerPage),
    [filteredSorted, pageSafe, itemsPerPage],
  );

  const metricTotal = allVehicles.length;
  const metricActive = allVehicles.filter((v) => (v.status || 'Active') === 'Active').length;
  const metricInactive = allVehicles.filter((v) => (v.status || '') === 'Inactive').length;
  const metricAvailable = allVehicles.filter((v) => (v.status || '') === 'Available').length;

  function isLocal(id: number) {
    return localVehicles.some((lv) => lv.id === id);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1) as SortDir);
    else {
      setSortKey(key);
      setSortDir(1);
    }
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

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setLocalVehicles((prev) => prev.filter((v) => v.id !== id));
    setDeleteTarget(null);
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
      <PortalLayout mainClassName="vehicles-page-main" title="Vehicles">
        <div className="alert alert-warning">
          Service Provider not set. Open with <code>?sp=YourCompany</code>.
        </div>
      </PortalLayout>
    );
  }

  const header = (
    <>
      <div className="vp-sp-pill-row">
        <AdminHeaderPill sp={sp} controls={menuControls} />
      </div>
      <AdminHeaderMenu sp={sp} controls={menuControls} />
    </>
  );

  const metrics = [
    { label: 'Total', value: metricTotal },
    { label: 'Active', value: metricActive },
    { label: 'Inactive', value: metricInactive },
    { label: 'Available', value: metricAvailable },
  ];

  return (
    <PortalLayout mainClassName="vehicles-page-main" header={header}>
      <div className="vehicles-page-container">
        <VehiclePageHeader title="Vehicles" subtitle="Vehicle fleet management" metrics={metrics} />

        {/* Desktop */}
        <div className="vp-desktop-main">
          <VehicleFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            fuelFilter={fuelFilter}
            onFuelFilterChange={setFuelFilter}
            onAddClick={openAddModal}
            onExportExcel={exportExcel}
            onExportPdf={() => window.print()}
          />
          <VehicleTable
            vehicles={pagedVehicles}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={setDetailVehicle}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            isDeletable={isLocal}
          />
          <Pagination
            currentPage={pageSafe}
            totalPages={totalPages}
            totalItems={filteredSorted.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(n) => {
              setItemsPerPage(n);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Mobile */}
        <div className="vp-mobile-main">
          <MobileVehicleFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            fuelFilter={fuelFilter}
            onFuelFilterChange={setFuelFilter}
            onAddClick={openAddModal}
          />
          <VehicleCardGrid
            vehicles={pagedVehicles}
            onCardClick={setDetailVehicle}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            isDeletable={isLocal}
          />
          <Pagination
            currentPage={pageSafe}
            totalPages={totalPages}
            totalItems={filteredSorted.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(n) => {
              setItemsPerPage(n);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <VehicleFormModal
        open={showFormModal}
        isEditing={editingId !== null}
        formData={formData}
        onChange={setFormData}
        depots={depots}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
      />

      {deleteTarget && (
        <DeleteVehicleModal
          vrn={deleteTarget.vrn || ''}
          isElectric={deleteTarget.fuelType === 'Electric'}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {detailVehicle && <VehicleDetailModal vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />}
    </PortalLayout>
  );
}
