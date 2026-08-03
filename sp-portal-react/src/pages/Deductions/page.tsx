import { useState, useCallback, useMemo } from "react";
import { StandardPageLayout, PageHeroCard, PageSection, PageContent } from "@/app/(private)/components";
import { useDeductions } from "./hooks/useDeductions";
import {
  MonthCarousel,
  SummaryCard,
  DeductionsList,
  ProgressSection,
  ErrorState,
  LoadingState,
} from "./components";
import { deductionsStyles } from "./styles";
import { calculateTotalDeductions } from "./utils";
import { useServicePartners } from "@/hooks/useServicePartners";

export default function DeductionsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const { servicePartners } = useServicePartners();
  // Service Partner filter is admin-only in the source. This subsystem's
  // mock user is always the single driver persona, so it never applies.
  const isAdmin = false;

  const selectedDate = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedYear, selectedMonth]
  );

  const {
    deductions,
    error,
    isLoading,
  } = useDeductions(selectedDate, selectedServicePartnerId !== '' ? Number(selectedServicePartnerId) : undefined);

  const totalDeductions = useMemo(
    () => calculateTotalDeductions(deductions),
    [deductions]
  );

  const installmentProgressItems = useMemo(
    () => deductions.filter(d => (d.totalInstallments || 1) > 1),
    [deductions]
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
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

  const monthLabel = useMemo(() => {
    const monthName = selectedDate.toLocaleString("en-US", { month: "long" });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }, [selectedDate]);

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageHeroCard icon="bi-graph-down-arrow" title="Deductions" subtitle="Deductions applied to your pay" accent="rose" />

      <PageSection>
        <MonthCarousel months={monthsCarousel} onMonthClick={handleMonthClick} />
      </PageSection>

      {isAdmin && servicePartners.length > 0 && (
        <PageSection>
          <div className="flex justify-start px-1 pb-2">
            <select
              value={selectedServicePartnerId}
              onChange={(e) => setSelectedServicePartnerId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-56"
            >
              <option value="">All Service Partners</option>
              {servicePartners.map((sp) => (
                <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                  {sp.partnerName}
                </option>
              ))}
            </select>
          </div>
        </PageSection>
      )}

      <PageContent className={deductionsStyles.pageContent}>
        {error ? (
          <ErrorState error={error} />
        ) : isLoading && deductions.length === 0 ? (
          <LoadingState />
        ) : (
          <>
            {isLoading && (
              <div className={deductionsStyles.loadingBarWrapper}>
                <div
                  className={deductionsStyles.loadingBarInner}
                  style={{ width: "60%" }}
                />
              </div>
            )}
            <SummaryCard
              key={`summary-${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
              monthLabel={monthLabel}
              year={selectedDate.getFullYear()}
              totalDeductions={totalDeductions}
              currencyFormatter={currencyFormatter}
            />

            <DeductionsList
              key={`deductions-${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
              deductions={deductions}
              currencyFormatter={currencyFormatter}
            />

            <ProgressSection
              key={`progress-${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
              installmentProgressItems={installmentProgressItems}
              currencyFormatter={currencyFormatter}
            />
          </>
        )}
      </PageContent>
    </StandardPageLayout>
  );
}
