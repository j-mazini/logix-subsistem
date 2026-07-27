import { useState } from 'react';
import { ScannerEvent } from '../types';
import { MOCK_SCANNER_EVENTS } from '../mock-data';

/**
 * Feed dos eventos mais recentes, do mais novo para o mais antigo.
 *
 * Sem intervalo: o pool mock é estático, por isso um setInterval só criaria uma
 * nova identidade de array com o mesmo conteúdo — re-render inútil que fazia o
 * auto-scroll do feed disparar de 2 em 2 segundos. Quando houver stream real,
 * acrescentar aqui os eventos novos ao início do array.
 */
export function useScannerEvents() {
  const [events] = useState<ScannerEvent[]>(() => MOCK_SCANNER_EVENTS.slice(0, 20));

  return { events, isLoading: false };
}
