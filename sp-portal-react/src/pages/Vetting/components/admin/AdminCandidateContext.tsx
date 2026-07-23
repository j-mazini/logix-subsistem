'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Shared "current applicant" selection for the admin area.
 * The AdminNavbar select writes here; the checklist and knowledge-test
 * pages read it to switch the candidate they display.
 */
interface AdminCandidateContextValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const AdminCandidateContext = createContext<AdminCandidateContextValue | null>(null);

export function AdminCandidateProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <AdminCandidateContext.Provider value={{ selectedId, setSelectedId }}>
      {children}
    </AdminCandidateContext.Provider>
  );
}

export function useAdminCandidate() {
  const ctx = useContext(AdminCandidateContext);
  if (!ctx) throw new Error('useAdminCandidate must be used within AdminCandidateProvider');
  return ctx;
}
