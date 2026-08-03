import * as XLSX from 'xlsx';
import type { RouteRow, ShipmentMetrics, ShipmentType, SortAttendance, Stop } from './RouteBalance';

/**
 * Ported from the standalone "Route Balancer" filter tool (recovered HTML
 * prototype). Reads a DISCO export (Excel) and reduces it to the same three
 * report tabs the standalone tool produced (Pre-12, postcode totals, size
 * class breakdown), plus a deduped per-row list (`dfStops`) the standalone
 * tool never exposed — that per-row list is what lets Route Balance seed
 * real stops instead of the old generateFakeData() fixtures.
 */

const POSTCODES_EXCLUDE = ['SE17EH', 'SE77RU'];
const TARGET_PRODUCTS = ['C', 'T', 'K', 'X', 'Y', '1', 'Q'];
const NAME_KEYS = ['Name.1', 'Name', 'Company Name', 'Customer Name', 'Client Name'];

export const FIXED_SIZE_CLASS_COLS = ['Subpostcode', 'Soma Phys.', 'Total Pieces', 'Total Shipments', 'COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL 1', 'Total'];

/** sessionStorage key the upload screen writes to and RouteBalance reads from, so a page refresh on /route-balance doesn't lose the imported dataset (router state alone doesn't survive a reload). */
export const ROUTE_BALANCE_SESSION_KEY = 'route-balance-import';

export type DiscoRawRow = Record<string, unknown>;

export interface DiscoStopRow {
  name: string;
  postcode: string;
  address: string;
  product: string;
  bookingType: string;
  sizeClass: string;
  phys: number;
  pieces: number;
}

export interface DiscoPre12Row {
  'Postal Code': string;
  Name: string;
  Address: string;
  [key: string]: string | number;
}

export interface DiscoPostcodeRow {
  subpostcode: string;
  'total de deliveries': number;
  [key: string]: string | number;
}

export type DiscoSizeClassRow = Record<string, string | number>;

export interface DiscoProcessResult {
  dfPre12: DiscoPre12Row[];
  dfPostcodes: DiscoPostcodeRow[];
  dfSizeClass: DiscoSizeClassRow[];
  dfStops: DiscoStopRow[];
  totalDeliveries: number;
  deliveriesCount: number;
}

function upper(v: unknown): string {
  return v != null ? String(v).toUpperCase().trim() : '';
}

function findColumn(obj: DiscoRawRow, candidates: string[], partials: string[]): string | null {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    if (keys.includes(c)) return c;
  }
  for (const p of partials) {
    const k = keys.find((x) => String(x).toUpperCase().includes(p));
    if (k) return k;
  }
  return null;
}

function normalizeCompanyName(name: unknown): string {
  if (name == null || name === '') return '';
  let n = String(name).toUpperCase().trim();
  const remove = ['C/O', 'CO', 'LTD', 'LIMITED', 'SERVICES', 'SERVICE', 'UK', 'GB', 'GLOBAL', 'LOGISTICS', 'LOGISTIC', '(', ')', '.', ',', '-', '_'];
  for (const t of remove) n = n.split(t).join(' ');
  n = n.split(/\s+/).filter((w) => w.length > 1).join(' ').trim();
  return n;
}

function similarity(a: unknown, b: unknown): number {
  if (a == null || b == null) return 0;
  const na = normalizeCompanyName(a);
  const nb = normalizeCompanyName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const w1 = new Set(na.split(/\s+/));
  const w2 = new Set(nb.split(/\s+/));
  const common = [...w1].filter((w) => w.length > 3 && w2.has(w));
  if (common.length >= 2) return 1;
  if (w1.size === 1 && w2.size === 1) {
    const s1 = [...w1][0];
    const s2 = [...w2][0];
    let matches = 0;
    const len = Math.max(s1.length, s2.length);
    for (let i = 0; i < len; i++) if (s1[i] === s2[i]) matches++;
    return matches / len;
  }
  return 0;
}

function similarNames(a: unknown, b: unknown): boolean {
  return similarity(a, b) > 0.85 || normalizeCompanyName(a) === normalizeCompanyName(b);
}

function removeSimilarNames(rows: DiscoRawRow[], nameKey: string, postalKey: string): DiscoRawRow[] {
  const out: DiscoRawRow[] = [];
  const byPostcode: Record<string, DiscoRawRow[]> = {};
  for (const r of rows) {
    const pc = upper(r[postalKey]);
    if (!byPostcode[pc]) byPostcode[pc] = [];
    byPostcode[pc].push({ ...r });
  }
  let blankNum = 1;
  for (const pc of Object.keys(byPostcode)) {
    const group = byPostcode[pc];
    const kept: DiscoRawRow[] = [];
    for (const row of group) {
      let name = row[nameKey];
      if (name == null || String(name).trim() === '') {
        name = `SEM NOME ${blankNum++}`;
        row[nameKey] = name;
      }
      const dup = kept.some((k) => similarNames(k[nameKey], name));
      if (!dup) {
        kept.push(row);
        out.push(row);
      }
    }
  }
  return out;
}

function processPostcode(postcode: unknown): string {
  const s = String(postcode || '').replace(/\s/g, '').toUpperCase().slice(0, 5);
  let base = s.slice(0, 4);
  if (s.length > 4 && /\d/.test(s[4])) base = s.slice(0, 5);
  if (base.length > 1) base = `${base.slice(0, -1)} ${base.slice(-1)}`;
  return base;
}

/**
 * Formats a bare DISCO postcode ("DA130RY") into standard UK "outward inward"
 * form ("DA13 0RY") — the inward code is always the last 3 characters. Route
 * Balance's subpostcodeOf() groups stops by splitting Stop.postcode on this
 * space, so without it every full postcode would end up as its own group.
 */
function formatPostcode(postcode: unknown): string {
  const s = String(postcode || '').replace(/\s/g, '').toUpperCase();
  if (s.length <= 3) return s;
  return `${s.slice(0, -3)} ${s.slice(-3)}`;
}

function formatSubpostcode(postcode: unknown): string {
  let s = String(postcode || '').replace(/\s/g, '').toUpperCase();
  if (s.length < 2) return s;
  s = s.slice(0, -2);
  if (s.length >= 2) s = `${s.slice(0, -1)} ${s.slice(-1)}`;
  return s;
}

export function readExcelFile(file: File): Promise<{ header: string[]; rows: DiscoRawRow[] }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const first = wb.SheetNames[0];
        const ws = wb.Sheets[first];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        if (raw.length < 2) { resolve({ header: [], rows: [] }); return; }
        const header = raw[1] as string[];
        const rows: DiscoRawRow[] = [];
        for (let i = 2; i < raw.length; i++) {
          const row: DiscoRawRow = {};
          for (let j = 0; j < header.length; j++) row[header[j]] = (raw[i] as unknown[])[j];
          rows.push(row);
        }
        resolve({ header, rows });
      } catch (err) { reject(err); }
    };
    r.onerror = () => reject(new Error('READ_ERROR'));
    r.readAsArrayBuffer(file);
  });
}

function normalizeSizeClassToFixedColumns(dfSizeClass: DiscoSizeClassRow[]): DiscoSizeClassRow[] {
  if (!dfSizeClass.length) return dfSizeClass;
  const numericSizeCols = ['COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL 1'];
  return dfSizeClass.map((r) => {
    const palSum = Object.keys(r).reduce((acc, k) => (/^PAL\s+/i.test(k) ? acc + (Number(r[k]) || 0) : acc), 0);
    const out: DiscoSizeClassRow = {
      Subpostcode: r.Subpostcode != null ? r.Subpostcode : '',
      'Soma Phys.': r['Soma Phys.'] != null ? r['Soma Phys.'] : '',
      'Total Pieces': r['Total Pieces'] != null ? r['Total Pieces'] : '',
      'Total Shipments': r['Total Shipments'] != null ? r['Total Shipments'] : '',
      COY: Number(r.COY) || 0,
      'COY-S1': Number(r['COY-S1']) || 0,
      'COY-S2': Number(r['COY-S2']) || 0,
      FLY: Number(r.FLY) || 0,
      NCY: Number(r.NCY) || 0,
      'PAL 1': palSum,
    };
    out.Total = numericSizeCols.reduce((sum, c) => sum + (Number(out[c]) || 0), 0);
    return out;
  });
}

function processData(
  rows: DiscoRawRow[],
  nameKey: string,
  postalKey: string,
  addressKey: string,
  productKey: string,
  bookingTypeKey: string,
  sizeClassKey: string,
  physKey: string,
  totalPiecesKey: string,
): DiscoProcessResult {
  let df = rows.map((r) => ({ ...r }));

  for (const r of df) {
    r[postalKey] = upper(r[postalKey]);
    if (addressKey && r[addressKey] != null) r[addressKey] = upper(r[addressKey]);
  }
  const dfOriginal = df.map((r) => ({ ...r }));

  df = df.filter((r) => !POSTCODES_EXCLUDE.includes(r[postalKey] as string));

  const seenAddr = new Set<string>();
  df = df.filter((r) => {
    const a = r[addressKey] != null ? String(r[addressKey]) : '';
    if (seenAddr.has(a)) return false;
    seenAddr.add(a);
    return true;
  });

  let blank = 1;
  for (const r of df) {
    const n = r[nameKey];
    if (n == null || String(n).trim() === '') r[nameKey] = `SEM NOME ${blank++}`;
  }
  df = removeSimilarNames(df, nameKey, postalKey);

  // dfStops: the deduped, cleaned row list — the closest thing to real
  // per-delivery data the DISCO export carries. Route Balance uses this to
  // seed real Stop objects; the standalone tool never surfaced it since it
  // only ever produced the three aggregate report tabs below.
  const dfStops: DiscoStopRow[] = df.map((r) => ({
    name: String(r[nameKey] ?? ''),
    postcode: formatPostcode(r[postalKey]),
    address: String(r[addressKey] ?? ''),
    product: String(r[productKey] ?? '').trim(),
    bookingType: String(r[bookingTypeKey] ?? '').trim(),
    sizeClass: String(r[sizeClassKey] ?? '').trim(),
    phys: Number(String(r[physKey] ?? '').replace(',', '.')) || 0,
    pieces: Number(String(r[totalPiecesKey] ?? '').replace(',', '.')) || 0,
  }));

  const deliveriesRows = df.filter((r) => r[bookingTypeKey] == null || String(r[bookingTypeKey]).trim() === '');
  const areaCount: Record<string, number> = {};
  for (const r of deliveriesRows) {
    const area = processPostcode(r[postalKey]);
    areaCount[area] = (areaCount[area] || 0) + 1;
  }
  const deliveriesList = Object.entries(areaCount).sort((a, b) => a[0].localeCompare(b[0]));
  let totalDeliveries = 0;
  const dfPostcodes: DiscoPostcodeRow[] = deliveriesList.map(([subpostcode, count]) => {
    totalDeliveries += count;
    return { subpostcode, 'total de deliveries': count };
  });
  dfPostcodes.push({ subpostcode: 'TOTAL', 'total de deliveries': totalDeliveries });

  const filteredPre12 = dfOriginal.filter((r) =>
    TARGET_PRODUCTS.includes(String(r[productKey] || '').trim()) && !POSTCODES_EXCLUDE.includes(upper(r[postalKey])));
  const dfPre12: DiscoPre12Row[] = filteredPre12
    .map((r) => ({ 'Postal Code': String(r[postalKey] ?? ''), Name: String(r[nameKey] ?? ''), Address: String(r[addressKey] ?? '') }))
    .sort((a, b) => a['Postal Code'].localeCompare(b['Postal Code']));

  const dfClean = rows
    .filter((r) => r[postalKey] != null && String(r[postalKey]).trim() !== '')
    .filter((r) => !POSTCODES_EXCLUDE.includes(upper(r[postalKey])))
    .map((r) => ({ ...r }));
  const cleanExtra = dfClean.map((r) => {
    const postcode = upper(r[postalKey]);
    return {
      sub: formatSubpostcode(postcode),
      phys: Number(String(r[physKey] ?? '').replace(',', '.')) || 0,
      pieces: Number(String(r[totalPiecesKey] ?? '').replace(',', '.')) || 0,
      sizeClass: r[sizeClassKey] != null ? String(r[sizeClassKey]).trim() : '',
    };
  });

  const bySub: Record<string, { phys: number; pieces: number; count: number; sizes: Record<string, number> }> = {};
  for (const c of cleanExtra) {
    if (!bySub[c.sub]) bySub[c.sub] = { phys: 0, pieces: 0, count: 0, sizes: {} };
    bySub[c.sub].phys += c.phys;
    bySub[c.sub].pieces += c.pieces;
    bySub[c.sub].count += 1;
    bySub[c.sub].sizes[c.sizeClass] = (bySub[c.sub].sizes[c.sizeClass] || 0) + 1;
  }
  const sizeClasses = new Set<string>();
  for (const sub of Object.values(bySub)) Object.keys(sub.sizes).forEach((k) => sizeClasses.add(k));
  const scList = [...sizeClasses].sort();
  let dfSizeClass: DiscoSizeClassRow[] = Object.entries(bySub)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([sub, v]) => {
      const row: DiscoSizeClassRow = {
        Subpostcode: sub,
        'Soma Phys.': Math.round(v.phys * 1000) / 1000,
        'Total Pieces': v.pieces,
        'Total Shipments': v.count,
      };
      let total = 0;
      for (const sc of scList) {
        row[sc] = v.sizes[sc] || 0;
        total += Number(row[sc]) || 0;
      }
      row.Total = total;
      return row;
    });
  dfSizeClass = normalizeSizeClassToFixedColumns(dfSizeClass);

  return { dfPre12, dfPostcodes, dfSizeClass, dfStops, totalDeliveries, deliveriesCount: deliveriesList.length };
}

export function mergeResults(results: DiscoProcessResult[]): DiscoProcessResult {
  if (!results.length) return { dfPre12: [], dfPostcodes: [], dfSizeClass: [], dfStops: [], totalDeliveries: 0, deliveriesCount: 0 };
  if (results.length === 1) return results[0];

  const mergedPre12: DiscoPre12Row[] = [];
  const mergedStops: DiscoStopRow[] = [];
  const postcodesBySub: Record<string, number> = {};
  let totalDeliveriesSum = 0;
  const sizeClassBySub: Record<string, DiscoSizeClassRow> = {};

  for (const r of results) {
    mergedPre12.push(...r.dfPre12);
    mergedStops.push(...r.dfStops);
    for (const row of r.dfPostcodes) {
      const sub = row.subpostcode;
      if (String(sub || '').toUpperCase() === 'TOTAL') totalDeliveriesSum += row['total de deliveries'] || 0;
      else postcodesBySub[sub] = (postcodesBySub[sub] || 0) + (row['total de deliveries'] || 0);
    }
    for (const row of r.dfSizeClass) {
      const sub = String(row.Subpostcode);
      if (!sizeClassBySub[sub]) {
        sizeClassBySub[sub] = { Subpostcode: sub, 'Soma Phys.': 0, 'Total Pieces': 0, 'Total Shipments': 0, COY: 0, 'COY-S1': 0, 'COY-S2': 0, FLY: 0, NCY: 0, 'PAL 1': 0, Total: 0 };
      }
      const t = sizeClassBySub[sub];
      t['Soma Phys.'] = Number(t['Soma Phys.']) + (Number(row['Soma Phys.']) || 0);
      t['Total Pieces'] = Number(t['Total Pieces']) + (Number(row['Total Pieces']) || 0);
      t['Total Shipments'] = Number(t['Total Shipments']) + (Number(row['Total Shipments']) || 0);
      t.COY = Number(t.COY) + (Number(row.COY) || 0);
      t['COY-S1'] = Number(t['COY-S1']) + (Number(row['COY-S1']) || 0);
      t['COY-S2'] = Number(t['COY-S2']) + (Number(row['COY-S2']) || 0);
      t.FLY = Number(t.FLY) + (Number(row.FLY) || 0);
      t.NCY = Number(t.NCY) + (Number(row.NCY) || 0);
      t['PAL 1'] = Number(t['PAL 1']) + (Number(row['PAL 1']) || 0);
      t.Total = Number(t.Total) + (Number(row.Total) || 0);
    }
  }

  mergedPre12.sort((a, b) => a['Postal Code'].localeCompare(b['Postal Code']));
  const dfPostcodes: DiscoPostcodeRow[] = Object.entries(postcodesBySub)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subpostcode, count]) => ({ subpostcode, 'total de deliveries': count }));
  dfPostcodes.push({ subpostcode: 'TOTAL', 'total de deliveries': totalDeliveriesSum });
  const dfSizeClass = Object.values(sizeClassBySub)
    .sort((a, b) => String(a.Subpostcode).localeCompare(String(b.Subpostcode)))
    .map((row) => ({ ...row, 'Soma Phys.': Math.round(Number(row['Soma Phys.']) * 1000) / 1000 }));

  return { dfPre12: mergedPre12, dfPostcodes, dfSizeClass, dfStops: mergedStops, totalDeliveries: totalDeliveriesSum, deliveriesCount: dfPostcodes.length - 1 };
}

/** Reads one or more DISCO exports and reduces them to the merged report tabs + per-row stop data. */
export async function processDiscoFiles(files: File[]): Promise<DiscoProcessResult> {
  const results: DiscoProcessResult[] = [];
  for (const file of files) {
    const { header, rows } = await readExcelFile(file);
    if (!rows.length) continue;
    const first = rows[0] || {};
    const nameKey = findColumn(first, NAME_KEYS, ['NAME', 'COMPANY', 'CLIENT']) || header.find((h) => String(h).toLowerCase().includes('name')) || 'Name';
    const postalKey = findColumn(first, ['Postal Code', '_5'], ['POSTAL']) || 'Postal Code';
    const addressKey = findColumn(first, ['Address'], ['ADDRESS']) || 'Address';
    const productKey = findColumn(first, ['Product'], ['PRODUCT']) || 'Product';
    const bookingTypeKey = findColumn(first, ['Booking type'], ['BOOKING']) || 'Booking type';
    const sizeClassKey = findColumn(first, ['Size Class'], ['SIZE']) || 'Size Class';
    const physKey = findColumn(first, ['Phys.', 'Weight'], ['PHYS', 'WEIGHT']) || 'Phys.';
    const totalPiecesKey = findColumn(first, ['Total Pieces', '_1'], ['PIECES']) || 'Total Pieces';
    results.push(processData(rows, nameKey, postalKey, addressKey, productKey, bookingTypeKey, sizeClassKey, physKey, totalPiecesKey));
  }
  if (!results.length) throw new Error('READ_ERROR');
  return mergeResults(results);
}

export function buildDiscoExcel(result: DiscoProcessResult): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const pre12Data = result.dfPre12.length ? result.dfPre12 : [{ 'Postal Code': '', Name: '', Address: '' }];
  const wsPre = XLSX.utils.json_to_sheet(pre12Data);
  XLSX.utils.book_append_sheet(wb, wsPre, 'Pre-12');
  const wsPost = XLSX.utils.json_to_sheet(result.dfPostcodes);
  XLSX.utils.book_append_sheet(wb, wsPost, 'Análise de Postcodes');
  const sizeData = result.dfSizeClass.map((r) => FIXED_SIZE_CLASS_COLS.map((c) => (r[c] != null ? r[c] : '')));
  const wsSize = XLSX.utils.aoa_to_sheet([FIXED_SIZE_CLASS_COLS, ...sizeData]);
  XLSX.utils.book_append_sheet(wb, wsSize, 'analise_size_class');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

const SIZE_CLASS_TO_SHIPMENT: Record<string, ShipmentType> = {
  COY: 'COY', 'COY-S1': 'COY-S1', 'COY-S2': 'COY-S2', FLY: 'FLY', NCY: 'NCY',
};

function mapShipmentType(sizeClass: string): ShipmentType {
  const key = sizeClass.toUpperCase();
  if (/^PAL/.test(key)) return 'PAL1';
  return SIZE_CLASS_TO_SHIPMENT[key] || 'COY';
}

function shipmentBreakdownOf(stops: Stop[]): ShipmentMetrics[] {
  const types: ShipmentType[] = ['COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL1'];
  return types
    .map((type) => {
      const typeStops = stops.filter((s) => s.shipmentType === type);
      return {
        type,
        pieces: typeStops.reduce((sum, s) => sum + s.pieces, 0),
        shipments: typeStops.length,
        physicalWeight: Math.round(typeStops.reduce((sum, s) => sum + s.physicalWeight, 0) * 100) / 100,
      };
    })
    .filter((m) => m.shipments > 0);
}

function totalsOf(stops: Stop[]): Pick<RouteRow, 'totalStops' | 'deliveries' | 'pickups' | 'pre12' | 'asr' | 'dsr' | 'totalPieces' | 'totalPhysicalWeight' | 'shipmentBreakdown'> {
  return {
    totalStops: stops.length,
    deliveries: stops.filter((s) => s.type === 'DEL').length,
    pickups: stops.filter((s) => s.type === 'PU').length,
    pre12: stops.filter((s) => s.pre12).length,
    asr: stops.filter((s) => s.asr).length,
    dsr: stops.filter((s) => s.dsr).length,
    totalPieces: stops.reduce((sum, s) => sum + s.pieces, 0),
    totalPhysicalWeight: Math.round(stops.reduce((sum, s) => sum + s.physicalWeight, 0) * 100) / 100,
    shipmentBreakdown: shipmentBreakdownOf(stops),
  };
}

export interface BuildRouteRowsOptions {
  /** How many additional empty routes to create for manual rebalancing. Default 7. */
  emptyRoutes?: number;
  seedRouteName?: string;
}

/**
 * Turns the deduped DISCO rows into the RouteRow[] shape RouteBalance
 * renders. The DISCO export carries no route/driver assignment — deciding
 * that is the whole point of Route Balance — so every stop lands on a
 * single seed route, plus a handful of empty routes ready to receive
 * postcodes via the existing "Move…" / "Move all…" rebalance tools.
 *
 * Known gaps versus the fake-data model (not present in the DISCO columns
 * this tool reads): `pm` (AM/PM shift) defaults to false, `asr`/`dsr`
 * default to false, and stop `type` is inferred as PU only when Booking
 * type is non-blank (DEL otherwise). `pre12` and `shipmentType` are real,
 * derived from Product and Size Class respectively.
 */
export function buildRouteRowsFromStops(dfStops: DiscoStopRow[], options: BuildRouteRowsOptions = {}): RouteRow[] {
  const { emptyRoutes = 7, seedRouteName = 'A-01' } = options;
  let stopId = 1;

  const seedStops: Stop[] = dfStops.map((r, i) => ({
    id: stopId++,
    routeName: seedRouteName,
    stopNumber: i + 1,
    postcode: r.postcode,
    address: r.address,
    customer: r.name,
    type: r.bookingType ? 'PU' : 'DEL',
    pm: false,
    pre12: TARGET_PRODUCTS.includes(r.product),
    asr: false,
    dsr: false,
    status: 'pending',
    shipmentType: mapShipmentType(r.sizeClass),
    pieces: r.pieces,
    physicalWeight: r.phys,
  }));

  const seedRoute: RouteRow = {
    id: 1,
    name: seedRouteName,
    driver: 'Unassigned',
    vehicle: 'TBD',
    target: 85,
    completedStops: 0,
    completion: 0,
    spr: 0,
    sortAttendance: 'yes',
    notes: '',
    sendStatus: { am: 'pending', pm: 'pending' },
    history: [],
    stops: seedStops,
    ...totalsOf(seedStops),
  };

  const routes: RouteRow[] = [seedRoute];
  for (let i = 0; i < emptyRoutes; i++) {
    const name = `A-${String(i + 2).padStart(2, '0')}`;
    routes.push({
      id: i + 2,
      name,
      driver: 'Unassigned',
      vehicle: 'TBD',
      target: 85,
      totalStops: 0,
      completedStops: 0,
      completion: 0,
      deliveries: 0,
      pickups: 0,
      pre12: 0,
      asr: 0,
      dsr: 0,
      spr: 0,
      sortAttendance: 'yes',
      notes: '',
      sendStatus: { am: 'pending', pm: 'pending' },
      history: [],
      stops: [],
      totalPieces: 0,
      totalPhysicalWeight: 0,
      shipmentBreakdown: [],
    });
  }
  return routes;
}

/* ==================== MOCK DATA (ported from the pre-DISCO generateFakeData()) ====================
   Lets Route Balance be exercised end-to-end — rebalancing, sending, exporting — without a real
   DISCO export on hand, e.g. for demos or QA. */

const MOCK_DRIVERS = [
  'Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
  'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa',
];
const MOCK_VEHICLES = ['Van-001', 'Van-002', 'Van-003', 'Truck-001', 'Truck-002', 'Truck-003', 'Bike-001', 'Car-001'];
const MOCK_SUBPOSTCODES = Array.from({ length: 8 }, (_, i) => `ME${i + 1}`);
const MOCK_POSTCODES = MOCK_SUBPOSTCODES.flatMap((sub) => Array.from({ length: 5 }, (_, i) => `${sub} ${i + 1}AB`));
const MOCK_STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Avenue', 'Mill Road', 'Park View', 'Queensway', 'Riverside Drive'];
const MOCK_SHIPMENT_TYPES: ShipmentType[] = ['COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL1'];

function mockRand(n: number): number {
  return Math.floor(Math.random() * n);
}
function mockPick<T>(arr: T[]): T {
  return arr[mockRand(arr.length)];
}

/** Generates a full set of fake routes/stops for testing Route Balance without a DISCO import. */
export function generateMockRouteRows(): RouteRow[] {
  let stopId = 1;
  const routes: RouteRow[] = [];

  for (let i = 1; i <= 8; i++) {
    const totalStops = 22 + mockRand(8);
    const deliveries = Math.floor(totalStops * 0.72);
    const completion = mockRand(101);
    const completedStops = Math.round((totalStops * completion) / 100);
    const name = `A-${String(i).padStart(2, '0')}`;

    const stops: Stop[] = [];
    for (let j = 0; j < totalStops; j++) {
      const isPM = Math.random() > 0.68;
      stops.push({
        id: stopId++,
        routeName: name,
        stopNumber: j + 1,
        postcode: mockPick(MOCK_POSTCODES),
        address: `${1 + mockRand(200)} ${mockPick(MOCK_STREETS)}`,
        customer: `Customer ${100 + mockRand(900)}`,
        type: j < deliveries ? 'DEL' : 'PU',
        pm: isPM,
        // Pre-12 ("must deliver before 12:00") is AM-only — never roll it for PM stops.
        pre12: !isPM && Math.random() > 0.78,
        asr: Math.random() > 0.15,
        dsr: Math.random() > 0.12,
        status: j < completedStops ? 'completed' : 'pending',
        shipmentType: mockPick(MOCK_SHIPMENT_TYPES),
        pieces: 1 + mockRand(15),
        physicalWeight: Math.round((50 + Math.random() * 750) * 100) / 100,
      });
    }

    routes.push({
      id: i,
      name,
      driver: MOCK_DRIVERS[(i - 1) % MOCK_DRIVERS.length],
      vehicle: mockPick(MOCK_VEHICLES),
      target: 80 + mockRand(16),
      totalStops,
      completedStops,
      completion,
      deliveries,
      pickups: totalStops - deliveries,
      pre12: stops.filter((s) => s.pre12).length,
      asr: stops.filter((s) => s.asr).length,
      dsr: stops.filter((s) => s.dsr).length,
      spr: 90 + mockRand(80),
      sortAttendance: mockPick<SortAttendance>(['yes', 'yes', 'yes', 'late', 'no']),
      notes: '',
      sendStatus: { am: 'pending', pm: 'pending' },
      history: [],
      stops,
      ...totalsOf(stops),
    });
  }

  return routes;
}
