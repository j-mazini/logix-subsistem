import { useState, useCallback, useRef } from "react";
import { StandardPageLayout, PageHeader, PageSection } from "@/app/(private)/components";
import InvoiceDetailsModal, { InvoiceDetailsModalRef } from "./components/InvoiceDetailsModal";
import { useMobileInvoices } from "./hooks/useMobileInvoices";
import { InvoiceListContainer } from "./components/InvoiceListContainer";
import { mobileInvoiceStyles } from "./styles";

export default function MobileInvoicePage() {
  const { invoices, isLoading } = useMobileInvoices();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const invoiceModalRef = useRef<InvoiceDetailsModalRef>(null);

  const handleViewInvoice = useCallback((invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setIsDetailsModalOpen(true);
  }, []);

  const handleDownload = useCallback(async (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setIsDetailsModalOpen(true);

    let attempts = 0;
    const maxAttempts = 50;

    const tryGeneratePDF = async () => {
      if (invoiceModalRef.current) {
        try {
          await invoiceModalRef.current.generatePDF();
          setIsDetailsModalOpen(false);
          setSelectedInvoiceId(null);
        } catch (error) {
          console.error("Error generating PDF:", error);
          alert(
            `Error generating PDF: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          setIsDetailsModalOpen(false);
          setSelectedInvoiceId(null);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryGeneratePDF, 100);
      } else {
        alert("Failed to load invoice details. Please try again.");
        setIsDetailsModalOpen(false);
        setSelectedInvoiceId(null);
      }
    };

    setTimeout(tryGeneratePDF, 300);
  }, []);

  const handleModalClose = useCallback((open: boolean) => {
    setIsDetailsModalOpen(open);
    if (!open) {
      setSelectedInvoiceId(null);
    }
  }, []);

  return (
    <StandardPageLayout bottomPadding={mobileInvoiceStyles.bottomPadding}>
      <PageHeader />

      <PageSection className={mobileInvoiceStyles.sectionPadding}>
        <div
          className={mobileInvoiceStyles.listCard}
          id="invoiceList"
        >
          <InvoiceListContainer
            invoices={invoices}
            isLoading={isLoading}
            onView={handleViewInvoice}
            onDownload={handleDownload}
          />
        </div>
      </PageSection>

      {selectedInvoiceId && (
        <InvoiceDetailsModal
          ref={invoiceModalRef}
          invoiceId={selectedInvoiceId}
          open={isDetailsModalOpen}
          onOpenChange={handleModalClose}
        />
      )}
    </StandardPageLayout>
  );
}
