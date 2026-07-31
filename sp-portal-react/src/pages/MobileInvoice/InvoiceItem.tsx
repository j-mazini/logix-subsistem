import React from "react";
import { Invoice } from "./types";
import { formatDate, formatCurrency } from './utils';
import { InvoiceActionButton } from './components/InvoiceActionButton';
import { AnimatedCurrency } from './components/AnimatedCurrency';
import { mobileInvoiceStyles } from './styles';

interface InvoiceItemProps {
  invoice: Invoice;
  onView: (invoiceId: number) => void;
  onDownload: (invoiceId: number) => void;
}

const InvoiceItemComponent: React.FC<InvoiceItemProps> = ({
  invoice,
  onView,
  onDownload,
}) => {
  const handleView = React.useCallback(() => {
    onView(invoice.invoiceId);
  }, [invoice.invoiceId, onView]);

  const handleDownload = React.useCallback(() => {
    onDownload(invoice.invoiceId);
  }, [invoice.invoiceId, onDownload]);

  return (
    <div
      onClick={handleView}
      className={mobileInvoiceStyles.invoiceRow}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleView();
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <span className={mobileInvoiceStyles.invoiceTitle}>
          <i className={mobileInvoiceStyles.invoiceTitleIcon} />
          Invoice #{invoice.invoiceNumber}
        </span>
        <span className={mobileInvoiceStyles.invoiceSubtitle}>
          {formatDate(invoice.referenceDate || invoice.invoiceCreatedOn)}
        </span>
      </div>

      <div className={mobileInvoiceStyles.invoiceRightSide}>
        <span className={mobileInvoiceStyles.invoiceAmount}>
          <AnimatedCurrency value={invoice.totalPayment} formatter={formatCurrency} />
        </span>

        <div className={mobileInvoiceStyles.invoiceActionsWrap} onClick={(e) => e.stopPropagation()}>
          <InvoiceActionButton
            icon="bi-download"
            onClick={handleDownload}
            title="Download Invoice"
            ariaLabel={`Download invoice ${invoice.invoiceNumber}`}
          />
        </div>
      </div>
    </div>
  );
};

export const InvoiceItem = React.memo(InvoiceItemComponent);
