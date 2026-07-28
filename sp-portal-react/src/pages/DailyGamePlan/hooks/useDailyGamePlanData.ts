import { MOCK_ROUTES, MOCK_VEHICLES, MOCK_VENDORS } from '../mock/mockMasterData';

/**
 * Mock stand-in for the Next.js app's `useDailyGamePlanData` (which wraps three
 * React Query calls). This subsystem has no backend and no React Query provider, so
 * the master lists are returned directly — they're static/deterministic, no loading
 * flicker needed (only the per-date operations in the mock API layer simulate a
 * network delay).
 */
export function useDailyGamePlanData(_date: string) {
    return {
        vehicles: { data: MOCK_VEHICLES, isLoading: false },
        vendors: { data: MOCK_VENDORS, isLoading: false },
        routes: { data: MOCK_ROUTES, isLoading: false },
    };
}
