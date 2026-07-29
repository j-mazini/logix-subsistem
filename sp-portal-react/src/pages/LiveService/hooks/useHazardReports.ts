import { useCallback, useState } from 'react';
import { HazardReport, HazardType } from '../types';
import { MOCK_HAZARDS } from '../mock-data';

/**
 * Relatos de campo dos entregadores (rua fechada, acidente etc.) plotados no
 * mapa. Sem intervalo: só mudam por ação do usuário (adicionar/limpar).
 */
export function useHazardReports() {
  const [hazards, setHazards] = useState<HazardReport[]>(MOCK_HAZARDS);

  const addHazard = useCallback((type: HazardType, lat: number, lng: number, reportedBy = 'Dispatcher') => {
    const report: HazardReport = {
      id: `hazard-${Date.now()}`,
      type,
      lat,
      lng,
      reportedBy,
      createdAt: new Date().toISOString(),
    };
    setHazards(prev => [report, ...prev]);
  }, []);

  const removeHazard = useCallback((id: string) => {
    setHazards(prev => prev.filter(h => h.id !== id));
  }, []);

  return { hazards, addHazard, removeHazard };
}
