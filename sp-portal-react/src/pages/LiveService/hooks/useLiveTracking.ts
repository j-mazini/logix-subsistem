import { useState, useEffect } from 'react';
import { Deliverer } from '../types';
import { MOCK_DELIVERERS } from '../mock-data';

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0xdead);
const randFloat = (min: number, max: number): number => min + rng() * (max - min);

export function useLiveTracking() {
  const [deliverers, setDeliverers] = useState<Deliverer[]>(MOCK_DELIVERERS);
  const [isLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDeliverers(prev =>
        prev.map(d => ({
          ...d,
          latitude: d.latitude + randFloat(-0.001, 0.001),
          longitude: d.longitude + randFloat(-0.001, 0.001),
          lastUpdate: new Date().toISOString(),
          // ~0.75%/min com piso em 5: a descarga tem de ser visível ao longo de
          // uma sessão sem esgotar a frota inteira em poucos minutos.
          batteryLevel: Math.max(5, d.batteryLevel - randFloat(0, 0.05)),
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { deliverers, isLoading };
}
