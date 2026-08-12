import { createContext, useContext, useState, type ReactNode } from 'react';
import { MOCK_DRIVER, type MockDriver } from '../data/driverMockData';

/** Same mocked-session convention as useCurrentSp/LoginScreenBody: a sessionStorage
 *  flag set by the (cosmetic) login form, read here to gate the Driver Portal shell. */
export const DRIVER_STORAGE_KEY = 'dhl_driver_portal_current_driver';

export function setDriverSession() {
  try {
    sessionStorage.setItem(DRIVER_STORAGE_KEY, MOCK_DRIVER.fullName);
  } catch {
    /* ignore */
  }
}

function readDriverSession(): boolean {
  try {
    return sessionStorage.getItem(DRIVER_STORAGE_KEY) === MOCK_DRIVER.fullName;
  } catch {
    return false;
  }
}

interface DriverSessionContextType {
  driver: MockDriver;
  isAuthenticated: boolean;
}

const DriverSessionContext = createContext<DriverSessionContextType | undefined>(undefined);

export function DriverSessionProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated] = useState(readDriverSession);
  const value: DriverSessionContextType = { driver: MOCK_DRIVER, isAuthenticated };
  return <DriverSessionContext.Provider value={value}>{children}</DriverSessionContext.Provider>;
}

export function useDriverSession() {
  const ctx = useContext(DriverSessionContext);
  if (!ctx) throw new Error('useDriverSession must be used within DriverSessionProvider');
  return ctx;
}
