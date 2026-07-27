import { UserProfile, VettingRecord, ProfileFilters } from '../../types/compliance';
import { ProfilesList } from './ProfilesList';
import { ProfileDetail } from './ProfileDetail';
import { ProfileFiltersComponent } from './ProfileFilters';

interface ProfilesTabProps {
  profiles: UserProfile[];
  vettings: VettingRecord[];
  selectedProfile: UserProfile | null;
  modalOpen: boolean;
  filters: ProfileFilters;
  actions: {
    onSelectProfile: (profile: UserProfile) => void;
    onOpenProfile: (profile: UserProfile) => void;
    onOpenModal: () => void;
    onCloseModal: () => void;
    onUpdateFilters: (filters: Partial<ProfileFilters>) => void;
    onUpdateProfile: (profileId: string, updates: Partial<UserProfile>) => void;
    isVettingPending: (profileId: string) => boolean;
    getVettingProgress: (profileId: string) => any;
  };
}

/**
 * Profiles tab - lists and manages user profiles
 *
 * Features:
 * - Filtered profile listing
 * - Status and compliance score display
 * - Detail modal with documents and trainings
 * - Conditional redirect to Vetting if incomplete
 */
export function ProfilesTab({
  profiles,
  vettings,
  selectedProfile,
  modalOpen,
  filters,
  actions,
}: ProfilesTabProps) {
  return (
    <div className="profiles-tab-content">
      {/* Filtros */}
      <ProfileFiltersComponent filters={filters} onUpdateFilters={actions.onUpdateFilters} />

      {/* Lista de perfis */}
      <ProfilesList
        profiles={profiles}
        vettings={vettings}
        filters={filters}
        onSelectProfile={actions.onSelectProfile}
        onOpenProfile={actions.onOpenProfile}
        isVettingPending={actions.isVettingPending}
        getVettingProgress={actions.getVettingProgress}
      />

      {/* Modal de detalhe */}
      {selectedProfile && modalOpen && (
        <ProfileDetail
          profile={selectedProfile}
          onClose={actions.onCloseModal}
          onUpdate={actions.onUpdateProfile}
        />
      )}
    </div>
  );
}
