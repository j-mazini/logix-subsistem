import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { hasAuthSession } from "@/app/(private)/mockAuth";
import { useDateStore } from "@/lib/date-store";
import { StandardPageLayout, PageHeader, PageSection, PageContent } from "@/app/(private)/components";
import { DailyPerformanceData } from "./types";
import { DaysCarousel } from "./DaysCarousel";
import { OperationCard } from "./OperationCard";
import { MonthSelector } from "./components/MonthSelector";
import { generateDailyPerformance } from "./mock/mockDailyPerformanceData";
import { dailyPerformanceInsightStyles } from "./styles";

export default function DailyPerformanceInsight() {
  const navigate = useNavigate();
  const { selectedDate: storedDate, setSelectedDate } = useDateStore();
  const [performanceData, setPerformanceData] = useState<DailyPerformanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const selectedDate = useMemo(() => {
    const date = storedDate instanceof Date ? storedDate : new Date(storedDate);
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  }, [storedDate]);

  useEffect(() => {
    if (!hasAuthSession()) {
      navigate('/home');
    }
  }, [navigate]);

  const displayMonth = useMemo(() => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }, [selectedDate]);

  const fetchDailyPerformance = useCallback(async (dateToFetch: Date) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setPerformanceData(generateDailyPerformance(dateToFetch));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDailyPerformance(selectedDate);
  }, [selectedDate, fetchDailyPerformance]);

  const handlePrevMonth = useCallback(() => {
    const prev = new Date(selectedDate);
    prev.setMonth(prev.getMonth() - 1);
    prev.setDate(1);
    setSelectedDate(prev);
  }, [selectedDate, setSelectedDate]);

  const handleNextMonth = useCallback(() => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    setSelectedDate(next);
  }, [selectedDate, setSelectedDate]);

  const handleDayClick = useCallback((day: number) => {
    const newDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    setSelectedDate(newDate);
  }, [displayMonth, setSelectedDate]);

  const renderContent = useMemo(() => {
    if (loading) {
      return (
        <div className={dailyPerformanceInsightStyles.loadingContainer}>
          <div className="flex items-center gap-2">
            <i className={dailyPerformanceInsightStyles.loadingSpinner}></i>
            <span className={dailyPerformanceInsightStyles.loadingText}>Loading data...</span>
          </div>
        </div>
      );
    }

    if (performanceData.length === 0) {
      return (
        <div className={dailyPerformanceInsightStyles.emptyStateContainer}>
          <i className={dailyPerformanceInsightStyles.emptyStateIcon}></i>
          <span className={dailyPerformanceInsightStyles.emptyStateText}>No data available for the selected date.</span>
        </div>
      );
    }

    return performanceData.map((operation, index) => (
      <OperationCard
        key={operation.operationId || `operation-${index}`}
        operation={operation}
        index={index}
        totalOperations={performanceData.length}
      />
    ));
  }, [loading, performanceData]);

  return (
    <StandardPageLayout bottomPadding="pb-[100px]">
      <PageHeader alignHeader="between">
        <MonthSelector
          displayMonth={displayMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      </PageHeader>

      <PageSection>
        <DaysCarousel
          displayMonth={displayMonth}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          hasNoData={!loading && performanceData.length === 0}
          isLoading={loading}
        />
      </PageSection>

      <PageContent className={dailyPerformanceInsightStyles.pageContent}>
        {renderContent}
      </PageContent>
    </StandardPageLayout>
  );
}
