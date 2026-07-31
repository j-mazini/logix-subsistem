import { useCallback, useMemo, useState } from "react";
import { fetchScheduleForWeek, getWeekStart, toISODate } from "../mock/mockMyScheduleData";
import type { ScheduleViewMode } from "../types";

export function useMySchedule() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("day");

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => fetchScheduleForWeek(weekStart), [weekStart]);

  const selectedDateISO = useMemo(() => toISODate(selectedDate), [selectedDate]);
  const selectedDay = useMemo(
    () => weekDays.find((d) => d.date === selectedDateISO) ?? weekDays[0],
    [weekDays, selectedDateISO]
  );

  const isCurrentWeek = useMemo(
    () => toISODate(getWeekStart(today)) === toISODate(weekStart),
    [today, weekStart]
  );

  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => setSelectedDate(new Date()), []);

  const selectDate = useCallback((d: Date) => setSelectedDate(d), []);

  return {
    viewMode,
    setViewMode,
    weekStart,
    weekDays,
    selectedDate,
    selectedDateISO,
    selectedDay,
    isCurrentWeek,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    selectDate,
  };
}
