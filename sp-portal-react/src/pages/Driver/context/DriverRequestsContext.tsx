import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { SEED_REQUESTS, type DriverRequest, type RequestType } from '../data/driverMockData';

export interface SubmitRequestInput {
  requestType: RequestType;
  startDate: string | null;
  endDate: string | null;
  prePaymentValue: number | null;
  reason: string;
  notes: string;
}

interface DriverRequestsContextType {
  requests: DriverRequest[];
  submitRequest: (input: SubmitRequestInput) => void;
}

const DriverRequestsContext = createContext<DriverRequestsContextType | undefined>(undefined);

/** In-memory only, scoped to the DriverLayout route — mirrors AnnouncementsProvider's
 *  Context shape and Vetting's Provider-scoped-to-layout-route pattern. Seeded so
 *  History isn't empty on first visit. */
export function DriverRequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DriverRequest[]>(SEED_REQUESTS);
  const idRef = useRef(Math.max(0, ...SEED_REQUESTS.map((r) => r.vendorRequestId)) + 1);

  const submitRequest = useCallback((input: SubmitRequestInput) => {
    const newRequest: DriverRequest = {
      ...input,
      vendorRequestId: idRef.current++,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    setRequests((prev) => [newRequest, ...prev]);
  }, []);

  const value: DriverRequestsContextType = { requests, submitRequest };
  return <DriverRequestsContext.Provider value={value}>{children}</DriverRequestsContext.Provider>;
}

export function useDriverRequests() {
  const ctx = useContext(DriverRequestsContext);
  if (!ctx) throw new Error('useDriverRequests must be used within DriverRequestsProvider');
  return ctx;
}
