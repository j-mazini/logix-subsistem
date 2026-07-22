// Local (non-shared) typed accessors over window.DHL_MOCK_DATA's `vehicles` /
// `contracts` buckets, used only by the Vehicles page. Kept separate from
// dhlMockData.ts (which other pages/agents may be editing concurrently) —
// see dhl-mock-data.js's MOCK_VEHICLES for the raw shape.
import type { DhlMockData } from './dhlMockData';

export interface RawVehicle {
  id: number;
  vrn: string;
  vin?: string | null;
  brand: string;
  model: string;
  registrationDate: string;
  fuelType?: string;
  vehicleType?: string;
  serviceProvider: string;
  color?: string;
  depot?: string;
  status?: string;
  wrappedVehicle?: boolean;
  slamLock?: boolean;
  camera?: boolean;
  gps?: boolean;
  bulkhead?: boolean;
  doors270?: boolean;
  additionalNotes?: string;
}

interface RawContractDepotMinimal {
  name: string;
}

interface RawContractProviderMinimal {
  serviceProvider: string;
  depots?: RawContractDepotMinimal[];
}

type VehiclesMockData = DhlMockData & {
  vehicles?: RawVehicle[];
  contracts?: RawContractProviderMinimal[];
};

function getData(): VehiclesMockData | undefined {
  return window.DHL_MOCK_DATA as VehiclesMockData | undefined;
}

export function getRawVehicles(): RawVehicle[] {
  return getData()?.vehicles || [];
}

/** Port of vehicles.js's getDepotsForSp(): unique depot names across the SP's contracts, sorted. */
export function getDepotsForSp(spName: string): string[] {
  const providers = getData()?.contracts || [];
  const out: string[] = [];
  const seen: Record<string, boolean> = {};
  providers.forEach((c) => {
    if (c.serviceProvider !== spName) return;
    (c.depots || []).forEach((d) => {
      if (d.name && !seen[d.name]) {
        seen[d.name] = true;
        out.push(d.name);
      }
    });
  });
  return out.sort();
}

/** Port of vehicles.js's formatDateDisplay(): "YYYY-MM-DD" -> "DD/MM/YYYY". */
export function formatDateDisplay(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const parts = String(dateStr).trim().split('-');
  if (parts.length < 3) return dateStr;
  const day = parts[2].split('T')[0].split(' ')[0];
  return `${day || parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Port of vehicles.js's getCurrentDateYMD(). */
export function getCurrentDateYMD(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
