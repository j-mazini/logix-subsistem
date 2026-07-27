import { useState, useCallback } from 'react';
import { Exception } from '../types';
import { MOCK_EXCEPTIONS } from '../mock-data';

/**
 * Fila de exceções ativas.
 *
 * Sem intervalo: as exceções só mudam por ação do admin (resolver). Um
 * setInterval a fazer `[...prev]` apenas forçaria re-renders sem alterar nada.
 */
export function useLiveExceptions() {
  const [exceptions, setExceptions] = useState<Exception[]>(MOCK_EXCEPTIONS);

  const resolveException = useCallback((id: string) => {
    setExceptions(prev => prev.map(e => (e.id === id ? { ...e, resolved: true } : e)));
  }, []);

  return { exceptions, resolveException, isLoading: false };
}
