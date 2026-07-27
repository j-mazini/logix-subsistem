import { ComplianceState } from '../types/compliance';
import { ProfilesTab } from './ProfilesTab/ProfilesTab';
import { AdminCandidateProvider } from '../../Vetting/components/admin/AdminCandidateContext';
import { VettingDashboardPage } from '../../Vetting';
import '../../Vetting/vetting-globals.css';

interface ComplianceTabsProps {
  state: ComplianceState;
  actions: {
    setActiveTab: (tab: 'profiles' | 'vetting') => void;
    selectProfile: (profile: any) => void;
    handleOpenProfile: (profile: any) => void;
    isVettingPending: (profileId: string) => boolean;
    getVettingProgress: (profileId: string) => any;
    openProfileDetailModal: () => void;
    closeProfileDetailModal: () => void;
    updateProfileFilters: (filters: any) => void;
    updateProfile: (profileId: string, updates: any) => void;
  };
}

/**
 * Manages the main tabs of the Compliance page.
 *
 * The "Vetting" tab embeds the real Vetting page (VettingDashboardPage,
 * the same one rendered at /vetting-dashboard) — not a reimplementation —
 * so the verification flow always has a single source of truth.
 */
export function ComplianceTabs({ state, actions }: ComplianceTabsProps) {
  const isVettingTab = state.activeTab === 'vetting';
  return (
    <div className={`compliance-tabs-section${isVettingTab ? ' compliance-tabs-section--full' : ''}`}>
      {/* Tab navigation */}
      <div className="compliance-tabs-nav">
        <button
          className={`tab-button${state.activeTab === 'profiles' ? ' tab-button-active' : ''}`}
          onClick={() => actions.setActiveTab('profiles')}
        >
          <i className="bi bi-people" /> Profiles ({state.profiles.length})
        </button>
        <button
          className={`tab-button${state.activeTab === 'vetting' ? ' tab-button-active' : ''}`}
          onClick={() => actions.setActiveTab('vetting')}
        >
          <i className="bi bi-check-circle" /> Vetting
        </button>
      </div>

      {/* Tab content */}
      <div className={`compliance-tabs-content${state.activeTab === 'vetting' ? ' compliance-tabs-content--full' : ''}`}>
        {state.activeTab === 'profiles' && (
          <ProfilesTab
            profiles={state.profiles}
            vettings={state.vettings}
            selectedProfile={state.selectedProfile}
            modalOpen={state.modals.profileDetail}
            filters={state.filters.profiles}
            actions={{
              onSelectProfile: actions.selectProfile,
              onOpenProfile: actions.handleOpenProfile,
              onOpenModal: actions.openProfileDetailModal,
              onCloseModal: actions.closeProfileDetailModal,
              onUpdateFilters: actions.updateProfileFilters,
              onUpdateProfile: actions.updateProfile,
              isVettingPending: actions.isVettingPending,
              getVettingProgress: actions.getVettingProgress,
            }}
          />
        )}

        {state.activeTab === 'vetting' && (
          <AdminCandidateProvider>
            <div className="vetting-v2-scope compliance-vetting-embed">
              <VettingDashboardPage />
            </div>
          </AdminCandidateProvider>
        )}
      </div>
    </div>
  );
}
