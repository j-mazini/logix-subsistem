import { useState, useEffect, useCallback } from "react";
import { processMonthData, calculateAverages, DayData } from "../dataProcessor";
import { getTimeWindowClass, getSporHClass } from "../utils";
import { generatePerformanceMonthOverview } from "../mock/mockCurrentPerformanceData";

/**
 * Mock stand-in for the Next.js source's `useCurrentPerformanceData` (which
 * fetches `/bff/daily-overview/list/:userId/:month/:year`). No backend here,
 * so the month is generated locally and run through the same processor.
 */
export function useCurrentPerformanceData(year: number, month: number) {
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [averages, setAverages] = useState({
    avgTw: "--:--",
    avgSpr: "--:--",
    avgSporH: "--:--",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const fetchMonthData = useCallback(async (y: number, m: number) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const data = generatePerformanceMonthOverview(y, m);
    const today = new Date();

    const mappedData = processMonthData(data, y, m, today, getSporHClass, getTimeWindowClass);
    setMonthData(mappedData);
    setAverages(calculateAverages(mappedData));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMonthData(year, month);
  }, [year, month, fetchMonthData]);

  return { monthData, averages, loading, error };
}
