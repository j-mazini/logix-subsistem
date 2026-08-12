import type { DeductionItem } from './types';

/**
 * Formats a date for display (dd/mm/yy).
 *
 * Uses UTC components to avoid an off-by-one shift: deduction dates represent
 * a calendar day only and are anchored at UTC noon by the mock generator, so
 * formatting in UTC keeps the same day in any timezone.
 */
export const formatDate = (dateString: string): string => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

/** Returns "YYYY-MM" for a date string. */
const toMonthYear = (dateString: string): string => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Groups raw deduction records into one display item per real deduction.
 *
 * Rules (ported verbatim from the reference app):
 * - Grouping uses the deduction's real identity (deductionType + deductionId),
 *   since every instalment of a plan shares that pair.
 * - The displayed/summed amount for the month is the SUM of every instalment
 *   that falls in the selected month (fixes multiple items on the same
 *   day/month not being added together).
 * - Each real deduction becomes a single item -> a single progress bar.
 */
export const processDeductions = (data: DeductionItem[], year: string, month: string): DeductionItem[] => {
  const selectedMonthYear = `${year}-${month}`;
  // Last day of the selected month (month is 1-based).
  const endOfSelectedMonth = new Date(Number(year), Number(month), 0);

  const groupedDeductions = data.reduce((acc: Record<string, DeductionItem[]>, curr) => {
    const key = `${curr.deductionType}-${curr.deductionId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  return Object.entries(groupedDeductions).map(([key, items]) => {
    const sortedItems = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const currentMonthItems = sortedItems.filter((item) => toMonthYear(item.date) === selectedMonthYear);
    const displayItem = currentMonthItems[0] || sortedItems[0];

    const currentMonthAmount = currentMonthItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalAmount = sortedItems.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2);
    const totalInstallments = sortedItems.length;
    const currentInstallmentStep = sortedItems.filter((item) => new Date(item.date) <= endOfSelectedMonth).length;
    const hasCurrentMonth = currentMonthItems.length > 0;

    return {
      ...displayItem,
      amount: hasCurrentMonth ? currentMonthAmount.toFixed(2) : displayItem.amount,
      description: displayItem.description,
      uniqueId: key,
      totalInstallments,
      currentInstallment: hasCurrentMonth ? currentInstallmentStep : 0,
      totalAmount,
    };
  });
};

/** Sums the deductions that actually land in the selected month. */
export const calculateTotalDeductions = (deductions: DeductionItem[]): number => {
  return deductions.reduce((sum, item) => {
    if (item.currentInstallment === 0) return sum;
    return sum + parseFloat(item.amount);
  }, 0);
};
