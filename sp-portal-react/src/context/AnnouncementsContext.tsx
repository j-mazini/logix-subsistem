import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { ExpiredDocumentAlert } from '../pages/Compliance/types/compliance';
import { getExpiredDocumentAlerts } from '../pages/Compliance/utils/expirationUtils';
import { vendorToProfile } from '../pages/Compliance/hooks/useComplianceState';
import { getAllMockVendors } from '../data/vendorsData';
import { getActiveAvisos, type AvisoRecord } from '../data/announcementsData';
import { useCurrentSp } from '../hooks/useCurrentSp';

interface AnnouncementsContextType {
  /** DHL/SP broadcasts currently live for this SP. */
  systemAnnouncements: AvisoRecord[];
  /** Drivers whose documents are expired or expiring soon. */
  complianceAlerts: ExpiredDocumentAlert[];
  /** Combined count, used for the header bell badge. */
  totalCount: number;
  setComplianceAlerts: (alerts: ExpiredDocumentAlert[]) => void;
  /** Re-reads the aviso store; call after any announcement CRUD. */
  refreshAnnouncements: () => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

// Same data source and transform as the Compliance page, so document-expiration
// alerts are available on every page without requiring a visit to /compliance
// first. The Compliance page overwrites this via setComplianceAlerts() whenever
// its (possibly edited) profile list changes.
function computeInitialComplianceAlerts(): ExpiredDocumentAlert[] {
  try {
    return getExpiredDocumentAlerts(getAllMockVendors().map(vendorToProfile));
  } catch {
    return [];
  }
}

/**
 * Must render inside the Router: it reads the current SP from the URL to
 * decide which announcements are visible.
 */
export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const sp = useCurrentSp();
  const [complianceAlerts, setComplianceAlerts] = useState<ExpiredDocumentAlert[]>(
    computeInitialComplianceAlerts,
  );

  // The aviso store is localStorage-backed, so it is re-read on demand rather
  // than held as the source of truth; `version` forces that re-read the same
  // way the Announcements page does after its own mutations.
  const [version, setVersion] = useState(0);
  const refreshAnnouncements = useCallback(() => setVersion((v) => v + 1), []);

  const systemAnnouncements = useMemo(() => {
    void version;
    return getActiveAvisos(sp);
  }, [sp, version]);

  const value = useMemo(
    () => ({
      systemAnnouncements,
      complianceAlerts,
      totalCount: systemAnnouncements.length + complianceAlerts.length,
      setComplianceAlerts,
      refreshAnnouncements,
    }),
    [systemAnnouncements, complianceAlerts, refreshAnnouncements],
  );

  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export function useAnnouncements() {
  const context = useContext(AnnouncementsContext);
  if (context === undefined) {
    throw new Error('useAnnouncements must be used within AnnouncementsProvider');
  }
  return context;
}
