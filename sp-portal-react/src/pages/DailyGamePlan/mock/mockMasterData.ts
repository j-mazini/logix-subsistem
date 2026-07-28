/**
 * Mock master data for the Daily Game Plan port, built from the system's shared mock
 * (`window.DHL_MOCK_DATA`, populated by src/data/dhl-mock-data.js and already the
 * source for the Vendors/Vehicles/Contracts pages) instead of a page-local generator —
 * so the same vendor names, vehicle plates and routes show up here as everywhere else
 * in the app.
 *
 * The system mock only models one physical depot (MSE, routes MD7A–MD7F) and 8
 * vendors, with no concept of BAOP / adhoc services / service partners — those are
 * Daily Game Plan-specific concepts the system mock doesn't cover. Adapted as:
 *  - LCY and LSE stay declared (real deposit IDs from BUSINESS_RULES / the allow-list
 *    in allowedDeposits.ts) but have no routes/vendors — honest given the source data
 *    only ever staffs MSE, not a fabrication.
 *  - The system mock's two vendors with `route: null` (Emma Thompson, David Clark)
 *    become the BAOP / Management & Support pool — a routeless vendor is exactly what
 *    BAOP represents, so no invented people were needed for it.
 *  - Adhoc services and service partners have no equivalent in the system mock, so
 *    they're kept as a small local supplement (documented per constant below) — with
 *    no vendor ever assigned a service partner, since the system mock only has one
 *    provider (TBX) and doesn't model per-vendor sub-partners.
 */
import { BUSINESS_RULES } from '../businessRules';
import { getAllMockVendors, type Vendor as DhlVendor } from '@/data/vendorsData';
import { getRawVehicles, type RawVehicle } from '@/data/vehiclesData';
import { getRawContractProviders } from '@/data/contractsData';

/* ==================== Small deterministic PRNG — only used for the handful of demo
   behavioural flags (sort/late) the system mock doesn't carry per vendor. ==================== */
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
export function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

/* ==================== Types (trimmed to the fields the ported mappers/components read) ==================== */
export interface MockVendor {
  userId: number;
  fullName: string;
  depositId: number | null;
  routeId: number | null;
  vehicleId: number | null;
  costModelId: number | null;
  vendorTypeId: number;
  vendorTypeDescription: string;
  email: string;
  servicePartnerId: number | null;
  isSort: boolean;
  isLate: boolean;
  userTypeId: number;
}

export interface MockRoute {
  routeId: number;
  routeName: string;
  depositId?: number;
  isFlex?: boolean;
}

export interface MockVehicle {
  vehicleId: number;
  registrationPlates: string;
  model: string;
  fuelType: string;
}

export interface MockDeposit {
  depositId: number;
  depositName: string;
  isPhysical: boolean;
  routes: MockRoute[];
}

export interface MockAdhocService {
  adhocServiceId: number;
  adhocName: string;
  adhocReceivedPayment: number;
  adhocVendorPayment: number;
  isAdhocSort: boolean;
}

export interface MockServicePartner {
  servicePartnerId: number;
  partnerName: string;
}

export const MOCK_ADMIN_USER = { id: 1, userTypeId: BUSINESS_RULES.USER_TYPE.ADMIN, fullName: 'Admin User' };

/** No per-vendor service-partner concept in the system mock (single provider: TBX) — kept empty on purpose. */
export const MOCK_SERVICE_PARTNERS: MockServicePartner[] = [];

/** Not modeled in the system mock — Daily Game Plan needs *some* adhoc catalogue, kept minimal and local. */
export const MOCK_ADHOC_SERVICES: MockAdhocService[] = [
  { adhocServiceId: 1, adhocName: 'Additional Collection', adhocReceivedPayment: 25, adhocVendorPayment: 15, isAdhocSort: true },
  { adhocServiceId: 2, adhocName: 'Redelivery', adhocReceivedPayment: 14, adhocVendorPayment: 8, isAdhocSort: true },
  { adhocServiceId: 3, adhocName: 'Bulky Item Handling', adhocReceivedPayment: 32, adhocVendorPayment: 20, isAdhocSort: false },
  { adhocServiceId: 4, adhocName: 'Out of Hours Run', adhocReceivedPayment: 50, adhocVendorPayment: 35, isAdhocSort: false },
  { adhocServiceId: 5, adhocName: 'Return to Depot', adhocReceivedPayment: 18, adhocVendorPayment: 10, isAdhocSort: true },
];

/** Administrative routes — fixed IDs matching BUSINESS_RULES.ROUTE.*, no deposit of their own. */
export const ROUTE_DHOC: MockRoute = { routeId: BUSINESS_RULES.ROUTE.DHOC, routeName: 'DHOC', isFlex: true };
export const ROUTE_NOT_ALLOCATED: MockRoute = { routeId: BUSINESS_RULES.ROUTE.NOT_ALLOCATED, routeName: 'NotAllocated' };
export const ROUTE_DAY_OFF: MockRoute = { routeId: BUSINESS_RULES.ROUTE.DAY_OFF, routeName: 'OFF' };

/** Maps the system mock's depot name strings to the real deposit IDs from BUSINESS_RULES. */
const DEPOSIT_NAME_TO_ID: Record<string, number> = {
  LCY: BUSINESS_RULES.DEPOSIT.LCY,
  MSE: BUSINESS_RULES.DEPOSIT.MSE,
  LSE: BUSINESS_RULES.DEPOSIT.LSE,
};

/** Builds routes from the system mock's contract structure (depot → loop → routes), e.g. MSE's MD7A–MD7F. */
function buildRoutesFromContracts(): MockRoute[] {
  const routes: MockRoute[] = [];
  let routeIdSeq = 100;
  for (const provider of getRawContractProviders()) {
    for (const depot of provider.depots || []) {
      const depositId = DEPOSIT_NAME_TO_ID[depot.name];
      if (!depositId) continue;
      for (const loop of depot.loops || []) {
        for (const route of loop.routes || []) {
          if (!route.name) continue;
          routes.push({ routeId: ++routeIdSeq, routeName: route.name, depositId, isFlex: false });
        }
      }
    }
  }
  return routes;
}

const contractRoutes = buildRoutesFromContracts();
export const MOCK_ROUTES: MockRoute[] = [...contractRoutes, ROUTE_DHOC, ROUTE_NOT_ALLOCATED, ROUTE_DAY_OFF];

export const MOCK_DEPOSITS: MockDeposit[] = [
  { depositId: BUSINESS_RULES.DEPOSIT.LCY, depositName: 'LCY', isPhysical: true, routes: contractRoutes.filter((r) => r.depositId === BUSINESS_RULES.DEPOSIT.LCY) },
  { depositId: BUSINESS_RULES.DEPOSIT.MSE, depositName: 'MSE', isPhysical: true, routes: contractRoutes.filter((r) => r.depositId === BUSINESS_RULES.DEPOSIT.MSE) },
  { depositId: BUSINESS_RULES.DEPOSIT.LSE, depositName: 'LSE', isPhysical: true, routes: contractRoutes.filter((r) => r.depositId === BUSINESS_RULES.DEPOSIT.LSE) },
  { depositId: BUSINESS_RULES.DEPOSIT.DAY_OFF, depositName: 'Day Off', isPhysical: false, routes: [] },
  { depositId: BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT, depositName: 'BAOP', isPhysical: false, routes: [] },
];

/** system mock's `vehicles[].vrn`/`.brand`/`.model`/`.fuelType`, keyed by numeric id. */
export const MOCK_VEHICLES: MockVehicle[] = getRawVehicles().map((v: RawVehicle) => ({
  vehicleId: v.id,
  registrationPlates: v.vrn,
  model: [v.brand, v.model].filter(Boolean).join(' '),
  fuelType: v.fuelType || '',
}));

const VENDOR_TYPE_LABELS: Record<string, string> = {
  '1': 'Owner Driver',
  '2': 'Multi Drop',
};

function resolveRouteIdByName(routeName: string | null | undefined): number | null {
  if (!routeName) return null;
  return contractRoutes.find((r) => r.routeName === routeName)?.routeId ?? null;
}

function buildMockVendors(): MockVendor[] {
  const rng = rngForSeed('daily-game-plan-vendor-flags-v1');
  const vehiclesByDepot = new Map<string, MockVehicle[]>();
  for (const v of getRawVehicles()) {
    const list = vehiclesByDepot.get(v.depot || '') ?? [];
    list.push({ vehicleId: v.id, registrationPlates: v.vrn, model: [v.brand, v.model].filter(Boolean).join(' '), fuelType: v.fuelType || '' });
    vehiclesByDepot.set(v.depot || '', list);
  }

  return getAllMockVendors().map((v: DhlVendor, idx: number): MockVendor => {
    const fullName = `${v.firstName} ${v.lastName}`.trim();
    // A vendor with no fixed route in the system mock (Emma Thompson, David Clark)
    // is exactly what BAOP represents here: no dedicated route/vehicle allocation.
    const isBaop = !v.route;
    const depositId = isBaop ? BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT : (DEPOSIT_NAME_TO_ID[v.depot || ''] ?? null);
    const depotVehicles = vehiclesByDepot.get(v.depot || '') || [];
    const vehicle = isBaop || depotVehicles.length === 0 ? null : depotVehicles[idx % depotVehicles.length];

    return {
      userId: v.id,
      fullName,
      depositId,
      routeId: isBaop ? null : resolveRouteIdByName(v.route),
      vehicleId: vehicle?.vehicleId ?? null,
      costModelId: isBaop ? null : 2,
      vendorTypeId: Number(v.vendorType) || 1,
      vendorTypeDescription: VENDOR_TYPE_LABELS[v.vendorType || ''] || 'Owner Driver',
      email: v.email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      servicePartnerId: null,
      isSort: isBaop ? false : rng() > 0.3,
      isLate: isBaop ? false : rng() > 0.85,
      userTypeId: 2,
    };
  });
}

export const MOCK_VENDORS: MockVendor[] = buildMockVendors();
