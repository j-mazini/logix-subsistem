import React from "react";
import { Invoice } from "./types";
import { InvoiceItem } from "./InvoiceItem";
import { EmptyState } from "./components/EmptyState";
import { mobileInvoiceStyles } from "./styles";

interface InvoiceMonthSectionProps {
  month: string;
  invoices: Invoice[];
  onView: (invoiceId: number) => void;
  onDownload: (invoiceId: number) => void;
}

const InvoiceMonthSectionComponent: React.FC<InvoiceMonthSectionProps> = ({
  month,
  invoices,
  onView,
  onDownload,
}) => {
  const [monthName, monthYear] = month.split(" ");

  return (
    <div>
      <h3 className={mobileInvoiceStyles.monthHeader}>
        <i className={mobileInvoiceStyles.monthHeaderIcon} />
        <span className={mobileInvoiceStyles.monthHeaderMonthWrap}>
          <span>{monthName}</span>
          <span className={mobileInvoiceStyles.monthHeaderYear}>{monthYear}</span>
        </span>
      </h3>

      {invoices.length === 0 ? (
        <EmptyState message="No invoices for this month." />
      ) : (
        <div>
          {invoices.map((invoice) => (
            <InvoiceItem
              key={invoice.invoiceId}
              invoice={invoice}
              onView={onView}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const InvoiceMonthSection = React.memo(InvoiceMonthSectionComponent);
