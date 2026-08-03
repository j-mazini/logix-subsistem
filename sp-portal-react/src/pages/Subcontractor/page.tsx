import { useMemo, useCallback } from "react";
import { StandardPageLayout, PageHeader, PageHeroCard, PageSection, PageContent } from "@/app/(private)/components";
import { useDateStore } from "@/lib/date-store";
import { MonthSelector } from "./components/MonthSelector";
import { DaysCarousel } from "./components/DaysCarousel";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { OperationsList } from "./components/OperationsList";
import { useSubcontractorData } from "./hooks/useSubcontractorData";
import { subcontractorStyles } from "./styles";

export default function SubcontractorPage() {
  const { selectedDate: storedDate, setSelectedDate: setDate } = useDateStore();

  const date = useMemo(() => {
    try {
      const d = storedDate instanceof Date ? storedDate : new Date(storedDate);
      if (isNaN(d.getTime())) {
        return new Date();
      }
      return d;
    } catch {
      return new Date();
    }
  }, [storedDate]);

  const { data, loading, error } = useSubcontractorData(date);

  const handlePrevMonth = useCallback(() => {
    const prev = new Date(date);
    prev.setMonth(prev.getMonth() - 1);
    prev.setDate(1);
    setDate(prev);
  }, [date, setDate]);

  const handleNextMonth = useCallback(() => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    setDate(next);
  }, [date, setDate]);

  const handleDateSelect = useCallback(
    (selectedDate: Date) => {
      setDate(selectedDate);
    },
    [setDate]
  );

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageHeader alignHeader="between">
        <MonthSelector
          date={date}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      </PageHeader>
      <PageHeroCard icon="bi-clipboard-data" title="Operations" subtitle="Your daily operations & payment breakdown" accent="slate" />

      <PageSection>
        <DaysCarousel
          date={date}
          loading={loading}
          hasData={data.length > 0}
          hasError={!!error}
          onDateSelect={handleDateSelect}
        />
      </PageSection>

      <PageContent className={subcontractorStyles.pageContent}>
        {loading ? (
          <LoadingState />
        ) : data.length > 0 ? (
          <OperationsList operations={data} />
        ) : (
          <ErrorState message={error || "No data available for the selected date"} />
        )}
      </PageContent>
    </StandardPageLayout>
  );
}
