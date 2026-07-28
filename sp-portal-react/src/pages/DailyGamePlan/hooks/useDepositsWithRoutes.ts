import { MOCK_DEPOSITS } from '../mock/mockMasterData';
import type { DepositWithRoutesFullDTO } from '../utils/mappers';

/** Mock stand-in for the Next.js app's `useDepositsWithRoutes` (React Query + real API). */
export function useDepositsWithRoutes(_options?: { enabled?: boolean }) {
    const data: DepositWithRoutesFullDTO[] = MOCK_DEPOSITS.map((d) => ({
        depositId: d.depositId,
        depositName: d.depositName,
        isPhysical: d.isPhysical,
        routes: d.routes.map((r) => ({
            routeId: r.routeId,
            routeName: r.routeName,
            active: true,
            customerId: 0,
            depositId: d.depositId,
            serviceTypeId: 0,
            isFlex: r.isFlex,
        })),
    }));
    return { data, isLoading: false };
}
