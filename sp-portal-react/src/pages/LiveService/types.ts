export type DeliveryStatus = 'pending' | 'in_route' | 'delivered' | 'failed' | 'exception';

/** Ciclo de vida da rota de uma van: Sort (carregando) → Departed → Arrived. */
export type RouteStatus = 'sort' | 'departed' | 'arrived';

export interface Delivery {
  id: string;
  packageId: string;
  customerId: string;
  address: string;
  postcode: string;
  status: DeliveryStatus;
  assignedTo: string;
  assignedToId: string;
  scannedAt?: string;
  note: string;
}

export interface Deliverer {
  id: string;
  name: string;
  routeStatus: RouteStatus;
  vehiclePlate: string;
  routeName: string;
  latitude: number;
  longitude: number;
  assignedPackages: number;
  deliveredPackages: number;
  currentStop?: string;
  lastUpdate: string;
  departedAt?: string;
  arrivedAt?: string;
  stopsPerHour: number;
  /** % de paradas feitas dentro da janela prometida — mesmo conceito de "TW" do Vendor Performance. */
  timeWindowPct: number;
}

export interface TeamMember {
  id: string;
  name: string;
  vehiclePlate: string;
  routeName: string;
  routeStatus: RouteStatus;
  totalAssigned: number;
  totalDelivered: number;
  departedAt?: string;
  arrivedAt?: string;
  stopsPerHour: number;
  location: { lat: number; lng: number };
}
