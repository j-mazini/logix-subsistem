import { useEffect, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import '../../styles/legacy/assets.css';

/* =====================================================
   Assets Management — Logixsphere portal
   Port of sp-portal/assets/script.js. Purely mock/simulated data generated
   locally (the original script never reads window.DHL_MOCK_DATA for this
   page — it builds its own deposits/service partners/customers/users plus
   six tabs of records, one seeded via a deterministic PRNG), so no shared
   data module is needed here beyond this file.
   ===================================================== */

/* ---------- small deterministic PRNG helpers (verbatim port) ---------- */
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

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ==================== TYPES ==================== */
interface Deposit { depositId: number; depositName: string }
interface ServicePartner { servicePartnerId: number; partnerName: string }
interface Customer { customerId: number; customerName: string }
interface UserRec { id: number; firstName: string; lastName: string }

interface VendorType {
  vendorTypeId: number;
  nameType: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}
interface UserType {
  userTypeId: number;
  nameType: string;
}
interface CostModel {
  costModelId: number;
  name: string;
  description?: string;
  paymentMethod?: string;
  isAdhocCategory: boolean;
  customerId: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}
interface VehicleType {
  vehicleTypeId: number;
  typeName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}
interface ManagementTeamItem {
  managementTeamFunctionId: number;
  functionName: string;
  depositId: number | null;
  userId: number | null;
  servicePartnerId: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}
interface AdhocCategory {
  adhocCategoriesId: number;
  name: string;
  description?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
}

type Tab = 'vendor-types' | 'user-types' | 'cost-models' | 'vehicle-types' | 'management-team' | 'adhoc-categories';
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; hiding: boolean }

/* ==================== MASTER / REFERENCE DATA (static, deterministic) ==================== */
const DEPOSITS: Deposit[] = [
  { depositId: 1, depositName: 'London North Depot' },
  { depositId: 2, depositName: 'Birmingham Central Depot' },
  { depositId: 3, depositName: 'Manchester Depot' },
  { depositId: 4, depositName: 'Leeds Depot' },
  { depositId: 5, depositName: 'Bristol Depot' },
];

const SERVICE_PARTNERS: ServicePartner[] = [
  { servicePartnerId: 1, partnerName: 'Swift Logistics' },
  { servicePartnerId: 2, partnerName: 'Kent Express' },
  { servicePartnerId: 3, partnerName: 'Medway Movers' },
];

const CUSTOMERS: Customer[] = [
  { customerId: 1, customerName: 'DHL eCommerce' },
  { customerId: 2, customerName: 'DHL Parcel UK' },
  { customerId: 3, customerName: 'DHL Express' },
];

const FIRST_NAMES = ['James', 'Oliver', 'George', 'Harry', 'Amelia', 'Olivia', 'Isla', 'Mateus', 'Ricardo', 'Bianca'];
const LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Silva', 'Costa', 'Santos', 'Murphy'];
const USERS: UserRec[] = Array.from({ length: 10 }, (_, i) => ({
  id: 1000 + i,
  firstName: FIRST_NAMES[i % FIRST_NAMES.length],
  lastName: LAST_NAMES[(i * 3) % LAST_NAMES.length],
}));

function getDepositName(id: number | null): string {
  const d = DEPOSITS.find((x) => x.depositId === Number(id));
  return d ? d.depositName : `Deposit ${id}`;
}
function getUserName(id: number | null): string {
  const u = USERS.find((x) => x.id === Number(id));
  return u ? `${u.firstName} ${u.lastName}` : `User ${id}`;
}
function getServicePartnerName(id: number | null): string {
  const sp = SERVICE_PARTNERS.find((x) => x.servicePartnerId === Number(id));
  return sp ? sp.partnerName : `Service Partner ${id}`;
}
function getCustomerName(id: number | null): string {
  const c = CUSTOMERS.find((x) => x.customerId === Number(id));
  return c ? c.customerName : `Customer ${id}`;
}

/* ==================== MOCK DATA BUILDERS (computed once at mount) ==================== */
function buildVendorTypes(): { items: VendorType[]; nextSeq: number } {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
  const names = ['Owner Driver', 'Multi-Drop', 'Courier Partner', 'Van Owner', 'Fleet Operator', 'Bike Courier', 'Subcontractor'];
  let seq = 100;
  const items = names.map((name, i) => ({
    vendorTypeId: seq++,
    nameType: name,
    createdBy: 'system',
    createdAt: daysAgo(200 - i * 5),
    updatedAt: i % 3 === 0 ? daysAgo(10 + i) : null,
  }));
  return { items, nextSeq: seq };
}

function buildUserTypes(): { items: UserType[]; nextSeq: number } {
  const names = ['Admin', 'Supervisor', 'Driver', 'Vendor', 'Dispatcher', 'Finance'];
  let seq = 200;
  const items = names.map((name) => ({ userTypeId: seq++, nameType: name }));
  return { items, nextSeq: seq };
}

function buildCostModels(): { items: CostModel[]; nextSeq: number } {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
  const defs: Array<Omit<CostModel, 'costModelId' | 'createdBy' | 'createdAt' | 'updatedAt'>> = [
    { name: 'Per Drop', description: 'Rate per delivered stop, tiered by volume.', paymentMethod: 'Invoice', isAdhocCategory: false, customerId: 1 },
    { name: 'Per Mile', description: 'Flat rate per mile driven on route.', paymentMethod: 'Invoice', isAdhocCategory: false, customerId: 2 },
    { name: 'Per Hour', description: 'Hourly rate for time-based routes.', paymentMethod: 'Prepaid', isAdhocCategory: false, customerId: null },
    { name: 'Flat Rate Ad-hoc', description: 'Fixed fee for one-off adhoc works.', paymentMethod: 'Invoice', isAdhocCategory: true, customerId: 3 },
    { name: 'Fuel Surcharge', description: 'Percentage surcharge applied on top of base rate.', paymentMethod: 'Invoice', isAdhocCategory: false, customerId: null },
    { name: 'Weekend Premium', description: 'Additional premium for Saturday/Sunday routes.', paymentMethod: 'Prepaid', isAdhocCategory: false, customerId: 1 },
  ];
  let seq = 300;
  const items = defs.map((def, i) => ({
    costModelId: seq++,
    ...def,
    createdBy: 'system',
    createdAt: daysAgo(180 - i * 8),
    updatedAt: null,
  }));
  return { items, nextSeq: seq };
}

function buildVehicleTypes(): { items: VehicleType[]; nextSeq: number } {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
  const names = ['Van', 'Truck 3.5t', 'Bike', 'Car', 'Box Van 7.5t', 'Articulated Lorry', 'Motorbike'];
  let seq = 400;
  const items = names.map((name, i) => ({
    vehicleTypeId: seq++,
    typeName: name,
    createdBy: 'system',
    createdAt: daysAgo(220 - i * 6),
    updatedAt: i % 4 === 0 ? daysAgo(15 + i) : null,
  }));
  return { items, nextSeq: seq };
}

function buildManagementTeam(): { items: ManagementTeamItem[]; nextSeq: number } {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
  const rng = rngForSeed('am-management-team-v1');
  const names = ['Fleet Manager', 'Ops Supervisor', 'Route Planner', 'Compliance Officer', 'Customer Service Lead', 'Depot Coordinator'];
  let seq = 500;
  const items = names.map((name, i) => {
    const hasSp = rng() > 0.4;
    return {
      managementTeamFunctionId: seq++,
      functionName: name,
      depositId: DEPOSITS[i % DEPOSITS.length].depositId,
      userId: USERS[i % USERS.length].id,
      servicePartnerId: hasSp ? SERVICE_PARTNERS[i % SERVICE_PARTNERS.length].servicePartnerId : null,
      createdBy: 'system',
      createdAt: daysAgo(150 - i * 7),
      updatedAt: null,
    };
  });
  return { items, nextSeq: seq };
}

function buildAdhocCategories(): { items: AdhocCategory[]; nextSeq: number } {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
  const defs: Array<Omit<AdhocCategory, 'adhocCategoriesId' | 'createdBy' | 'createdAt' | 'updatedAt'>> = [
    { name: 'Operational', description: 'Day-to-day operational adhoc works.', active: true },
    { name: 'Customer Requested', description: 'Adhoc works requested directly by the customer.', active: true },
    { name: 'Compliance', description: 'Works required to satisfy compliance obligations.', active: true },
    { name: 'Weather Related', description: 'Adhoc works triggered by adverse weather.', active: true },
    { name: 'Equipment Failure', description: 'Works related to equipment or vehicle failure.', active: false },
    { name: 'Special Project', description: 'One-off works tied to a special project.', active: true },
  ];
  let seq = 600;
  const items = defs.map((def, i) => ({
    adhocCategoriesId: seq++,
    ...def,
    createdBy: 'system',
    createdAt: daysAgo(120 - i * 4),
    updatedAt: null,
  }));
  return { items, nextSeq: seq };
}

/* ==================== SHARED RENDER HELPERS ==================== */
function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="am-empty-state">
      <span className="am-empty-icon">{icon}</span>
      <p className="am-empty-title">{title}</p>
      <p className="am-empty-text">{subtitle}</p>
    </div>
  );
}

function InfoBox({ item }: { item: { createdBy?: string | null; createdAt?: string | null; updatedAt?: string | null } | null }) {
  if (!item || (!item.createdBy && !item.createdAt && !item.updatedAt)) return null;
  return (
    <div className="am-info-box">
      <p className="am-info-box-title">Additional Information</p>
      {item.createdBy && <div className="am-info-box-row"><strong>Created by:</strong> {item.createdBy}</div>}
      {item.createdAt && <div className="am-info-box-row"><strong>Created at:</strong> {formatDate(item.createdAt)}</div>}
      {item.updatedAt && <div className="am-info-box-row"><strong>Updated at:</strong> {formatDate(item.updatedAt)}</div>}
    </div>
  );
}

export function Assets() {
  /* ==================== LOADING OVERLAY (matches init()'s 400ms removal) ==================== */
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  /* ==================== TABS ==================== */
  const [activeTab, setActiveTab] = useState<Tab>('vendor-types');

  /* ==================== SEARCH ==================== */
  const [searchVendorTypes, setSearchVendorTypes] = useState('');
  const [searchUserTypes, setSearchUserTypes] = useState('');
  const [searchCostModels, setSearchCostModels] = useState('');
  const [searchVehicleTypes, setSearchVehicleTypes] = useState('');
  const [searchManagementTeam, setSearchManagementTeam] = useState('');
  const [searchAdhocCategories, setSearchAdhocCategories] = useState('');

  /* ==================== DATA (built once, seq counters kept in refs) ==================== */
  const [vendorTypes, setVendorTypes] = useState<VendorType[]>(() => buildVendorTypes().items);
  const vendorTypeSeq = useRef(buildVendorTypes().nextSeq);
  const [userTypes, setUserTypes] = useState<UserType[]>(() => buildUserTypes().items);
  const userTypeSeq = useRef(buildUserTypes().nextSeq);
  const [costModels, setCostModels] = useState<CostModel[]>(() => buildCostModels().items);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(() => buildVehicleTypes().items);
  const vehicleTypeSeq = useRef(buildVehicleTypes().nextSeq);
  const [managementTeam, setManagementTeam] = useState<ManagementTeamItem[]>(() => buildManagementTeam().items);
  const managementTeamSeq = useRef(buildManagementTeam().nextSeq);
  const [adhocCategories, setAdhocCategories] = useState<AdhocCategory[]>(() => buildAdhocCategories().items);
  const adhocCategorySeq = useRef(buildAdhocCategories().nextSeq);

  /* ==================== TOASTS ==================== */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
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

  /* ==================== MODALS ==================== */
  const [vendorTypeModal, setVendorTypeModal] = useState<{ open: boolean; editing: VendorType | null }>({ open: false, editing: null });
  const [vendorTypeName, setVendorTypeName] = useState('');

  const [userTypeModal, setUserTypeModal] = useState<{ open: boolean; editing: UserType | null }>({ open: false, editing: null });
  const [userTypeName, setUserTypeName] = useState('');

  const [costModelModal, setCostModelModal] = useState<{ open: boolean; editing: CostModel | null }>({ open: false, editing: null });
  const [costModelDescription, setCostModelDescription] = useState('');
  const [costModelPaymentMethod, setCostModelPaymentMethod] = useState('');

  const [vehicleTypeModal, setVehicleTypeModal] = useState<{ open: boolean; editing: VehicleType | null }>({ open: false, editing: null });
  const [vehicleTypeName, setVehicleTypeName] = useState('');

  const [managementTeamModal, setManagementTeamModal] = useState<{ open: boolean; editing: ManagementTeamItem | null }>({ open: false, editing: null });
  const [managementTeamFunctionName, setManagementTeamFunctionName] = useState('');
  const [managementTeamDeposit, setManagementTeamDeposit] = useState('');
  const [managementTeamUser, setManagementTeamUser] = useState('');
  const [managementTeamServicePartner, setManagementTeamServicePartner] = useState('');

  const [adhocCategoryModal, setAdhocCategoryModal] = useState<{ open: boolean; editing: AdhocCategory | null }>({ open: false, editing: null });
  const [adhocCategoryName, setAdhocCategoryName] = useState('');
  const [adhocCategoryDescription, setAdhocCategoryDescription] = useState('');
  const [adhocCategoryActive, setAdhocCategoryActive] = useState(true);

  const [pendingDelete, setPendingDelete] = useState<{ type: 'managementTeam' | 'adhocCategory'; id: number } | null>(null);
  const confirmDeleteOpen = pendingDelete !== null;

  function closeAllModals() {
    setVendorTypeModal({ open: false, editing: null });
    setUserTypeModal({ open: false, editing: null });
    setCostModelModal({ open: false, editing: null });
    setVehicleTypeModal({ open: false, editing: null });
    setManagementTeamModal({ open: false, editing: null });
    setAdhocCategoryModal({ open: false, editing: null });
    setPendingDelete(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAllModals();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ==================== VENDOR TYPES ==================== */
  const filteredVendorTypes = (() => {
    const q = searchVendorTypes.trim().toLowerCase();
    if (!q) return vendorTypes;
    return vendorTypes.filter((v) => (v.nameType || '').toLowerCase().includes(q));
  })();

  function openVendorTypeModal(vendorType: VendorType | null) {
    setVendorTypeModal({ open: true, editing: vendorType });
    setVendorTypeName(vendorType ? vendorType.nameType || '' : '');
  }

  function submitVendorType(e: React.FormEvent) {
    e.preventDefault();
    const nameType = vendorTypeName.trim();
    if (!nameType) { alert('Type name is required'); return; }
    const editing = vendorTypeModal.editing;
    if (editing) {
      setVendorTypes((prev) => prev.map((v) => (v.vendorTypeId === editing.vendorTypeId ? { ...v, nameType, updatedAt: new Date().toISOString() } : v)));
      showToast('Vendor type updated successfully.', 'success');
    } else {
      setVendorTypes((prev) => [...prev, {
        vendorTypeId: vendorTypeSeq.current++,
        nameType,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }]);
      showToast('Vendor type created successfully.', 'success');
    }
    setVendorTypeModal({ open: false, editing: null });
  }

  /* ==================== USER TYPES ==================== */
  const filteredUserTypes = (() => {
    const q = searchUserTypes.trim().toLowerCase();
    if (!q) return userTypes;
    return userTypes.filter((v) => (v.nameType || '').toLowerCase().includes(q));
  })();

  function openUserTypeModal(userType: UserType | null) {
    setUserTypeModal({ open: true, editing: userType });
    setUserTypeName(userType ? userType.nameType || '' : '');
  }

  function submitUserType(e: React.FormEvent) {
    e.preventDefault();
    const nameType = userTypeName.trim();
    if (!nameType) { alert('Name type is required'); return; }
    const editing = userTypeModal.editing;
    if (editing) {
      setUserTypes((prev) => prev.map((v) => (v.userTypeId === editing.userTypeId ? { ...v, nameType } : v)));
      showToast('User type updated successfully.', 'success');
    } else {
      setUserTypes((prev) => [...prev, { userTypeId: userTypeSeq.current++, nameType }]);
      showToast('User type created successfully.', 'success');
    }
    setUserTypeModal({ open: false, editing: null });
  }

  /* ==================== COST MODELS (edit-only) ==================== */
  const filteredCostModels = (() => {
    const q = searchCostModels.trim().toLowerCase();
    if (!q) return costModels;
    return costModels.filter((v) => (v.name || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q));
  })();

  function openCostModelModal(costModel: CostModel | null) {
    // Cost models are edit-only on this page (no "Add" button), matching the source.
    if (!costModel) return;
    setCostModelModal({ open: true, editing: costModel });
    setCostModelDescription(costModel.description || '');
    setCostModelPaymentMethod(costModel.paymentMethod || '');
  }

  function submitCostModel(e: React.FormEvent) {
    e.preventDefault();
    const editing = costModelModal.editing;
    if (!editing) return;
    const description = costModelDescription.trim() || undefined;
    const paymentMethod = costModelPaymentMethod.trim() || undefined;
    setCostModels((prev) => prev.map((c) => (c.costModelId === editing.costModelId ? { ...c, description, paymentMethod, updatedAt: new Date().toISOString() } : c)));
    showToast('Cost model updated successfully.', 'success');
    setCostModelModal({ open: false, editing: null });
  }

  /* ==================== VEHICLE TYPES ==================== */
  const filteredVehicleTypes = (() => {
    const q = searchVehicleTypes.trim().toLowerCase();
    if (!q) return vehicleTypes;
    return vehicleTypes.filter((v) => (v.typeName || '').toLowerCase().includes(q));
  })();

  function openVehicleTypeModal(vehicleType: VehicleType | null) {
    setVehicleTypeModal({ open: true, editing: vehicleType });
    setVehicleTypeName(vehicleType ? vehicleType.typeName || '' : '');
  }

  function submitVehicleType(e: React.FormEvent) {
    e.preventDefault();
    const typeName = vehicleTypeName.trim();
    if (!typeName) { alert('Type name is required'); return; }
    const editing = vehicleTypeModal.editing;
    if (editing) {
      setVehicleTypes((prev) => prev.map((v) => (v.vehicleTypeId === editing.vehicleTypeId ? { ...v, typeName, updatedAt: new Date().toISOString() } : v)));
      showToast('Vehicle type updated successfully.', 'success');
    } else {
      setVehicleTypes((prev) => [...prev, {
        vehicleTypeId: vehicleTypeSeq.current++,
        typeName,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }]);
      showToast('Vehicle type created successfully.', 'success');
    }
    setVehicleTypeModal({ open: false, editing: null });
  }

  /* ==================== MANAGEMENT & SUPPORT TEAM ==================== */
  const filteredManagementTeam = (() => {
    const q = searchManagementTeam.trim().toLowerCase();
    if (!q) return managementTeam;
    return managementTeam.filter((item) => {
      const haystack = [
        item.functionName,
        getDepositName(item.depositId),
        getUserName(item.userId),
        item.servicePartnerId ? getServicePartnerName(item.servicePartnerId) : '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  })();

  function openManagementTeamModal(item: ManagementTeamItem | null) {
    setManagementTeamModal({ open: true, editing: item });
    setManagementTeamFunctionName(item ? item.functionName || '' : '');
    setManagementTeamDeposit(item && item.depositId != null ? String(item.depositId) : '');
    setManagementTeamUser(item && item.userId != null ? String(item.userId) : '');
    setManagementTeamServicePartner(item && item.servicePartnerId != null ? String(item.servicePartnerId) : '');
  }

  function submitManagementTeam(e: React.FormEvent) {
    e.preventDefault();
    const functionName = managementTeamFunctionName.trim();
    const depositId = managementTeamDeposit;
    const userId = managementTeamUser;
    const servicePartnerId = managementTeamServicePartner;
    if (!functionName || !depositId || !userId) {
      alert('Function name, deposit and user are required');
      return;
    }
    const editing = managementTeamModal.editing;
    if (editing) {
      setManagementTeam((prev) => prev.map((v) => (v.managementTeamFunctionId === editing.managementTeamFunctionId ? {
        ...v,
        functionName,
        depositId: Number(depositId),
        userId: Number(userId),
        servicePartnerId: servicePartnerId ? Number(servicePartnerId) : null,
        updatedAt: new Date().toISOString(),
      } : v)));
      showToast('Management team function updated successfully.', 'success');
    } else {
      setManagementTeam((prev) => [...prev, {
        managementTeamFunctionId: managementTeamSeq.current++,
        functionName,
        depositId: Number(depositId),
        userId: Number(userId),
        servicePartnerId: servicePartnerId ? Number(servicePartnerId) : null,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }]);
      showToast('Management team function created successfully.', 'success');
    }
    setManagementTeamModal({ open: false, editing: null });
  }

  /* ==================== ADHOC CATEGORIES ==================== */
  const filteredAdhocCategories = (() => {
    const q = searchAdhocCategories.trim().toLowerCase();
    if (!q) return adhocCategories;
    return adhocCategories.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  })();

  function openAdhocCategoryModal(item: AdhocCategory | null) {
    setAdhocCategoryModal({ open: true, editing: item });
    setAdhocCategoryName(item ? item.name || '' : '');
    setAdhocCategoryDescription(item ? item.description || '' : '');
    setAdhocCategoryActive(item ? item.active !== false : true);
  }

  function submitAdhocCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = adhocCategoryName.trim();
    if (!name) { alert('Name is required'); return; }
    const description = adhocCategoryDescription.trim();
    const active = adhocCategoryActive;
    const editing = adhocCategoryModal.editing;
    if (editing) {
      setAdhocCategories((prev) => prev.map((c) => (c.adhocCategoriesId === editing.adhocCategoriesId ? {
        ...c,
        name,
        description: description || undefined,
        active,
        updatedAt: new Date().toISOString(),
      } : c)));
      showToast('Adhoc category updated successfully.', 'success');
    } else {
      setAdhocCategories((prev) => [...prev, {
        adhocCategoriesId: adhocCategorySeq.current++,
        name,
        description: description || undefined,
        active,
        createdBy: 'you',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }]);
      showToast('Adhoc category created successfully.', 'success');
    }
    setAdhocCategoryModal({ open: false, editing: null });
  }

  /* ==================== DELETE (Management Team + Adhoc Categories only,
     matching the source's ConfirmDeleteModal usage) ==================== */
  function requestDelete(type: 'managementTeam' | 'adhocCategory', id: number) {
    setPendingDelete({ type, id });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    if (type === 'managementTeam') {
      setManagementTeam((prev) => prev.filter((x) => x.managementTeamFunctionId !== id));
      showToast('Management team function deleted.', 'success');
    } else if (type === 'adhocCategory') {
      setAdhocCategories((prev) => prev.filter((x) => x.adhocCategoriesId !== id));
      showToast('Adhoc category deleted.', 'success');
    }
    setPendingDelete(null);
  }

  const confirmDeleteTitle = pendingDelete?.type === 'managementTeam'
    ? 'Delete Management Team Function'
    : pendingDelete?.type === 'adhocCategory'
      ? 'Delete Adhoc Category'
      : 'Delete Item';
  const confirmDeleteMessage = pendingDelete?.type === 'managementTeam'
    ? 'Are you sure you want to delete this management team function? This action cannot be undone.'
    : pendingDelete?.type === 'adhocCategory'
      ? 'Are you sure you want to delete this category? This action cannot be undone and will affect associated services.'
      : 'Are you sure you want to delete this item? This action cannot be undone.';

  const tabs: Array<{ key: Tab; icon: string; label: string }> = [
    { key: 'vendor-types', icon: 'bi-shop', label: 'Vendor Types' },
    { key: 'user-types', icon: 'bi-person-badge', label: 'User Types' },
    { key: 'cost-models', icon: 'bi-calculator', label: 'Cost Models' },
    { key: 'vehicle-types', icon: 'bi-truck', label: 'Vehicle Types' },
    { key: 'management-team', icon: 'bi-people', label: 'Management & Support Team' },
    { key: 'adhoc-categories', icon: 'bi-tags', label: 'Adhoc Categories' },
  ];

  return (
    <PortalLayout pageClassName="assets-page" mainClassName="am-container container-fluid px-3 px-lg-4 py-4" title="Assets Management">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading assets…</p>
      </div>

      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date"><i className="bi bi-phone" /><span>Vendor types, user types, cost models, vehicle types, team functions and adhoc categories.</span></p>
        </div>
      </div>

      <div className="am-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`am-tab${activeTab === t.key ? ' active' : ''}`}
            data-tab={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
          >
            <i className={`bi ${t.icon}`} /><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ============ VENDOR TYPES TAB ============ */}
      <section className="am-tab-panel" id="panelVendorTypes" hidden={activeTab !== 'vendor-types'}>
        <div className="am-actions-row">
          <button type="button" className="styled-button styled-button--primary" onClick={() => openVendorTypeModal(null)}><i className="bi bi-plus-lg" /> Add Vendor Type</button>
        </div>
        <div className="am-layout">
          <aside className="am-filters-panel">
            <label className="am-filters-label">Search</label>
            <div className="search-input-wrap"><i className="bi bi-search" /><input type="text" className="form-control" placeholder="Search vendor types..." value={searchVendorTypes} onChange={(e) => setSearchVendorTypes(e.target.value)} /></div>
            <button type="button" className="styled-button styled-button--outline styled-button--sm am-clear-btn" onClick={() => setSearchVendorTypes('')}><i className="bi bi-x-circle" /> Clear</button>
          </aside>
          <section className="am-cards-col">
            {filteredVendorTypes.length === 0 ? (
              <EmptyState icon="🏢" title="No vendor types found" subtitle="Try adjusting the search or creating a new vendor type." />
            ) : (
              filteredVendorTypes.map((v) => (
                <div className="am-card am-card--blue" key={v.vendorTypeId}>
                  <div className="am-card-body">
                    <h3 className="am-card-title">{v.nameType || `Vendor Type ${v.vendorTypeId}`}</h3>
                    <div className="am-card-meta"><span><i className="bi bi-hash" />ID: {v.vendorTypeId}</span></div>
                    {(v.createdAt || v.updatedAt) && (
                      <div className="am-card-footnote">
                        {v.createdAt && <span>Created: {formatDate(v.createdAt)}</span>}
                        {v.updatedAt && <span>Updated: {formatDate(v.updatedAt)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="am-card-actions">
                    <button type="button" className="am-icon-btn" title="Edit vendor type" onClick={() => openVendorTypeModal(v)}><i className="bi bi-pencil" /></button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>

      {/* ============ USER TYPES TAB ============ */}
      <section className="am-tab-panel" id="panelUserTypes" hidden={activeTab !== 'user-types'}>
        <div className="am-actions-row">
          <button type="button" className="styled-button styled-button--primary" onClick={() => openUserTypeModal(null)}><i className="bi bi-plus-lg" /> Add User Type</button>
        </div>
        <div className="am-layout">
          <aside className="am-filters-panel">
            <label className="am-filters-label">Search</label>
            <div className="search-input-wrap"><i className="bi bi-search" /><input type="text" className="form-control" placeholder="Search user types..." value={searchUserTypes} onChange={(e) => setSearchUserTypes(e.target.value)} /></div>
            <button type="button" className="styled-button styled-button--outline styled-button--sm am-clear-btn" onClick={() => setSearchUserTypes('')}><i className="bi bi-x-circle" /> Clear</button>
          </aside>
          <section className="am-cards-col">
            {filteredUserTypes.length === 0 ? (
              <EmptyState icon="👤" title="No user types found" subtitle="Try adjusting the search or creating a new user type." />
            ) : (
              filteredUserTypes.map((v) => (
                <div className="am-card am-card--green" key={v.userTypeId}>
                  <div className="am-card-body">
                    <h3 className="am-card-title">{v.nameType || `User Type ${v.userTypeId}`}</h3>
                    <div className="am-card-meta"><span><i className="bi bi-hash" />ID: {v.userTypeId}</span></div>
                  </div>
                  <div className="am-card-actions">
                    <button type="button" className="am-icon-btn" title="Edit user type" onClick={() => openUserTypeModal(v)}><i className="bi bi-pencil" /></button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>

      {/* ============ COST MODELS TAB (edit-only, no add button) ============ */}
      <section className="am-tab-panel" id="panelCostModels" hidden={activeTab !== 'cost-models'}>
        <div className="am-layout">
          <aside className="am-filters-panel">
            <label className="am-filters-label">Search</label>
            <div className="search-input-wrap"><i className="bi bi-search" /><input type="text" className="form-control" placeholder="Search cost models..." value={searchCostModels} onChange={(e) => setSearchCostModels(e.target.value)} /></div>
            <button type="button" className="styled-button styled-button--outline styled-button--sm am-clear-btn" onClick={() => setSearchCostModels('')}><i className="bi bi-x-circle" /> Clear</button>
          </aside>
          <section className="am-cards-col">
            {filteredCostModels.length === 0 ? (
              <EmptyState icon="💰" title="No cost models found" subtitle="Try adjusting the search." />
            ) : (
              filteredCostModels.map((c) => (
                <div className="am-card am-card--amber" key={c.costModelId}>
                  <div className="am-card-body">
                    <h3 className="am-card-title">{c.name || 'Unnamed'} {c.isAdhocCategory && <span className="am-badge">Ad-Hoc</span>}</h3>
                    <div className="am-card-block">
                      <p className="am-card-block-label">Formula</p>
                      <p className="am-card-block-value">{c.description && c.description.trim() ? c.description : '—'}</p>
                    </div>
                    <div className="am-card-block">
                      <p className="am-card-block-label">Payment Method</p>
                      <p className="am-card-block-value">{c.paymentMethod && c.paymentMethod.trim() ? c.paymentMethod : '—'}</p>
                    </div>
                    {c.createdAt && <div className="am-card-footnote"><span>Created: {formatDate(c.createdAt)}</span></div>}
                  </div>
                  <div className="am-card-actions">
                    <button type="button" className="am-icon-btn" title="Edit cost model" onClick={() => openCostModelModal(c)}><i className="bi bi-pencil" /></button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>

      {/* ============ VEHICLE TYPES TAB ============ */}
      <section className="am-tab-panel" id="panelVehicleTypes" hidden={activeTab !== 'vehicle-types'}>
        <div className="am-actions-row">
          <button type="button" className="styled-button styled-button--primary" onClick={() => openVehicleTypeModal(null)}><i className="bi bi-plus-lg" /> Add Vehicle Type</button>
        </div>
        <div className="am-layout">
          <aside className="am-filters-panel">
            <label className="am-filters-label">Search</label>
            <div className="search-input-wrap"><i className="bi bi-search" /><input type="text" className="form-control" placeholder="Search vehicle types..." value={searchVehicleTypes} onChange={(e) => setSearchVehicleTypes(e.target.value)} /></div>
            <button type="button" className="styled-button styled-button--outline styled-button--sm am-clear-btn" onClick={() => setSearchVehicleTypes('')}><i className="bi bi-x-circle" /> Clear</button>
          </aside>
          <section className="am-cards-col">
            {filteredVehicleTypes.length === 0 ? (
              <EmptyState icon="🚛" title="No vehicle types found" subtitle="Try adjusting the search or creating a new vehicle type." />
            ) : (
              filteredVehicleTypes.map((v) => (
                <div className="am-card am-card--indigo" key={v.vehicleTypeId}>
                  <div className="am-card-body">
                    <h3 className="am-card-title">{v.typeName || `Vehicle Type ${v.vehicleTypeId}`}</h3>
                    <div className="am-card-meta"><span><i className="bi bi-hash" />ID: {v.vehicleTypeId}</span></div>
                    {(v.createdAt || v.updatedAt) && (
                      <div className="am-card-footnote">
                        {v.createdAt && <span>Created: {formatDate(v.createdAt)}</span>}
                        {v.updatedAt && <span>Updated: {formatDate(v.updatedAt)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="am-card-actions">
                    <button type="button" className="am-icon-btn" title="Edit vehicle type" onClick={() => openVehicleTypeModal(v)}><i className="bi bi-pencil" /></button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>

      {/* ============ MANAGEMENT & SUPPORT TEAM TAB ============ */}
      <section className="am-tab-panel" id="panelManagementTeam" hidden={activeTab !== 'management-team'}>
        <div className="am-actions-row">
          <button type="button" className="styled-button styled-button--primary" onClick={() => openManagementTeamModal(null)}><i className="bi bi-plus-lg" /> Add Management Team Function</button>
        </div>
        <div className="am-layout">
          <aside className="am-filters-panel">
            <label className="am-filters-label">Search</label>
            <div className="search-input-wrap"><i className="bi bi-search" /><input type="text" className="form-control" placeholder="Search by name, deposit, vendor..." value={searchManagementTeam} onChange={(e) => setSearchManagementTeam(e.target.value)} /></div>
            <button type="button" className="styled-button styled-button--outline styled-button--sm am-clear-btn" onClick={() => setSearchManagementTeam('')}><i className="bi bi-x-circle" /> Clear</button>
          </aside>
          <section className="am-cards-col">
            {filteredManagementTeam.length === 0 ? (
              <EmptyState icon="👥" title="No management team functions found" subtitle="Try adjusting the search or creating a new one." />
            ) : (
              filteredManagementTeam.map((item) => (
                <div className="am-card am-card--red" key={item.managementTeamFunctionId}>
                  <div className="am-card-body">
                    <h3 className="am-card-title">{item.functionName || `Function ${item.managementTeamFunctionId}`}</h3>
                    <div className="am-card-meta">
                      <span><i className="bi bi-hash" />ID: {item.managementTeamFunctionId}</span>
                      {item.depositId != null && <span><i className="bi bi-building" />Deposit: {getDepositName(item.depositId)}</span>}
                      {item.userId != null && <span><i className="bi bi-person" />Vendor: {getUserName(item.userId)}</span>}
                      {item.servicePartnerId != null && <span><i className="bi bi-briefcase" />Service Partner: {getServicePartnerName(item.servicePartnerId)}</span>}
                    </div>
                  </div>
                  <div className="am-card-actions">
                    <button type="button" className="am-icon-btn" title="Edit" onClick={() => openManagementTeamModal(item)}><i className="bi bi-pencil" /></button>
                    <button type="button" className="am-icon-btn danger" title="Delete" onClick={() => requestDelete('managementTeam', item.managementTeamFunctionId)}><i className="bi bi-trash" /></button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>

      {/* ============ ADHOC CATEGORIES TAB ============ */}
      <section className="am-tab-panel" id="panelAdhocCategories" hidden={activeTab !== 'adhoc-categories'}>
        <div className="am-actions-row">
          <button type="button" className="styled-button styled-button--primary" onClick={() => openAdhocCategoryModal(null)}><i className="bi bi-plus-lg" /> Add Adhoc Category</button>
        </div>
        <div className="am-layout">
          <aside className="am-filters-panel">
            <label className="am-filters-label">Search</label>
            <div className="search-input-wrap"><i className="bi bi-search" /><input type="text" className="form-control" placeholder="Search categories..." value={searchAdhocCategories} onChange={(e) => setSearchAdhocCategories(e.target.value)} /></div>
            <button type="button" className="styled-button styled-button--outline styled-button--sm am-clear-btn" onClick={() => setSearchAdhocCategories('')}><i className="bi bi-x-circle" /> Clear</button>
          </aside>
          <section className="am-cards-col">
            {filteredAdhocCategories.length === 0 ? (
              <EmptyState icon="🏷️" title="No adhoc categories found" subtitle="Try adjusting the search or creating a new adhoc category." />
            ) : (
              filteredAdhocCategories.map((c) => (
                <div className="am-card am-card--purple" key={c.adhocCategoriesId}>
                  <div className="am-card-body">
                    <h3 className="am-card-title">{c.name || `Category ${c.adhocCategoriesId}`} <span className={`am-badge ${c.active ? 'active' : 'inactive'}`}>{c.active ? 'Active' : 'Inactive'}</span></h3>
                    {c.description && <p className="am-card-sub">{c.description}</p>}
                    <div className="am-card-meta"><span><i className="bi bi-hash" />ID: {c.adhocCategoriesId}</span></div>
                  </div>
                  <div className="am-card-actions">
                    <button type="button" className="am-icon-btn" title="Edit" onClick={() => openAdhocCategoryModal(c)}><i className="bi bi-pencil" /></button>
                    <button type="button" className="am-icon-btn danger" title="Delete" onClick={() => requestDelete('adhocCategory', c.adhocCategoriesId)}><i className="bi bi-trash" /></button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </section>

      {/* ============ MODAL: Vendor Type ============ */}
      {vendorTypeModal.open && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setVendorTypeModal({ open: false, editing: null }); }}>
          <div className="am-modal am-modal-small">
            <div className="am-modal-header">
              <h2 className="am-modal-title">{vendorTypeModal.editing ? 'Edit Vendor Type' : 'Create Vendor Type'}</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setVendorTypeModal({ open: false, editing: null })}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={submitVendorType}>
              <div className="am-modal-body">
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="vendorTypeName">Type Name *</label>
                  <input type="text" id="vendorTypeName" className="form-control" required placeholder="Enter vendor type name" value={vendorTypeName} onChange={(e) => setVendorTypeName(e.target.value)} />
                </div>
                <InfoBox item={vendorTypeModal.editing} />
                <p className="am-form-hint">Fields marked with * are required.</p>
              </div>
              <div className="am-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setVendorTypeModal({ open: false, editing: null })}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{vendorTypeModal.editing ? 'Update Vendor Type' : 'Create Vendor Type'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: User Type ============ */}
      {userTypeModal.open && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setUserTypeModal({ open: false, editing: null }); }}>
          <div className="am-modal am-modal-small">
            <div className="am-modal-header">
              <h2 className="am-modal-title">{userTypeModal.editing ? 'Edit User Type' : 'Create User Type'}</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setUserTypeModal({ open: false, editing: null })}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={submitUserType}>
              <div className="am-modal-body">
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="userTypeName">Name Type *</label>
                  <input type="text" id="userTypeName" className="form-control" required placeholder="Enter user type name" value={userTypeName} onChange={(e) => setUserTypeName(e.target.value)} />
                </div>
                <p className="am-form-hint">Fields marked with * are required.</p>
              </div>
              <div className="am-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setUserTypeModal({ open: false, editing: null })}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{userTypeModal.editing ? 'Update User Type' : 'Create User Type'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Cost Model (edit-only) ============ */}
      {costModelModal.open && costModelModal.editing && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setCostModelModal({ open: false, editing: null }); }}>
          <div className="am-modal">
            <div className="am-modal-header">
              <h2 className="am-modal-title">Edit Cost Model</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setCostModelModal({ open: false, editing: null })}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={submitCostModel}>
              <div className="am-modal-body">
                <div className="am-info-box">
                  <p className="am-info-box-title">Cost Model (read-only)</p>
                  <div className="am-info-box-row"><strong>Name:</strong> {costModelModal.editing.name ?? '—'}</div>
                  {costModelModal.editing.customerId != null && <div className="am-info-box-row"><strong>Customer:</strong> {getCustomerName(costModelModal.editing.customerId)}</div>}
                  {costModelModal.editing.isAdhocCategory && <div className="am-info-box-row"><strong>Ad-Hoc Category:</strong> Yes</div>}
                </div>
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="costModelDescription">Formula / Description</label>
                  <textarea id="costModelDescription" rows={3} placeholder="Optional description" value={costModelDescription} onChange={(e) => setCostModelDescription(e.target.value)} />
                </div>
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="costModelPaymentMethod">Payment Method</label>
                  <input type="text" id="costModelPaymentMethod" className="form-control" placeholder="e.g. invoice, prepaid" value={costModelPaymentMethod} onChange={(e) => setCostModelPaymentMethod(e.target.value)} />
                </div>
                <InfoBox item={costModelModal.editing} />
                <p className="am-form-hint">Only description and payment method can be edited.</p>
              </div>
              <div className="am-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setCostModelModal({ open: false, editing: null })}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">Update Cost Model</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Vehicle Type ============ */}
      {vehicleTypeModal.open && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setVehicleTypeModal({ open: false, editing: null }); }}>
          <div className="am-modal am-modal-small">
            <div className="am-modal-header">
              <h2 className="am-modal-title">{vehicleTypeModal.editing ? 'Edit Vehicle Type' : 'Create Vehicle Type'}</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setVehicleTypeModal({ open: false, editing: null })}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={submitVehicleType}>
              <div className="am-modal-body">
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="vehicleTypeName">Type Name *</label>
                  <input type="text" id="vehicleTypeName" className="form-control" required placeholder="Enter vehicle type name" value={vehicleTypeName} onChange={(e) => setVehicleTypeName(e.target.value)} />
                </div>
                <InfoBox item={vehicleTypeModal.editing} />
                <p className="am-form-hint">Fields marked with * are required.</p>
              </div>
              <div className="am-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setVehicleTypeModal({ open: false, editing: null })}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{vehicleTypeModal.editing ? 'Update Vehicle Type' : 'Create Vehicle Type'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Management Team Function ============ */}
      {managementTeamModal.open && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setManagementTeamModal({ open: false, editing: null }); }}>
          <div className="am-modal am-modal-small">
            <div className="am-modal-header">
              <h2 className="am-modal-title">{managementTeamModal.editing ? 'Edit Management Team Function' : 'Create Management Team Function'}</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setManagementTeamModal({ open: false, editing: null })}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={submitManagementTeam}>
              <div className="am-modal-body">
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="managementTeamFunctionName">Function Name *</label>
                  <input type="text" id="managementTeamFunctionName" className="form-control" required placeholder="Enter function name" value={managementTeamFunctionName} onChange={(e) => setManagementTeamFunctionName(e.target.value)} />
                </div>
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="managementTeamDeposit">Deposit *</label>
                  <select id="managementTeamDeposit" className="form-select" required value={managementTeamDeposit} onChange={(e) => setManagementTeamDeposit(e.target.value)}>
                    <option value="">— Select deposit —</option>
                    {DEPOSITS.map((d) => <option key={d.depositId} value={String(d.depositId)}>{d.depositName}</option>)}
                  </select>
                </div>
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="managementTeamUser">User *</label>
                  <select id="managementTeamUser" className="form-select" required value={managementTeamUser} onChange={(e) => setManagementTeamUser(e.target.value)}>
                    <option value="">— Select user —</option>
                    {USERS.map((u) => <option key={u.id} value={String(u.id)}>{u.firstName} {u.lastName}</option>)}
                  </select>
                </div>
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="managementTeamServicePartner">Service Partner</label>
                  <select id="managementTeamServicePartner" className="form-select" value={managementTeamServicePartner} onChange={(e) => setManagementTeamServicePartner(e.target.value)}>
                    <option value="">— Select service partner —</option>
                    {SERVICE_PARTNERS.map((sp) => <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>{sp.partnerName}</option>)}
                  </select>
                </div>
                <InfoBox item={managementTeamModal.editing} />
                <p className="am-form-hint">Fields marked with * are required.</p>
              </div>
              <div className="am-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setManagementTeamModal({ open: false, editing: null })}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{managementTeamModal.editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Adhoc Category ============ */}
      {adhocCategoryModal.open && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setAdhocCategoryModal({ open: false, editing: null }); }}>
          <div className="am-modal am-modal-small">
            <div className="am-modal-header">
              <h2 className="am-modal-title">{adhocCategoryModal.editing ? 'Edit Adhoc Category' : 'Create Adhoc Category'}</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setAdhocCategoryModal({ open: false, editing: null })}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={submitAdhocCategory}>
              <div className="am-modal-body">
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="adhocCategoryName">Name *</label>
                  <input type="text" id="adhocCategoryName" className="form-control" required placeholder="Enter category name" value={adhocCategoryName} onChange={(e) => setAdhocCategoryName(e.target.value)} />
                </div>
                <div className="am-form-field">
                  <label className="am-form-label" htmlFor="adhocCategoryDescription">Description</label>
                  <textarea id="adhocCategoryDescription" rows={3} placeholder="Enter category description" value={adhocCategoryDescription} onChange={(e) => setAdhocCategoryDescription(e.target.value)} />
                </div>
                <div className="am-form-check">
                  <input type="checkbox" id="adhocCategoryActive" checked={adhocCategoryActive} onChange={(e) => setAdhocCategoryActive(e.target.checked)} />
                  <label htmlFor="adhocCategoryActive">Active</label>
                </div>
                <InfoBox item={adhocCategoryModal.editing} />
                <p className="am-form-hint">Fields marked with * are required.</p>
              </div>
              <div className="am-form-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={() => setAdhocCategoryModal({ open: false, editing: null })}>Cancel</button>
                <button type="submit" className="styled-button styled-button--primary">{adhocCategoryModal.editing ? 'Update Category' : 'Create Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Confirm Delete (shared) ============ */}
      {confirmDeleteOpen && (
        <div className="am-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPendingDelete(null); }}>
          <div className="am-modal am-modal-small">
            <div className="am-modal-header">
              <h2 className="am-modal-title">{confirmDeleteTitle}</h2>
              <button type="button" className="am-modal-close" aria-label="Close" onClick={() => setPendingDelete(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="am-modal-body">
              <p className="am-modal-desc">{confirmDeleteMessage}</p>
            </div>
            <div className="am-form-actions" style={{ padding: '0 1.4rem 1.4rem' }}>
              <button type="button" className="styled-button styled-button--outline" onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className="styled-button styled-button--danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="toast-container">
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
