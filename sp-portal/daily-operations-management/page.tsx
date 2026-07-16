'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react';
import { BeamSidebar } from '../components/BeamSidebar';
import { useBodyClass } from '../components/useBodyClass';
import './style.css';

/* ---------- deterministic PRNG (ported verbatim) ---------- */
function hashStringToSeed(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

const TABLE_HEADERS = ['Route', 'Name', 'Payment Mode', 'Vehicle', 'Rate', 'Sort', 'Sort Value', 'Extras', 'Notes', 'Vendor type'];
const TABLE_HEADERS_SUBMITTED = [...TABLE_HEADERS, 'AD-HOC Service'];
const TABLE_HEADERS_NOT_ALLOCATED = ['Route', 'Name', 'Vendor type'];
const TABLE_HEADERS_ADHOC = ['Route', 'Vendor', 'Vehicle', 'AD-HOC Service', 'AD-HOC Sort', 'Extra', 'Notes'];

function getHeaderLabel(header: string) {
  if (header === 'Extras') return 'Extras - Qty Hour';
  if (header === 'Extra') return 'Extra';
  if (header === 'Name' || header === 'Vendor') return 'Vendor';
  if (header === 'AD-HOC Service') return 'adhoc-service';
  return header;
}
function renderCellValue(value: any) {
  if (value === null || value === undefined) return '-';
  const str = String(value);
  return str.trim() === '' ? '-' : str;
}
function decimalHoursToTimeString(value: any) {
  if (value === undefined || value === null || value === '') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return '';
  let h = Math.floor(n);
  const m = Math.min(59, Math.max(0, Math.round((n - h) * 60)));
  if (h >= 24) h = 23;
  return `${String(h).padStart(2, '0')}:${String(Math.min(59, m)).padStart(2, '0')}`;
}
function timeStringToDecimalHours(s: string) {
  if (!s) return undefined;
  const m = s.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return undefined;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60) return undefined;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

interface Rec {
  [key: string]: any;
  id: string;
  userId: number | null;
  Name: string;
  Route: string;
  Vehicle: string;
  vehicleFuelType?: string;
  paymentModeId: number | string;
  Rate: number | string;
  Sort: string;
  SortLate: boolean;
  routeSort: number | string;
  adhocServiceId: number | string;
  Extras: number | string;
  Notes: string;
  Status: string;
  isDayOff: boolean;
  isSubmitted: boolean;
  depositId: number | null;
  servicePartnerId: number | null;
}

type ModalMode = 'record' | 'adhoc' | 'dayoff';
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }
let toastSeq = 0;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyOperationsManagementPage() {
  useBodyClass('dom-page has-beam-sidebar');

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVendorType, setFilterVendorType] = useState('all');
  const [filterServicePartnerId, setFilterServicePartnerId] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const [submittedKindFilter, setSubmittedKindFilter] = useState('all');
  const [submittedVendorTypeFilter, setSubmittedVendorTypeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'Route', direction: 'asc' });
  const [validatedKeys, setValidatedKeys] = useState<Set<string>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, forceRender] = useState(0);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('record');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Rec | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Rec | null>(null);
  const [rateModalRow, setRateModalRow] = useState<Rec | null>(null);
  const [notesPopover, setNotesPopover] = useState<{ note: string; top: number; left: number; below: boolean } | null>(null);

  const recordsByDate = useRef(new Map<string, Rec[]>());
  const idCounter = useRef(0);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  /* ==================== MASTER DATA ==================== */
  const master = useMemo(() => {
    const rng = rngForSeed('dom-master-data-v1');

    const deposits = [
      { depositId: 1, depositName: 'Maidstone' },
      { depositId: 2, depositName: 'Chatham' },
      { depositId: 3, depositName: 'Dartford' },
      { depositId: 4, depositName: 'Ashford' },
      { depositId: 7, depositName: 'BAOP' },
    ];
    const vendorTypes = [
      { vendorTypeId: 1, nameType: 'Owner Driver' },
      { vendorTypeId: 2, nameType: 'Multi Drop' },
      { vendorTypeId: 3, nameType: 'Courier Company' },
      { vendorTypeId: 4, nameType: 'Van Owner' },
    ];
    const costModels = [
      { costModelId: 1, name: 'DAF' },
      { costModelId: 2, name: 'DR' },
      { costModelId: 3, name: 'FSR' },
      { costModelId: 4, name: 'VSR' },
      { costModelId: 5, name: 'Hourly Rate' },
      { costModelId: 6, name: 'Per Stop' },
      { costModelId: 7, name: 'Extra Hours' },
      { costModelId: 12, name: 'SP_VSR' },
    ];
    const BANDED_COST_MODEL_IDS = [1, 4, 12];
    const adhocServices = [
      { adhocServiceId: 1, adhocName: 'Additional Collection', adhocVendorPayment: 15 },
      { adhocServiceId: 2, adhocName: 'Redelivery', adhocVendorPayment: 8 },
      { adhocServiceId: 3, adhocName: 'Bulky Item Handling', adhocVendorPayment: 20 },
      { adhocServiceId: 4, adhocName: 'Out of Hours Run', adhocVendorPayment: 35 },
      { adhocServiceId: 5, adhocName: 'Return to Depot', adhocVendorPayment: 10 },
    ];
    const servicePartners = [
      { servicePartnerId: 1, partnerName: 'Swift Logistics' },
      { servicePartnerId: 2, partnerName: 'Kent Express' },
    ];

    const routes: { routeId: number; routeName: string; depositId: number }[] = [];
    let rid = 1;
    for (const dep of deposits.filter((d) => d.depositId !== 7)) {
      const prefix = dep.depositName.slice(0, 3).toUpperCase();
      for (let i = 1; i <= 4; i++) routes.push({ routeId: rid++, routeName: `${prefix}-${String(i).padStart(2, '0')}`, depositId: dep.depositId });
    }
    routes.push({ routeId: rid++, routeName: 'NALC', depositId: 7 });
    routes.push({ routeId: rid++, routeName: 'DHOC', depositId: 7 });

    const fuelTypes = ['Diesel', 'Diesel', 'Diesel', 'Petrol', 'EV'];
    const vehicles = Array.from({ length: 26 }, (_, i) => {
      const letter = String.fromCharCode(65 + (i % 26));
      const plate = `V${letter}${String(10 + i).padStart(2, '0')} ${['ABC', 'DEF', 'GHJ', 'KLM', 'NPQ'][i % 5]}`;
      return { vehicleId: i + 1, registrationPlates: plate, model: ['Transit', 'Sprinter', 'Crafter', 'Vivaro', 'Boxer'][i % 5], fuel_type: fuelTypes[i % fuelTypes.length] };
    });

    const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Jack', 'Amelia', 'Olivia', 'Isla', 'Ava', 'Sophia', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Diego', 'Marta', 'Tomasz', 'Anna', 'Piotr', 'Elena', 'Marcus', 'Chloe', 'Ethan', 'Grace'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Ferreira', 'Kowalski', 'Nowak', 'Popescu', 'Ionescu', 'Murphy', 'Walsh'];
    const vendors = Array.from({ length: 26 }, (_, i) => {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
      const vendorTypeId = vendorTypes[i % vendorTypes.length].vendorTypeId;
      const isBAOP = i >= 24;
      const dep = isBAOP ? deposits.find((d) => d.depositId === 7)! : deposits[i % 4];
      const routesForDep = routes.filter((r) => r.depositId === dep.depositId && !['NALC', 'DHOC'].includes(r.routeName));
      const route = routesForDep.length ? routesForDep[i % routesForDep.length] : routes[0];
      const vehicle = vehicles[i % vehicles.length];
      const cmPool = [2, 2, 3, 5, 6, 7, 1, 4, 12];
      const costModelId = cmPool[i % cmPool.length];
      return {
        userId: 1000 + i, fullName, vendorTypeId, depositId: dep.depositId, routeId: route.routeId, vehicleId: vehicle.vehicleId, costModelId,
        isSort: rng() > 0.25, isLate: rng() > 0.8, routeSortValue: rng() > 0.5 ? 20 : 1, fixedRate: 95 + Math.round(rng() * 60),
        servicePartnerId: rng() > 0.8 ? servicePartners[i % servicePartners.length].servicePartnerId : null, isBAOP,
      };
    });

    return { deposits, vendorTypes, costModels, BANDED_COST_MODEL_IDS, adhocServices, servicePartners, routes, vehicles, vendors };
  }, []);

  function getCostModelName(id: any) {
    const cm = master.costModels.find((c) => c.costModelId === Number(id));
    return cm ? cm.name : '';
  }
  function isBandedCostModelId(id: any) {
    return master.BANDED_COST_MODEL_IDS.includes(Number(id));
  }
  function buildRateBands(costModelId: any) {
    const rng = rngForSeed(`bands-${costModelId}-${selectedDate}`);
    const bands: { min: number; max: number | null; price: string }[] = [];
    let min = 0;
    for (let i = 0; i < 4; i++) {
      const span = 10 + Math.floor(rng() * 15);
      const max = i === 3 ? null : min + span;
      const price = (1.4 + i * 0.35 + rng() * 0.2).toFixed(2);
      bands.push({ min, max, price });
      min = max != null ? max + 1 : min;
    }
    return bands;
  }

  function makeRecordId() {
    idCounter.current += 1;
    return `dom-${idCounter.current}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function generateRecordsForDate(date: string): Rec[] {
    const rng = rngForSeed(`dom-records-${date}`);
    const records: Rec[] = [];
    const notesPool = ['Vehicle serviced this morning', 'Vendor requested late start', 'Covering extra loop', 'Please confirm arrival time', ''];

    for (const vendor of master.vendors) {
      const roll = rng();
      const vendorType = master.vendorTypes.find((t) => t.vendorTypeId === vendor.vendorTypeId);
      const isSubmitted = roll < 0.14;
      let status = 'Working';
      if (!isSubmitted) {
        if (roll < 0.14 + 0.09) status = 'Off';
        else if (roll < 0.14 + 0.09 + 0.09) status = 'NotAllocated';
      }

      const route = master.routes.find((r) => r.routeId === vendor.routeId);
      const vehicle = master.vehicles.find((v) => v.vehicleId === vendor.vehicleId);
      const deposit = master.deposits.find((d) => d.depositId === vendor.depositId);
      const costModelId = vendor.costModelId;
      const isBanded = isBandedCostModelId(costModelId);
      const isFixed = costModelId === 2 || costModelId === 3;
      const isHourly = costModelId === 7;

      const base = {
        id: makeRecordId(), userId: vendor.userId, Name: vendor.fullName, 'Vendor type': vendorType ? vendorType.nameType : '',
        servicePartnerId: vendor.servicePartnerId, isSubmitted,
      };

      if (status === 'Off') {
        records.push({ ...base, Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '', Rate: '', Sort: 'No', SortLate: false, routeSort: '', 'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '', Extras: '', Notes: rng() > 0.7 ? 'Booked holiday' : '', Status: 'Off', isDayOff: true, depositId: null, 'Deposit Name': '' });
        continue;
      }
      if (status === 'NotAllocated') {
        records.push({ ...base, Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '', Rate: '', Sort: 'No', SortLate: false, routeSort: '', 'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '', Extras: '', Notes: '', Status: 'NotAllocated', isDayOff: false, depositId: null, 'Deposit Name': '' });
        continue;
      }

      const rate = isBanded ? '' : isFixed ? vendor.fixedRate : Math.round((8 + rng() * 12) * 100) / 100;
      const extras = isHourly ? Math.round((rng() * 3 * 4)) / 4 : rng() > 0.6 ? Math.round(rng() * 20) : 0;
      const sortYes = vendor.isSort;
      records.push({
        ...base, Route: route ? route.routeName : '', Vehicle: vehicle ? vehicle.registrationPlates : 'NOVEHICLE', vehicleFuelType: vehicle ? vehicle.fuel_type : '',
        'Payment Mode': getCostModelName(costModelId), paymentModeId: costModelId, Rate: rate, Sort: sortYes ? 'Yes' : 'No', SortLate: sortYes ? vendor.isLate : false,
        routeSort: sortYes ? vendor.routeSortValue : '', 'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '', Extras: extras, Notes: notesPool[Math.floor(rng() * notesPool.length)],
        Status: 'Working', isDayOff: false, depositId: vendor.depositId, 'Deposit Name': deposit ? deposit.depositName : '',
      });

      if (!vendor.isBAOP && rng() < 0.22) {
        const service = master.adhocServices[Math.floor(rng() * master.adhocServices.length)];
        records.push({
          id: makeRecordId(), userId: vendor.userId, Name: vendor.fullName, 'Vendor type': vendorType ? vendorType.nameType : '', servicePartnerId: vendor.servicePartnerId,
          depositId: vendor.depositId, 'Deposit Name': deposit ? deposit.depositName : '', isSubmitted: false, Route: 'DHOC', Vehicle: vehicle ? vehicle.registrationPlates : 'NOVEHICLE',
          vehicleFuelType: vehicle ? vehicle.fuel_type : '', 'Payment Mode': getCostModelName(2), paymentModeId: 2, Rate: '', Sort: 'No', SortLate: false, routeSort: '',
          'AD-HOC Sort': String(service.adhocVendorPayment), 'AD-HOC Service': service.adhocName, adhocServiceId: service.adhocServiceId, Extras: Math.round(rng() * 10), Notes: '',
          Status: 'Working', isDayOff: false,
        });
      }
    }
    return records;
  }

  function getRecords(): Rec[] {
    if (!recordsByDate.current.has(selectedDate)) recordsByDate.current.set(selectedDate, generateRecordsForDate(selectedDate));
    return recordsByDate.current.get(selectedDate)!;
  }
  const records = getRecords();

  function rerender() {
    forceRender((n) => n + 1);
  }

  function changeDate(delta: number) {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    setDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  }
  function setDate(date: string) {
    setSelectedDate(date);
    setValidatedKeys(new Set());
    setSubmittedSearchTerm('');
    setSubmittedKindFilter('all');
    setSubmittedVendorTypeFilter('all');
  }

  const header = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const dateUK = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7);
    return `${dayName} - ${dateUK} - Week ${String(week).padStart(2, '0')}`;
  }, [selectedDate]);

  const metrics = useMemo(() => {
    const total = records.length;
    const working = records.filter((r) => r.Status === 'Working' && !r.isSubmitted).length;
    const off = records.filter((r) => r.Status === 'Off').length;
    const notAllocated = records.filter((r) => r.Status === 'NotAllocated').length;
    const submitted = records.filter((r) => r.isSubmitted).length;
    return [
      { label: 'Total Records', value: total }, { label: 'Working', value: working }, { label: 'Day off', value: off },
      { label: 'Not allocated', value: notAllocated }, { label: 'Submitted', value: submitted }, { label: 'Selected', value: validatedKeys.size },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, validatedKeys]);

  function getFilteredRecords(): Rec[] {
    const term = searchTerm.trim().toLowerCase();
    return records.filter((item) => {
      if (filterStatus !== 'all') {
        const rowIsOff = item.Status === 'Off';
        const rowIsNotAlloc = item.Status === 'NotAllocated';
        if (filterStatus === 'Working') { if (!rowIsOff && !rowIsNotAlloc && item.Status !== 'Working') return false; }
        else if (filterStatus === 'Off') { if (!rowIsOff) return false; }
        else if (filterStatus === 'NotAllocated') { if (!rowIsNotAlloc) return false; }
      }
      if (filterVendorType !== 'all' && (item['Vendor type'] || '').toLowerCase() !== filterVendorType.toLowerCase()) return false;
      if (filterServicePartnerId !== '' && (item.servicePartnerId == null || String(item.servicePartnerId) !== filterServicePartnerId)) return false;
      if (term) {
        const hay = `${item.Name || ''} ${item.Route || ''} ${item.Vehicle || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }

  function getAllSubmittedRowsUnfiltered() {
    return records.filter((r) => r.isSubmitted);
  }
  function matchesSubmittedKind(row: Rec, kind: string) {
    if (kind === 'all') return true;
    const isDayOff = Boolean(row.isDayOff);
    if (kind === 'dayoff') return isDayOff;
    if (kind === 'notallocated') return !isDayOff && (row.Status === 'NotAllocated' || row.depositId === 7);
    if (kind === 'routes') return !isDayOff && row.depositId !== 7;
    return true;
  }
  function getSubmittedRows(): Rec[] {
    let rows = getAllSubmittedRowsUnfiltered();
    if (filterVendorType !== 'all') rows = rows.filter((r) => (r['Vendor type'] || '').toLowerCase() === filterVendorType.toLowerCase());
    const term = searchTerm.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${r.Name} ${r.Route} ${r.Vehicle}`.toLowerCase().includes(term));
    if (submittedKindFilter !== 'all') rows = rows.filter((r) => matchesSubmittedKind(r, submittedKindFilter));
    if (submittedVendorTypeFilter !== 'all') rows = rows.filter((r) => (r['Vendor type'] || '').toLowerCase() === submittedVendorTypeFilter.toLowerCase());
    const subTerm = submittedSearchTerm.trim().toLowerCase();
    if (subTerm) rows = rows.filter((r) => `${r.Name} ${r.Route} ${r.Vehicle} ${r['Deposit Name']} ${r.Notes}`.toLowerCase().includes(subTerm));
    rows = [...rows].sort((a, b) => String(a.Name).localeCompare(String(b.Name), undefined, { sensitivity: 'base' }));
    return rows;
  }

  function groupIntoBlocks(rows: Rec[]) {
    const groups = new Map<string, Rec[]>();
    for (const item of rows) {
      let key: string;
      if (item.depositId === 7) key = 'BAOP';
      else if (item.isDayOff || item.Status === 'Off') key = 'OFF';
      else if (item.Status === 'NotAllocated') key = 'NOTALLOC';
      else key = String(item.depositId != null ? item.depositId : item['Deposit Name'] || '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    const blocks: { key: string; label: string; rows: Rec[] }[] = [];
    if (groups.has('OFF')) blocks.push({ key: 'OFF', label: 'Day off', rows: groups.get('OFF')! });
    if (groups.has('NOTALLOC')) blocks.push({ key: 'NOTALLOC', label: 'Not allocated', rows: groups.get('NOTALLOC')! });
    for (const dep of master.deposits.filter((d) => d.depositId !== 7)) {
      const key = String(dep.depositId);
      if (groups.has(key)) blocks.push({ key, label: dep.depositName, rows: groups.get(key)! });
    }
    if (groups.has('BAOP')) blocks.push({ key: 'BAOP', label: 'BAOP', rows: groups.get('BAOP')! });
    return blocks;
  }

  function applySort(rows: Rec[]) {
    const map: Record<string, string> = { Vendor: 'Name', Extra: 'Extras', 'Sort Value': 'routeSort' };
    const field = map[sortConfig.key] || sortConfig.key;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = String(a[field] ?? '').trim();
      const bv = String(b[field] ?? '').trim();
      return dir * av.localeCompare(bv, undefined, { sensitivity: 'base' });
    });
  }

  function hasAdhocService(row: Rec) {
    const label = String(row['AD-HOC Service'] || '').trim();
    return label !== '' && label.toLowerCase() !== 'null';
  }
  function isEligibleForValidation(item: Rec) {
    return !item.isSubmitted;
  }

  function handleSort(key: string) {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  }

  function toggleValidated(id: string) {
    setValidatedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllInBlock(blockKey: string, eligible: Rec[]) {
    if (eligible.length === 0) return;
    setValidatedKeys((prev) => {
      const allSelected = eligible.every((r) => prev.has(r.id));
      const next = new Set(prev);
      eligible.forEach((r) => {
        if (allSelected) next.delete(r.id);
        else next.add(r.id);
      });
      return next;
    });
  }

  function handleBatchSubmit() {
    if (validatedKeys.size === 0) return;
    let count = 0;
    records.forEach((r) => {
      if (validatedKeys.has(r.id)) {
        r.isSubmitted = true;
        count++;
      }
    });
    setValidatedKeys(new Set());
    showToast(`${count} record(s) submitted successfully.`, 'success');
    rerender();
  }

  function openNotesPopover(e: React.MouseEvent, note: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const top = rect.top - 10 + window.scrollY;
    const left = rect.left + rect.width / 2 + window.scrollX;
    setNotesPopover({ note, top, left, below: top < 80 });
  }

  function openRateModal(id: string) {
    const item = records.find((r) => r.id === id);
    if (item) setRateModalRow(item);
  }

  function openDeleteModal(id: string) {
    const item = records.find((r) => r.id === id);
    if (item) setDeleteTarget(item);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    const item = deleteTarget;
    const sameDayCount = records.filter((r) => r.userId === item.userId).length;
    if (sameDayCount > 1) {
      recordsByDate.current.set(selectedDate, records.filter((r) => r.id !== item.id));
      showToast('Record deleted.', 'success');
    } else {
      Object.assign(item, { Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '', Rate: '', Sort: 'No', SortLate: false, routeSort: '', 'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '', Status: 'NotAllocated', isDayOff: false, depositId: null, 'Deposit Name': '' });
      showToast('Vendor moved to Not Allocated.', 'success');
    }
    setValidatedKeys((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    setDeleteTarget(null);
    rerender();
  }

  function blankFormData(mode: ModalMode): Rec {
    const base: Rec = {
      id: '', userId: null, Name: '', Route: '', 'Payment Mode': '', paymentModeId: '', Rate: '', Sort: 'Yes', SortLate: false, routeSort: '',
      'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '', Extras: '', Notes: '', Vehicle: '', vehicleFuelType: '', 'Vendor type': '',
      Status: 'Working', depositId: null, 'Deposit Name': '', servicePartnerId: null, isDayOff: false, isSubmitted: false,
    };
    if (mode === 'dayoff') return { ...base, Route: 'OFF', Vehicle: 'NOVEHICLE', Status: 'Off', isDayOff: true };
    if (mode === 'adhoc') return { ...base, 'Payment Mode': getCostModelName(2), paymentModeId: 2, Sort: 'No' };
    return base;
  }

  function applyVendorDefaults(fd: Rec, vendorName: string, mode: ModalMode): Rec {
    const vendor = master.vendors.find((v) => v.fullName === vendorName);
    if (!vendor) return fd;
    const next = { ...fd };
    const vendorType = master.vendorTypes.find((t) => t.vendorTypeId === vendor.vendorTypeId);
    next.userId = vendor.userId;
    next['Vendor type'] = vendorType ? vendorType.nameType : '';
    next.servicePartnerId = vendor.servicePartnerId;

    if (mode === 'dayoff' || next.Status === 'Off' || next.Status === 'NotAllocated') return next;

    const route = master.routes.find((r) => r.routeId === vendor.routeId);
    const vehicle = master.vehicles.find((v) => v.vehicleId === vendor.vehicleId);
    const deposit = master.deposits.find((d) => d.depositId === vendor.depositId);
    next.Vehicle = vehicle ? vehicle.registrationPlates : 'NOVEHICLE';
    next.vehicleFuelType = vehicle ? vehicle.fuel_type : '';
    next.depositId = vendor.depositId;
    next['Deposit Name'] = deposit ? deposit.depositName : '';

    if (mode === 'adhoc') return next;

    next.Route = route ? route.routeName : '';
    next.paymentModeId = vendor.costModelId;
    next['Payment Mode'] = getCostModelName(vendor.costModelId);
    const isFixed = vendor.costModelId === 2 || vendor.costModelId === 3;
    const isBanded = isBandedCostModelId(vendor.costModelId);
    next.Rate = isBanded ? '' : isFixed ? vendor.fixedRate : '';
    next.Sort = vendor.isSort ? 'Yes' : 'No';
    next.SortLate = vendor.isSort ? vendor.isLate : false;
    next.routeSort = vendor.isSort ? vendor.routeSortValue : '';
    return next;
  }

  function openCreateModal(mode: ModalMode) {
    setModalMode(mode);
    setEditingId(null);
    setFormData(blankFormData(mode));
    setRecordModalOpen(true);
  }
  function openEditModal(id: string) {
    const item = records.find((r) => r.id === id);
    if (!item) return;
    setEditingId(id);
    setModalMode(hasAdhocService(item) ? 'adhoc' : 'record');
    setFormData({ ...item });
    setRecordModalOpen(true);
  }
  function closeRecordModal() {
    setRecordModalOpen(false);
    setEditingId(null);
    setFormData(null);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = formData;
    if (!fd) return;
    if (!fd.Name) { showToast('Please select a vendor.', 'error'); return; }
    if (modalMode === 'record' && fd.Status === 'Working' && !fd.Route) { showToast('Route is required when Status is Working.', 'error'); return; }
    if (modalMode === 'adhoc' && !fd['AD-HOC Service']) { showToast('Please select an AD-HOC Service.', 'error'); return; }

    if (editingId) {
      const idx = records.findIndex((r) => r.id === editingId);
      if (idx !== -1) records[idx] = { ...records[idx], ...fd, id: editingId };
      showToast('Record updated.', 'success');
    } else {
      const newRecord: Rec = { ...fd, id: makeRecordId(), isSubmitted: false };
      if (modalMode === 'dayoff') Object.assign(newRecord, { Route: 'OFF', Vehicle: 'NOVEHICLE', Status: 'Off', isDayOff: true, depositId: null, 'Deposit Name': '' });
      records.push(newRecord);
      recordsByDate.current.set(selectedDate, records);
      showToast(modalMode === 'adhoc' ? 'AD-HOC service added.' : modalMode === 'dayoff' ? 'Day off added.' : 'Record added.', 'success');
    }
    closeRecordModal();
    rerender();
  }

  function renderCell(headerKey: string, item: Rec) {
    if (headerKey === 'Name' || headerKey === 'Vendor') {
      const sp = item.servicePartnerId ? master.servicePartners.find((s) => s.servicePartnerId === item.servicePartnerId) : null;
      return <span>{renderCellValue(item.Name)}{sp && <span className="sp-badge"> {sp.partnerName}</span>}</span>;
    }
    if (headerKey === 'Vehicle') {
      const plate = String(item.Vehicle || '').trim();
      if (!plate) return <span className="dom-cell-empty">-</span>;
      if (plate.toUpperCase() === 'NOVEHICLE') return <span className="fw-semibold text-muted">NOVEHICLE</span>;
      const isEv = String(item.vehicleFuelType || '').toLowerCase().includes('ev') || String(item.vehicleFuelType || '').toLowerCase().includes('electric');
      return <span className={`vrn-plate${isEv ? ' ev' : ''}`}>{plate}</span>;
    }
    if (headerKey === 'Notes') {
      const note = item.Notes;
      if (note && String(note).trim() !== '') {
        return <button type="button" className="notes-badge" title="View notes" aria-label="View notes" onClick={(e) => openNotesPopover(e, note)}>!</button>;
      }
      return <span className="dom-cell-empty">-</span>;
    }
    if (headerKey === 'Extras' || headerKey === 'Extra') {
      if (Number(item.paymentModeId) === 7) return renderCellValue(decimalHoursToTimeString(item.Extras) || '-');
      return renderCellValue(item.Extras);
    }
    if (headerKey === 'Rate') {
      const modeLabel = getCostModelName(item.paymentModeId);
      const showIcon = modeLabel !== 'DR' && modeLabel !== 'FSR' && isBandedCostModelId(item.paymentModeId);
      if (showIcon) return <button type="button" className="rate-info-btn" title="View cost model bands" onClick={() => openRateModal(item.id)}>i</button>;
      return renderCellValue(item.Rate);
    }
    if (headerKey === 'Sort') {
      const s = String(item.Sort || '').toLowerCase();
      if (s === 'yes' && item.SortLate) return 'Yes (Late)';
      if (s === 'yes') return 'Yes';
      return renderCellValue(item.Sort);
    }
    if (headerKey === 'Sort Value') return renderCellValue(item.routeSort);
    if (headerKey === 'AD-HOC Service') return renderCellValue(item['AD-HOC Service']);
    return renderCellValue(item[headerKey]);
  }

  function renderActionsCell(item: Rec) {
    if (item.isSubmitted) return <div className="dom-actions-cell"><span className="submitted-pill">Submitted</span></div>;
    const isValidated = validatedKeys.has(item.id);
    const canDelete = item.Status !== 'NotAllocated';
    return (
      <div className="dom-actions-cell">
        <button type="button" className={`dom-icon-btn validate-btn${isValidated ? ' checked' : ''}`} title={isValidated ? 'Validated — click to unmark' : 'Mark as validated'} onClick={() => toggleValidated(item.id)}><i className="bi bi-check-lg" /></button>
        <button type="button" className="dom-icon-btn edit-btn" title="Edit" onClick={() => openEditModal(item.id)}><i className="bi bi-pencil" /></button>
        {canDelete && <button type="button" className="dom-icon-btn delete-btn" title="Delete" onClick={() => openDeleteModal(item.id)}><i className="bi bi-trash" /></button>}
      </div>
    );
  }

  function Table({ headers, rows, showActions }: { headers: string[]; rows: Rec[]; showActions: boolean }) {
    return (
      <div className="dom-table-scroll">
        <table className="dom-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} style={{ cursor: 'pointer' }} onClick={() => handleSort(h)}>
                  {getHeaderLabel(h)}
                  {sortConfig.key === h && <span className="sort-ind">{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>}
                </th>
              ))}
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className={item.Status === 'Off' ? 'row-off' : item.Status === 'NotAllocated' ? 'row-notallocated' : item.isSubmitted ? 'row-submitted' : ''}>
                {headers.map((h) => <td key={h}>{renderCell(h, item)}</td>)}
                {showActions && <td>{renderActionsCell(item)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function Block({ block, isSubmitted, submittedTotal }: { block: { key: string; label: string; rows: Rec[] }; isSubmitted: boolean; submittedTotal?: number }) {
    const isCollapsed = collapsedBlocks.has(block.key);
    const isDepositBlock = block.key !== 'OFF' && block.key !== 'NOTALLOC' && block.key !== '__submitted';
    const eligible = block.rows.filter(isEligibleForValidation);
    const allSelected = eligible.length > 0 && eligible.every((r) => validatedKeys.has(r.id));

    const showEmpty = isSubmitted && block.rows.length === 0 && !!submittedTotal;
    const headers = block.key === 'NOTALLOC' ? TABLE_HEADERS_NOT_ALLOCATED : isSubmitted ? TABLE_HEADERS_SUBMITTED : TABLE_HEADERS;
    const mainRows = applySort(isDepositBlock ? block.rows.filter((r) => !hasAdhocService(r)) : block.rows);
    const adhocRows = isSubmitted || !isDepositBlock ? [] : applySort(block.rows.filter(hasAdhocService));

    return (
      <section className="dom-block">
        <div className="dom-block-header">
          <div className="dom-block-header-left">
            <button type="button" className="dom-collapse-btn" aria-label="Toggle block" onClick={() => setCollapsedBlocks((prev) => {
              const next = new Set(prev);
              if (next.has(block.key)) next.delete(block.key);
              else next.add(block.key);
              return next;
            })}>
              <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'}`} />
            </button>
            <h2 className="dom-block-title">{block.label}<span className="dom-block-count">({block.rows.length} {block.rows.length === 1 ? 'record' : 'records'})</span></h2>
          </div>
          {!isCollapsed && block.key !== 'NOTALLOC' && (
            <button type="button" className="dom-select-all-btn" disabled={block.rows.length === 0} onClick={() => toggleSelectAllInBlock(block.key, eligible)}>
              {allSelected ? 'Unselect All' : 'Select All'}
            </button>
          )}
        </div>

        {!isCollapsed && (showEmpty ? (
          <div className="dom-empty-state">
            <p className="dom-empty-title">No records to show</p>
            <p className="dom-empty-text">{submittedTotal} submitted record(s) exist for this date, but none match the current filters.</p>
          </div>
        ) : (
          <>
            <Table headers={headers} rows={mainRows} showActions={block.key !== 'NOTALLOC'} />
            {adhocRows.length > 0 && (
              <div className="dom-adhoc-subtable">
                <h3>AD-HOC</h3>
                <Table headers={TABLE_HEADERS_ADHOC} rows={adhocRows} showActions />
              </div>
            )}
          </>
        ))}
      </section>
    );
  }

  const filtered = getFilteredRecords();
  const mainRows = filtered.filter((r) => !r.isSubmitted);
  const submittedRows = getSubmittedRows();
  const submittedTotal = getAllSubmittedRowsUnfiltered().length;
  const blocks = groupIntoBlocks(mainRows);

  const isBandedRate = formData ? isBandedCostModelId(formData.paymentModeId) : false;
  const isExtraHours = formData ? Number(formData.paymentModeId) === 7 : false;

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading daily operations…</p>
      </div>

      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <main className="dom-container container-fluid px-3 px-lg-4 py-4">
          <header className="page-header-section">
            <div className="page-header-welcome-text">
              <h1 className="page-header-title">Daily Operations Management</h1>
              <p className="page-header-date"><i className="bi bi-calendar3" /><span>{header}</span></p>
            </div>
            <div className="dom-header-actions">
              <div className="date-nav">
                <span className="date-nav-label"><i className="bi bi-calendar3" /> Day</span>
                <div className="date-nav-controls">
                  <button type="button" className="date-nav-btn" title="Previous day" aria-label="Previous day" onClick={() => changeDate(-1)}><i className="bi bi-chevron-left" /></button>
                  <input type="date" className="date-nav-input" title="Select date" aria-label="Select date" value={selectedDate} onChange={(e) => e.target.value && setDate(e.target.value)} />
                  <button type="button" className="date-nav-btn" title="Next day" aria-label="Next day" onClick={() => changeDate(1)}><i className="bi bi-chevron-right" /></button>
                </div>
              </div>
              <button type="button" className="styled-button styled-button--primary" onClick={() => openCreateModal('record')}><i className="bi bi-plus-circle" /> Add Record</button>
              <button type="button" className="styled-button styled-button--outline" onClick={() => openCreateModal('adhoc')}><i className="bi bi-tools" /> Add Adhoc Service</button>
              <button type="button" className="styled-button styled-button--outline dom-dayoff-btn" onClick={() => openCreateModal('dayoff')}><i className="bi bi-calendar-x" /> Add Day off</button>
            </div>
          </header>

          <div className="dom-metrics">
            {metrics.map((m) => (
              <div className="dom-metric-card" key={m.label}>
                <div className="dom-metric-value">{m.value}</div>
                <div className="dom-metric-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="filters-bar">
            <div className="search-wrap dom-search-wrap">
              <label className="filters-label">Search (Vendor, Route, Vehicle)</label>
              <div className="search-input-wrap">
                <i className="bi bi-search" />
                <input type="text" className="form-control" placeholder="Type to search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="filters-label">Service Partner</label>
              <select className="form-select filter-select" value={filterServicePartnerId} onChange={(e) => setFilterServicePartnerId(e.target.value)}>
                <option value="">All Service Partners</option>
                {master.servicePartners.map((sp) => <option value={sp.servicePartnerId} key={sp.servicePartnerId}>{sp.partnerName}</option>)}
              </select>
            </div>
            <div>
              <label className="filters-label">Status</label>
              <select className="form-select filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                {['Off', 'Working', 'NotAllocated'].map((s) => <option value={s} key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="filters-label">Vendor Type</label>
              <select className="form-select filter-select" value={filterVendorType} onChange={(e) => setFilterVendorType(e.target.value)}>
                <option value="all">All</option>
                {master.vendorTypes.map((t) => <option value={t.nameType} key={t.vendorTypeId}>{t.nameType}</option>)}
              </select>
            </div>
          </div>

          {mainRows.length === 0 && submittedRows.length === 0 && (
            <div className="dom-empty-state">
              <p className="dom-empty-title">No data</p>
              <p className="dom-empty-text">No records for the selected date.</p>
            </div>
          )}

          <div className="dom-blocks">
            {blocks.map((block) => <Block block={block} isSubmitted={false} key={block.key} />)}
          </div>

          {!(mainRows.length === 0 && submittedRows.length === 0) && (
            <div className="dom-review-bar">
              <button type="button" className="styled-button styled-button--success" disabled={validatedKeys.size === 0} onClick={handleBatchSubmit}>
                <i className="bi bi-send-check" /> Submit
              </button>
              <span className="dom-review-hint">{validatedKeys.size === 0 ? 'Select records using the checkbox to submit.' : `${validatedKeys.size} record(s) selected.`}</span>
            </div>
          )}

          {submittedTotal > 0 && (
            <div className="dom-submitted-section">
              <div className="filters-bar">
                <div className="search-wrap dom-search-wrap">
                  <label className="filters-label">Search (Submitted)</label>
                  <div className="search-input-wrap">
                    <i className="bi bi-search" />
                    <input type="text" className="form-control" placeholder="Vendor, route, vehicle, deposit, notes…" value={submittedSearchTerm} onChange={(e) => setSubmittedSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="filters-label">Record type</label>
                  <select className="form-select filter-select" value={submittedKindFilter} onChange={(e) => setSubmittedKindFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="dayoff">Day off</option>
                    <option value="notallocated">Not allocated</option>
                    <option value="routes">Routes</option>
                  </select>
                </div>
                <div>
                  <label className="filters-label">Vendor type</label>
                  <select className="form-select filter-select" value={submittedVendorTypeFilter} onChange={(e) => setSubmittedVendorTypeFilter(e.target.value)}>
                    <option value="all">All</option>
                    {master.vendorTypes.map((t) => <option value={t.nameType} key={t.vendorTypeId}>{t.nameType}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Block block={{ key: '__submitted', label: 'Submitted', rows: submittedRows }} isSubmitted submittedTotal={submittedTotal} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Record Modal */}
      {recordModalOpen && formData && (
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeRecordModal(); }}>
          <div className="dom-modal">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title">{modalMode === 'adhoc' ? (editingId ? 'Edit Record' : 'Add Adhoc Service') : modalMode === 'dayoff' ? (editingId ? 'Edit Record' : 'Add Day off') : (editingId ? 'Edit Record' : 'Add New Record')}</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={closeRecordModal}><i className="bi bi-x-lg" /></button>
            </div>
            <form className="dom-modal-body" onSubmit={handleFormSubmit}>
              <div className="dom-form-grid">
                {modalMode === 'dayoff' && (
                  <div className="dom-form-field span-2">
                    <label className="dom-form-label">Vendor *</label>
                    <select required value={formData.Name} onChange={(e) => setFormData(applyVendorDefaults({ ...formData, Name: e.target.value }, e.target.value, modalMode))}>
                      <option value="">Select vendor</option>
                      {[...master.vendors].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((v) => <option value={v.fullName} key={v.userId}>{v.fullName}</option>)}
                    </select>
                  </div>
                )}

                {modalMode === 'adhoc' && (
                  <>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Vendor *</label>
                      <select required value={formData.Name} onChange={(e) => setFormData(applyVendorDefaults({ ...formData, Name: e.target.value }, e.target.value, modalMode))}>
                        <option value="">Select vendor</option>
                        {[...master.vendors].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((v) => <option value={v.fullName} key={v.userId}>{v.fullName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Route</label>
                      <select value={formData.Route} onChange={(e) => setFormData({ ...formData, Route: e.target.value })}>
                        <option value="OFF">OFF</option>
                        {master.routes.filter((r) => !['NALC', 'DHOC'].includes(r.routeName)).map((r) => <option value={r.routeName} key={r.routeId}>{r.routeName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Depot</label>
                      <select value={formData['Deposit Name']} onChange={(e) => setFormData({ ...formData, 'Deposit Name': e.target.value })}>
                        {master.deposits.map((d) => <option value={d.depositName} key={d.depositId}>{d.depositName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">AD-HOC Service *</label>
                      <select required value={String(formData.adhocServiceId)} onChange={(e) => {
                        const service = master.adhocServices.find((s) => String(s.adhocServiceId) === e.target.value);
                        setFormData({ ...formData, adhocServiceId: e.target.value, 'AD-HOC Service': service ? service.adhocName : '', 'AD-HOC Sort': service ? String(service.adhocVendorPayment) : formData['AD-HOC Sort'] });
                      }}>
                        <option value="">Select service</option>
                        {master.adhocServices.map((s) => <option value={s.adhocServiceId} key={s.adhocServiceId}>{s.adhocName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">AD-HOC Sort</label>
                      <input type="text" value={formData['AD-HOC Sort']} placeholder="e.g. 10.00" onChange={(e) => setFormData({ ...formData, 'AD-HOC Sort': e.target.value })} />
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Extra</label>
                      <input type="text" value={formData.Extras} onChange={(e) => setFormData({ ...formData, Extras: e.target.value })} />
                    </div>
                    <div className="dom-form-field span-2">
                      <label className="dom-form-label">Notes</label>
                      <textarea rows={2} value={formData.Notes} onChange={(e) => setFormData({ ...formData, Notes: e.target.value })} />
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Vehicle</label>
                      <select value={formData.Vehicle} onChange={(e) => setFormData({ ...formData, Vehicle: e.target.value })}>
                        <option value="NOVEHICLE">NOVEHICLE</option>
                        {master.vehicles.map((v) => <option value={v.registrationPlates} key={v.vehicleId}>{v.registrationPlates} ({v.model})</option>)}
                      </select>
                    </div>
                  </>
                )}

                {modalMode === 'record' && (
                  <>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Vendor *</label>
                      <select required value={formData.Name} onChange={(e) => setFormData(applyVendorDefaults({ ...formData, Name: e.target.value }, e.target.value, modalMode))}>
                        <option value="">Select vendor</option>
                        {[...master.vendors].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((v) => <option value={v.fullName} key={v.userId}>{v.fullName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Status *</label>
                      <select required value={formData.Status} onChange={(e) => {
                        const status = e.target.value;
                        let next = { ...formData, Status: status };
                        if (status === 'Off' || status === 'NotAllocated') next = { ...next, Route: 'OFF', Vehicle: 'NOVEHICLE' };
                        else if (next.Name) next = applyVendorDefaults(next, next.Name, modalMode);
                        setFormData(next);
                      }}>
                        <option value="Working">Working</option>
                        <option value="Off">Day Off</option>
                        <option value="NotAllocated">Not Allocated</option>
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Route{formData.Status === 'Working' ? ' *' : ''}</label>
                      <select disabled={formData.Status !== 'Working'} value={formData.Route} onChange={(e) => {
                        const route = master.routes.find((r) => r.routeName === e.target.value);
                        setFormData({ ...formData, Route: e.target.value, depositId: route ? route.depositId : formData.depositId, 'Deposit Name': route ? (master.deposits.find((d) => d.depositId === route.depositId)?.depositName ?? '') : formData['Deposit Name'] });
                      }}>
                        <option value="OFF">OFF</option>
                        {master.routes.filter((r) => !['NALC', 'DHOC'].includes(r.routeName)).map((r) => <option value={r.routeName} key={r.routeId}>{r.routeName}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Payment Mode{formData.Status === 'Working' ? ' *' : ''}</label>
                      <select disabled={formData.Status !== 'Working'} value={formData.paymentModeId} onChange={(e) => {
                        const cmId = Number(e.target.value);
                        setFormData({ ...formData, paymentModeId: cmId, 'Payment Mode': getCostModelName(cmId), Rate: isBandedCostModelId(cmId) ? '' : formData.Rate });
                      }}>
                        <option value="">Select mode</option>
                        {master.costModels.map((c) => <option value={c.costModelId} key={c.costModelId}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Rate</label>
                      <input type="text" value={formData.Rate} disabled={isBandedRate || formData.Status !== 'Working'} placeholder={isBandedRate ? 'Defined by cost model bands' : ''} onChange={(e) => setFormData({ ...formData, Rate: e.target.value })} />
                      {isBandedRate && <p className="dom-form-hint">For DAF/VSR/SP_VSR, use the info icon in the Rate column of the table.</p>}
                    </div>
                    <div className="dom-form-field span-2">
                      <label className="dom-form-label">Sort</label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 140 }}>
                          <select disabled={formData.Status !== 'Working'} value={formData.Sort} onChange={(e) => {
                            const v = e.target.value;
                            setFormData({ ...formData, Sort: v, routeSort: v === 'No' ? '' : formData.routeSort, SortLate: v === 'No' ? false : formData.SortLate });
                          }}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                          {formData.Sort === 'Yes' && (
                            <div className="dom-sort-arrival">
                              <span>Arrival:</span>
                              <button type="button" className={`dom-arrival-btn${!formData.SortLate ? ' active-ontime' : ''}`} onClick={() => setFormData({ ...formData, SortLate: false })}><i className="bi bi-check-lg" /> On time</button>
                              <button type="button" className={`dom-arrival-btn${formData.SortLate ? ' active-late' : ''}`} onClick={() => setFormData({ ...formData, SortLate: true })}><i className="bi bi-clock" /> Late</button>
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 140 }}>
                          <label className="dom-form-label" style={{ fontWeight: 500 }}>Sort value</label>
                          <input type="number" disabled={formData.Sort !== 'Yes' || formData.Status !== 'Working'} value={formData.routeSort} placeholder="e.g. 0, 1, 20" onChange={(e) => setFormData({ ...formData, routeSort: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">{isExtraHours ? 'Extras - Time' : 'Extras - Qty Hour'}</label>
                      {isExtraHours ? (
                        <input type="time" value={decimalHoursToTimeString(formData.Extras)} onChange={(e) => {
                          const dec = timeStringToDecimalHours(e.target.value);
                          setFormData({ ...formData, Extras: dec !== undefined ? dec : '' });
                        }} />
                      ) : (
                        <input type="text" value={formData.Extras} onChange={(e) => setFormData({ ...formData, Extras: e.target.value })} />
                      )}
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Vehicle</label>
                      <select disabled={formData.Status === 'Off' || formData.Status === 'NotAllocated'} value={formData.Vehicle} onChange={(e) => setFormData({ ...formData, Vehicle: e.target.value })}>
                        <option value="NOVEHICLE">NOVEHICLE</option>
                        {master.vehicles.map((v) => <option value={v.registrationPlates} key={v.vehicleId}>{v.registrationPlates} ({v.model})</option>)}
                      </select>
                    </div>
                    <div className="dom-form-field span-2">
                      <label className="dom-form-label">Notes</label>
                      <textarea rows={2} value={formData.Notes} onChange={(e) => setFormData({ ...formData, Notes: e.target.value })} />
                    </div>
                    <div className="dom-form-field">
                      <label className="dom-form-label">Vendor type</label>
                      <select value={formData['Vendor type']} onChange={(e) => setFormData({ ...formData, 'Vendor type': e.target.value })}>
                        <option value="">Select type</option>
                        {master.vendorTypes.map((t) => <option value={t.nameType} key={t.vendorTypeId}>{t.nameType}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="dom-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={closeRecordModal}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{editingId ? 'Update Record' : 'Add Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (() => {
        const sameDayCount = records.filter((r) => r.userId === deleteTarget.userId).length;
        return (
          <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
            <div className="dom-modal dom-modal-small">
              <div className="dom-modal-header">
                <h2 className="dom-modal-title"><i className="bi bi-exclamation-triangle text-danger me-2" />Confirm Delete</h2>
                <button type="button" className="dom-modal-close" aria-label="Close" onClick={() => setDeleteTarget(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="dom-modal-body">
                <p>{sameDayCount > 1 ? `Remove ${deleteTarget.Name}'s record for ${deleteTarget.Route}? This record will be deleted.` : `${deleteTarget.Name} has no other record today — removing this will mark them as Not Allocated instead of deleting.`}</p>
                <div className="dom-form-actions">
                  <button type="button" className="styled-button styled-button--outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button type="button" className="styled-button styled-button--danger" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rate Bands Modal */}
      {rateModalRow && (
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setRateModalRow(null); }}>
          <div className="dom-modal dom-modal-small">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title"><i className="bi bi-info-circle me-2" />Cost Model Bands</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={() => setRateModalRow(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="dom-modal-body">
              <p className="mb-3 text-secondary" style={{ fontSize: '0.85rem' }}>Cost model <strong>{getCostModelName(rateModalRow.paymentModeId)}</strong> pays per stop, according to the band the route falls into.</p>
              <table className="dom-band-table">
                <thead><tr><th>Min stops</th><th>Max stops</th><th>Price / stop</th></tr></thead>
                <tbody>
                  {buildRateBands(rateModalRow.paymentModeId).map((b, i) => (
                    <tr key={i}><td>{b.min}</td><td>{b.max == null ? '∞' : b.max}</td><td>£{b.price}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notes Popover */}
      {notesPopover && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setNotesPopover(null)} />
          <div className="dom-notes-popover" style={{ top: notesPopover.below ? notesPopover.top + 20 : notesPopover.top, left: notesPopover.left, transform: notesPopover.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}>
            <button type="button" className="dom-notes-popover-close" aria-label="Close" onClick={() => setNotesPopover(null)}><i className="bi bi-x-lg" /></button>
            <p>{notesPopover.note}</p>
          </div>
        </>
      )}

      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => {
          const icon = t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill';
          return (
            <div className={`app-toast ${t.type}`} key={t.id}>
              <i className={`bi ${icon}`} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
