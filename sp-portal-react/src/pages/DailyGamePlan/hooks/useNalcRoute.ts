import { ROUTE_NOT_ALLOCATED } from '../mock/mockMasterData';

/** Mock stand-in for the Next.js app's `useNalcRoute` (React Query + real API). */
export function useNalcRoute(_options?: { enabled?: boolean }) {
    return { data: { routeId: ROUTE_NOT_ALLOCATED.routeId, routeName: ROUTE_NOT_ALLOCATED.routeName } };
}
