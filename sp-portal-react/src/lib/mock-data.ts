/**
 * Deterministic mock data for Daily Operations Reports (no backend / no auth
 * required in this subsystem, matching the pattern used by VendorPerformance
 * and the other ported sp-portal pages).
 *
 * generateMockReports() returns raw records shaped like the real backend's
 * DailyOperationsReportDTO (operationDate, routeName, courierName, ...) so
 * dataProcessor.transformReportData() can consume them unchanged.
 */

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0xda11705);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

export const MOCK_DEPOSITS = [
  { depositId: 1, depositName: 'TBX - Heathrow' },
  { depositId: 2, depositName: 'LBA - Leeds' },
  { depositId: 3, depositName: 'MAN - Manchester' },
];

export const MOCK_ROUTES = ['MD7A', 'MD7B', 'MD7C', 'EX1A', 'EX1B'];

export const MOCK_VENDORS = [
  'Vendor A Ltd', 'Vendor B Corp', 'Vendor C Services',
  'Vendor D Logistics', 'Vendor E Express', 'Vendor F Transport',
];

const NOTE_SAMPLES = [
  'Traffic delay on M25',
  'Vehicle breakdown, replacement dispatched',
  'Customer not available, redelivery scheduled',
  'Late start due to depot congestion',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function randomVrn(): string {
  const letters = () => String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26));
  return `${letters()}${randInt(10, 69)}${letters()}`;
}

function minutesToHHMM(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

interface DailyOperationsReportDTO {
  operationDate: string;
  routeName: string;
  courierName: string;
  vrn: string;
  percentageOtTwDl: number;
  departTime: string;
  arriveTime: string;
  calculatedWorkHours: number;
  totalStops: number;
  note: string;
  depositName: string;
  depositId: number;
  breakMinutes: number;
  loopName: string;
  routeSort: number;
  isSpms: boolean;
}

/** Generates a stable pool of raw report rows spanning `daysBack` days up to today. */
function buildMockPool(daysBack = 45, rowsPerDay = 8): DailyOperationsReportDTO[] {
  const reports: DailyOperationsReportDTO[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < daysBack; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = toISODate(date);

    for (let i = 0; i < rowsPerDay; i++) {
      const deposit = pick(MOCK_DEPOSITS);
      const route = pick(MOCK_ROUTES);
      const loop = route.startsWith('EX1') ? 'EX1' : 'MD7';
      const departMinutes = randInt(5 * 60, 8 * 60 + 30);
      // Quarter-hour increments (0.25/0.5/0.75/1.0 are exact in binary floating
      // point) so summed totals never accumulate float rounding noise.
      const workHours = randInt(15, 37) / 4; // 3.75h – 9.25h
      const arriveMinutes = departMinutes + Math.round(workHours * 60);

      reports.push({
        operationDate: dateStr,
        routeName: route,
        courierName: pick(MOCK_VENDORS),
        vrn: randomVrn(),
        percentageOtTwDl: randInt(820, 1000) / 1000,
        departTime: minutesToHHMM(departMinutes),
        arriveTime: minutesToHHMM(arriveMinutes),
        calculatedWorkHours: workHours,
        totalStops: randInt(8, 42),
        note: rng() > 0.85 ? pick(NOTE_SAMPLES) : '',
        depositName: deposit.depositName,
        depositId: deposit.depositId,
        breakMinutes: pick([0, 15, 30, 45]),
        loopName: loop,
        routeSort: rng() > 0.9 ? 1 : 0,
        isSpms: rng() > 0.05,
      });
    }
  }

  return reports;
}

export const MOCK_REPORTS_POOL: DailyOperationsReportDTO[] = buildMockPool();

/** Kept for backwards compatibility — always returns the same stable pool. */
export const generateMockReports = (_count?: number): DailyOperationsReportDTO[] => MOCK_REPORTS_POOL;
