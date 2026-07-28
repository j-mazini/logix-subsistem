import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  ComplianceState,
  UserProfile,
  ProfileFilters,
  WorkforceTab,
  isWorkforceTab,
} from '../types/compliance';
import * as workforce from '../../../services/workforceService';

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

  // O roster vem do WorkforceService, não de uma leitura própria do mock:
  // é o que faz uma edição na aba Vendors aparecer aqui sem recarregar.
  const rosterSnapshot = useSyncExternalStore(workforce.subscribe, workforce.getSnapshot);

  const derived = useMemo(
    () => ({
      profiles: rosterSnapshot.vendors.map(workforce.toProfile),
      vettings: rosterSnapshot.vendors.map(workforce.toVettingRecord),
    }),
    [rosterSnapshot],
  );

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      profiles: derived.profiles,
      vettings: derived.vettings,
      loading: false,
      error: null,
    }));
  }, [derived]);

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
