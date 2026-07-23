'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export const VETTING_OFFICERS = [
  'Sarah Thompson',
  'Michael Chen',
  'Emma Rodriguez',
  'James Wilson',
  'Priya Patel',
];

interface OfficerContextType {
  selectedOfficer: string | null;
  setSelectedOfficer: (officer: string) => void;
  officers: string[];
  isOfficerSelected: boolean;
}

const OfficerContext = createContext<OfficerContextType | undefined>(undefined);

export function OfficerProvider({ children }: { children: ReactNode }) {
  const [selectedOfficer, setSelectedOfficerState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('vetting-selected-officer');
    if (stored && VETTING_OFFICERS.includes(stored)) {
      setSelectedOfficerState(stored);
    }
    setIsLoaded(true);
  }, []);

  const setSelectedOfficer = (officer: string) => {
    if (VETTING_OFFICERS.includes(officer)) {
      setSelectedOfficerState(officer);
      sessionStorage.setItem('vetting-selected-officer', officer);
    }
  };

  if (!isLoaded) return <>{children}</>;

  return (
    <OfficerContext.Provider
      value={{
        selectedOfficer,
        setSelectedOfficer,
        officers: VETTING_OFFICERS,
        isOfficerSelected: !!selectedOfficer,
      }}
    >
      {children}
    </OfficerContext.Provider>
  );
}

export function useOfficer() {
  const context = useContext(OfficerContext);
  if (!context) {
    throw new Error('useOfficer must be used within OfficerProvider');
  }
  return context;
}
