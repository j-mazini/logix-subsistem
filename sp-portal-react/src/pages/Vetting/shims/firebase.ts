// Local stand-in for '@/lib/firebase' — no real Firebase app, no auth.
// `db` is an opaque handle the firestore shim ignores; `auth` exposes a fixed
// local admin identity so audit trails and UI labels keep working.

export const db = { __local: true } as const;

export const auth = {
  currentUser: {
    uid: 'local-admin',
    email: 'admin@local',
    displayName: 'Local Admin',
    photoURL: null as string | null,
    async getIdToken(): Promise<string> {
      return 'local-token';
    },
  },
};
