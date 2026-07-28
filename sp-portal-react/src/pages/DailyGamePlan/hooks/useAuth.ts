import { MOCK_ADMIN_USER } from '../mock/mockMasterData';

/**
 * Mock stand-in for the Next.js app's `useAuth`. This subsystem has no login flow —
 * the Daily Game Plan is always viewed as the single mock admin, who supervises every
 * deposit (see mockDailyGamePlanApi's `getGamePlansForDate`), so Start/Finish and
 * every edit action work for every deposit group in the demo.
 */
export interface AuthUser {
    id: number;
    userTypeId: number;
    fullName: string;
}

export function useAuth(): { user: AuthUser } {
    // Widened to `number` on purpose: BUSINESS_RULES.USER_TYPE.* are frozen literal
    // constants (e.g. ADMIN is exactly `1`), so without this the mock's single fixed
    // admin user would make every `userType === BUSINESS_RULES.USER_TYPE.SUPERVISOR`
    // comparison a TS2367 "no overlap" error — real auth returns a dynamic value here.
    return { user: MOCK_ADMIN_USER };
}
