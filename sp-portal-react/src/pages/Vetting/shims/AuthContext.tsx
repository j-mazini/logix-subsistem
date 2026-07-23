// Local stand-in for '@/context/AuthContext' — always authenticated as a
// fixed local admin, so none of the login/redirect branches ever trigger.

import type { ReactNode } from 'react';

const LOCAL_USER = {
  uid: 'local-admin',
  email: 'admin@local',
  displayName: 'Local Admin',
  photoURL: null as string | null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return {
    user: LOCAL_USER,
    isAuthenticated: true,
    loading: false,
    signOut: async () => {},
  };
}
