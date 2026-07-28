import { ComplianceState, WorkforceTab } from '../Compliance/types/compliance';
import { ProfilesTab } from '../Compliance/components/ProfilesTab/ProfilesTab';
import { VendorsContent } from '../Vendors/Vendors';
import { AdminCandidateProvider } from '../Vetting/components/admin/AdminCandidateContext';
import { VettingDashboardPage } from '../Vetting';
import '../Vetting/vetting-globals.css';

interface WorkforceTabsProps {
  state: ComplianceState;
  vendorCount: number;
  actions: {
    setActiveTab: (tab: WorkforceTab) => void;
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

interface TabSpec {
  id: WorkforceTab;
  icon: string;
  label: string;
  /** Sufixo de contagem, quando a aba tem um total útil para mostrar. */
  count?: number;
}

/**
 * As três abas da Workforce.
 *
 * Nenhuma delas é uma reimplementação: `vendors` monta o corpo do antigo
 * ecrã de Vendors e `vetting` monta a página real de Vetting (a mesma que
 * respondia em /vetting-dashboard), para que cada fluxo continue a ter uma
 * única fonte de verdade.
 */
export function WorkforceTabs({ state, vendorCount, actions }: WorkforceTabsProps) {
  const tabs: TabSpec[] = [
    { id: 'vendors', icon: 'bi-person-fill', label: 'Vendors', count: vendorCount },
    { id: 'compliance', icon: 'bi-shield-check', label: 'Compliance', count: state.profiles.length },
    { id: 'vetting', icon: 'bi-check-circle', label: 'Vetting' },
  ];

  // Vendors e Vetting trazem as suas próprias larguras e cabeçalhos; só a aba
  // de Compliance vive dentro do contentor estreito original.
  const isFullWidth = state.activeTab !== 'compliance';

  return (
    <div className={`compliance-tabs-section${isFullWidth ? ' compliance-tabs-section--full' : ''}`}>
      <div className="compliance-tabs-nav" role="tablist" aria-label="Workforce sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={state.activeTab === tab.id}
            className={`tab-button${state.activeTab === tab.id ? ' tab-button-active' : ''}`}
            onClick={() => actions.setActiveTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" /> {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        ))}
      </div>

      <div className={`compliance-tabs-content${isFullWidth ? ' compliance-tabs-content--full' : ''}`}>
        {state.activeTab === 'vendors' && <VendorsContent />}

        {state.activeTab === 'compliance' && (
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
