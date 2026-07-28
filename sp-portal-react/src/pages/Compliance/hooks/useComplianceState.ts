import { useState, useEffect, useCallback } from 'react';
import {
  ComplianceState,
  UserProfile,
  VettingRecord,
  ProfileFilters,
  WorkforceTab,
  isWorkforceTab,
} from '../types/compliance';
import { getAllMockVendors, type Vendor } from '../../../data/vendorsData';
import { getExpirationStatus } from '../utils/expirationUtils';

const TAB_STORAGE_KEY = 'compliance-active-tab';

/**
 * A aba guardada só é aceite se ainda existir. Sessões anteriores à fusão
 * dos ecrãs guardaram `'profiles'` nesta chave; sem esta validação o estado
 * inicial ficava num valor que nenhuma aba renderiza e a página abria vazia.
 */
function readStoredTab(): WorkforceTab {
  const stored = localStorage.getItem(TAB_STORAGE_KEY);
  return isWorkforceTab(stored) ? stored : 'vendors';
}

// Assigns a variety of vetting outcomes across the mock vendor roster so
// every status/KPI in the UI has at least one example to show.
const VETTING_STATUS_BY_VENDOR_ID: Record<number, VettingRecord['status']> = {
  1: 'completed',
  2: 'in-progress',
  3: 'completed',
  4: 'pending',
  5: 'completed',
  6: 'in-progress',
  7: 'completed',
  8: 'rejected',
};

const COMPLIANCE_SCORE_BY_STATUS: Record<VettingRecord['status'], number> = {
  completed: 95,
  'in-progress': 62,
  pending: 35,
  rejected: 20,
};

const VENDOR_ACCESS_BY_STATUS: Record<VettingRecord['status'], VettingRecord['vendorAccess']> = {
  completed: 'full',
  'in-progress': 'restricted',
  pending: 'restricted',
  rejected: 'none',
};

const CHECKLIST_TEMPLATE = ['Right to Work check', 'DBS background check', 'DVLA licence check', 'Final approval'];

/**
 * Decide o badge do documento (`approved` / `expired`). Delega em
 * getExpirationStatus para usar a mesma contagem por dia de calendário da
 * linha "Status: Valid/Expired" logo ao lado — comparar instantes aqui e
 * dias ali fazia as duas discordarem no próprio dia do vencimento.
 */
function isFutureDate(value?: string | null): boolean {
  if (!value) return false;
  return getExpirationStatus(value) !== 'expired';
}

/**
 * Mapeia um vendor do mock para os documentos que o perfil mostra.
 *
 * Os tipos `dbs` / `dvla` / `passport` existem em DocumentType e o
 * ProfileDetail já tinha ramos a renderá-los, mas este builder emitia
 * `id` / `license` / `proof-of-address`: nenhum desses ramos disparava, o
 * número do DBS ia colado ao nome e as datas de validade nunca apareciam.
 */
function buildDocuments(vendor: Vendor) {
  const documents: UserProfile['documents'] = [];

  if (vendor.dbsNumber) {
    documents.push({
      id: `${vendor.id}-dbs`,
      type: 'dbs',
      name: 'DBS certificate',
      status: 'approved',
      uploadedAt: vendor.criminalRecordDate || vendor.startDate || new Date().toISOString(),
      url: '#',
      dbsNumber: vendor.dbsNumber,
      // A página Vendors rotula este campo como "Criminal record check date":
      // o DBS é a verificação de registo criminal, por isso é a data da
      // verificação — não uma validade.
      dbsCheckDate: vendor.criminalRecordDate || undefined,
    });
  }
  if (vendor.licenceExpiringDate) {
    documents.push({
      id: `${vendor.id}-licence`,
      type: 'dvla',
      name: 'Driving licence',
      status: isFutureDate(vendor.licenceExpiringDate) ? 'approved' : 'expired',
      uploadedAt: vendor.startDate || new Date().toISOString(),
      expiresAt: vendor.licenceExpiringDate,
      url: '#',
      // `vendor.dvlaCheckDate` (a data em que a verificação DVLA foi feita)
      // também existe no mock e cabe em ComplianceDocument.checkDate, mas o
      // perfil mostra apenas a validade — não fica guardada aqui enquanto não
      // houver onde a ler.
      dvlaExpiry: vendor.licenceExpiringDate,
    });
  }
  if (vendor.passportExpiringDate) {
    documents.push({
      id: `${vendor.id}-passport`,
      type: 'passport',
      name: 'Passport',
      status: isFutureDate(vendor.passportExpiringDate) ? 'approved' : 'expired',
      uploadedAt: vendor.startDate || new Date().toISOString(),
      expiresAt: vendor.passportExpiringDate,
      url: '#',
      passportExpiry: vendor.passportExpiringDate,
    });
  }
  if (vendor.visaValidity) {
    documents.push({
      id: `${vendor.id}-visa`,
      type: 'contract',
      name: 'Right to Work / visa',
      status: isFutureDate(vendor.visaValidity) ? 'approved' : 'expired',
      uploadedAt: vendor.startDate || new Date().toISOString(),
      expiresAt: vendor.visaValidity,
      url: '#',
    });
  }

  return documents;
}

function buildTrainings(vendor: Vendor) {
  const trainings: UserProfile['trainings'] = [];

  if (vendor.cargoTraining) {
    trainings.push({
      id: `${vendor.id}-cargo`,
      name: 'Cargo handling',
      type: 'mandatory',
      status: 'completed',
      completedAt: vendor.cargoTrainingDate || undefined,
    });
  }
  if (vendor.dangerousGoodsTraining) {
    trainings.push({
      id: `${vendor.id}-dg`,
      name: 'Dangerous goods',
      type: 'mandatory',
      status: 'completed',
      completedAt: vendor.dangerousGoodsTrainingDate || undefined,
    });
  }
  if (vendor.manualHandlingTraining) {
    trainings.push({
      id: `${vendor.id}-manual-handling`,
      name: 'Manual handling',
      type: 'mandatory',
      status: 'completed',
      completedAt: vendor.manualHandlingTrainingDate || undefined,
    });
  }

  return trainings;
}

function buildChecklist(status: VettingRecord['status']) {
  const completedCount = { completed: 4, 'in-progress': 2, pending: 0, rejected: 1 }[status];
  return CHECKLIST_TEMPLATE.map((title, index) => ({
    id: `checklist-${index}`,
    title,
    description: '',
    required: true,
    completed: index < completedCount,
  }));
}

export function vendorToProfile(vendor: Vendor): UserProfile {
  const status = VETTING_STATUS_BY_VENDOR_ID[vendor.id] ?? 'pending';
  const now = new Date().toISOString();

  return {
    id: `vendor-${vendor.id}`,
    name: `${vendor.firstName} ${vendor.lastName}`,
    email: vendor.email || '',
    phone: vendor.phone || '',
    vendor: vendor.serviceProvider,
    role: 'driver',
    documents: buildDocuments(vendor),
    trainings: buildTrainings(vendor),
    vettingStatus: status,
    complianceScore: COMPLIANCE_SCORE_BY_STATUS[status],
    createdAt: vendor.startDate || now,
    lastUpdated: now,
  };
}

function vendorToVettingRecord(vendor: Vendor): VettingRecord {
  const status = VETTING_STATUS_BY_VENDOR_ID[vendor.id] ?? 'pending';
  const daysInStage = { completed: 0, 'in-progress': 7, pending: 3, rejected: 14 }[status];

  return {
    id: `vetting-${vendor.id}`,
    profileId: `vendor-${vendor.id}`,
    status,
    backgroundCheck: {
      criminalRecord: false,
      status: status === 'completed' ? 'approved' : status === 'rejected' ? 'flagged' : 'pending',
      notes:
        status === 'completed'
          ? 'Background check cleared.'
          : status === 'rejected'
            ? 'Background check flagged an issue.'
            : 'Awaiting DBS response.',
    },
    checklist: buildChecklist(status),
    vendorAccess: VENDOR_ACCESS_BY_STATUS[status],
    priority: status === 'rejected' || status === 'pending' ? 'high' : status === 'in-progress' ? 'medium' : 'low',
    daysInStage,
    slaBreached: daysInStage >= 10,
    createdAt: vendor.startDate || new Date().toISOString(),
  };
}

/**
 * Main hook that manages the global state of the Compliance page.
 *
 * Responsibilities:
 * - Manage profiles and each one's associated vetting status
 * - Manage UI state (tabs, modals, loading)
 * - Persist the last active tab
 */
export function useComplianceState() {
  // Main state
  const [state, setState] = useState<ComplianceState>({
    profiles: [],
    vettings: [],
    selectedProfile: null,
    activeTab: readStoredTab(),
    loading: true,
    error: null,
    modals: {
      profileDetail: false,
      documentUpload: false,
    },
    filters: {
      profiles: {
        status: 'all',
        vendor: '',
        role: 'all',
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc',
      },
    },
  });

  // Loads profiles from the same mock data used by the Vendors page
  useEffect(() => {
    const loadData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const vendors = getAllMockVendors();
        const profiles = vendors.map(vendorToProfile);
        const vettings = vendors.map(vendorToVettingRecord);

        setState((prev) => ({
          ...prev,
          profiles,
          vettings,
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load compliance data',
          loading: false,
        }));
      }
    };

    loadData();
  }, []);

  /**
   * Select a profile
   */
  const selectProfile = useCallback((profile: UserProfile | null) => {
    setState((prev) => ({ ...prev, selectedProfile: profile }));
  }, []);

  /**
   * Change active tab and persist it
   */
  const setActiveTab = useCallback((tab: WorkforceTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  }, []);

  /**
   * Open/close the profile detail modal
   */
  const openProfileDetailModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modals: { ...prev.modals, profileDetail: true },
    }));
  }, []);

  const closeProfileDetailModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modals: { ...prev.modals, profileDetail: false },
    }));
  }, []);

  const openDocumentUploadModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modals: { ...prev.modals, documentUpload: true },
    }));
  }, []);

  const closeDocumentUploadModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      modals: { ...prev.modals, documentUpload: false },
    }));
  }, []);

  /**
   * Update Profiles filters
   */
  const updateProfileFilters = useCallback((filters: Partial<ProfileFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        profiles: { ...prev.filters.profiles, ...filters },
      },
    }));
  }, []);

  /**
   * Update a profile (e.g. after a document upload)
   */
  const updateProfile = useCallback((profileId: string, updates: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === profileId
          ? { ...p, ...updates, lastUpdated: new Date().toISOString() }
          : p,
      ),
      selectedProfile:
        prev.selectedProfile?.id === profileId
          ? { ...prev.selectedProfile, ...updates, lastUpdated: new Date().toISOString() }
          : prev.selectedProfile,
    }));
  }, []);

  /**
   * Delete a profile (with confirmation)
   */
  const deleteProfile = useCallback((profileId: string) => {
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.filter((p) => p.id !== profileId),
      selectedProfile:
        prev.selectedProfile?.id === profileId ? null : prev.selectedProfile,
    }));
  }, []);

  return {
    // State
    state,

    // Actions
    selectProfile,
    setActiveTab,

    // Modals
    openProfileDetailModal,
    closeProfileDetailModal,
    openDocumentUploadModal,
    closeDocumentUploadModal,

    // Filters
    updateProfileFilters,

    // CRUD
    updateProfile,
    deleteProfile,
  };
}

export type UseComplianceStateReturn = ReturnType<typeof useComplianceState>;
