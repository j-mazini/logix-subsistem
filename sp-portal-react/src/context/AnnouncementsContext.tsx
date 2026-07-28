import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { ExpiredDocumentAlert, UserProfile } from '../pages/Compliance/types/compliance';
import {
  getDocumentExpiryEntries,
  getExpiredDocumentAlerts,
  getNextExpiry,
  type DocumentExpiryEntry,
} from '../pages/Compliance/utils/expirationUtils';
import { vendorToProfile } from '../pages/Compliance/hooks/useComplianceState';
import { getAllMockVendors } from '../data/vendorsData';
import { getActiveAvisos, type AvisoRecord } from '../data/announcementsData';
import { useCurrentSp } from '../hooks/useCurrentSp';

interface AnnouncementsContextType {
  /** DHL/SP broadcasts currently live for this SP. */
  systemAnnouncements: AvisoRecord[];
  /** Drivers whose documents are expired or expiring soon. */
  complianceAlerts: ExpiredDocumentAlert[];
  /**
   * Uma linha por documento vencido ou a vencer dentro do horizonte,
   * ordenada do pior para o melhor. É o que a lista de expirações mostra.
   */
  expiryEntries: DocumentExpiryEntry[];
  /**
   * O documento por vencer mais próximo, para a contagem regressiva no
   * cabeçalho. `null` quando não há nada a vencer dentro do horizonte.
   * É sempre um item de `expiryEntries`, para que clicar na contagem abra
   * uma lista que o contém.
   */
  nextExpiry: DocumentExpiryEntry | null;
  /** Combined count, used for the header bell badge. */
  totalCount: number;
  /**
   * Recalcula alertas e contagem regressiva a partir da lista de perfis da
   * página Compliance (que pode ter edições locais). Um único ponto de
   * entrada em vez de um setter por valor: os dois derivam dos mesmos
   * documentos e não podem ficar dessincronizados.
   */
  syncComplianceFromProfiles: (profiles: UserProfile[]) => void;
  /** Re-reads the aviso store; call after any announcement CRUD. */
  refreshAnnouncements: () => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

// Same data source and transform as the Compliance page, so document-expiration
// alerts are available on every page without requiring a visit to /compliance
// first. The Compliance page overwrites this via setComplianceAlerts() whenever
// its (possibly edited) profile list changes.
interface ComplianceSnapshot {
  alerts: ExpiredDocumentAlert[];
  entries: DocumentExpiryEntry[];
  nextExpiry: DocumentExpiryEntry | null;
}

const EMPTY_SNAPSHOT: ComplianceSnapshot = { alerts: [], entries: [], nextExpiry: null };

function summariseCompliance(profiles: UserProfile[]): ComplianceSnapshot {
  const entries = getDocumentExpiryEntries(profiles);
  return {
    alerts: getExpiredDocumentAlerts(profiles),
    entries,
    nextExpiry: getNextExpiry(entries),
  };
}

function computeInitialCompliance(): ComplianceSnapshot {
  try {
    return summariseCompliance(getAllMockVendors().map(vendorToProfile));
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/**
 * Must render inside the Router: it reads the current SP from the URL to
 * decide which announcements are visible.
 */
export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const sp = useCurrentSp();
  const [compliance, setCompliance] = useState<ComplianceSnapshot>(computeInitialCompliance);

  const syncComplianceFromProfiles = useCallback((profiles: UserProfile[]) => {
    setCompliance(summariseCompliance(profiles));
  }, []);

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
      complianceAlerts: compliance.alerts,
      expiryEntries: compliance.entries,
      nextExpiry: compliance.nextExpiry,
      totalCount: systemAnnouncements.length + compliance.alerts.length,
      syncComplianceFromProfiles,
      refreshAnnouncements,
    }),
    [systemAnnouncements, compliance, syncComplianceFromProfiles, refreshAnnouncements],
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
