// Ported from the Next.js source's app/(private)/vendor/utils/pdfExport.ts,
// which built a styled "Vendor Management" report with jsPDF (installed as
// an npm dependency there, loaded via a shared `@/lib/lazy-imports` helper
// backed by a real backend API and multi-tenant fields — service partners,
// cost models — that don't exist in this single-SP mock portal).
//
// This is a mock-data SPA with no npm jsPDF dependency, so this port follows
// the CDN-loading convention already established in
// src/pages/Vehicles/utils/pdfExport.ts: load jsPDF from a CDN <script> tag
// on demand, and fall back to window.print() if the CDN load fails (e.g.
// offline demo/dev environment). Columns are trimmed to what this portal
// actually tracks per vendor (no service partner / cost model — those are
// admin-wide concepts the SP portal doesn't have).
import {
  formatDateOnly,
  getTrainingStatus,
  getDocumentsStatus,
  vendorTypeLabel,
  type Vendor,
} from '../../../data/vendorsData';

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

interface VendorsPdfParams {
  vendors: Vendor[];
  serviceProvider: string;
  statusFilter: string;
  vendorTypeFilter: string;
  search: string;
}

function effectiveStatusText(v: Vendor): string {
  if (v.status) return v.status;
  return !v.finishDate || new Date(v.finishDate) > new Date() ? 'Active' : 'Inactive';
}

/** Styled "Vendors Report" PDF, ported from the Next.js source's utils/pdfExport.ts. */
export async function generateVendorsPDF({ vendors, serviceProvider, statusFilter, vendorTypeFilter, search }: VendorsPdfParams): Promise<void> {
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

    // Logo block + heading
    const logoSize = 20;
    doc.setFillColor(...darkBlue);
    doc.rect(margin, margin, logoSize, logoSize, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(serviceProvider.slice(0, 2).toUpperCase() || 'SP', margin + logoSize / 2, margin + logoSize / 2 + 3, { align: 'center' });

    doc.setTextColor(...darkBlue);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(serviceProvider || 'Service Provider', margin + logoSize + 8, margin + 8);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Vendor Management', margin + logoSize + 8, margin + 14);

    // Title box
    const titleBoxWidth = 70;
    const titleBoxHeight = 25;
    const titleBoxX = pageWidth - margin - titleBoxWidth;
    doc.setFillColor(...lightBlue);
    doc.roundedRect(titleBoxX, margin, titleBoxWidth, titleBoxHeight, 2, 2, 'F');

    doc.setTextColor(...darkBlue);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('VENDORS REPORT', titleBoxX + titleBoxWidth / 2, margin + 10, { align: 'center' });

    const reportNumber = `#${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
    doc.setFontSize(9);
    doc.text(reportNumber, titleBoxX + titleBoxWidth / 2, margin + 18, { align: 'center' });

    // Summary + filters boxes
    let currentY = margin + logoSize + 15;
    const detailsBoxHeight = 35;
    const detailsBoxWidth = (pageWidth - margin * 3) / 2;

    const activeCount = vendors.filter((v) => effectiveStatusText(v) === 'Active').length;
    const inactiveCount = vendors.filter((v) => effectiveStatusText(v) === 'Inactive').length;

    doc.setFillColor(...lightBlue);
    doc.roundedRect(margin, currentY, detailsBoxWidth, detailsBoxHeight, 2, 2, 'F');
    doc.setFillColor(...darkBlue);
    doc.roundedRect(margin, currentY, detailsBoxWidth, 8, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', margin + 5, currentY + 5.5);

    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, margin + 5, currentY + 16);
    doc.text(`Total Vendors: ${vendors.length} (${activeCount} active, ${inactiveCount} inactive)`, margin + 5, currentY + 22);

    const rightBoxX = margin * 2 + detailsBoxWidth;
    doc.setFillColor(...lightBlue);
    doc.roundedRect(rightBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 2, 2, 'F');
    doc.setFillColor(...darkBlue);
    doc.roundedRect(rightBoxX, currentY, detailsBoxWidth, 8, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFont(undefined, 'bold');
    doc.text('Filters', rightBoxX + 5, currentY + 5.5);

    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, 'normal');
    let filterY = currentY + 16;
    let hasFilters = false;
    if (statusFilter !== 'all') {
      doc.text(`Status: ${statusFilter}`, rightBoxX + 5, filterY);
      filterY += 6;
      hasFilters = true;
    }
    if (vendorTypeFilter !== 'all') {
      doc.text(`Vendor Type: ${vendorTypeFilter === '2' ? 'Subcontractor' : 'Driver'}`, rightBoxX + 5, filterY);
      filterY += 6;
      hasFilters = true;
    }
    if (search) {
      doc.text(`Search: ${search}`, rightBoxX + 5, filterY);
      filterY += 6;
      hasFilters = true;
    }
    if (!hasFilters) {
      doc.text('No filters applied', rightBoxX + 5, filterY);
    }

    // Table
    currentY = currentY + detailsBoxHeight + 15;
    const rowHeight = 8;
    const headers = ['Name', 'Email', 'Type', 'Route', 'Status', 'Started', 'Training', 'Documents'];
    const colWidths = [42, 55, 26, 30, 24, 26, 28, 28];
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

    vendors.forEach((vendor) => {
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
        `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || '-',
        vendor.email || '-',
        vendorTypeLabel(vendor),
        vendor.route || '-',
        effectiveStatusText(vendor),
        formatDateOnly(vendor.startDate) || '-',
        getTrainingStatus(vendor).label,
        getDocumentsStatus(vendor).label,
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

    if (vendors.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...darkBlue);
      doc.text('No data available', margin, y + 8);
    }

    doc.save(`vendors-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Error generating vendors PDF, falling back to print dialog:', error);
    window.print();
  }
}
