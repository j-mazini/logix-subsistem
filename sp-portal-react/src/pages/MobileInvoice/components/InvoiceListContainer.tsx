import { memo, useMemo } from "react";
import { Invoice } from "../types";
import { groupInvoicesByMonth, sortMonths } from "../utils";
import { InvoiceMonthSection } from "../InvoiceMonthSection";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";

interface InvoiceListContainerProps {
  invoices: Invoice[];
  isLoading: boolean;
  onView: (invoiceId: number) => void;
  onDownload: (invoiceId: number) => void;
}

export const InvoiceListContainer = memo(function InvoiceListContainer({
  invoices,
  isLoading,
  onView,
  onDownload,
}: InvoiceListContainerProps) {
  const groupedInvoices = useMemo(() => groupInvoicesByMonth(invoices), [invoices]);
  const sortedMonths = useMemo(() => sortMonths(groupedInvoices), [groupedInvoices]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (sortedMonths.length === 0) {
    return <EmptyState message="No invoices found." icon="bi-inbox" />;
  }

  return (
    <div>
      {sortedMonths.map((month) => (
        <InvoiceMonthSection
          key={month}
          month={month}
          invoices={groupedInvoices[month]}
          onView={onView}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
});
