import { useMemo } from 'react';
import { UserProfile, VettingRecord, ProfileFilters } from '../../types/compliance';
import { ProfileCard } from './ProfileCard';

interface ProfilesListProps {
  profiles: UserProfile[];
  vettings: VettingRecord[];
  filters: ProfileFilters;
  onSelectProfile: (profile: UserProfile) => void;
  onOpenProfile: (profile: UserProfile) => void;
  isVettingPending: (profileId: string) => boolean;
  getVettingProgress: (profileId: string) => any;
}

/**
 * Filtered grid of profiles
 */
export function ProfilesList({
  profiles,
  vettings,
  filters,
  onSelectProfile,
  onOpenProfile,
  isVettingPending,
  getVettingProgress,
}: ProfilesListProps) {
  // Aplicar filtros
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    // Filtro por status
    if (filters.status !== 'all') {
      result = result.filter((p) => p.vettingStatus === filters.status);
    }

    // Filtro por vendor
    if (filters.vendor) {
      result = result.filter((p) => p.vendor.toLowerCase().includes(filters.vendor.toLowerCase()));
    }

    // Filtro por role
    if (filters.role !== 'all') {
      result = result.filter((p) => p.role === filters.role);
    }

    // Filtro por busca
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.includes(q),
      );
    }

    // Sorting
    result.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'date':
          compareValue = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'score':
          compareValue = b.complianceScore - a.complianceScore;
          break;
        case 'status':
          compareValue = a.vettingStatus.localeCompare(b.vettingStatus);
          break;
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [profiles, filters]);

  const handleProfileClick = (profile: UserProfile) => {
    onSelectProfile(profile);
    // Trigger conditional redirect
    onOpenProfile(profile);
  };

  if (filteredProfiles.length === 0) {
    return (
      <div className="profiles-list-empty">
        <p>
          <i className="bi bi-inbox" /> No profiles found
        </p>
      </div>
    );
  }

  return (
    <div className="profiles-list-container">
      <div className="profiles-list-grid">
        {filteredProfiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isVettingPending={isVettingPending(profile.id)}
            vettingProgress={getVettingProgress(profile.id)}
            onClick={() => handleProfileClick(profile)}
          />
        ))}
      </div>
    </div>
  );
}
