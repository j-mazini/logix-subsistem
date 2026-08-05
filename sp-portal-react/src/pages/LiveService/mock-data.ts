import { Delivery, Deliverer, DeliveryStatus, RouteStatus } from './types';

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

// Depósito — ponto de partida/retorno das vans. "Sort" (ainda carregando) e
// "Arrived" (já de volta) ficam parados exatamente aqui, então mais de um
// van pode ocupar o mesmo pino; só "Departed" se espalha pela rota.
export const DEPOT = { lat: 51.5074, lng: -0.1278 };

const ROUTE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const PLATE_LETTERS = 'ABCDEFGHJKLMNOPRSTUVWXYZ';

// Placa estilo UK (ex. "LX21 KPR"), gerada com o mesmo RNG seedado pra ficar
// determinística entre reloads.
function generatePlate(): string {
  const area = pick(PLATE_LETTERS.split('')) + pick(PLATE_LETTERS.split(''));
  const age = String(randInt(15, 73)).padStart(2, '0');
  const suffix = Array.from({ length: 3 }, () => pick(PLATE_LETTERS.split(''))).join('');
  return `${area}${age} ${suffix}`;
}

function generateRouteStatus(): RouteStatus {
  const roll = rng();
  if (roll < 0.2) return 'sort';
  if (roll < 0.75) return 'departed';
  return 'arrived';
}

function generateDeliverers(): Deliverer[] {
  const deliverers: Deliverer[] = [];

  for (let i = 0; i < 10; i++) {
    const name = DELIVERER_NAMES[i];
    const assigned = randInt(30, 60);
    const routeStatus = generateRouteStatus();

    let deliveredPackages = 0;
    let departedAt: string | undefined;
    let arrivedAt: string | undefined;
    const now = Date.now();

    if (routeStatus === 'departed') {
      deliveredPackages = Math.round(assigned * randFloat(0.1, 0.85));
      departedAt = new Date(now - randInt(30, 180) * 60_000).toISOString();
    } else if (routeStatus === 'arrived') {
      deliveredPackages = Math.round(assigned * randFloat(0.92, 1));
      const departedMinutesAgo = randInt(120, 300);
      const arrivedMinutesAgo = randInt(5, 60);
      departedAt = new Date(now - departedMinutesAgo * 60_000).toISOString();
      arrivedAt = new Date(now - arrivedMinutesAgo * 60_000).toISOString();
    }

    deliverers.push({
      id: `deliverer-${i}`,
      name,
      routeStatus,
      vehiclePlate: generatePlate(),
      routeName: `Route ${ROUTE_LETTERS[i]}`,
      latitude: routeStatus === 'departed' ? DEPOT.lat + randFloat(-0.05, 0.05) : DEPOT.lat,
      longitude: routeStatus === 'departed' ? DEPOT.lng + randFloat(-0.05, 0.05) : DEPOT.lng,
      assignedPackages: assigned,
      deliveredPackages,
      currentStop: routeStatus === 'departed' ? pick(ADDRESSES) : undefined,
      lastUpdate: new Date(now - randInt(10, 300) * 1000).toISOString(),
      departedAt,
      arrivedAt,
      stopsPerHour: randFloat(4, 14),
      // Mesma faixa usada pelo mock do Vendor Performance (55–100% on-time).
      timeWindowPct: randFloat(55, 100),
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

export const MOCK_DELIVERERS = generateDeliverers();
export const MOCK_DELIVERIES = generateDeliveries(MOCK_DELIVERERS);
