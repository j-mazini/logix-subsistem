/**
 * Mock data for Dashboard and operational pages
 */

export interface RouteMetrics {
  name: string;
  deliveries: number;
  onTimePercentage: number;
  vehicles: number;
  status: 'on-track' | 'attention' | 'delayed' | 'complete';
}

export interface DriverInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
  depot: string;
  route: string;
  status: 'active' | 'inactive' | 'on-leave';
  vehicleAssigned: string;
}

export interface VehicleInfo {
  id: number;
  vrn: string;
  brand: string;
  model: string;
  depot: string;
  status: 'available' | 'in-use' | 'maintenance';
  mileage: number;
  lastService: string;
}

export interface FinancialMetrics {
  date: string;
  revenue: number;
  expenses: number;
  deliveries: number;
  avgValue: number;
}

export interface OperationalAlert {
  id: number;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

// Dashboard Metrics
export const dashboardMetrics = {
  activeDeliveries: 2847,
  routesRunning: 42,
  fleetStatus: 98,
  onTimeRate: 96.8,
  totalRevenue: 45230,
  operationalCosts: 12450,
};

// Route Metrics
export const routeMetrics: RouteMetrics[] = [
  {
    name: 'MD7A',
    deliveries: 86,
    onTimePercentage: 98,
    vehicles: 7,
    status: 'on-track',
  },
  {
    name: 'MD7B',
    deliveries: 92,
    onTimePercentage: 94,
    vehicles: 6,
    status: 'attention',
  },
  {
    name: 'MD7C',
    deliveries: 108,
    onTimePercentage: 88,
    vehicles: 8,
    status: 'delayed',
  },
  {
    name: 'MD7D',
    deliveries: 101,
    onTimePercentage: 100,
    vehicles: 7,
    status: 'complete',
  },
  {
    name: 'MD7E',
    deliveries: 116,
    onTimePercentage: 97,
    vehicles: 9,
    status: 'on-track',
  },
  {
    name: 'MD7F',
    deliveries: 73,
    onTimePercentage: 92,
    vehicles: 5,
    status: 'attention',
  },
];

// Drivers
export const driversData: DriverInfo[] = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+44 7700 900123',
    depot: 'MSE',
    route: 'MD7A',
    status: 'active',
    vehicleAssigned: 'AB12 CDE',
  },
  {
    id: 2,
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    phone: '+44 7700 900456',
    depot: 'MSE',
    route: 'MD7B',
    status: 'active',
    vehicleAssigned: 'EF34 FGH',
  },
  {
    id: 3,
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    phone: '+44 7700 900789',
    depot: 'MSE',
    route: 'MD7C',
    status: 'active',
    vehicleAssigned: 'JK56 LMN',
  },
  {
    id: 4,
    name: 'Ana Ferreira',
    email: 'ana.ferreira@example.com',
    phone: '+44 7700 901012',
    depot: 'MSE',
    route: 'MD7D',
    status: 'active',
    vehicleAssigned: 'OP78 PQR',
  },
  {
    id: 5,
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    phone: '+44 7700 901345',
    depot: 'MSE',
    route: 'MD7E',
    status: 'active',
    vehicleAssigned: 'ST90 UVW',
  },
  {
    id: 6,
    name: 'Sofia Rodrigues',
    email: 'sofia.rodrigues@example.com',
    phone: '+44 7700 901678',
    depot: 'MSE',
    route: 'MD7F',
    status: 'on-leave',
    vehicleAssigned: 'XY12 ZAB',
  },
  {
    id: 7,
    name: 'Emma Thompson',
    email: 'emma.thompson@example.com',
    phone: '+44 7700 901999',
    depot: 'MSE',
    route: 'MD7A',
    status: 'active',
    vehicleAssigned: 'CD34 EFG',
  },
  {
    id: 8,
    name: 'David Clark',
    email: 'david.clark@example.com',
    phone: '+44 7700 902111',
    depot: 'MSE',
    route: 'MD7B',
    status: 'inactive',
    vehicleAssigned: 'GH56 IJK',
  },
];

// Vehicles
export const vehiclesData: VehicleInfo[] = [
  {
    id: 1,
    vrn: 'AB12 CDE',
    brand: 'Volkswagen',
    model: 'Crafter',
    depot: 'MSE',
    status: 'in-use',
    mileage: 45230,
    lastService: '2026-01-15',
  },
  {
    id: 2,
    vrn: 'EF34 FGH',
    brand: 'Ford',
    model: 'Transit',
    depot: 'LCY',
    status: 'in-use',
    mileage: 38920,
    lastService: '2026-01-10',
  },
  {
    id: 3,
    vrn: 'JK56 LMN',
    brand: 'Renault',
    model: 'Master',
    depot: 'LSE',
    status: 'in-use',
    mileage: 52100,
    lastService: '2025-12-20',
  },
  {
    id: 4,
    vrn: 'OP78 PQR',
    brand: 'Tesla',
    model: 'Semi',
    depot: 'MSE',
    status: 'available',
    mileage: 15420,
    lastService: '2026-01-05',
  },
  {
    id: 5,
    vrn: 'ST90 UVW',
    brand: 'Mercedes-Benz',
    model: 'Sprinter',
    depot: 'LCY',
    status: 'maintenance',
    mileage: 68350,
    lastService: '2026-02-01',
  },
  {
    id: 6,
    vrn: 'XY12 ZAB',
    brand: 'Ford',
    model: 'e-Transit',
    depot: 'LSE',
    status: 'in-use',
    mileage: 28450,
    lastService: '2026-01-20',
  },
];

// Financial Data
export const financialData: FinancialMetrics[] = [
  {
    date: '2026-07-16',
    revenue: 45230,
    expenses: 12450,
    deliveries: 2847,
    avgValue: 15.9,
  },
  {
    date: '2026-07-17',
    revenue: 48920,
    expenses: 13200,
    deliveries: 3012,
    avgValue: 16.2,
  },
  {
    date: '2026-07-18',
    revenue: 42100,
    expenses: 11800,
    deliveries: 2650,
    avgValue: 15.9,
  },
  {
    date: '2026-07-19',
    revenue: 51300,
    expenses: 14500,
    deliveries: 3145,
    avgValue: 16.3,
  },
  {
    date: '2026-07-20',
    revenue: 46800,
    expenses: 12900,
    deliveries: 2890,
    avgValue: 16.2,
  },
  {
    date: '2026-07-21',
    revenue: 49200,
    expenses: 13400,
    deliveries: 3020,
    avgValue: 16.3,
  },
  {
    date: '2026-07-22',
    revenue: 45230,
    expenses: 12450,
    deliveries: 2847,
    avgValue: 15.9,
  },
];

// Operational Alerts
export const operationalAlerts: OperationalAlert[] = [
  {
    id: 1,
    type: 'error',
    title: 'Route MD7C - Delivery Delay',
    description: 'Route MD7C is experiencing delays due to traffic. Current status: 2 hours behind schedule.',
    timestamp: '2026-07-22 14:30',
    priority: 'high',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Vehicle ST90 UVW - Maintenance Required',
    description: 'Vehicle ST90 UVW requires scheduled maintenance. Please park for service.',
    timestamp: '2026-07-22 13:15',
    priority: 'medium',
  },
  {
    id: 3,
    type: 'info',
    title: 'New Delivery Requests',
    description: 'Additional 150 deliveries assigned to available routes.',
    timestamp: '2026-07-22 12:00',
    priority: 'low',
  },
  {
    id: 4,
    type: 'warning',
    title: 'Driver Sofia Rodrigues - On Leave',
    description: 'Driver Sofia Rodrigues marked as on leave until 2026-07-25.',
    timestamp: '2026-07-22 11:45',
    priority: 'medium',
  },
];

export default {
  dashboardMetrics,
  routeMetrics,
  driversData,
  vehiclesData,
  financialData,
  operationalAlerts,
};
