import {
  Delivery,
  Deliverer,
  LiveMetrics,
  ScannerEvent,
  Exception,
  DeliveryStatus,
  DelivererStatus,
  ExceptionReason,
  HazardReport,
} from './types';

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

const rng = mulberry32(0xdead1705);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const randFloat = (min: number, max: number): number => min + rng() * (max - min);

const DELIVERER_NAMES = [
  'João Silva',
  'Maria Santos',
  'Carlos Oliveira',
  'Ana Costa',
  'Pedro Martins',
  'Lucia Ferreira',
  'Felipe Alves',
  'Camila Rocha',
  'Roberto Gomes',
  'Daniela Lima',
];

// Marcos reais de Londres com postcode e coordenadas aproximadas — usados
// tanto para o texto do endereço quanto para traçar a rota estimada no mapa.
export interface LondonLocation {
  name: string;
  postcode: string;
  lat: number;
  lng: number;
}

export const LONDON_LOCATIONS: LondonLocation[] = [
  { name: 'Oxford Street, London', postcode: 'W1D 1BS', lat: 51.5152, lng: -0.1418 },
  { name: 'Piccadilly Circus, London', postcode: 'W1J 9HS', lat: 51.51, lng: -0.1337 },
  { name: 'Baker Street, London', postcode: 'NW1 6XE', lat: 51.5226, lng: -0.1571 },
  { name: 'Regent Street, London', postcode: 'W1B 5AH', lat: 51.5136, lng: -0.141 },
  { name: 'Bond Street, London', postcode: 'W1S 1SQ', lat: 51.5142, lng: -0.1494 },
  { name: 'Covent Garden, London', postcode: 'WC2E 8RF', lat: 51.5117, lng: -0.124 },
  { name: 'Trafalgar Square, London', postcode: 'WC2N 5DN', lat: 51.508, lng: -0.1281 },
  { name: 'Kensington High Street, London', postcode: 'W8 5SA', lat: 51.5009, lng: -0.1925 },
  { name: 'Tottenham Court Road, London', postcode: 'W1T 7RA', lat: 51.5165, lng: -0.1308 },
  { name: 'Leicester Square, London', postcode: 'WC2H 7NA', lat: 51.5106, lng: -0.1281 },
];

const ADDRESSES = LONDON_LOCATIONS.map(l => l.name);

const EXCEPTION_REASONS: ExceptionReason[] = ['absent', 'wrong_address', 'unreachable', 'damaged', 'refused'];


function generateDeliverers(): Deliverer[] {
  const deliverers: Deliverer[] = [];
  const statuses: DelivererStatus[] = ['active', 'break', 'returning', 'offline'];

  for (let i = 0; i < 10; i++) {
    const name = DELIVERER_NAMES[i];
    const baseLat = 51.5074; // London
    const baseLng = -0.1278;
    const assigned = randInt(30, 60);

    deliverers.push({
      id: `deliverer-${i}`,
      name,
      status: rng() > 0.8 ? pick(statuses) : 'active',
      latitude: baseLat + randFloat(-0.05, 0.05),
      longitude: baseLng + randFloat(-0.05, 0.05),
      batteryLevel: randInt(15, 100),
      assignedPackages: assigned,
      // Entregues nunca pode exceder o atribuído — deriva-se como fração da carga.
      deliveredPackages: Math.round(assigned * randFloat(0.15, 0.85)),
      currentStop: pick(ADDRESSES),
      lastUpdate: new Date(Date.now() - randInt(10, 300) * 1000).toISOString(),
      avgTimePerStop: randFloat(4, 12),
    });
  }

  return deliverers;
}

function generateDeliveries(deliverers: Deliverer[]): Delivery[] {
  const deliveries: Delivery[] = [];
  const statuses: DeliveryStatus[] = ['pending', 'in_route', 'delivered', 'failed', 'exception'];

  for (let i = 0; i < 50; i++) {
    const status = rng() > 0.7 ? pick(statuses) : i < 20 ? 'delivered' : 'in_route';
    const deliverer = pick(deliverers);
    const location = pick(LONDON_LOCATIONS);

    deliveries.push({
      id: `delivery-${i}`,
      packageId: `PKG-${String(100000 + i).slice(-5)}`,
      customerId: `CUST-${String(50000 + i).slice(-5)}`,
      address: location.name,
      postcode: location.postcode,
      status,
      assignedTo: deliverer.name,
      assignedToId: deliverer.id,
      scannedAt: status !== 'pending' ? new Date(Date.now() - randInt(60, 3600) * 1000).toISOString() : undefined,
      note: rng() > 0.8 ? 'Customer was not at home' : '',
    });
  }

  return deliveries;
}

function generateScannerEvents(deliveries: Delivery[], deliverers: Deliverer[]): ScannerEvent[] {
  const events: ScannerEvent[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < 100; i++) {
    const delivery = pick(deliveries.filter(d => d.status !== 'pending'));
    const deliverer = deliverers.find(d => d.id === delivery.assignedToId) || pick(deliverers);

    events.push({
      id: `event-${i}`,
      timestamp: new Date(baseTime - randInt(60, 7200) * 1000).toISOString(),
      delivererId: deliverer.id,
      delivererName: deliverer.name,
      packageId: delivery.packageId,
      action: delivery.status,
      note: delivery.note,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateExceptions(deliveries: Delivery[], deliverers: Deliverer[]): Exception[] {
  const exceptions: Exception[] = [];
  const failedDeliveries = deliveries.filter(d => d.status === 'exception' || d.status === 'failed');

  for (let i = 0; i < Math.min(5, failedDeliveries.length); i++) {
    const delivery = failedDeliveries[i];
    const deliverer = deliverers.find(d => d.id === delivery.assignedToId) || pick(deliverers);
    const reason = pick(EXCEPTION_REASONS);

    exceptions.push({
      id: `exception-${i}`,
      deliveryId: delivery.id,
      packageId: delivery.packageId,
      delivererName: deliverer.name,
      delivererId: deliverer.id,
      address: delivery.address,
      reason,
      createdAt: new Date(Date.now() - randInt(600, 3600) * 1000).toISOString(),
      resolved: false,
      // O motivo já tem linha própria (traduzida) no detalhe — aqui fica só a
      // observação do entregador, sem repetir a chave crua do enum.
      notes: delivery.note || 'No notes from the courier.',
    });
  }

  return exceptions;
}

function generateHazards(deliverers: Deliverer[]): HazardReport[] {
  // Alguns relatos de campo já plantados no mapa, pra feature não nascer vazia.
  const seeds: Array<{ type: HazardReport['type']; lat: number; lng: number; note: string }> = [
    { type: 'road_closed', lat: 51.5136, lng: -0.141, note: 'Regent Street closed for filming' },
    { type: 'accident', lat: 51.508, lng: -0.1281, note: 'Minor collision, one lane blocked' },
  ];

  return seeds.map((seed, i) => ({
    id: `hazard-${i}`,
    type: seed.type,
    lat: seed.lat,
    lng: seed.lng,
    note: seed.note,
    reportedBy: pick(deliverers).name,
    createdAt: new Date(Date.now() - randInt(300, 5400) * 1000).toISOString(),
  }));
}

export const MOCK_DELIVERERS = generateDeliverers();
export const MOCK_DELIVERIES = generateDeliveries(MOCK_DELIVERERS);
export const MOCK_SCANNER_EVENTS = generateScannerEvents(MOCK_DELIVERIES, MOCK_DELIVERERS);
export const MOCK_EXCEPTIONS = generateExceptions(MOCK_DELIVERIES, MOCK_DELIVERERS);
export const MOCK_HAZARDS = generateHazards(MOCK_DELIVERERS);
