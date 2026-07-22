import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import '../../styles/legacy/daily-operations-management.css';

/**
 * Faithful port of sp-portal/daily-operations-management (index.html +
 * style.css + script.js). Vanilla-JS class-based app in the original;
 * ported to React state/hooks with the exact same mock-data shape, class
 * names and DOM structure.
 *
 * Simplifications (documented per the porting brief):
 *  - The notes popover's "flip below if too close to the top of the
 *    viewport" edge case is not reproduced — it always opens above its
 *    trigger via one getBoundingClientRect() measurement, like the
 *    original's common case.
 *  - No auto-refresh / polling — this page has none in the original either.
 *  - Record IDs use a simple incrementing ref counter (matches the
 *    original's `dom-<n>-<rand>` scheme minus true randomness, which is
 *    irrelevant since IDs are only ever compared for equality).
 */

/* ==================== Deterministic PRNG (ported verbatim from script.js) ==================== */
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
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

/* ==================== Types ==================== */
interface Deposit { depositId: number; depositName: string }
interface VendorType { vendorTypeId: number; nameType: string }
interface CostModel { costModelId: number; name: string }
interface AdhocService { adhocServiceId: number; adhocName: string; adhocVendorPayment: number }
interface ServicePartner { servicePartnerId: number; partnerName: string }
interface RouteDef { routeId: number; routeName: string; depositId: number }
interface VehicleDef { vehicleId: number; registrationPlates: string; model: string; fuel_type: string }
interface VendorDef {
  userId: number; fullName: string; vendorTypeId: number; depositId: number; routeId: number; vehicleId: number;
  costModelId: number; isSort: boolean; isLate: boolean; routeSortValue: number; fixedRate: number;
  servicePartnerId: number | null; isBAOP: boolean;
}
interface MasterData {
  deposits: Deposit[]; vendorTypes: VendorType[]; costModels: CostModel[]; adhocServices: AdhocService[];
  servicePartners: ServicePartner[]; routes: RouteDef[]; vehicles: VehicleDef[]; vendors: VendorDef[];
  BANDED_COST_MODEL_IDS: number[];
}

type Status = 'Working' | 'Off' | 'NotAllocated';

interface DomRecord {
  id: string; userId: number | null; Name: string; 'Vendor type': string; servicePartnerId: number | null;
  depositId: number | null; 'Deposit Name': string; isSubmitted: boolean;
  Route: string; Vehicle: string; vehicleFuelType?: string;
  'Payment Mode': string; paymentModeId: number | string;
  Rate: number | string; Sort: string; SortLate: boolean; routeSort: number | string;
  'AD-HOC Sort': string; 'AD-HOC Service': string; adhocServiceId: number | string;
  Extras: number | string; Notes: string;
  Status: Status; isDayOff: boolean;
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

function renderCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const str = String(value);
  return str.trim() === '' ? '-' : str;
}

function decimalHoursToTimeString(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return '';
  let h = Math.floor(n);
  const m = Math.min(59, Math.max(0, Math.round((n - h) * 60)));
  if (h >= 24) { h = 23; }
  return `${String(h).padStart(2, '0')}:${String(h >= 23 ? 59 : m).padStart(2, '0')}`;
}
function timeStringToDecimalHours(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return undefined;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60) return undefined;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

/* ==================== Master (mock) data — built once, deterministic ==================== */
function buildMasterData(): MasterData {
  const rng = rngForSeed('dom-master-data-v1');

  const deposits: Deposit[] = [
    { depositId: 1, depositName: 'Maidstone' },
    { depositId: 2, depositName: 'Chatham' },
    { depositId: 3, depositName: 'Dartford' },
    { depositId: 4, depositName: 'Ashford' },
    { depositId: 7, depositName: 'BAOP' },
  ];

  const vendorTypes: VendorType[] = [
    { vendorTypeId: 1, nameType: 'Owner Driver' },
    { vendorTypeId: 2, nameType: 'Multi Drop' },
    { vendorTypeId: 3, nameType: 'Courier Company' },
    { vendorTypeId: 4, nameType: 'Van Owner' },
  ];

  const costModels: CostModel[] = [
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

  const adhocServices: AdhocService[] = [
    { adhocServiceId: 1, adhocName: 'Additional Collection', adhocVendorPayment: 15 },
    { adhocServiceId: 2, adhocName: 'Redelivery', adhocVendorPayment: 8 },
    { adhocServiceId: 3, adhocName: 'Bulky Item Handling', adhocVendorPayment: 20 },
    { adhocServiceId: 4, adhocName: 'Out of Hours Run', adhocVendorPayment: 35 },
    { adhocServiceId: 5, adhocName: 'Return to Depot', adhocVendorPayment: 10 },
  ];

  const servicePartners: ServicePartner[] = [
    { servicePartnerId: 1, partnerName: 'Swift Logistics' },
    { servicePartnerId: 2, partnerName: 'Kent Express' },
  ];

  const routes: RouteDef[] = [];
  let rid = 1;
  for (const dep of deposits.filter((d) => d.depositId !== 7)) {
    const prefix = dep.depositName.slice(0, 3).toUpperCase();
    for (let i = 1; i <= 4; i++) {
      routes.push({ routeId: rid++, routeName: `${prefix}-${String(i).padStart(2, '0')}`, depositId: dep.depositId });
    }
  }
  routes.push({ routeId: rid++, routeName: 'NALC', depositId: 7 });
  routes.push({ routeId: rid++, routeName: 'DHOC', depositId: 7 });

  const fuelTypes = ['Diesel', 'Diesel', 'Diesel', 'Petrol', 'EV'];
  const vehicles: VehicleDef[] = Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(65 + (i % 26));
    const plate = `V${letter}${String(10 + i).padStart(2, '0')} ${['ABC', 'DEF', 'GHJ', 'KLM', 'NPQ'][i % 5]}`;
    return {
      vehicleId: i + 1,
      registrationPlates: plate,
      model: ['Transit', 'Sprinter', 'Crafter', 'Vivaro', 'Boxer'][i % 5],
      fuel_type: fuelTypes[i % fuelTypes.length],
    };
  });

  const firstNames = ['James', 'Oliver', 'George', 'Harry', 'Jack', 'Amelia', 'Olivia', 'Isla', 'Ava', 'Sophia', 'Mateus', 'Ricardo', 'Bianca', 'Fernanda', 'Diego', 'Marta', 'Tomasz', 'Anna', 'Piotr', 'Elena', 'Marcus', 'Chloe', 'Ethan', 'Grace'];
  const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Ferreira', 'Kowalski', 'Nowak', 'Popescu', 'Ionescu', 'Murphy', 'Walsh'];
  const vendors: VendorDef[] = Array.from({ length: 26 }, (_, i) => {
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
      userId: 1000 + i,
      fullName,
      vendorTypeId,
      depositId: dep.depositId,
      routeId: route.routeId,
      vehicleId: vehicle.vehicleId,
      costModelId,
      isSort: rng() > 0.25,
      isLate: rng() > 0.8,
      routeSortValue: rng() > 0.5 ? 20 : 1,
      fixedRate: 95 + Math.round(rng() * 60),
      servicePartnerId: rng() > 0.8 ? servicePartners[i % servicePartners.length].servicePartnerId : null,
      isBAOP,
    };
  });

  return { deposits, vendorTypes, costModels, adhocServices, servicePartners, routes, vehicles, vendors, BANDED_COST_MODEL_IDS };
}

function getCostModelName(master: MasterData, id: unknown): string {
  const cm = master.costModels.find((c) => c.costModelId === Number(id));
  return cm ? cm.name : '';
}
function isBandedCostModelId(master: MasterData, id: unknown): boolean {
  return master.BANDED_COST_MODEL_IDS.includes(Number(id));
}
function buildRateBands(costModelId: unknown, selectedDate: string) {
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

/* ==================== Per-date mock records ==================== */
function generateRecordsForDate(date: string, master: MasterData, makeId: () => string): DomRecord[] {
  const rng = rngForSeed(`dom-records-${date}`);
  const records: DomRecord[] = [];
  const notesPool = ['Vehicle serviced this morning', 'Vendor requested late start', 'Covering extra loop', 'Please confirm arrival time', ''];

  for (const vendor of master.vendors) {
    const roll = rng();
    const vendorType = master.vendorTypes.find((t) => t.vendorTypeId === vendor.vendorTypeId);
    const isSubmitted = roll < 0.14;
    let status: Status = 'Working';
    if (!isSubmitted) {
      if (roll < 0.14 + 0.09) status = 'Off';
      else if (roll < 0.14 + 0.09 + 0.09) status = 'NotAllocated';
    }

    const route = master.routes.find((r) => r.routeId === vendor.routeId);
    const vehicle = master.vehicles.find((v) => v.vehicleId === vendor.vehicleId);
    const deposit = master.deposits.find((d) => d.depositId === vendor.depositId);
    const costModelId = vendor.costModelId;
    const isBanded = isBandedCostModelId(master, costModelId);
    const isFixed = costModelId === 2 || costModelId === 3;
    const isHourly = costModelId === 7;

    const base = {
      id: makeId(),
      userId: vendor.userId,
      Name: vendor.fullName,
      'Vendor type': vendorType ? vendorType.nameType : '',
      servicePartnerId: vendor.servicePartnerId,
      depositId: vendor.depositId,
      'Deposit Name': deposit ? deposit.depositName : '',
      isSubmitted,
    };

    if (status === 'Off') {
      records.push({
        ...base,
        Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '',
        Rate: '', Sort: 'No', SortLate: false, routeSort: '',
        'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
        Extras: '', Notes: rng() > 0.7 ? 'Booked holiday' : '',
        Status: 'Off', isDayOff: true, depositId: null, 'Deposit Name': '',
      });
      continue;
    }

    if (status === 'NotAllocated') {
      records.push({
        ...base,
        Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '',
        Rate: '', Sort: 'No', SortLate: false, routeSort: '',
        'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
        Extras: '', Notes: '',
        Status: 'NotAllocated', isDayOff: false, depositId: null, 'Deposit Name': '',
      });
      continue;
    }

    const rate = isBanded ? '' : isFixed ? vendor.fixedRate : Math.round((8 + rng() * 12) * 100) / 100;
    const extras = isHourly ? Math.round(rng() * 3 * 4) / 4 : rng() > 0.6 ? Math.round(rng() * 20) : 0;
    const sortYes = vendor.isSort;
    records.push({
      ...base,
      Route: route ? route.routeName : '',
      Vehicle: vehicle ? vehicle.registrationPlates : 'NOVEHICLE',
      vehicleFuelType: vehicle ? vehicle.fuel_type : '',
      'Payment Mode': getCostModelName(master, costModelId), paymentModeId: costModelId,
      Rate: rate,
      Sort: sortYes ? 'Yes' : 'No',
      SortLate: sortYes ? vendor.isLate : false,
      routeSort: sortYes ? vendor.routeSortValue : '',
      'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
      Extras: extras, Notes: notesPool[Math.floor(rng() * notesPool.length)],
      Status: 'Working', isDayOff: false,
      depositId: vendor.depositId, 'Deposit Name': deposit ? deposit.depositName : '',
    });

    if (!vendor.isBAOP && rng() < 0.22) {
      const service = master.adhocServices[Math.floor(rng() * master.adhocServices.length)];
      records.push({
        id: makeId(),
        userId: vendor.userId,
        Name: vendor.fullName,
        'Vendor type': vendorType ? vendorType.nameType : '',
        servicePartnerId: vendor.servicePartnerId,
        depositId: vendor.depositId,
        'Deposit Name': deposit ? deposit.depositName : '',
        isSubmitted: false,
        Route: 'DHOC',
        Vehicle: vehicle ? vehicle.registrationPlates : 'NOVEHICLE',
        vehicleFuelType: vehicle ? vehicle.fuel_type : '',
        'Payment Mode': getCostModelName(master, 2), paymentModeId: 2,
        Rate: '', Sort: 'No', SortLate: false, routeSort: '',
        'AD-HOC Sort': String(service.adhocVendorPayment),
        'AD-HOC Service': service.adhocName, adhocServiceId: service.adhocServiceId,
        Extras: Math.round(rng() * 10), Notes: '',
        Status: 'Working', isDayOff: false,
      });
    }
  }

  return records;
}

function hasAdhocService(row: DomRecord) {
  const label = String(row['AD-HOC Service'] || '').trim();
  return label !== '' && label.toLowerCase() !== 'null';
}

interface Block { key: string; label: string; rows: DomRecord[] }

function groupIntoBlocks(rows: DomRecord[], master: MasterData): Block[] {
  const groups = new Map<string, DomRecord[]>();
  for (const item of rows) {
    let key: string;
    if (item.depositId === 7) key = 'BAOP';
    else if (item.isDayOff || item.Status === 'Off') key = 'OFF';
    else if (item.Status === 'NotAllocated') key = 'NOTALLOC';
    else key = String(item.depositId != null ? item.depositId : item['Deposit Name'] || '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const blocks: Block[] = [];
  if (groups.has('OFF')) blocks.push({ key: 'OFF', label: 'Day off', rows: groups.get('OFF')! });
  if (groups.has('NOTALLOC')) blocks.push({ key: 'NOTALLOC', label: 'Not allocated', rows: groups.get('NOTALLOC')! });
  for (const dep of master.deposits.filter((d) => d.depositId !== 7)) {
    const key = String(dep.depositId);
    if (groups.has(key)) blocks.push({ key, label: dep.depositName, rows: groups.get(key)! });
  }
  if (groups.has('BAOP')) blocks.push({ key: 'BAOP', label: 'BAOP', rows: groups.get('BAOP')! });
  return blocks;
}

interface SortConfig { key: string; direction: 'asc' | 'desc' }
function applySortRows(rows: DomRecord[], sortConfig: SortConfig): DomRecord[] {
  const map: Record<string, string> = { Vendor: 'Name', Extra: 'Extras', 'Sort Value': 'routeSort' };
  const field = map[sortConfig.key] || sortConfig.key;
  const dir = sortConfig.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = String((a as Record<string, unknown>)[field] ?? '').trim();
    const bv = String((b as Record<string, unknown>)[field] ?? '').trim();
    return dir * av.localeCompare(bv, undefined, { sensitivity: 'base' });
  });
}

function matchesSubmittedKind(row: DomRecord, kind: string): boolean {
  if (kind === 'all') return true;
  const isDayOff = Boolean(row.isDayOff);
  if (kind === 'dayoff') return isDayOff;
  if (kind === 'notallocated') return !isDayOff && (row.Status === 'NotAllocated' || row.depositId === 7);
  if (kind === 'routes') return !isDayOff && row.depositId !== 7;
  return true;
}

interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info'; hiding: boolean }

type ModalMode = 'record' | 'adhoc' | 'dayoff';
type FormData = Record<string, unknown> & { id: string | null; Name: string; Status: Status };

function blankFormData(mode: ModalMode, master: MasterData): FormData {
  const base: FormData = {
    id: null, userId: null, Name: '', Route: '', 'Payment Mode': '', paymentModeId: '',
    Rate: '', Sort: 'Yes', SortLate: false, routeSort: '', 'AD-HOC Sort': '', 'AD-HOC Service': '',
    adhocServiceId: '', Extras: '', Notes: '', Vehicle: '', vehicleFuelType: '',
    'Vendor type': '', Status: 'Working', depositId: null, 'Deposit Name': '',
    servicePartnerId: null, isDayOff: false, isSubmitted: false,
  };
  if (mode === 'dayoff') return { ...base, Route: 'OFF', Vehicle: 'NOVEHICLE', Status: 'Off', isDayOff: true };
  if (mode === 'adhoc') return { ...base, 'Payment Mode': getCostModelName(master, 2), paymentModeId: 2, Sort: 'No' };
  return base;
}

function applyVendorDefaults(fd: FormData, vendorName: string, mode: ModalMode, master: MasterData): FormData {
  const vendor = master.vendors.find((v) => v.fullName === vendorName);
  if (!vendor) return fd;
  const vendorType = master.vendorTypes.find((t) => t.vendorTypeId === vendor.vendorTypeId);
  const next: FormData = { ...fd, userId: vendor.userId, 'Vendor type': vendorType ? vendorType.nameType : '', servicePartnerId: vendor.servicePartnerId };

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
  next['Payment Mode'] = getCostModelName(master, vendor.costModelId);
  const isFixed = vendor.costModelId === 2 || vendor.costModelId === 3;
  const isBanded = isBandedCostModelId(master, vendor.costModelId);
  next.Rate = isBanded ? '' : isFixed ? vendor.fixedRate : '';
  next.Sort = vendor.isSort ? 'Yes' : 'No';
  next.SortLate = vendor.isSort ? vendor.isLate : false;
  next.routeSort = vendor.isSort ? vendor.routeSortValue : '';
  return next;
}

/* ==================== Component ==================== */
export function DailyOperationsManagement() {
  useViewportAttribute();

  const master = useMemo(() => buildMasterData(), []);
  const idCounterRef = useRef(0);
  const makeRecordId = () => `dom-${++idCounterRef.current}`;

  const [overlayActive, setOverlayActive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const recordsCacheRef = useRef<Map<string, DomRecord[]>>(new Map());
  const [records, setRecords] = useState<DomRecord[]>(() => {
    const recs = generateRecordsForDate(selectedDate, master, makeRecordId);
    recordsCacheRef.current.set(selectedDate, recs);
    return recs;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVendorType, setFilterVendorType] = useState('all');
  const [filterServicePartnerId, setFilterServicePartnerId] = useState('');

  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const [submittedKindFilter, setSubmittedKindFilter] = useState('all');
  const [submittedVendorTypeFilter, setSubmittedVendorTypeFilter] = useState('all');

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Route', direction: 'asc' });
  const [validatedKeys, setValidatedKeys] = useState<Set<string>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  const [notesTarget, setNotesTarget] = useState<{ note: string; rect: DOMRect } | null>(null);
  const [rateModalItem, setRateModalItem] = useState<DomRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomRecord | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('record');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    document.body.classList.add('dom-page');
    return () => document.body.classList.remove('dom-page');
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setOverlayActive(false), 400);
    return () => clearTimeout(t);
  }, []);

  function showToast(message: string, type: ToastItem['type'] = 'info') {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, hiding: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((tt) => (tt.id === id ? { ...tt, hiding: true } : tt)));
      setTimeout(() => setToasts((prev) => prev.filter((tt) => tt.id !== id)), 320);
    }, 3200);
  }

  function updateRecords(next: DomRecord[]) {
    setRecords(next);
    recordsCacheRef.current.set(selectedDate, next);
  }

  function setDate(date: string) {
    setSelectedDate(date);
    setValidatedKeys(new Set());
    setSubmittedSearchTerm('');
    setSubmittedKindFilter('all');
    setSubmittedVendorTypeFilter('all');
    let recs = recordsCacheRef.current.get(date);
    if (!recs) {
      recs = generateRecordsForDate(date, master, makeRecordId);
      recordsCacheRef.current.set(date, recs);
    }
    setRecords(recs);
  }

  function changeDate(deltaDays: number) {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    const next = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    setDate(next);
  }

  /* ---------- derived ---------- */
  const headerSubtitle = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const dateUK = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${dayName} - ${dateUK} - Week ${String(week).padStart(2, '0')}`;
  }, [selectedDate]);

  const metrics = useMemo(() => {
    const all = records;
    const total = all.length;
    const working = all.filter((r) => r.Status === 'Working' && !r.isSubmitted).length;
    const off = all.filter((r) => r.Status === 'Off').length;
    const notAllocated = all.filter((r) => r.Status === 'NotAllocated').length;
    const submitted = all.filter((r) => r.isSubmitted).length;
    return [
      { label: 'Total Records', value: total },
      { label: 'Working', value: working },
      { label: 'Day off', value: off },
      { label: 'Not allocated', value: notAllocated },
      { label: 'Submitted', value: submitted },
      { label: 'Selected', value: validatedKeys.size },
    ];
  }, [records, validatedKeys]);

  const filteredRecords = useMemo(() => {
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
      if (filterServicePartnerId !== '') {
        if (item.servicePartnerId == null || String(item.servicePartnerId) !== filterServicePartnerId) return false;
      }
      if (term) {
        const hay = `${item.Name || ''} ${item.Route || ''} ${item.Vehicle || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [records, searchTerm, filterStatus, filterVendorType, filterServicePartnerId]);

  const mainRows = useMemo(() => filteredRecords.filter((r) => !r.isSubmitted), [filteredRecords]);
  const allSubmittedUnfiltered = useMemo(() => records.filter((r) => r.isSubmitted), [records]);

  const submittedRows = useMemo(() => {
    let rows = allSubmittedUnfiltered;
    if (filterVendorType !== 'all') rows = rows.filter((r) => (r['Vendor type'] || '').toLowerCase() === filterVendorType.toLowerCase());
    const term = searchTerm.trim().toLowerCase();
    if (term) rows = rows.filter((r) => `${r.Name} ${r.Route} ${r.Vehicle}`.toLowerCase().includes(term));
    if (submittedKindFilter !== 'all') rows = rows.filter((r) => matchesSubmittedKind(r, submittedKindFilter));
    if (submittedVendorTypeFilter !== 'all') rows = rows.filter((r) => (r['Vendor type'] || '').toLowerCase() === submittedVendorTypeFilter.toLowerCase());
    const subTerm = submittedSearchTerm.trim().toLowerCase();
    if (subTerm) rows = rows.filter((r) => `${r.Name} ${r.Route} ${r.Vehicle} ${r['Deposit Name']} ${r.Notes}`.toLowerCase().includes(subTerm));
    return [...rows].sort((a, b) => String(a.Name).localeCompare(String(b.Name), undefined, { sensitivity: 'base' }));
  }, [allSubmittedUnfiltered, filterVendorType, searchTerm, submittedKindFilter, submittedVendorTypeFilter, submittedSearchTerm]);

  const blocks = useMemo(() => groupIntoBlocks(mainRows, master), [mainRows, master]);
  const isEmpty = mainRows.length === 0 && submittedRows.length === 0;

  /* ---------- row actions ---------- */
  function toggleValidated(id: string) {
    setValidatedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllInBlock(blockKey: string) {
    const allBlocks: Block[] = [...blocks, { key: '__submitted', label: 'Submitted', rows: submittedRows }];
    const block = allBlocks.find((b) => b.key === blockKey);
    if (!block) return;
    const eligible = block.rows.filter((r) => !r.isSubmitted);
    if (eligible.length === 0) return;
    const allSelected = eligible.every((r) => validatedKeys.has(r.id));
    setValidatedKeys((prev) => {
      const next = new Set(prev);
      eligible.forEach((r) => { if (allSelected) next.delete(r.id); else next.add(r.id); });
      return next;
    });
  }

  function handleBatchSubmit() {
    if (validatedKeys.size === 0) return;
    let count = 0;
    const next = records.map((r) => {
      if (validatedKeys.has(r.id)) { count++; return { ...r, isSubmitted: true }; }
      return r;
    });
    updateRecords(next);
    setValidatedKeys(new Set());
    showToast(`${count} record(s) submitted successfully.`, 'success');
  }

  function toggleCollapse(key: string) {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function openNotesPopover(e: React.MouseEvent<HTMLButtonElement>, note: string) {
    setNotesTarget({ note, rect: e.currentTarget.getBoundingClientRect() });
  }
  function closeNotesPopover() { setNotesTarget(null); }

  function openRateModal(item: DomRecord) { setRateModalItem(item); }
  function closeRateModal() { setRateModalItem(null); }

  function openDeleteModal(item: DomRecord) { setDeleteTarget(item); }
  function closeDeleteModal() { setDeleteTarget(null); }
  function confirmDelete() {
    if (!deleteTarget) return;
    const item = deleteTarget;
    const sameDayCount = records.filter((r) => r.userId === item.userId).length;
    if (sameDayCount > 1) {
      updateRecords(records.filter((r) => r.id !== item.id));
      showToast('Record deleted.', 'success');
    } else {
      updateRecords(records.map((r) => (r.id === item.id ? {
        ...r, Route: 'OFF', Vehicle: 'NOVEHICLE', 'Payment Mode': '', paymentModeId: '',
        Rate: '', Sort: 'No', SortLate: false, routeSort: '', 'AD-HOC Sort': '', 'AD-HOC Service': '', adhocServiceId: '',
        Status: 'NotAllocated' as Status, isDayOff: false, depositId: null, 'Deposit Name': '',
      } : r)));
      showToast('Vendor moved to Not Allocated.', 'success');
    }
    setValidatedKeys((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
    closeDeleteModal();
  }

  function openCreateModal(mode: ModalMode) {
    setModalMode(mode);
    setEditingId(null);
    setFormData(blankFormData(mode, master));
    setModalOpen(true);
  }
  function openEditModal(item: DomRecord) {
    setEditingId(item.id);
    setModalMode(hasAdhocService(item) ? 'adhoc' : 'record');
    setFormData({ ...item } as unknown as FormData);
    setModalOpen(true);
  }
  function closeRecordModal() {
    setModalOpen(false);
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
      updateRecords(records.map((r) => (r.id === editingId ? { ...r, ...(fd as unknown as DomRecord), id: editingId } : r)));
      showToast('Record updated.', 'success');
    } else {
      const newRecord = { ...fd, id: makeRecordId(), isSubmitted: false } as unknown as DomRecord;
      if (modalMode === 'dayoff') Object.assign(newRecord, { Route: 'OFF', Vehicle: 'NOVEHICLE', Status: 'Off', isDayOff: true, depositId: null, 'Deposit Name': '' });
      updateRecords([...records, newRecord]);
      showToast(modalMode === 'adhoc' ? 'AD-HOC service added.' : modalMode === 'dayoff' ? 'Day off added.' : 'Record added.', 'success');
    }
    closeRecordModal();
  }

  function handleSort(key: string) {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  }

  /* ---------- cell renderers ---------- */
  function renderCell(header: string, item: DomRecord): React.ReactNode {
    if (header === 'Name' || header === 'Vendor') {
      const sp = item.servicePartnerId ? master.servicePartners.find((s) => s.servicePartnerId === item.servicePartnerId) : null;
      return <>{renderCellValue(item.Name)}{sp && <span className="sp-badge">{sp.partnerName}</span>}</>;
    }
    if (header === 'Vehicle') {
      const plate = String(item.Vehicle || '').trim();
      if (!plate) return <span className="dom-cell-empty">-</span>;
      if (plate.toUpperCase() === 'NOVEHICLE') return <span className="fw-semibold text-muted">NOVEHICLE</span>;
      const isEv = String(item.vehicleFuelType || '').toLowerCase().includes('ev') || String(item.vehicleFuelType || '').toLowerCase().includes('electric');
      return <span className={`vrn-plate${isEv ? ' ev' : ''}`}>{plate}</span>;
    }
    if (header === 'Notes') {
      const note = item.Notes;
      if (note && String(note).trim() !== '') {
        return <button type="button" className="notes-badge" title="View notes" aria-label="View notes" onClick={(e) => openNotesPopover(e, String(note))}>!</button>;
      }
      return <span className="dom-cell-empty">-</span>;
    }
    if (header === 'Extras' || header === 'Extra') {
      if (Number(item.paymentModeId) === 7) return renderCellValue(decimalHoursToTimeString(item.Extras) || '-');
      return renderCellValue(item.Extras);
    }
    if (header === 'Rate') {
      const modeLabel = getCostModelName(master, item.paymentModeId);
      const showIcon = modeLabel !== 'DR' && modeLabel !== 'FSR' && isBandedCostModelId(master, item.paymentModeId);
      if (showIcon) return <button type="button" className="rate-info-btn" title="View cost model bands" onClick={() => openRateModal(item)}>i</button>;
      return renderCellValue(item.Rate);
    }
    if (header === 'Sort') {
      const s = String(item.Sort || '').toLowerCase();
      if (s === 'yes' && item.SortLate) return 'Yes (Late)';
      if (s === 'yes') return 'Yes';
      return renderCellValue(item.Sort);
    }
    if (header === 'Sort Value') return renderCellValue(item.routeSort);
    if (header === 'AD-HOC Service') return renderCellValue(item['AD-HOC Service']);
    return renderCellValue((item as unknown as Record<string, unknown>)[header]);
  }

  function renderActionsCell(item: DomRecord) {
    if (item.isSubmitted) return <div className="dom-actions-cell"><span className="submitted-pill">Submitted</span></div>;
    const isValidated = validatedKeys.has(item.id);
    const canDelete = item.Status !== 'NotAllocated';
    return (
      <div className="dom-actions-cell">
        <button type="button" className={`dom-icon-btn validate-btn${isValidated ? ' checked' : ''}`} title={isValidated ? 'Validated — click to unmark' : 'Mark as validated'} onClick={() => toggleValidated(item.id)}><i className="bi bi-check-lg" /></button>
        <button type="button" className="dom-icon-btn edit-btn" title="Edit" onClick={() => openEditModal(item)}><i className="bi bi-pencil" /></button>
        {canDelete && <button type="button" className="dom-icon-btn delete-btn" title="Delete" onClick={() => openDeleteModal(item)}><i className="bi bi-trash" /></button>}
      </div>
    );
  }

  function Table({ headers, rows, showActions }: { headers: string[]; rows: DomRecord[]; showActions: boolean }) {
    return (
      <div className="dom-table-scroll">
        <table className="dom-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} onClick={() => handleSort(h)}>
                  {getHeaderLabel(h)}
                  {sortConfig.key === h && <span className="sort-ind">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className={item.Status === 'Off' ? 'row-off' : item.Status === 'NotAllocated' ? 'row-notallocated' : item.isSubmitted ? 'row-submitted' : undefined}>
                {headers.map((h) => <td key={h}>{renderCell(h, item)}</td>)}
                {showActions && <td>{renderActionsCell(item)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function BlockSection({ block, isSubmitted, submittedTotal }: { block: Block; isSubmitted: boolean; submittedTotal?: number }) {
    const isCollapsed = collapsedBlocks.has(block.key);
    const isDepositBlock = block.key !== 'OFF' && block.key !== 'NOTALLOC' && block.key !== '__submitted';
    const eligible = block.rows.filter((r) => !r.isSubmitted);
    const allSelected = eligible.length > 0 && eligible.every((r) => validatedKeys.has(r.id));
    const showEmpty = isSubmitted && block.rows.length === 0 && !!submittedTotal;

    const headers = block.key === 'NOTALLOC' ? TABLE_HEADERS_NOT_ALLOCATED : isSubmitted ? TABLE_HEADERS_SUBMITTED : TABLE_HEADERS;
    const tableMainRows = applySortRows(isDepositBlock ? block.rows.filter((r) => !hasAdhocService(r)) : block.rows, sortConfig);
    const adhocRows = (isSubmitted || !isDepositBlock) ? [] : applySortRows(block.rows.filter((r) => hasAdhocService(r)), sortConfig);

    return (
      <section className="dom-block" data-block-key={block.key}>
        <div className="dom-block-header">
          <div className="dom-block-header-left">
            <button type="button" className="dom-collapse-btn" aria-label="Toggle block" onClick={() => toggleCollapse(block.key)}>
              <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'}`} />
            </button>
            <h2 className="dom-block-title">{block.label}<span className="dom-block-count">({block.rows.length} {block.rows.length === 1 ? 'record' : 'records'})</span></h2>
          </div>
          {!isCollapsed && block.key !== 'NOTALLOC' && (
            <button type="button" className="dom-select-all-btn" disabled={block.rows.length === 0} onClick={() => toggleSelectAllInBlock(block.key)}>
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
            <Table headers={headers} rows={tableMainRows} showActions={block.key !== 'NOTALLOC'} />
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

  const submittedTotal = allSubmittedUnfiltered.length;

  return (
    <PortalLayout mainClassName="dom-container container-fluid px-3 px-lg-4 py-4" title="Daily Operations Management">
      {overlayActive && createPortal(
        <div className="loading-overlay active" id="loadingOverlay">
          <div className="spinner" />
          <p>Loading daily operations…</p>
        </div>,
        document.body,
      )}

      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date"><i className="bi bi-calendar3" /><span id="pageHeaderSubtitle">{headerSubtitle}</span></p>
        </div>
        <div className="dom-header-actions">
          <div className="date-nav">
            <span className="date-nav-label"><i className="bi bi-calendar3" /> Day</span>
            <div className="date-nav-controls">
              <button type="button" className="date-nav-btn" title="Previous day" aria-label="Previous day" onClick={() => changeDate(-1)}><i className="bi bi-chevron-left" /></button>
              <input type="date" id="selectedDateInput" className="date-nav-input" title="Select date" aria-label="Select date" value={selectedDate} onChange={(e) => e.target.value && setDate(e.target.value)} />
              <button type="button" className="date-nav-btn" title="Next day" aria-label="Next day" onClick={() => changeDate(1)}><i className="bi bi-chevron-right" /></button>
            </div>
          </div>
          <button type="button" className="styled-button styled-button--primary" onClick={() => openCreateModal('record')}><i className="bi bi-plus-circle" /> Add Record</button>
          <button type="button" className="styled-button styled-button--outline" onClick={() => openCreateModal('adhoc')}><i className="bi bi-tools" /> Add Adhoc Service</button>
          <button type="button" className="styled-button styled-button--outline dom-dayoff-btn" onClick={() => openCreateModal('dayoff')}><i className="bi bi-calendar-x" /> Add Day off</button>
        </div>
      </div>

      <div className="dom-metrics" id="domMetrics">
        {metrics.map((m) => (
          <div className="dom-metric-card" key={m.label}>
            <div className="dom-metric-value">{m.value}</div>
            <div className="dom-metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <div className="search-wrap dom-search-wrap">
          <label className="filters-label" htmlFor="searchInput">Search (Vendor, Route, Vehicle)</label>
          <div className="search-input-wrap">
            <i className="bi bi-search" />
            <input type="text" id="searchInput" className="form-control" placeholder="Type to search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="filters-label" htmlFor="filterServicePartner">Service Partner</label>
          <select className="form-select filter-select" id="filterServicePartner" value={filterServicePartnerId} onChange={(e) => setFilterServicePartnerId(e.target.value)}>
            <option value="">All Service Partners</option>
            {master.servicePartners.map((sp) => <option key={sp.servicePartnerId} value={sp.servicePartnerId}>{sp.partnerName}</option>)}
          </select>
        </div>
        <div>
          <label className="filters-label" htmlFor="filterStatus">Status</label>
          <select className="form-select filter-select" id="filterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            {['Off', 'Working', 'NotAllocated'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="filters-label" htmlFor="filterVendorType">Vendor Type</label>
          <select className="form-select filter-select" id="filterVendorType" value={filterVendorType} onChange={(e) => setFilterVendorType(e.target.value)}>
            <option value="all">All</option>
            {master.vendorTypes.map((vt) => <option key={vt.vendorTypeId} value={vt.nameType}>{vt.nameType}</option>)}
          </select>
        </div>
      </div>

      {isEmpty && (
        <div className="dom-empty-state">
          <p className="dom-empty-title">No data</p>
          <p className="dom-empty-text">No records for the selected date.</p>
        </div>
      )}

      <div className="dom-blocks" id="domBlocksContainer">
        {blocks.map((block) => <BlockSection key={block.key} block={block} isSubmitted={false} />)}
      </div>

      {!(mainRows.length === 0 && submittedRows.length === 0) && (
        <div className="dom-review-bar" id="domReviewBar">
          <button type="button" className="styled-button styled-button--success" id="btnBatchSubmit" disabled={validatedKeys.size === 0} onClick={handleBatchSubmit}>
            <i className="bi bi-send-check" /> Submit
          </button>
          <span className="dom-review-hint" id="domReviewHint">{validatedKeys.size === 0 ? 'Select records using the checkbox to submit.' : `${validatedKeys.size} record(s) selected.`}</span>
        </div>
      )}

      {submittedTotal > 0 && (
        <div className="dom-submitted-section" id="domSubmittedSection">
          <div className="filters-bar">
            <div className="search-wrap dom-search-wrap">
              <label className="filters-label" htmlFor="submittedSearchInput">Search (Submitted)</label>
              <div className="search-input-wrap">
                <i className="bi bi-search" />
                <input type="text" id="submittedSearchInput" className="form-control" placeholder="Vendor, route, vehicle, deposit, notes…" value={submittedSearchTerm} onChange={(e) => setSubmittedSearchTerm(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="filters-label" htmlFor="submittedKindFilter">Record type</label>
              <select className="form-select filter-select" id="submittedKindFilter" value={submittedKindFilter} onChange={(e) => setSubmittedKindFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="dayoff">Day off</option>
                <option value="notallocated">Not allocated</option>
                <option value="routes">Routes</option>
              </select>
            </div>
            <div>
              <label className="filters-label" htmlFor="submittedVendorTypeFilter">Vendor type</label>
              <select className="form-select filter-select" id="submittedVendorTypeFilter" value={submittedVendorTypeFilter} onChange={(e) => setSubmittedVendorTypeFilter(e.target.value)}>
                <option value="all">All</option>
                {master.vendorTypes.map((vt) => <option key={vt.vendorTypeId} value={vt.nameType}>{vt.nameType}</option>)}
              </select>
            </div>
          </div>
          <div id="domSubmittedBlockContainer">
            <BlockSection block={{ key: '__submitted', label: 'Submitted', rows: submittedRows }} isSubmitted submittedTotal={submittedTotal} />
          </div>
        </div>
      )}

      {/* ============ MODAL: Add / Edit Record ============ */}
      {modalOpen && formData && createPortal(
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeRecordModal(); }}>
          <div className="dom-modal">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title">{editingId ? 'Edit Record' : modalMode === 'adhoc' ? 'Add Adhoc Service' : modalMode === 'dayoff' ? 'Add Day off' : 'Add New Record'}</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={closeRecordModal}><i className="bi bi-x-lg" /></button>
            </div>
            <form className="dom-modal-body" onSubmit={handleFormSubmit}>
              <RecordFormGrid
                mode={modalMode}
                fd={formData}
                master={master}
                onChange={(next) => setFormData(next)}
              />
              <div className="dom-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={closeRecordModal}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{editingId ? 'Update Record' : 'Add Record'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* ============ MODAL: Delete confirm ============ */}
      {deleteTarget && createPortal(
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeDeleteModal(); }}>
          <div className="dom-modal dom-modal-small">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title"><i className="bi bi-exclamation-triangle text-danger me-2" />Confirm Delete</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={closeDeleteModal}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="dom-modal-body">
              <p>{records.filter((r) => r.userId === deleteTarget.userId).length > 1
                ? `Remove ${deleteTarget.Name}'s record for ${deleteTarget.Route}? This record will be deleted.`
                : `${deleteTarget.Name} has no other record today — removing this will mark them as Not Allocated instead of deleting.`}</p>
              <div className="dom-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={closeDeleteModal}>Cancel</button>
                <button type="button" className="styled-button styled-button--danger" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ============ MODAL: Rate bands ============ */}
      {rateModalItem && createPortal(
        <div className="dom-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeRateModal(); }}>
          <div className="dom-modal dom-modal-small">
            <div className="dom-modal-header">
              <h2 className="dom-modal-title"><i className="bi bi-info-circle me-2" />Cost Model Bands</h2>
              <button type="button" className="dom-modal-close" aria-label="Close" onClick={closeRateModal}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="dom-modal-body">
              <p className="mb-3 text-secondary" style={{ fontSize: '0.85rem' }}>
                Cost model <strong>{getCostModelName(master, rateModalItem.paymentModeId)}</strong> pays per stop, according to the band the route falls into.
              </p>
              <table className="dom-band-table">
                <thead><tr><th>Min stops</th><th>Max stops</th><th>Price / stop</th></tr></thead>
                <tbody>
                  {buildRateBands(rateModalItem.paymentModeId, selectedDate).map((b, i) => (
                    <tr key={i}><td>{b.min}</td><td>{b.max == null ? '∞' : b.max}</td><td>£{b.price}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ---------- Notes popover ---------- */}
      {notesTarget && createPortal(
        <div
          className="dom-notes-popover"
          style={{ position: 'fixed', top: notesTarget.rect.top - 10, left: notesTarget.rect.left + notesTarget.rect.width / 2, transform: 'translate(-50%, -100%)' }}
        >
          <button type="button" className="dom-notes-popover-close" aria-label="Close" onClick={closeNotesPopover}><i className="bi bi-x-lg" /></button>
          <p>{notesTarget.note}</p>
        </div>,
        document.body,
      )}

      {/* ---------- Toasts ---------- */}
      {createPortal(
        <div className="toast-container" id="toastContainer">
          {toasts.map((t) => (
            <div key={t.id} className={`app-toast ${t.type}${t.hiding ? ' hiding' : ''}`}>
              <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-x-circle-fill' : 'bi-info-circle-fill'}`} />
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </PortalLayout>
  );
}

/* ==================== Record form grid (Add/Edit modal body) ==================== */
function RecordFormGrid({ mode, fd, master, onChange }: { mode: ModalMode; fd: FormData; master: MasterData; onChange: (next: FormData) => void }) {
  const isBandedRate = isBandedCostModelId(master, fd.paymentModeId);
  const isExtraHours = Number(fd.paymentModeId) === 7;

  function set(patch: Partial<FormData>) { onChange({ ...fd, ...patch }); }

  function onVendorChange(name: string) {
    let next: FormData = { ...fd, Name: name };
    next = applyVendorDefaults(next, name, mode, master);
    onChange(next);
  }
  function onStatusChange(status: Status) {
    let next: FormData = { ...fd, Status: status };
    if (status === 'Off' || status === 'NotAllocated') { next.Route = 'OFF'; next.Vehicle = 'NOVEHICLE'; }
    else if (next.Name) next = applyVendorDefaults(next, String(next.Name), mode, master);
    onChange(next);
  }
  function onRouteChange(routeName: string) {
    const route = master.routes.find((r) => r.routeName === routeName);
    const next: FormData = { ...fd, Route: routeName };
    if (route) {
      const dep = master.deposits.find((d) => d.depositId === route.depositId);
      next.depositId = route.depositId;
      next['Deposit Name'] = dep ? dep.depositName : '';
    }
    onChange(next);
  }
  function onPaymentModeChange(value: string) {
    const cmId = Number(value);
    const next: FormData = { ...fd, paymentModeId: cmId, 'Payment Mode': getCostModelName(master, cmId) };
    if (isBandedCostModelId(master, cmId)) next.Rate = '';
    onChange(next);
  }
  function onSortChange(value: string) {
    const next: FormData = { ...fd, Sort: value };
    if (value === 'No') { next.routeSort = ''; next.SortLate = false; }
    onChange(next);
  }
  function onAdhocServiceChange(value: string) {
    const service = master.adhocServices.find((s) => String(s.adhocServiceId) === value);
    const next: FormData = { ...fd, adhocServiceId: value, 'AD-HOC Service': service ? service.adhocName : '' };
    if (service) next['AD-HOC Sort'] = String(service.adhocVendorPayment);
    onChange(next);
  }

  const vendorOptions = useMemo(() => [...master.vendors].sort((a, b) => a.fullName.localeCompare(b.fullName)), [master.vendors]);
  const routeOptions = useMemo(() => master.routes.filter((r) => !['NALC', 'DHOC'].includes(r.routeName)), [master.routes]);

  if (mode === 'dayoff') {
    return (
      <div className="dom-form-grid" id="recordFormGrid">
        <div className="dom-form-field span-2">
          <label className="dom-form-label">Vendor *</label>
          <select value={String(fd.Name)} onChange={(e) => onVendorChange(e.target.value)} required>
            <option value="">Select vendor</option>
            {vendorOptions.map((v) => <option key={v.userId} value={v.fullName}>{v.fullName}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (mode === 'adhoc') {
    return (
      <div className="dom-form-grid" id="recordFormGrid">
        <div className="dom-form-field"><label className="dom-form-label">Vendor *</label>
          <select value={String(fd.Name)} onChange={(e) => onVendorChange(e.target.value)} required>
            <option value="">Select vendor</option>
            {vendorOptions.map((v) => <option key={v.userId} value={v.fullName}>{v.fullName}</option>)}
          </select>
        </div>
        <div className="dom-form-field"><label className="dom-form-label">Route</label>
          <select value={String(fd.Route)} onChange={(e) => set({ Route: e.target.value })}>
            <option value="OFF">OFF</option>
            {routeOptions.map((r) => <option key={r.routeId} value={r.routeName}>{r.routeName}</option>)}
          </select>
        </div>
        <div className="dom-form-field"><label className="dom-form-label">Depot</label>
          <select value={String(fd['Deposit Name'])} onChange={(e) => set({ 'Deposit Name': e.target.value })}>
            {master.deposits.map((d) => <option key={d.depositId} value={d.depositName}>{d.depositName}</option>)}
          </select>
        </div>
        <div className="dom-form-field"><label className="dom-form-label">AD-HOC Service *</label>
          <select value={String(fd.adhocServiceId ?? '')} onChange={(e) => onAdhocServiceChange(e.target.value)} required>
            <option value="">Select service</option>
            {master.adhocServices.map((s) => <option key={s.adhocServiceId} value={s.adhocServiceId}>{s.adhocName}</option>)}
          </select>
        </div>
        <div className="dom-form-field"><label className="dom-form-label">AD-HOC Sort</label>
          <input type="text" value={String(fd['AD-HOC Sort'] ?? '')} placeholder="e.g. 10.00" onChange={(e) => set({ 'AD-HOC Sort': e.target.value })} />
        </div>
        <div className="dom-form-field"><label className="dom-form-label">Extra</label>
          <input type="text" value={String(fd.Extras ?? '')} onChange={(e) => set({ Extras: e.target.value })} />
        </div>
        <div className="dom-form-field span-2"><label className="dom-form-label">Notes</label>
          <textarea rows={2} value={String(fd.Notes ?? '')} onChange={(e) => set({ Notes: e.target.value })} />
        </div>
        <div className="dom-form-field"><label className="dom-form-label">Vehicle</label>
          <select value={String(fd.Vehicle)} onChange={(e) => set({ Vehicle: e.target.value })}>
            <option value="NOVEHICLE">NOVEHICLE</option>
            {master.vehicles.map((v) => <option key={v.vehicleId} value={v.registrationPlates}>{v.registrationPlates} ({v.model})</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="dom-form-grid" id="recordFormGrid">
      <div className="dom-form-field"><label className="dom-form-label">Vendor *</label>
        <select value={String(fd.Name)} onChange={(e) => onVendorChange(e.target.value)} required>
          <option value="">Select vendor</option>
          {vendorOptions.map((v) => <option key={v.userId} value={v.fullName}>{v.fullName}</option>)}
        </select>
      </div>
      <div className="dom-form-field">
        <label className="dom-form-label">Status *</label>
        <select value={fd.Status} onChange={(e) => onStatusChange(e.target.value as Status)} required>
          <option value="Working">Working</option>
          <option value="Off">Day Off</option>
          <option value="NotAllocated">Not Allocated</option>
        </select>
      </div>
      <div className="dom-form-field"><label className="dom-form-label">Route{fd.Status === 'Working' ? ' *' : ''}</label>
        <select value={String(fd.Route)} disabled={fd.Status !== 'Working'} onChange={(e) => onRouteChange(e.target.value)}>
          <option value="OFF">OFF</option>
          {routeOptions.map((r) => <option key={r.routeId} value={r.routeName}>{r.routeName}</option>)}
        </select>
      </div>
      <div className="dom-form-field"><label className="dom-form-label">Payment Mode{fd.Status === 'Working' ? ' *' : ''}</label>
        <select value={String(fd.paymentModeId ?? '')} disabled={fd.Status !== 'Working'} onChange={(e) => onPaymentModeChange(e.target.value)}>
          <option value="">Select mode</option>
          {master.costModels.map((c) => <option key={c.costModelId} value={c.costModelId}>{c.name}</option>)}
        </select>
      </div>
      <div className="dom-form-field">
        <label className="dom-form-label">Rate</label>
        <input type="text" value={String(fd.Rate ?? '')} disabled={isBandedRate || fd.Status !== 'Working'} placeholder={isBandedRate ? 'Defined by cost model bands' : ''} onChange={(e) => set({ Rate: e.target.value })} />
        {isBandedRate && <p className="dom-form-hint">For DAF/VSR/SP_VSR, use the info icon in the Rate column of the table.</p>}
      </div>
      <div className="dom-form-field span-2">
        <label className="dom-form-label">Sort</label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 140 }}>
            <select value={String(fd.Sort)} disabled={fd.Status !== 'Working'} onChange={(e) => onSortChange(e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            {fd.Sort === 'Yes' && (
              <div className="dom-sort-arrival">
                <span>Arrival:</span>
                <button type="button" className={`dom-arrival-btn${!fd.SortLate ? ' active-ontime' : ''}`} onClick={() => set({ SortLate: false })}><i className="bi bi-check-lg" /> On time</button>
                <button type="button" className={`dom-arrival-btn${fd.SortLate ? ' active-late' : ''}`} onClick={() => set({ SortLate: true })}><i className="bi bi-clock" /> Late</button>
              </div>
            )}
          </div>
          <div style={{ minWidth: 140 }}>
            <label className="dom-form-label" style={{ fontWeight: 500 }}>Sort value</label>
            <input type="number" value={String(fd.routeSort ?? '')} disabled={fd.Sort !== 'Yes' || fd.Status !== 'Working'} placeholder="e.g. 0, 1, 20" onChange={(e) => set({ routeSort: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="dom-form-field">
        <label className="dom-form-label">{isExtraHours ? 'Extras - Time' : 'Extras - Qty Hour'}</label>
        {isExtraHours
          ? <input type="time" value={decimalHoursToTimeString(fd.Extras)} onChange={(e) => { const dec = timeStringToDecimalHours(e.target.value); set({ Extras: dec !== undefined ? dec : '' }); }} />
          : <input type="text" value={String(fd.Extras ?? '')} onChange={(e) => set({ Extras: e.target.value })} />}
      </div>
      <div className="dom-form-field"><label className="dom-form-label">Vehicle</label>
        <select value={String(fd.Vehicle)} disabled={fd.Status === 'Off' || fd.Status === 'NotAllocated'} onChange={(e) => set({ Vehicle: e.target.value })}>
          <option value="NOVEHICLE">NOVEHICLE</option>
          {master.vehicles.map((v) => <option key={v.vehicleId} value={v.registrationPlates}>{v.registrationPlates} ({v.model})</option>)}
        </select>
      </div>
      <div className="dom-form-field span-2"><label className="dom-form-label">Notes</label>
        <textarea rows={2} value={String(fd.Notes ?? '')} onChange={(e) => set({ Notes: e.target.value })} />
      </div>
      <div className="dom-form-field"><label className="dom-form-label">Vendor type</label>
        <select value={String(fd['Vendor type'] ?? '')} onChange={(e) => set({ 'Vendor type': e.target.value })}>
          <option value="">Select type</option>
          {master.vendorTypes.map((t) => <option key={t.vendorTypeId} value={t.nameType}>{t.nameType}</option>)}
        </select>
      </div>
    </div>
  );
}
