import { DeliveryStop } from '../types';

/**
 * Mock stand-in for a "today's assigned stops" endpoint. This subsystem has
 * no backend, so the route is generated deterministically from today's date
 * (same scheme as CurrentMonth's mock data) — reloading the page gives the
 * same stops until the date changes, and the driver's own reordering lives
 * only in component state (no persistence layer to save it to).
 */

const ROUTE_NAME = 'R101';
const VEHICLE = 'AT19 XLR (Ford Transit)';

const SUBPOSTCODES = ['ME1', 'ME2', 'ME3', 'ME4'];
const STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Avenue', 'Mill Road', 'Park View', 'Queensway', 'Riverside Drive'];

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return function next() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return h;
}

function todayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface MyRouteOverview {
  routeName: string;
  vehicle: string;
  stops: DeliveryStop[];
}

export function fetchMyRouteToday(): MyRouteOverview {
  const rand = seededRandom(hashSeed(todayDateKey()));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  const stopCount = 16 + Math.floor(rand() * 8);
  const stops: DeliveryStop[] = [];

  for (let i = 0; i < stopCount; i++) {
    const sub = pick(SUBPOSTCODES);
    const isPU = rand() > 0.78;
    stops.push({
      id: i + 1,
      postcode: `${sub} ${1 + Math.floor(rand() * 5)}AB`,
      address: `${1 + Math.floor(rand() * 200)} ${pick(STREETS)}`,
      customer: `Customer ${100 + Math.floor(rand() * 900)}`,
      type: isPU ? 'PU' : 'DEL',
      pre12: !isPU && rand() > 0.8,
      asr: rand() > 0.82,
      dsr: rand() > 0.85,
      pieces: 1 + Math.floor(rand() * 12),
    });
  }

  // Arrive already grouped by subpostcode, same as Route Balance's own
  // manifests — the driver reorders from there, not from a random shuffle.
  stops.sort((a, b) => a.postcode.localeCompare(b.postcode));

  return { routeName: ROUTE_NAME, vehicle: VEHICLE, stops };
}
