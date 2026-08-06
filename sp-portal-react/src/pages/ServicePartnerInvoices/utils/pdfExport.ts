// CDN-jsPDF convention (see src/pages/Vehicles/utils/pdfExport.ts and
// src/pages/FinancialInvoices/utils/pdfExport.ts): this SPA has no npm jsPDF
// dependency, so load the UMD bundle from cdnjs on demand and fall back to
// window.print() if that fails. Layout ported line-for-line from the
// Next.js source's utils/pdfExport.ts (the "BA Express" branded landscape
// invoice document), against this page's local mock `Invoice` shape.
import type { Deduction, Invoice } from '../../../data/servicePartnerInvoicesData';
import { formatGbp, formatItemDate, formatInvoiceNumber, formatDeductionReference, parsePeriodLabel } from './format';
import { INVOICE_RGB } from '../constants/invoiceTheme';
import { BA_COMPANY } from '../constants/baCompany';

const MARGIN = 14;

interface JsPdfDoc {
  internal: { pageSize: { width: number; height: number } };
  setFillColor: (r: number, g: number, b: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setFontSize: (n: number) => void;
  setFont: (family: string | undefined, style: string) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  text: (text: string, x: number, y: number, options?: { align?: string }) => void;
  getTextWidth: (text: string) => number;
  addPage: () => void;
  output: (type: string) => ArrayBuffer;
}
type JsPdfCtor = new (options: { orientation: string; unit: string; format: string }) => JsPdfDoc;

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

function drawStatCards(pdf: JsPdfDoc, y: number, cards: Array<{ label: string; value: string; positive?: boolean }>): number {
  const usableWidth = pdf.internal.pageSize.width - MARGIN * 2;
  const gap = 3;
  const cardW = (usableWidth - gap * (cards.length - 1)) / cards.length;
  const cardH = 18;

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);
    pdf.setFillColor(...INVOICE_RGB.surface);
    pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...INVOICE_RGB.textGray);
    pdf.text(card.label.toUpperCase(), x + 4, y + 6);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...(card.positive ? INVOICE_RGB.green : INVOICE_RGB.navy));
    pdf.text(card.value, x + 4, y + 13);
  });

  return y + cardH;
}

function drawPartnerHeader(pdf: JsPdfDoc, y: number, partnerName: string, issuerLabel: string, tableW: number): number {
  const barH = 10;
  pdf.setFillColor(...INVOICE_RGB.navy);
  pdf.rect(MARGIN, y, tableW, barH, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INVOICE_RGB.white);
  pdf.text(partnerName, MARGIN + 5, y + 6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(185, 206, 255);
  pdf.text(issuerLabel, MARGIN + tableW - 5, y + 6.5, { align: 'right' });
  return y + barH;
}

function drawItemsTable(pdf: JsPdfDoc, y: number, headers: string[], rows: string[][], colWidths: number[]): number {
  const pageHeight = pdf.internal.pageSize.height;
  const tableW = colWidths.reduce((s, w) => s + w, 0);
  const rowH = 8;

  const renderHeader = (atY: number): number => {
    pdf.setFillColor(...INVOICE_RGB.surface);
    pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
    pdf.rect(MARGIN, atY, tableW, rowH, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...INVOICE_RGB.navy);
    let x = MARGIN;
    headers.forEach((h, i) => {
      pdf.text(h, x + 3, atY + 5.5);
      x += colWidths[i];
    });
    return atY + rowH;
  };

  y = renderHeader(y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);

  rows.forEach((row) => {
    if (y + rowH > pageHeight - MARGIN) {
      pdf.addPage();
      y = MARGIN + 8;
      y = renderHeader(y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
    }
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
    pdf.rect(MARGIN, y, tableW, rowH, 'FD');
    pdf.setTextColor(...INVOICE_RGB.textDark);
    let x = MARGIN;
    row.forEach((cell, ci) => {
      const maxW = colWidths[ci] - 6;
      let text = String(cell);
      if (pdf.getTextWidth(text) > maxW) {
        while (pdf.getTextWidth(text + '…') > maxW && text.length > 0) {
          text = text.slice(0, -1);
        }
        text += '…';
      }
      pdf.text(text, x + 3, y + 5.5);
      x += colWidths[ci];
    });
    y += rowH;
  });

  return y;
}

function drawSubtotal(pdf: JsPdfDoc, y: number, subtotal: number, tableW: number): number {
  const stripH = 9;
  pdf.setFillColor(...INVOICE_RGB.surface);
  pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
  pdf.rect(MARGIN, y, tableW, stripH, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...INVOICE_RGB.navy);
  pdf.text(`Subtotal: ${formatGbp(subtotal)}`, MARGIN + tableW - 5, y + 6, { align: 'right' });
  return y + stripH;
}

function drawGrandTotal(pdf: JsPdfDoc, y: number, total: number, caption: string, tableW: number): number {
  const barH = 13;
  pdf.setFillColor(...INVOICE_RGB.navy);
  pdf.rect(MARGIN, y, tableW, barH, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(...INVOICE_RGB.white);
  pdf.text('Grand Total', MARGIN + 5, y + 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(185, 206, 255);
  pdf.text(`(${caption})`, MARGIN + 5, y + 11);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...INVOICE_RGB.white);
  pdf.text(formatGbp(total), MARGIN + tableW - 5, y + 8.5, { align: 'right' });
  return y + barH;
}

function drawInvoiceHeader(
  pdf: JsPdfDoc,
  y: number,
  partnerName: string,
  partnerAddress: string | null | undefined,
  partnerPhone: string | null | undefined,
  partnerVatNumber: string | null | undefined,
  formattedInvoiceNumber: string,
  periodLabel: string,
  tableW: number,
): number {
  const col1X = MARGIN;
  const col2X = MARGIN + tableW * 0.38;
  const col3X = MARGIN + tableW * 0.72;
  const col3W = tableW * 0.28;
  let maxRowY = y;

  let cy = y;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...INVOICE_RGB.navy);
  pdf.text('TO', col1X, cy);
  cy += 6;
  pdf.setFontSize(11);
  pdf.text(BA_COMPANY.name, col1X, cy);
  cy += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...INVOICE_RGB.textGray);
  pdf.text(BA_COMPANY.address, col1X, cy);
  cy += 4.5;
  pdf.text(BA_COMPANY.email, col1X, cy);
  cy += 4.5;
  pdf.text(BA_COMPANY.vat, col1X, cy);
  maxRowY = Math.max(maxRowY, cy);

  cy = y;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...INVOICE_RGB.navy);
  pdf.text('FROM', col2X, cy);
  cy += 6;
  pdf.setFontSize(10.5);
  pdf.text(partnerName, col2X, cy);
  cy += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...INVOICE_RGB.textGray);
  const details = [partnerAddress, partnerPhone, partnerVatNumber ? `VAT: ${partnerVatNumber}` : null].filter(
    (v): v is string => !!v,
  );
  if (details.length === 0) {
    pdf.text('No additional details available', col2X, cy);
    cy += 4.5;
  } else {
    details.forEach((line) => {
      pdf.text(line, col2X, cy);
      cy += 4.5;
    });
  }
  maxRowY = Math.max(maxRowY, cy);

  const boxH = 24;
  pdf.setFillColor(...INVOICE_RGB.surface);
  pdf.roundedRect(col3X, y - 4, col3W, boxH, 2, 2, 'F');
  let by = y + 2;
  if (formattedInvoiceNumber) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...INVOICE_RGB.navy);
    pdf.text('Invoice Number:', col3X + col3W / 2, by, { align: 'center' });
    by += 5;
    pdf.setFontSize(9);
    pdf.text(formattedInvoiceNumber, col3X + col3W / 2, by, { align: 'center' });
    by += 7;
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);
  pdf.text('Date:', col3X + col3W / 2, by, { align: 'center' });
  by += 5;
  pdf.setFontSize(9);
  pdf.text(periodLabel, col3X + col3W / 2, by, { align: 'center' });
  maxRowY = Math.max(maxRowY, y - 4 + boxH);

  const dividerY = maxRowY + 4;
  pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
  pdf.line(MARGIN, dividerY, MARGIN + tableW, dividerY);

  return dividerY + 6;
}

function drawDeductionsTable(
  pdf: JsPdfDoc,
  y: number,
  deductions: Deduction[],
  totalDeductions: number,
  totalReimbursements: number,
  tableW: number,
): number {
  if (!deductions || deductions.length === 0) return y;

  const headers = ['Reference', 'Description', 'Incident', 'Entry', 'Deduction', 'Reimb.'];
  const colWidths = [30, 90, 25, 25, 30, 30];

  const barH = 10;
  pdf.setFillColor(...INVOICE_RGB.navy);
  pdf.rect(MARGIN, y, tableW, barH, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INVOICE_RGB.white);
  pdf.text('Deductions & Reimbursements', MARGIN + 5, y + 6.5);
  y += barH;

  const rows = deductions.map((d) => [
    formatDeductionReference({
      service_partner_deduction_id: d.service_partner_deduction_id,
      deduction_amount: d.deduction_amount,
      reimbursements_amount: d.reimbursements_amount,
    }),
    d.description || '—',
    d.incident_date ? formatItemDate(d.incident_date) : '—',
    d.entry_date ? formatItemDate(d.entry_date) : '—',
    d.deduction_amount > 0 ? formatGbp(d.deduction_amount) : '—',
    d.reimbursements_amount > 0 ? formatGbp(d.reimbursements_amount) : '—',
  ]);

  y = drawItemsTable(pdf, y, headers, rows, colWidths);

  const stripH = 9;
  pdf.setFillColor(...INVOICE_RGB.surface);
  pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
  pdf.rect(MARGIN, y, tableW, stripH, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...INVOICE_RGB.red);
  pdf.text(`Deductions: ${formatGbp(totalDeductions)}`, MARGIN + 5, y + 6);
  pdf.setTextColor(...INVOICE_RGB.green);
  pdf.text(`Reimbursements: ${formatGbp(totalReimbursements)}`, MARGIN + tableW - 5, y + 6, { align: 'right' });
  y += stripH;

  return y + 6;
}

function drawVatLine(pdf: JsPdfDoc, y: number, amount: number, tableW: number): number {
  if (!(amount > 0)) return y;
  const stripH = 10;
  pdf.setFillColor(...INVOICE_RGB.surface);
  pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
  pdf.roundedRect(MARGIN, y, tableW, stripH, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...INVOICE_RGB.navy);
  pdf.text('VAT (20%)', MARGIN + 5, y + 6.5);
  pdf.text(formatGbp(amount), MARGIN + tableW - 5, y + 6.5, { align: 'right' });
  return y + stripH + 6;
}

function drawFooter(pdf: JsPdfDoc, y: number, tableW: number): number {
  pdf.setDrawColor(...INVOICE_RGB.surfaceBorder);
  pdf.line(MARGIN, y, MARGIN + tableW, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...INVOICE_RGB.textGray);
  pdf.text(`Generated by ${BA_COMPANY.name}`, MARGIN, y);
  pdf.setTextColor(...INVOICE_RGB.navy);
  pdf.text('Service Partner Invoices', MARGIN + tableW, y, { align: 'right' });
  return y;
}

/**
 * Single-invoice PDF export — mirrors ServicePartnerInvoiceModal: header,
 * stat cards, items block, deductions block, VAT line, grand total, footer.
 */
export async function exportSingleServicePartnerInvoiceToPDF(invoice: Invoice): Promise<void> {
  try {
    const itens = invoice.itens;
    const deductions = invoice.deductions;

    const periodLabel = parsePeriodLabel(invoice.date);
    const totalStops = itens.reduce((sum, item) => sum + (Number(item.totalStops) || 0), 0);
    const itemLabel = `${itens.length} ${itens.length === 1 ? 'item' : 'items'}`;
    const formattedInvoiceNumber = formatInvoiceNumber(invoice.invoiceNumber);
    const partnerName = invoice.servicePartnerName || `#${invoice.servicePartnerId}`;

    const JsPDF = await loadJsPdf();
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const tableW = pdf.internal.pageSize.width - MARGIN * 2;

    let y = MARGIN + 4;
    y = drawInvoiceHeader(
      pdf,
      y,
      partnerName,
      invoice.servicePartnerAddress,
      invoice.servicePartnerPhone,
      invoice.servicePartnerVatNumber,
      formattedInvoiceNumber,
      periodLabel,
      tableW,
    );

    const statCards = [
      { label: 'Period', value: periodLabel },
      { label: 'Total Stops', value: String(totalStops) },
      { label: 'Net Total', value: formatGbp(invoice.netTotal), positive: true },
    ];
    y = drawStatCards(pdf, y, statCards);
    y += 10;

    const COL_WIDTHS = [45, 90, 20, 40, 35].map((w) => (w / 230) * tableW);
    const TABLE_HEADERS = ['Route', 'Note', 'Stops', 'Amount', 'Date'];
    const issuerLabel = `${BA_COMPANY.name} - ${periodLabel}`;

    y = drawPartnerHeader(pdf, y, partnerName, issuerLabel, tableW);
    const rows =
      itens.length === 0
        ? [['—', 'No items', '—', '—', '—']]
        : itens.map((item) => [
            item.routeName || '—',
            item.note || '—',
            String(item.totalStops),
            formatGbp(item.amount),
            formatItemDate(item.date),
          ]);
    y = drawItemsTable(pdf, y, TABLE_HEADERS, rows, COL_WIDTHS);
    if (itens.length > 0) {
      y = drawSubtotal(pdf, y, invoice.amountTotal, tableW);
    }
    y += 6;

    y = drawDeductionsTable(pdf, y, deductions, invoice.totalDeductions, invoice.totalReimbursements, tableW);
    y = drawVatLine(pdf, y, invoice.totalVat, tableW);

    if (y + 15 > pdf.internal.pageSize.height - MARGIN) {
      pdf.addPage();
      y = MARGIN + 8;
    }
    y = drawGrandTotal(pdf, y, invoice.netTotal, `1 invoice, ${itemLabel}`, tableW);
    y += 8;

    if (y + 10 > pdf.internal.pageSize.height - MARGIN) {
      pdf.addPage();
      y = MARGIN + 8;
    }
    drawFooter(pdf, y, tableW);

    const blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const partnerSlug = partnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `service-partner-invoice-${partnerSlug}-${invoice.date}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating service partner invoice PDF, falling back to print dialog:', error);
    window.print();
  }
}
