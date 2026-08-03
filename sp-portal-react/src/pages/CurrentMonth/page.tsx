import { useState, useCallback, useMemo } from "react";
import { StandardPageLayout, PageHeroCard, PageSection, PageContent } from "@/app/(private)/components";
import { DayDetails } from "./DayDetails";
import { formatCurrency, getVehicleIcon } from "./utils";
import {
  MonthCarousel,
  SummaryCard,
  InfoGrid,
  EarningsList,
  LoadingState,
  ErrorState,
  NoDataState,
} from "./components";
import { useCurrentMonthData } from "./hooks/useCurrentMonthData";
import { useDayDetails } from "./hooks/useDayDetails";
import { DailyEarning, Operation } from "./types";

export default function CurrentMonthPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const { monthData, loading, error } = useCurrentMonthData(selectedYear, selectedMonth);
  const {
    selectedDays,
    showDayDetails,
    selectedDateName,
    fetchDayDetails,
    handleBack,
  } = useDayDetails();

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
    []
  );

  const handleMonthClick = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  const monthsCarousel = useMemo(() => {
    const months: { year: number; month: number; label: string; isSelected: boolean }[] = [];
    const currentDate = new Date(selectedYear, selectedMonth, 1);

    for (let i = 6; i >= 1; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: `${monthName}/${date.getFullYear()}`,
        isSelected: date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      });
    }

    const monthName = currentDate.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
    months.push({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
      label: `${monthName}/${currentDate.getFullYear()}`,
      isSelected: true
    });

    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleString('en-US', { month: 'short' }).replace('.', '').toUpperCase();
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: `${monthName}/${date.getFullYear()}`,
        isSelected: date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      });
    }

    return months;
  }, [selectedYear, selectedMonth]);

  const calculateDayTotal = useCallback((earning: DailyEarning): string => {
    if (earning.calculatedAmount) {
      return earning.calculatedAmount;
    }

    if (earning.operations && earning.operations.length > 0) {
      const uniqueOperations = earning.operations.reduce(
        (acc: Operation[], current: Operation) => {
          const isDuplicate = acc.find((item) => item.operationId === current.operationId);
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        },
        []
      );

      const total = uniqueOperations.reduce((sum, operation) => {
        return sum + parseFloat(operation.amountTotal || "0");
      }, 0);
      return total.toFixed(2);
    }

    return earning.totalAmount || earning.amount;
  }, []);

  const handleDayClick = useCallback(
    (date: string, dateName: string) => {
      fetchDayDetails(date, dateName);
    },
    [fetchDayDetails]
  );

  const summaryData = useMemo(() => {
    const selectedDate = new Date(selectedYear, selectedMonth, 1);
    const monthName = selectedDate.toLocaleString('en-GB', { month: 'long' });
    const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const summaryMonthLabel = `${monthNameCapitalized}/${selectedYear} Earnings`;

    const totalEarnings = monthData?.currentMonth?.total || 0;
    const daysWorked = monthData?.currentMonth?.daysWorked || 0;
    const avgDaily = monthData?.currentMonth?.averagePerDay || 0;

    return { summaryMonthLabel, totalEarnings, daysWorked, avgDaily };
  }, [selectedYear, selectedMonth, monthData]);

  const reversedEarnings = useMemo(() => {
    if (!monthData?.dailyEarnings) return [];
    return [...monthData.dailyEarnings].reverse();
  }, [monthData?.dailyEarnings]);

  const infoItems = useMemo(() => [
    { label: 'Days Worked', value: summaryData.daysWorked, valueColor: 'neutral' as const },
    { label: 'Avg. Daily', value: currencyFormatter.format(summaryData.avgDaily), valueColor: 'success' as const }
  ], [summaryData.daysWorked, summaryData.avgDaily, currencyFormatter]);

  if (showDayDetails && selectedDateName) {
    return (
      <StandardPageLayout bottomPadding="pb-[clamp(3.5rem,8vh,4.375rem)]">
        <DayDetails selectedDays={selectedDays} selectedDateName={selectedDateName} onBack={handleBack} />
      </StandardPageLayout>
    );
  }

  return (
    <StandardPageLayout bottomPadding="pb-[clamp(3.5rem,8vh,4.375rem)]">
      <PageHeroCard icon="bi-calendar-event" title="Current Month" subtitle="Your earnings for the selected month" accent="amber" />

      <PageSection>
        <MonthCarousel months={monthsCarousel} onMonthClick={handleMonthClick} />
      </PageSection>

      <PageContent>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : !monthData ? (
          <NoDataState />
        ) : (
          <>
            <SummaryCard
              label={summaryData.summaryMonthLabel}
              value={currencyFormatter.format(summaryData.totalEarnings)}
            />

            <InfoGrid items={infoItems} />

            <EarningsList
              earnings={reversedEarnings}
              calculateDayTotal={calculateDayTotal}
              formatCurrency={formatCurrency}
              getVehicleIcon={getVehicleIcon}
              onDayClick={handleDayClick}
            />
          </>
        )}
      </PageContent>
    </StandardPageLayout>
  );
}
