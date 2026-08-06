// CDN-jsPDF convention (see src/pages/Vehicles/utils/pdfExport.ts): this SPA
// has no npm jsPDF dependency, so load the UMD bundle from cdnjs on demand
// and fall back to window.print() if that fails — ported from the Next.js
// source's exportUtils.ts + invoice-details-modal.tsx PDF generation, which
// both used an npm-installed jsPDF against real invoice/line-item data.
import type { Invoice } from '../../../data/financialInvoicesData';
import { formatCurrency, formatDate } from '../../../data/financialInvoicesData';

interface JsPdfDoc {
  internal: { pageSize: { width: number; height: number } };
  setFillColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setFontSize: (n: number) => void;
  setFont: (family: string | undefined, style: string) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  text: (text: string, x: number, y: number, options?: { align?: string }) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addPage: () => void;
  save: (filename: string) => void;
}
type JsPdfCtor = new (...args: unknown[]) => JsPdfDoc;

async function loadJsPdf(): Promise<JsPdfCtor> {
  const win = window as Window & { jspdf?: { jsPDF: JsPdfCtor } };
  if (win.jspdf?.jsPDF) return win.jspdf.jsPDF;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-jspdf-loader="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load jsPDF.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.dataset.jspdfLoader = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load jsPDF.'));
    document.head.appendChild(script);
  });

  if (!win.jspdf?.jsPDF) throw new Error('jsPDF did not initialize.');
  return win.jspdf.jsPDF;
}

export async function exportInvoicesToPDF(invoices: Invoice[], periodLabel: string): Promise<void> {
  try {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF();
    const darkBlue: [number, number, number] = [30, 58, 138];
    const borderGray: [number, number, number] = [200, 200, 200];
    const margin = 14;
    const pageHeight = doc.internal.pageSize.height;

    doc.setTextColor(...darkBlue);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Financial Invoices', margin, margin + 6);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(periodLabel, margin, margin + 13);

    let y = margin + 22;
    const headers = ['Record ID', 'Vendor', 'Service Partner', 'Period', 'Amount'];
    const colWidths = [38, 46, 40, 26, 30];
    const rowHeight = 8;
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    const drawHeaderRow = () => {
      doc.setFillColor(...darkBlue);
      doc.rect(margin, y, totalWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      let x = margin;
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y + 5.5);
        x += colWidths[i];
      });
      y += rowHeight;
      doc.setFont(undefined, 'normal');
    };
    drawHeaderRow();
    doc.setFontSize(8);

    invoices.forEach((inv) => {
      if (y + rowHeight > pageHeight - 20) {
        doc.addPage();
        y = margin;
        drawHeaderRow();
        doc.setFontSize(8);
      }
      doc.setDrawColor(...borderGray);
      doc.rect(margin, y, totalWidth, rowHeight);
      doc.setTextColor(50, 50, 50);
      let x = margin;
      const row = [
        inv.invoiceNumber,
        inv.courier,
        inv.servicePartnerName || '-',
        formatDate(inv.referenceDate),
        formatCurrency(inv.totalPayment),
      ];
      row.forEach((cell, i) => {
        doc.text(String(cell).slice(0, 28), x + 2, y + 5.5);
        x += colWidths[i];
      });
      y += rowHeight;
    });

    doc.save(`financial-invoices-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  } catch (error) {
    console.error('Error generating invoices PDF, falling back to print dialog:', error);
    window.print();
  }
}

export async function exportInvoiceDetailsToPDF(invoice: Invoice): Promise<void> {
  try {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF();
    const darkBlue: [number, number, number] = [30, 58, 138];
    const margin = 14;

    doc.setTextColor(...darkBlue);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Self Billing Invoice', margin, margin + 6);
    doc.setFontSize(11);
    doc.text(`#${invoice.invoiceNumber}`, margin, margin + 14);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const lines = [
      `Vendor: ${invoice.courier}`,
      `Service Partner: ${invoice.servicePartnerName || '-'}`,
      `Period: ${formatDate(invoice.referenceDate)}`,
      `Created On: ${formatDate(invoice.invoiceCreatedOn)}`,
      `Total Stops: ${invoice.totalStops ?? '-'}`,
      `Total Payment: ${formatCurrency(invoice.totalPayment)}`,
    ];
    let y = margin + 26;
    lines.forEach((line) => {
      doc.text(line, margin, y);
      y += 8;
    });

    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Error generating invoice PDF, falling back to print dialog:', error);
    window.print();
  }
}
