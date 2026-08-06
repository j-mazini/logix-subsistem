// Ported from the Next.js source's app/(private)/adhoc-works-invoice-management/utils/pdfExport.ts,
// which built a styled "Adhoc Works Invoice Management" report with jsPDF (installed
// as an npm dependency there, loaded via a shared `@/lib/lazy-imports` helper).
//
// This is a mock-data SPA with no npm jsPDF dependency, so this port follows the
// CDN-loading convention already established in
// src/pages/Vehicles/utils/pdfExport.ts: load jsPDF from a CDN <script> tag on
// demand, and fall back to window.print() if the CDN load fails (e.g. offline
// demo/dev environment).

interface JsPdfDoc {
  internal: { pageSize: { width: number; height: number } };
  setFillColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (w: number) => void;
  setFontSize: (n: number) => void;
  setFont: (family: string | undefined, style: string) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void;
  circle: (x: number, y: number, r: number, style?: string) => void;
  text: (text: string, x: number, y: number, options?: { align?: string }) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  getTextWidth: (text: string) => number;
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

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

interface AdhocPdfRow {
  date: string;
  vendorName: string;
  servicePartnerName: string;
  depot: string;
  route: string;
  adhocName: string;
  adhocCategory: string;
  receivedPayment: number;
  vendorPayment: number;
}

interface AdhocPdfParams {
  rows: AdhocPdfRow[];
  weekLabel: string;
  formatDateDisplay: (dateStr: string) => string;
  filenameSuffix: string;
}

/** Styled "Adhoc Works Invoice Management" report, ported from the Next.js source's utils/pdfExport.ts. */
export async function generateAdhocWorksPDF({ rows, weekLabel, formatDateDisplay, filenameSuffix }: AdhocPdfParams): Promise<void> {
  try {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const darkBlue: [number, number, number] = [30, 58, 138];
    const lightBlue: [number, number, number] = [239, 246, 255];
    const white: [number, number, number] = [255, 255, 255];
    const textDark: [number, number, number] = [50, 50, 50];
    const borderGray: [number, number, number] = [226, 232, 240];

    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Logo block + heading
    const logoSize = 20;
    doc.setFillColor(...darkBlue);
    doc.roundedRect(margin, margin, logoSize, logoSize, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('BA', margin + logoSize / 2, margin + logoSize / 2 + 3, { align: 'center' });

    doc.setTextColor(...darkBlue);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('BA EXPRESS LIMITED', margin + logoSize + 8, margin + 8);

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('20 The Laurels', margin + logoSize + 8, margin + 14);
    doc.text('info@baexpress.co.uk', margin + logoSize + 8, margin + 19);

    // Title box
    const titleBoxWidth = 75;
    const titleBoxX = pageWidth - margin - titleBoxWidth;
    doc.setTextColor(...darkBlue);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('ADHOC WORKS', titleBoxX + titleBoxWidth / 2, margin + 8, { align: 'center' });
    doc.text('INVOICE MANAGEMENT', titleBoxX + titleBoxWidth / 2, margin + 13, { align: 'center' });

    let currentY = margin + logoSize + 15;

    const totalReceived = rows.reduce((s, r) => s + (r.receivedPayment || 0), 0);
    const totalVendor = rows.reduce((s, r) => s + (r.vendorPayment || 0), 0);

    // Summary box
    const summaryData = [
      { label: 'Generated', value: new Date().toLocaleDateString('en-GB') },
      { label: 'Period', value: weekLabel },
      { label: 'Total Records', value: rows.length.toString() },
      { label: 'Total Received Payment', value: `£${formatCurrency(totalReceived)}` },
      { label: 'Total Vendor Payment', value: `£${formatCurrency(totalVendor)}` },
    ];
    const detailsBoxWidth = (pageWidth - margin * 3) / 2;
    const detailsBoxHeight = 10 + summaryData.length * 8;

    doc.setFillColor(...lightBlue);
    doc.roundedRect(margin, currentY, detailsBoxWidth, detailsBoxHeight, 3, 3, 'F');
    doc.setFillColor(...darkBlue);
    doc.roundedRect(margin, currentY, detailsBoxWidth, 8, 3, 3, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', margin + 5, currentY + 5.5);

    doc.setTextColor(...textDark);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    summaryData.forEach((item, index) => {
      doc.text(`${item.label}: ${item.value}`, margin + 5, currentY + 16 + index * 8);
    });

    currentY += detailsBoxHeight + 15;

    // Table
    const headers = ['Date', 'Vendor', 'Service Partner', 'Depot', 'Route', 'Adhoc Service', 'Service Type', 'Received', 'Vendor'];
    const columnWidths = [20, 32, 28, 24, 28, 32, 24, 28, 28];
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const rowHeight = 8;
    const pageHeight = doc.internal.pageSize.height;

    const drawHeaderRow = () => {
      doc.setFillColor(...lightBlue);
      doc.roundedRect(margin, currentY, totalWidth, rowHeight, 2, 2, 'F');
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, totalWidth, rowHeight, 2, 2, 'S');
      doc.setTextColor(...darkBlue);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      let x = margin;
      headers.forEach((header, index) => {
        doc.text(header, x + 2, currentY + 5.5);
        x += columnWidths[index];
        if (index < headers.length - 1) {
          doc.setDrawColor(...borderGray);
          doc.line(x, currentY + 1, x, currentY + rowHeight - 1);
        }
      });
      currentY += rowHeight;
    };

    if (rows.length > 0) {
      drawHeaderRow();
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);

      rows.forEach((row, rowIndex) => {
        if (currentY + rowHeight > pageHeight - 20) {
          doc.addPage();
          currentY = margin;
          drawHeaderRow();
          doc.setFont(undefined, 'normal');
          doc.setFontSize(7);
        }

        const rowBg: [number, number, number] = rowIndex % 2 === 0 ? white : [248, 250, 252];
        doc.setFillColor(...rowBg);
        doc.rect(margin, currentY, totalWidth, rowHeight, 'F');
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY, totalWidth, rowHeight);

        doc.setTextColor(...textDark);
        let x = margin;
        const cells = [
          formatDateDisplay(row.date),
          row.vendorName,
          row.servicePartnerName,
          row.depot,
          row.route,
          row.adhocName,
          row.adhocCategory,
          `£${formatCurrency(row.receivedPayment)}`,
          `£${formatCurrency(row.vendorPayment)}`,
        ];

        cells.forEach((cell, cellIndex) => {
          const maxWidth = columnWidths[cellIndex] - 4;
          let text = String(cell || '—');
          if (doc.getTextWidth(text) > maxWidth) {
            while (doc.getTextWidth(text + '...') > maxWidth && text.length > 0) {
              text = text.slice(0, -1);
            }
            text += '...';
          }
          doc.text(text, x + 2, currentY + 5.5);
          x += columnWidths[cellIndex];
          if (cellIndex < cells.length - 1) {
            doc.setDrawColor(...borderGray);
            doc.line(x, currentY, x, currentY + rowHeight);
          }
        });

        currentY += rowHeight;
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      doc.text('No data available', margin, currentY);
    }

    doc.save(`adhoc-works-${filenameSuffix}.pdf`);
  } catch (error) {
    console.error('Error generating adhoc works PDF, falling back to print dialog:', error);
    window.print();
  }
}
