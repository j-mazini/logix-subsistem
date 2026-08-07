import { useEffect, useRef, useState } from 'react';
import type { DayOverviewResponse } from '../types';
import { generateDayOverview } from '../mockData';

/**
 * Local replacement for the reference app's useSubcontractorData hook.
 * That hook fetched `/bff/day-overview/{userId}/{date}` from a real backend;
 * here we synthesize the same shape from deterministic seeded mock data and
 * keep a short artificial delay so the existing LoadingState/transitions
 * still read naturally.
 */
export function useProfileData(date: Date, userId: number, fullName: string) {
  const [data, setData] = useState<DayOverviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timeout = setTimeout(() => {
      if (requestIdRef.current !== requestId) return;

      try {
        const operations = generateDayOverview(date, userId, fullName);
        if (operations.length === 0) {
          setData([]);
          setError('No data available for the selected date');
        } else {
          setData(operations);
          setError(null);
        }
      } catch {
        setData([]);
        setError('No data available for the selected date');
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [date, userId, fullName]);

  return { data, loading, error };
}
