/**
 * Mock stand-in for the Next.js source app's global `useAuth`/`lib/auth` token
 * helpers. This subsystem has no login flow — every driver-facing page under
 * app/(private) is always viewed as the single mock courier below.
 */
export const USER_TYPE = Object.freeze({
  ADMIN: 1,
  DRIVER: 2,
  SUPERVISOR: 3,
});

export interface MockDriverUser {
  id: number;
  userTypeId: number;
  fullName: string;
  companyName: string;
}

export const MOCK_DRIVER_USER: MockDriverUser = {
  id: 101,
  userTypeId: USER_TYPE.DRIVER,
  fullName: 'Sam Carter',
  companyName: 'Atlas Transport',
};

export function useAuth(): { user: MockDriverUser } {
  return { user: MOCK_DRIVER_USER };
}

export function getFullNameFromToken(): string {
  return MOCK_DRIVER_USER.fullName;
}

export function getUserIdFromToken(): number {
  return MOCK_DRIVER_USER.id;
}

export function removeToken() {
  // No-op: no real session to clear in this subsystem.
}

export function hasAuthSession(): boolean {
  return true;
}
