import { useState, useCallback } from "react";
import { DailyOverview } from "../types";
import { generateDayOperations } from "../mock/mockCurrentMonthData";

/**
 * Mock stand-in for the Next.js source's `useDayDetails` (which fetches
 * `/bff/daily-overview/:userId/:year/:month/:day`). Generates the same
 * deterministic operation the month list already showed for that date.
 */
export function useDayDetails() {
  const [selectedDays, setSelectedDays] = useState<DailyOverview[]>([]);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [selectedDateName, setSelectedDateName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const fetchDayDetails = useCallback(async (date: string, dateName: string) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    setSelectedDays(generateDayOperations(date, dateName));
    setSelectedDateName(dateName);
    setShowDayDetails(true);
    setLoading(false);
  }, []);

  const handleBack = useCallback(() => {
    setShowDayDetails(false);
    setSelectedDays([]);
    setSelectedDateName("");
  }, []);

  return {
    selectedDays,
    showDayDetails,
    selectedDateName,
    loading,
    error,
    fetchDayDetails,
    handleBack,
  };
}
