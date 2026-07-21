// Side-effect import: runs the legacy IIFE verbatim, which assigns
// window.DHL_MOCK_DATA exactly like every static HTML page in the current
// site. Keeping the file byte-identical (not retyped into TS) avoids any
// transcription drift in the mock data itself.
import './dhl-mock-data.js';

export interface DepotManager {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  coverColor?: string;
  owner?: string;
  email?: string;
  phone?: string;
  description?: string;
  depotManagers?: Record<string, DepotManager>;
}

export interface DhlMockData {
  serviceProviders: ServiceProvider[];
  [key: string]: unknown;
}

declare global {
  interface Window {
    DHL_MOCK_DATA?: DhlMockData;
  }
}

export function getMockData(): DhlMockData | undefined {
  return window.DHL_MOCK_DATA;
}

export function getServiceProvider(spName: string): ServiceProvider | null {
  const data = window.DHL_MOCK_DATA;
  if (!data || !data.serviceProviders) return null;
  const found = data.serviceProviders.find((sp) => sp.name === spName);
  if (found) return found;
  return { id: spName, name: spName, owner: '', description: '', email: '', phone: '', depotManagers: {} };
}
