// Ported from the Next.js source's utils/pdfExport.ts, which built a
// "Deductions Report" PDF via a shared @/lib/pdf-utils helper (createPDFWithHeader
// / addSummaryBox / drawTable) backed by an npm jsPDF dependency.
//
// This is a mock-data SPA with no npm jsPDF dependency, so — like
// src/pages/Vehicles/utils/pdfExport.ts — this loads jsPDF from a CDN
// <script> tag on demand and falls back to window.print() if the CDN load
// fails (e.g. offline demo/dev environment).

interface JsPdfDoc {
  internal: { pageSize: { width: number; height: number } };
  setFillColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setFontSize: (n: number) => void;
  setFont: (family: string | undefined, style: string) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void;
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

export interface DeductionsPdfRow {
  id: string;
  dateOfIncident: string;
  courierName: string;
  type: string;
  amount: number;
  status: string;
}

interface DeductionsPdfParams {
  rows: DeductionsPdfRow[];
  currentMonth: Date;
  activeFilter: string;
  searchQuery: string;
}

function formatCurrency(val: number): string {
  return Number.isFinite(val) ? `£${val.toFixed(2)}` : '£0.00';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

/** Styled "Deductions Report" PDF, ported from the Next.js source's utils/pdfExport.ts. */
export async function generateDeductionsPDF({ rows, currentMonth, activeFilter, searchQuery }: DeductionsPdfParams): Promise<void> {
  try {
    const JsPDF = await loadJsPdf();
    const doc = new JsPDF({ orientation: 'landscape' });

    const darkBlue: [number, number, number] = [30, 58, 138];
    const lightBlue: [number, number, number] = [239, 246, 255];
    const white: [number, number, number] = [255, 255, 255];
    const borderGray: [number, number, number] = [200, 200, 200];

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;

    // Title
    doc.setTextColor(...darkBlue);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Deductions, Disbursements & Recharges', margin, margin + 8);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Deductions Report', margin, margin + 14);

    // Summary box
    let currentY = margin + 22;
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const summaryLines = [
      `Generated: ${new Date().toLocaleDateString('en-GB')}`,
      `Total Entries: ${rows.length}`,
      `Total Amount: ${formatCurrency(totalAmount)}`,
      `Month: ${currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
    ];
    if (activeFilter !== 'All') summaryLines.push(`Type Filter: ${activeFilter}`);
    if (searchQuery) summaryLines.push(`Search Term: ${searchQuery}`);

    const summaryBoxWidth = pageWidth - margin * 2;
    const summaryBoxHeight = 8 + summaryLines.length * 5.5;
    doc.setFillColor(...lightBlue);
    doc.roundedRect(margin, currentY, summaryBoxWidth, summaryBoxHeight, 2, 2, 'F');
    doc.setFillColor(...darkBlue);
    doc.roundedRect(margin, currentY, summaryBoxWidth, 8, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', margin + 5, currentY + 5.5);

    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, 'normal');
    summaryLines.forEach((line, i) => {
      doc.text(line, margin + 5, currentY + 15 + i * 5.5);
    });

    currentY += summaryBoxHeight + 10;

    // Table
    const rowHeight = 8;
    const headers = ['ID', 'Date', 'Vendor Name', 'Type', 'Amount', 'Status'];
    const colWidths = [40, 26, 55, 45, 30, 30];
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);

    let y = currentY;
    const drawHeaderRow = () => {
      doc.setFillColor(...darkBlue);
      doc.rect(margin, y, totalWidth, rowHeight, 'F');
      doc.setTextColor(...white);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      let x = margin;
      headers.forEach((header, index) => {
        doc.text(header, x + 3, y + 5.5);
        x += colWidths[index];
        if (index < headers.length - 1) {
          doc.setDrawColor(...white);
          doc.line(x, y + 1, x, y + rowHeight - 1);
        }
      });
      y += rowHeight;
      doc.setFont(undefined, 'normal');
    };
    drawHeaderRow();
    doc.setFontSize(8);

    if (rows.length === 0) {
      doc.setTextColor(100, 100, 100);
      doc.text('No data available', margin, y + 8);
    }

    rows.forEach((row) => {
      if (y + rowHeight > pageHeight - 20) {
        doc.addPage();
        y = margin;
        drawHeaderRow();
        doc.setFontSize(8);
      }

      doc.setFillColor(...white);
      doc.rect(margin, y, totalWidth, rowHeight, 'F');
      doc.setDrawColor(...borderGray);
      doc.rect(margin, y, totalWidth, rowHeight);

      doc.setTextColor(50, 50, 50);
      let x = margin;
      const rowData = [
        row.id || '-',
        formatDate(row.dateOfIncident),
        row.courierName || '-',
        row.type || '-',
        formatCurrency(row.amount),
        row.status || '-',
      ];

      rowData.forEach((cell, cellIndex) => {
        const maxWidth = colWidths[cellIndex] - 6;
        let text = String(cell);
        if (doc.getTextWidth(text) > maxWidth) {
          while (doc.getTextWidth(text + '...') > maxWidth && text.length > 0) {
            text = text.slice(0, -1);
          }
          text += '...';
        }
        doc.text(text, x + 3, y + 5.5);
        x += colWidths[cellIndex];
        if (cellIndex < rowData.length - 1) {
          doc.setDrawColor(...borderGray);
          doc.line(x, y, x, y + rowHeight);
        }
      });

      y += rowHeight;
    });

    doc.save(`deductions-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Error generating deductions PDF, falling back to print dialog:', error);
    window.print();
  }
}
