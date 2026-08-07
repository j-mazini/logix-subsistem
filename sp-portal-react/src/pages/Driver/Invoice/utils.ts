import type { GroupedInvoices, Invoice } from './types';

/**
 * Formats a date string for display.
 * Ported verbatim from the reference `utils.ts` (`formatDate`).
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) {
    return 'N/A';
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return 'N/A';
  }
};

/**
 * Formats a monetary value as GBP currency.
 * Ported verbatim from the reference `utils.ts` (`formatCurrency`).
 */
export const formatCurrency = (amount: number): string => {
  if (!amount || isNaN(amount)) {
    return '£0.00';
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Groups invoices by month, newest invoice first within each month.
 * Ported verbatim from the reference `utils.ts` (`groupInvoicesByMonth`).
 */
export const groupInvoicesByMonth = (invoices: Invoice[]): GroupedInvoices => {
  const grouped: GroupedInvoices = {};

  invoices.forEach((invoice) => {
    const date = new Date(invoice.referenceDate || invoice.invoiceCreatedOn);
    const monthKey = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(invoice);
  });

  Object.keys(grouped).forEach((month) => {
    grouped[month].sort((a, b) => {
      const dateA = new Date(a.referenceDate || a.invoiceCreatedOn);
      const dateB = new Date(b.referenceDate || b.invoiceCreatedOn);
      return dateB.getTime() - dateA.getTime();
    });
  });

  return grouped;
};

/**
 * Sorts month keys (e.g. "Jul 2026") newest first.
 * Ported verbatim from the reference `utils.ts` (`sortMonths`).
 */
export const sortMonths = (groupedInvoices: GroupedInvoices): string[] => {
  const parseMonthYear = (monthYearStr: string) => {
    const [month, year] = monthYearStr.split(' ');
    const monthIndex = MONTH_NAMES.indexOf(month);
    return new Date(parseInt(year, 10), monthIndex, 1);
  };

  return Object.keys(groupedInvoices).sort((a, b) => parseMonthYear(b).getTime() - parseMonthYear(a).getTime());
};
