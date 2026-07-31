import { DeductionItem } from './types';

/**
 * Formats a date for display (dd/mm/yy).
 *
 * Uses UTC components to avoid an off-by-one shift: deduction dates represent
 * just the calendar day and are anchored to UTC midday, so formatting in UTC
 * keeps the same day in any timezone.
 */
export const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

/**
 * Returns "YYYY-MM" from a date. Uses UTC components for the same reason as
 * formatDate above — date-only strings parse as UTC midnight, so reading
 * back with local getters shifts the month in any timezone behind UTC (the
 * source's version used local getters here, which is the inverse of what it
 * does one function up, and drops date-only installments into the wrong
 * month depending on the viewer's timezone).
 */
const toMonthYear = (dateString: string): string => {
  const d = new Date(dateString);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * Groups raw deduction installments into one item per deduction plan.
 *
 * Rules:
 * - Grouping is by the deduction's real identity (deductionType + deductionId),
 *   since every installment of the same deduction shares that pair.
 * - The displayed/summed amount for the month is the SUM of every installment
 *   that falls in the selected month.
 * - Each real deduction becomes a single item -> a single progress bar per deduction.
 */
export const processDeductions = (data: DeductionItem[], year: string, month: string): DeductionItem[] => {
  const selectedMonthYear = `${year}-${month}`;
  const endOfSelectedMonth = new Date(Number(year), Number(month), 0);

  const groupedDeductions = data.reduce(
    (acc: { [key: string]: DeductionItem[] }, curr: DeductionItem) => {
      const key = `${curr.deductionType}-${curr.deductionId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(curr);
      return acc;
    },
    {}
  );

  const processedDeductions = Object.entries(groupedDeductions).map(
    ([key, items]) => {
      const sortedItems = [...(items as DeductionItem[])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const currentMonthItems = sortedItems.filter(
        (item) => toMonthYear(item.date) === selectedMonthYear
      );

      const displayItem = currentMonthItems[0] || sortedItems[0];

      const currentMonthAmount = currentMonthItems.reduce(
        (sum, item) => sum + parseFloat(item.amount),
        0
      );

      const totalAmount = sortedItems
        .reduce((sum, item) => sum + parseFloat(item.amount), 0)
        .toFixed(2);

      const totalInstallments = sortedItems.length;

      const currentInstallmentStep = sortedItems.filter(
        (item) => new Date(item.date) <= endOfSelectedMonth
      ).length;

      const hasCurrentMonth = currentMonthItems.length > 0;

      return {
        ...displayItem,
        amount: hasCurrentMonth
          ? currentMonthAmount.toFixed(2)
          : displayItem.amount,
        description: displayItem.description,
        uniqueId: key,
        totalInstallments,
        currentInstallment: hasCurrentMonth ? currentInstallmentStep : 0,
        totalAmount,
      };
    }
  );

  return processedDeductions;
};

export const calculateTotalDeductions = (deductions: DeductionItem[]): number => {
  return deductions.reduce((sum, item) => {
    if (item.currentInstallment === 0) {
      return sum;
    }
    return sum + parseFloat(item.amount);
  }, 0);
};
