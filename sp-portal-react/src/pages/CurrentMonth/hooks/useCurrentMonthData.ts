import { useState, useEffect, useCallback } from "react";
import { MonthOverview } from "../types";
import { generateMonthOverview } from "../mock/mockCurrentMonthData";

/**
 * Mock stand-in for the Next.js source's `useCurrentMonthData` (which fetches
 * `/bff/daily-overview/list/:userId/:month/:year`). No backend here, so the
 * month is generated locally with a small simulated delay.
 */
export function useCurrentMonthData(year: number, month: number) {
  const [monthData, setMonthData] = useState<MonthOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setMonthData(generateMonthOverview(y, m));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonthData(year, month);
  }, [year, month, fetchMonthData]);

  return { monthData, loading, error };
}
