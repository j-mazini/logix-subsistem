export type DeliveryStatus = 'pending' | 'in_route' | 'delivered' | 'failed' | 'exception';
export type DelivererStatus = 'active' | 'break' | 'returning' | 'offline';
export type ExceptionReason = 'absent' | 'wrong_address' | 'unreachable' | 'damaged' | 'refused';

export interface Delivery {
  id: string;
  packageId: string;
  customerId: string;
  address: string;
  status: DeliveryStatus;
  assignedTo: string;
  assignedToId: string;
  scannedAt?: string;
  note: string;
}

export interface Deliverer {
  id: string;
  name: string;
  status: DelivererStatus;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  assignedPackages: number;
  deliveredPackages: number;
  currentStop?: string;
  lastUpdate: string;
  avgTimePerStop: number;
}

export interface LiveMetrics {
  totalToday: number;
  percentComplete: number;
  delivered: number;
  absent: number;
  wrongAddress: number;
  unreachable: number;
  damaged: number;
  refused: number;
  avgTimePerStop: number;
  lastUpdated: string;
}

export interface ScannerEvent {
  id: string;
  timestamp: string;
  delivererId: string;
  delivererName: string;
  packageId: string;
  action: DeliveryStatus;
  note?: string;
}

export interface Exception {
  id: string;
  deliveryId: string;
  packageId: string;
  delivererName: string;
  delivererId: string;
  address: string;
  reason: ExceptionReason;
  createdAt: string;
  resolved: boolean;
  notes: string;
}

export interface TeamMember {
  id: string;
  name: string;
  status: DelivererStatus;
  totalAssigned: number;
  totalDelivered: number;
  batteryLevel: number;
  avgTimePerStop: number;
  location: { lat: number; lng: number };
}

export interface HeatmapZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  intensity: number; // 0-100
  packageCount: number;
}
