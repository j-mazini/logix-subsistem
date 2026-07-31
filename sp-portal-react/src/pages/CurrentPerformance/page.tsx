import { useState, useCallback, useMemo } from "react";
import { StandardPageLayout, PageHeader, PageHeroCard, PageSection, PageContent } from "@/app/(private)/components";
import { MonthCarousel } from "./components/MonthCarousel";
import { MonthlyAverages } from "./components/MonthlyAverages";
import { DailyBreakdownTable } from "./components/DailyBreakdownTable";
import { useCurrentPerformanceData } from "./hooks/useCurrentPerformanceData";

export default function CurrentPerformancePage() {
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());

  const { monthData, averages, loading, error } = useCurrentPerformanceData(
    selectedYear,
    selectedMonth
  );

  const handleMonthSelect = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageHeader alignHeader="right" />
      <PageHeroCard icon="bi-bar-chart-line" title="Performance" subtitle="Monthly averages & daily breakdown" accent="emerald" />

      <PageSection>
        <MonthCarousel
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onMonthSelect={handleMonthSelect}
          today={today}
        />
      </PageSection>

      <PageContent>
        <MonthlyAverages averages={averages} />

        <DailyBreakdownTable monthData={monthData} loading={loading} error={error} />
      </PageContent>
    </StandardPageLayout>
  );
}
