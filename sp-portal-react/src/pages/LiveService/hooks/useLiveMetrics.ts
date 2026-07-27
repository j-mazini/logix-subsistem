import { useState, useEffect } from 'react';
import { LiveMetrics, ExceptionReason } from '../types';
import { MOCK_DELIVERIES, MOCK_SCANNER_EVENTS, MOCK_EXCEPTIONS } from '../mock-data';

/** Média, em minutos, do intervalo entre scans consecutivos da mesma jornada. */
function averageMinutesBetweenScans(): number {
  const ONE_HOUR_MS = 3_600_000;
  let total = 0;
  let samples = 0;

  for (let i = 0; i < MOCK_SCANNER_EVENTS.length - 1; i++) {
    const gap = Math.abs(
      new Date(MOCK_SCANNER_EVENTS[i].timestamp).getTime() -
        new Date(MOCK_SCANNER_EVENTS[i + 1].timestamp).getTime()
    );
    // Saltos acima de 1h são mudança de turno, não tempo de parada.
    if (gap < ONE_HOUR_MS) {
      total += gap;
      samples++;
    }
  }

  return samples > 0 ? total / samples / 60_000 : 0;
}

function countByReason(reason: ExceptionReason): number {
  return MOCK_EXCEPTIONS.filter(e => e.reason === reason).length;
}

function buildMetrics(): LiveMetrics {
  const total = MOCK_DELIVERIES.length;
  const delivered = MOCK_DELIVERIES.filter(d => d.status === 'delivered').length;

  return {
    totalToday: total,
    percentComplete: total > 0 ? Math.round((delivered / total) * 100) : 0,
    delivered,
    // As falhas derivam do motivo registado na exceção — o campo `note` é texto
    // livre e não é fonte fiável para contagem.
    absent: countByReason('absent'),
    wrongAddress: countByReason('wrong_address'),
    unreachable: countByReason('unreachable'),
    damaged: countByReason('damaged'),
    refused: countByReason('refused'),
    avgTimePerStop: Math.round(averageMinutesBetweenScans() * 100) / 100,
    lastUpdated: new Date().toISOString(),
  };
}

export function useLiveMetrics() {
  const [metrics, setMetrics] = useState<LiveMetrics>(buildMetrics);
  const [isLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({ ...prev, lastUpdated: new Date().toISOString() }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { metrics, isLoading };
}
