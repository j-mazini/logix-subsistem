import { useEffect, useMemo, useRef, useState } from 'react';
import { MOCK_DRIVER } from '../../data/driverMockData';
import { calculateAverages, generateMonthData, type Averages, type DayData } from '../mockData';

/**
 * Mock stand-in for the reference app's useCurrentPerformanceData, which
 * fetched `/bff/daily-overview/list/:userId/:month/:year` from a real
 * backend. No backend here: month data is generated deterministically per
 * driver/year/month and cached for the life of the component, with a short
 * simulated loading flicker preserved for UX parity (error state is always
 * null — there's nothing that can fail against mock data).
 */
export function useDriverPerformanceData(year: number, month: number) {
  const today = useRef(new Date()).current;
  const cacheRef = useRef(new Map<string, DayData[]>());

  const [loading, setLoading] = useState(true);

  const monthData = useMemo(() => {
    const key = `${year}-${month}`;
    const cache = cacheRef.current;
    if (!cache.has(key)) {
      cache.set(key, generateMonthData(MOCK_DRIVER.userId, MOCK_DRIVER.servicePartnerName, year, month, today));
    }
    return cache.get(key)!;
  }, [year, month, today]);

  const averages = useMemo<Averages>(() => calculateAverages(monthData), [monthData]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 260);
    return () => clearTimeout(timer);
  }, [year, month]);

  return { monthData, averages, loading, error: null as string | null };
}
