// Local (non-shared) typed accessors over window.DHL_MOCK_DATA's `contracts` /
// `digressiveBands` buckets, used only by the Contracts page. Kept separate
// from dhlMockData.ts (which other pages/agents are editing concurrently) —
// see dhl-mock-data.js's MOCK_CONTRACTS / DIGRESSIVE_BANDS for the raw shape.
import type { DhlMockData } from './dhlMockData';

export interface DigressiveBand {
  min: number;
  max: number | null;
  price: number;
}

export interface RawContractRoute {
  name: string;
  type?: string;
  targetDel?: number;
  targetPu?: number;
  driver?: string;
  postcodes?: string[];
  deliveries?: number;
}

export interface RawContractLoop {
  name: string;
  deliveryRate?: number;
  routes?: RawContractRoute[];
}

export interface RawContractDepot {
  name: string;
  loops?: RawContractLoop[];
}

export interface RawContractProvider {
  serviceProvider: string;
  depots?: RawContractDepot[];
}

type ContractsMockData = DhlMockData & {
  contracts?: RawContractProvider[];
  digressiveBands?: Record<string, DigressiveBand[]>;
};

function getData(): ContractsMockData | undefined {
  return window.DHL_MOCK_DATA as ContractsMockData | undefined;
}

export function getRawContractProviders(): RawContractProvider[] {
  return getData()?.contracts || [];
}

export function getDigressiveBandsFor(loopName: string): DigressiveBand[] | undefined {
  return getData()?.digressiveBands?.[loopName];
}

/** Port of contracts.js's postcodesToSubpostcodes(): outward-code prefixes, deduped + sorted. */
export function postcodesToSubpostcodes(postcodes: string[] | undefined): string[] {
  if (!postcodes || !postcodes.length) return [];
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  for (const raw of postcodes) {
    const pc = String(raw).trim();
    if (pc.length <= 2) continue;
    const sub = pc.slice(0, -2).trim();
    if (sub && !seen[sub]) {
      seen[sub] = true;
      out.push(sub);
    }
  }
  return out.sort();
}

const ROUTE_TARGETS_STORAGE_KEY = 'dhl_contract_route_targets';

function targetKey(depotName: string, routeName: string): string {
  return `${depotName || ''}|${routeName || ''}`;
}

/** Port of contracts.js's getStoredTarget(). */
export function getStoredTarget(spName: string, depotName: string, routeName: string): number | null {
  try {
    const raw = localStorage.getItem(ROUTE_TARGETS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const sp = data[spName];
    if (!sp) return null;
    const val = sp[targetKey(depotName, routeName)];
    return val != null ? Number(val) : null;
  } catch {
    return null;
  }
}

/** Port of contracts.js's setStoredTarget(). Pass null/undefined/NaN to clear the override. */
export function setStoredTarget(spName: string, depotName: string, routeName: string, value: number | null | undefined): void {
  try {
    const raw = localStorage.getItem(ROUTE_TARGETS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[spName]) data[spName] = {};
    const key = targetKey(depotName, routeName);
    if (value === null || value === undefined || Number.isNaN(value)) delete data[spName][key];
    else data[spName][key] = Number(value);
    localStorage.setItem(ROUTE_TARGETS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const ROUTE_SUBPOSTCODES_STORAGE_KEY = 'dhl_contract_route_subpostcodes';

/** Get custom subpostcodes added for a specific route (in addition to extracted ones). */
export function getStoredSubpostcodes(spName: string, depotName: string, routeName: string): string[] {
  try {
    const raw = localStorage.getItem(ROUTE_SUBPOSTCODES_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const sp = data[spName];
    if (!sp) return [];
    const val = sp[targetKey(depotName, routeName)];
    return Array.isArray(val) ? val.map(String) : [];
  } catch {
    return [];
  }
}

/** Store custom subpostcodes for a route. */
export function setStoredSubpostcodes(spName: string, depotName: string, routeName: string, subpostcodes: string[]): void {
  try {
    const raw = localStorage.getItem(ROUTE_SUBPOSTCODES_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[spName]) data[spName] = {};
    const key = targetKey(depotName, routeName);
    if (!subpostcodes || subpostcodes.length === 0) delete data[spName][key];
    else data[spName][key] = subpostcodes.map(String).filter(Boolean);
    localStorage.setItem(ROUTE_SUBPOSTCODES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Add a single subpostcode to a route (merges with existing). */
export function addStoredSubpostcode(spName: string, depotName: string, routeName: string, subpostcode: string): void {
  const existing = getStoredSubpostcodes(spName, depotName, routeName);
  const normalized = String(subpostcode).trim().toUpperCase();
  if (!normalized) return;
  if (!existing.includes(normalized)) {
    existing.push(normalized);
  }
  setStoredSubpostcodes(spName, depotName, routeName, existing);
}

/** Remove a subpostcode from a route. */
export function removeStoredSubpostcode(spName: string, depotName: string, routeName: string, subpostcode: string): void {
  const existing = getStoredSubpostcodes(spName, depotName, routeName);
  const normalized = String(subpostcode).trim().toUpperCase();
  const filtered = existing.filter(s => s !== normalized);
  setStoredSubpostcodes(spName, depotName, routeName, filtered);
}

const LOOP_RATES_STORAGE_KEY = 'dhl_contract_loop_rates';

/** Get the stored delivery-rate override for a loop, or null when not overridden. */
export function getStoredLoopRate(spName: string, depotName: string, loopName: string): number | null {
  try {
    const raw = localStorage.getItem(LOOP_RATES_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const sp = data[spName];
    if (!sp) return null;
    const val = sp[targetKey(depotName, loopName)];
    return val != null ? Number(val) : null;
  } catch {
    return null;
  }
}

/** Store a delivery-rate override for a loop. Pass null/undefined/NaN to clear it. */
export function setStoredLoopRate(spName: string, depotName: string, loopName: string, value: number | null | undefined): void {
  try {
    const raw = localStorage.getItem(LOOP_RATES_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[spName]) data[spName] = {};
    const key = targetKey(depotName, loopName);
    if (value === null || value === undefined || Number.isNaN(value)) delete data[spName][key];
    else data[spName][key] = Number(value);
    localStorage.setItem(LOOP_RATES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const LOOP_BANDS_STORAGE_KEY = 'dhl_contract_loop_bands';

/** Get the stored digressive-bands override for a loop, or null when not overridden. */
export function getStoredLoopBands(spName: string, depotName: string, loopName: string): DigressiveBand[] | null {
  try {
    const raw = localStorage.getItem(LOOP_BANDS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const sp = data[spName];
    if (!sp) return null;
    const val = sp[targetKey(depotName, loopName)];
    return Array.isArray(val) ? val : null;
  } catch {
    return null;
  }
}

/** Store a digressive-bands override for a loop. Pass null or an empty array to clear it. */
export function setStoredLoopBands(spName: string, depotName: string, loopName: string, bands: DigressiveBand[] | null): void {
  try {
    const raw = localStorage.getItem(LOOP_BANDS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[spName]) data[spName] = {};
    const key = targetKey(depotName, loopName);
    if (!bands || bands.length === 0) delete data[spName][key];
    else data[spName][key] = bands;
    localStorage.setItem(LOOP_BANDS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Bands for a loop with any stored override applied, falling back to the contract's digressive bands. */
export function getEffectiveBandsFor(spName: string, depotName: string, loopName: string): DigressiveBand[] | undefined {
  return getStoredLoopBands(spName, depotName, loopName) ?? getDigressiveBandsFor(loopName);
}

export interface ContractRouteView {
  name: string;
  type: string;
  target: number;
  driver: string;
  postcodes: string[];
  subpostcodes: string[];
  customSubpostcodes: string[];
}

export interface ContractLoopView {
  name: string;
  deliveryRate: number;
  routes: ContractRouteView[];
}

export interface ContractDepotView {
  name: string;
  loops: ContractLoopView[];
}

export interface ContractProviderView {
  serviceProvider: string;
  depots: ContractDepotView[];
}

/**
 * Port of contracts.js's getFilteredData(): the single provider matching
 * `spName`, with each route's `target` resolved from localStorage (falling
 * back to targetDel). Snapshot is computed once per `spName` — matches the
 * original, which only calls this at initial renderTree() and never
 * recomputes per-loop/provider totals as targets are edited afterwards.
 */
export function getFilteredContracts(spName: string): ContractProviderView[] {
  if (!spName) return [];
  const providers = getRawContractProviders();
  const prov = providers.find((p) => p.serviceProvider === spName);
  if (!prov) return [];

  const depots: ContractDepotView[] = (prov.depots || []).map((dep) => {
    const loops: ContractLoopView[] = (dep.loops || []).map((loop) => {
      const routes: ContractRouteView[] = (loop.routes || []).map((r) => {
        const stored = getStoredTarget(prov.serviceProvider, dep.name, r.name);
        const target = stored != null && !Number.isNaN(stored) ? stored : r.targetDel != null ? r.targetDel : 0;
        const extracted = postcodesToSubpostcodes(r.postcodes || []);
        const custom = getStoredSubpostcodes(prov.serviceProvider, dep.name, r.name);
        const allSubpostcodes = Array.from(new Set([...extracted, ...custom])).sort();
        return {
          name: r.name,
          type: r.type || 'Child',
          target,
          driver: r.driver || '',
          postcodes: r.postcodes || [],
          subpostcodes: allSubpostcodes,
          customSubpostcodes: custom,
        };
      });
      const storedRate = getStoredLoopRate(prov.serviceProvider, dep.name, loop.name);
      const rate =
        storedRate != null && !Number.isNaN(storedRate)
          ? storedRate
          : typeof loop.deliveryRate === 'number'
            ? loop.deliveryRate
            : 0;
      return { name: loop.name, deliveryRate: rate, routes };
    });
    return { name: dep.name, loops };
  });

  return [{ serviceProvider: prov.serviceProvider, depots }];
}
