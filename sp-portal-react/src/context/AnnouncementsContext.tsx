import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { ExpiredDocumentAlert, UserProfile } from '../pages/Compliance/types/compliance';
import {
  getDocumentExpiryEntries,
  getExpiredDocumentAlerts,
  getNextExpiry,
  type DocumentExpiryEntry,
} from '../pages/Compliance/utils/expirationUtils';
import * as workforce from '../services/workforceService';
import { getActiveAvisos, type AvisoRecord } from '../data/announcementsData';
import { useCurrentSp } from '../hooks/useCurrentSp';
import * as traceQueryCases from '../services/traceQueryCaseService';
import { getCaseDeadlineAlerts, type CaseDeadlineEntry } from '../pages/TraceQueries/utils/caseDeadlineAlerts';

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
  /** DHL cases approaching or past their 3-day resolution deadline, worst-first. */
  caseDeadlineEntries: CaseDeadlineEntry[];
  /** Combined count, used for the header bell badge. */
  totalCount: number;
  /** Re-reads the aviso store; call after any announcement CRUD. */
  refreshAnnouncements: () => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextType | undefined>(undefined);

// Derivado do WorkforceService, a mesma fonte que alimenta as abas. Antes a
// página Compliance tinha de empurrar a sua lista de perfis para cá
// (setComplianceAlerts / syncComplianceFromProfiles) e os avisos do cabeçalho
// só ficavam correctos depois de alguém visitar essa página. Agora o
// cabeçalho reage a qualquer escrita no roster, em qualquer aba.
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

function computeComplianceFromRoster(): ComplianceSnapshot {
  try {
    return summariseCompliance(workforce.getProfiles());
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

  const roster = useSyncExternalStore(workforce.subscribe, workforce.getSnapshot);
  // `roster` como dependência e não `roster.vendors`: o serviço só troca a
  // referência do snapshot quando há mutação, por isso isto recalcula
  // exactamente uma vez por escrita.
  const compliance = useMemo(() => {
    void roster;
    return computeComplianceFromRoster();
  }, [roster]);

  // The aviso store is localStorage-backed, so it is re-read on demand rather
  // than held as the source of truth; `version` forces that re-read the same
  // way the Announcements page does after its own mutations.
  const [version, setVersion] = useState(0);
  const refreshAnnouncements = useCallback(() => setVersion((v) => v + 1), []);

  const systemAnnouncements = useMemo(() => {
    void version;
    return getActiveAvisos(sp);
  }, [sp, version]);

  const caseStore = useSyncExternalStore(traceQueryCases.subscribe, traceQueryCases.getSnapshot);
  const caseDeadlines = useMemo(() => getCaseDeadlineAlerts(caseStore.cases), [caseStore]);

  const value = useMemo(
    () => ({
      systemAnnouncements,
      complianceAlerts: compliance.alerts,
      expiryEntries: compliance.entries,
      nextExpiry: compliance.nextExpiry,
      caseDeadlineEntries: caseDeadlines.entries,
      totalCount: systemAnnouncements.length + compliance.alerts.length + caseDeadlines.entries.length,
      refreshAnnouncements,
    }),
    [systemAnnouncements, compliance, caseDeadlines, refreshAnnouncements],
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
