import { Invoice, GroupedInvoices } from './types';

export const formatDate = (dateString: string | null): string => {
  if (!dateString) {
    return "N/A";
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "N/A";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  } catch {
    return "N/A";
  }
};

export const formatCurrency = (amount: number): string => {
  if (!amount || isNaN(amount)) {
    return "£0.00";
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const groupInvoicesByMonth = (invoices: Invoice[]): GroupedInvoices => {
  const grouped: GroupedInvoices = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  invoices.forEach((invoice) => {
    const date = new Date(invoice.referenceDate || invoice.invoiceCreatedOn);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

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

export const sortMonths = (groupedInvoices: GroupedInvoices): string[] => {
  const parseMonthYear = (monthYearStr: string) => {
    const [month, year] = monthYearStr.split(' ');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = monthNames.indexOf(month);
    return new Date(parseInt(year), monthIndex, 1);
  };

  return Object.keys(groupedInvoices).sort((a, b) => {
    return parseMonthYear(b).getTime() - parseMonthYear(a).getTime();
  });
};
