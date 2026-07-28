import { useCallback } from 'react';
import {
  UserProfile,
  VettingRecord,
  ConditionalRedirectEvent,
  WorkforceTab,
} from '../types/compliance';

interface UseConditionalRedirectProps {
  vettings: VettingRecord[];
  onTabChange: (tab: WorkforceTab) => void;
  onSelectProfile: (profile: UserProfile | null) => void;
  onOpenProfileDetail: () => void;
}

/**
 * Hook that implements the conditional redirect logic.
 *
 * Business rule:
 * - If the user opens a profile whose Vetting is NOT finished
 *   → auto-redirect to the Vetting tab (the real Vetting page embedded
 *     there is the source of truth for completing the process)
 * - If the Vetting is already finished
 *   → open the profile detail modal normally
 */
export function useConditionalRedirect({
  vettings,
  onTabChange,
  onSelectProfile,
  onOpenProfileDetail,
}: UseConditionalRedirectProps) {
  /**
   * Looks up the Vetting status for a specific profile
   */
  const getVettingStatus = useCallback(
    (profileId: string) => {
      return vettings.find((v) => v.profileId === profileId);
    },
    [vettings],
  );

  /**
   * Main handler for when the user tries to open a profile.
   * Runs the conditional redirect logic.
   */
  const handleOpenProfile = useCallback(
    (profile: UserProfile) => {
      const vettingRecord = getVettingStatus(profile.id);

      // Condition: Vetting is not complete
      if (!vettingRecord || vettingRecord.status !== 'completed') {
        // Emit event for logging/analytics
        const event: ConditionalRedirectEvent = {
          profileId: profile.id,
          vettingId: vettingRecord?.id || 'unknown',
          action: 'redirect',
          reason: vettingRecord
            ? `Vetting status: ${vettingRecord.status}`
            : 'No vetting record found',
        };

        console.log('[Workforce] Conditional redirect triggered:', event);

        // Dispatch a custom event for integration with other pages
        window.dispatchEvent(
          new CustomEvent('compliance-conditional-redirect', {
            detail: event,
          }),
        );

        // Auto-redirect to the Vetting tab
        onSelectProfile(profile);
        onTabChange('vetting');
        return;
      }

      // Normal flow: Vetting is complete
      onSelectProfile(profile);
      onOpenProfileDetail();
    },
    [getVettingStatus, onSelectProfile, onTabChange, onOpenProfileDetail],
  );

  /**
   * Checks whether a profile has Vetting pending
   */
  const isVettingPending = useCallback(
    (profileId: string) => {
      const vetting = getVettingStatus(profileId);
      return !vetting || vetting.status !== 'completed';
    },
    [getVettingStatus],
  );

  /**
   * Returns progress info about the Vetting
   */
  const getVettingProgress = useCallback(
    (profileId: string) => {
      const vetting = getVettingStatus(profileId);
      if (!vetting) return null;

      const completed = vetting.checklist.filter((item) => item.completed).length;
      const total = vetting.checklist.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        completed,
        total,
        percentage,
        status: vetting.status,
        isPending: vetting.status !== 'completed',
      };
    },
    [getVettingStatus],
  );

  return {
    handleOpenProfile,
    isVettingPending,
    getVettingProgress,
    getVettingStatus,
  };
}

export type UseConditionalRedirectReturn = ReturnType<typeof useConditionalRedirect>;
