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

const LOOP_TARGETS_STORAGE_KEY = 'dhl_contract_loop_targets';

/**
 * Get the stored target override for a loop, or null when not overridden —
 * in which case the loop's target is just the sum of its routes' targets
 * (see ContractLoopView.target in getFilteredContracts()).
 */
export function getStoredLoopTarget(spName: string, depotName: string, loopName: string): number | null {
  try {
    const raw = localStorage.getItem(LOOP_TARGETS_STORAGE_KEY);
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

/** Store a target override for a loop. Pass null/undefined/NaN to clear it (falls back to the sum of route targets). */
export function setStoredLoopTarget(spName: string, depotName: string, loopName: string, value: number | null | undefined): void {
  try {
    const raw = localStorage.getItem(LOOP_TARGETS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[spName]) data[spName] = {};
    const key = targetKey(depotName, loopName);
    if (value === null || value === undefined || Number.isNaN(value)) delete data[spName][key];
    else data[spName][key] = Number(value);
    localStorage.setItem(LOOP_TARGETS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const CUSTOM_ROUTES_STORAGE_KEY = 'dhl_contract_custom_routes';

export interface NewRouteInput {
  depotName: string;
  loopName: string;
  routeName: string;
  type: string;
  driver?: string;
  target?: number | null;
}

function getStoredCustomDepots(spName: string): RawContractDepot[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROUTES_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data[spName]) ? data[spName] : [];
  } catch {
    return [];
  }
}

function setStoredCustomDepots(spName: string, depots: RawContractDepot[]): void {
  try {
    const raw = localStorage.getItem(CUSTOM_ROUTES_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[spName] = depots;
    localStorage.setItem(CUSTOM_ROUTES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Adds a new route to a depot/loop for the given service provider, creating the depot/loop if new. Stored in localStorage and merged into getFilteredContracts(). */
export function addStoredRoute(spName: string, input: NewRouteInput): void {
  const depots = getStoredCustomDepots(spName);
  let depot = depots.find(d => d.name === input.depotName);
  if (!depot) {
    depot = { name: input.depotName, loops: [] };
    depots.push(depot);
  }
  if (!depot.loops) depot.loops = [];
  let loop = depot.loops.find(l => l.name === input.loopName);
  if (!loop) {
    loop = { name: input.loopName, routes: [] };
    depot.loops.push(loop);
  }
  if (!loop.routes) loop.routes = [];
  loop.routes.push({
    name: input.routeName,
    type: input.type,
    driver: input.driver || undefined,
    targetDel: input.target != null && !Number.isNaN(input.target) ? input.target : undefined,
  });
  setStoredCustomDepots(spName, depots);
}

/** Adds a new, empty depot for the given service provider. No-op if it already exists. */
export function addStoredDepot(spName: string, depotName: string): void {
  const depots = getStoredCustomDepots(spName);
  if (depots.some(d => d.name === depotName)) return;
  depots.push({ name: depotName, loops: [] });
  setStoredCustomDepots(spName, depots);
}

/** Adds a new, empty loop to a depot (creating the depot if new). No-op if the loop already exists. */
export function addStoredLoop(spName: string, depotName: string, loopName: string, deliveryRate?: number | null): void {
  const depots = getStoredCustomDepots(spName);
  let depot = depots.find(d => d.name === depotName);
  if (!depot) {
    depot = { name: depotName, loops: [] };
    depots.push(depot);
  }
  if (!depot.loops) depot.loops = [];
  if (depot.loops.some(l => l.name === loopName)) return;
  depot.loops.push({
    name: loopName,
    deliveryRate: deliveryRate != null && !Number.isNaN(deliveryRate) ? deliveryRate : undefined,
    routes: [],
  });
  setStoredCustomDepots(spName, depots);
}

/** Whether a depot was added by the SP (as opposed to coming from the raw contract data) — only these can be removed. */
export function isCustomDepot(spName: string, depotName: string): boolean {
  return getStoredCustomDepots(spName).some(d => d.name === depotName);
}

/** Whether a loop was added by the SP — only these can be removed. */
export function isCustomLoop(spName: string, depotName: string, loopName: string): boolean {
  const depot = getStoredCustomDepots(spName).find(d => d.name === depotName);
  return !!depot?.loops?.some(l => l.name === loopName);
}

/** Whether a route was added by the SP — only these can be removed. */
export function isCustomRoute(spName: string, depotName: string, loopName: string, routeName: string): boolean {
  const depot = getStoredCustomDepots(spName).find(d => d.name === depotName);
  const loop = depot?.loops?.find(l => l.name === loopName);
  return !!loop?.routes?.some(r => r.name === routeName);
}

/** Removes a custom depot (and everything under it). No-op for depots that came from the raw contract data. */
export function removeStoredDepot(spName: string, depotName: string): void {
  const depots = getStoredCustomDepots(spName).filter(d => d.name !== depotName);
  setStoredCustomDepots(spName, depots);
}

/** Removes a custom loop (and its routes) from a depot. No-op for loops that came from the raw contract data. */
export function removeStoredLoop(spName: string, depotName: string, loopName: string): void {
  const depots = getStoredCustomDepots(spName);
  const depot = depots.find(d => d.name === depotName);
  if (depot?.loops) depot.loops = depot.loops.filter(l => l.name !== loopName);
  setStoredCustomDepots(spName, depots);
}

/** Removes a custom route from a loop. No-op for routes that came from the raw contract data. */
export function removeStoredRoute(spName: string, depotName: string, loopName: string, routeName: string): void {
  const depots = getStoredCustomDepots(spName);
  const depot = depots.find(d => d.name === depotName);
  const loop = depot?.loops?.find(l => l.name === loopName);
  if (loop?.routes) loop.routes = loop.routes.filter(r => r.name !== routeName);
  setStoredCustomDepots(spName, depots);
}

/** Names of all depots (existing + custom) currently on file for a service provider. */
export function getDepotNames(spName: string): string[] {
  const providers = getRawContractProviders();
  const prov = providers.find(p => p.serviceProvider === spName);
  const existing = (prov?.depots || []).map(d => d.name);
  const custom = getStoredCustomDepots(spName).map(d => d.name);
  return Array.from(new Set([...existing, ...custom])).sort();
}

/** Names of loops within a depot (existing + custom) for a service provider. */
export function getLoopNames(spName: string, depotName: string): string[] {
  const providers = getRawContractProviders();
  const prov = providers.find(p => p.serviceProvider === spName);
  const existingDepot = (prov?.depots || []).find(d => d.name === depotName);
  const existing = (existingDepot?.loops || []).map(l => l.name);
  const customDepot = getStoredCustomDepots(spName).find(d => d.name === depotName);
  const custom = (customDepot?.loops || []).map(l => l.name);
  return Array.from(new Set([...existing, ...custom])).sort();
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
  /** Editable loop-level target. Defaults to the sum of the loop's routes' targets until overridden. */
  target: number;
  /** Whether `target` above comes from an explicit override rather than being the sum of route targets. */
  hasTargetOverride: boolean;
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
  const customDepots = getStoredCustomDepots(spName);
  if (!prov && customDepots.length === 0) return [];

  const mergedDepots: RawContractDepot[] = (prov?.depots || []).map((dep) => {
    const customDepot = customDepots.find((d) => d.name === dep.name);
    if (!customDepot) return dep;
    const loops = (dep.loops || []).map((loop) => {
      const customLoop = customDepot.loops?.find((l) => l.name === loop.name);
      if (!customLoop) return loop;
      return { ...loop, routes: [...(loop.routes || []), ...(customLoop.routes || [])] };
    });
    const extraLoops = (customDepot.loops || []).filter((l) => !loops.some((loop) => loop.name === l.name));
    return { ...dep, loops: [...loops, ...extraLoops] };
  });
  const extraDepots = customDepots.filter((d) => !mergedDepots.some((dep) => dep.name === d.name));

  const depots: ContractDepotView[] = [...mergedDepots, ...extraDepots].map((dep) => {
    const loops: ContractLoopView[] = (dep.loops || []).map((loop) => {
      const routes: ContractRouteView[] = (loop.routes || []).map((r) => {
        const stored = getStoredTarget(spName, dep.name, r.name);
        const target = stored != null && !Number.isNaN(stored) ? stored : r.targetDel != null ? r.targetDel : 0;
        const extracted = postcodesToSubpostcodes(r.postcodes || []);
        const custom = getStoredSubpostcodes(spName, dep.name, r.name);
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
      const storedRate = getStoredLoopRate(spName, dep.name, loop.name);
      const rate =
        storedRate != null && !Number.isNaN(storedRate)
          ? storedRate
          : typeof loop.deliveryRate === 'number'
            ? loop.deliveryRate
            : 0;
      const storedTarget = getStoredLoopTarget(spName, dep.name, loop.name);
      const hasTargetOverride = storedTarget != null && !Number.isNaN(storedTarget);
      const target = hasTargetOverride ? storedTarget : routes.reduce((s, r) => s + (r.target || 0), 0);
      return { name: loop.name, deliveryRate: rate, target, hasTargetOverride, routes };
    });
    return { name: dep.name, loops };
  });

  return [{ serviceProvider: spName, depots }];
}
