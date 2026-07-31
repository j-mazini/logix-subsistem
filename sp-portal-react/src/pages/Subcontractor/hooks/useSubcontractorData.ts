import { useState, useEffect, useCallback, useRef } from "react";
import { DayOverviewResponse } from "../types";
import { generateSubcontractorDay } from "../mock/mockSubcontractorData";

/**
 * Mock stand-in for the Next.js source's `useSubcontractorData` (which fetches
 * `/bff/day-overview/:userId/:date?metrics=revenue`). No backend here, so the
 * day is generated locally with a small simulated delay.
 */
export function useSubcontractorData(date: Date) {
  const [data, setData] = useState<DayOverviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchDayOverview = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const operations = generateSubcontractorDay(date);
    if (operations.length === 0) {
      setData([]);
      setError("No data available for the selected date");
    } else {
      setData(operations);
      setError(null);
    }
    setLoading(false);
    fetchingRef.current = false;
  }, [date]);

  useEffect(() => {
    void fetchDayOverview();
  }, [fetchDayOverview]);

  return { data, loading, error };
}
