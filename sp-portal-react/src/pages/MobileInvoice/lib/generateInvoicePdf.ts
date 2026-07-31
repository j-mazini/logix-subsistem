import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { InvoiceDetailData } from '../mock/mockInvoiceData';

/**
 * Simplified stand-in for the Next.js source's PDF export (html2canvas +
 * jsPDF, screenshotting the on-screen modal DOM). Neither html2canvas nor
 * jsPDF are dependencies here — pdf-lib already is, so this renders the same
 * information programmatically as a single A4 page instead of a DOM capture.
 */
function money(amount: number): string {
  return `GBP ${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export async function generateInvoicePdf(details: InvoiceDetailData): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait, points
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0.118, 0.227, 0.541);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.4, 0.4, 0.4);
  const red = rgb(0.71, 0.11, 0.11);

  const marginX = 40;
  const width = 595.28 - marginX * 2;
  let y = 800;

  const line = (text: string, opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    page.drawText(text, {
      x: opts.x ?? marginX,
      y,
      size: opts.size ?? 10,
      font: opts.f ?? font,
      color: opts.color ?? black,
    });
  };

  // Header
  line(`Self Billing Invoice #${details.invoiceNumber}`, { size: 16, f: bold, color: navy });
  y -= 20;
  line(details.company.companyName, { size: 10, color: gray });
  y -= 14;
  line(`${details.company.companyStreet}  |  ${details.company.companyEmail}  |  VAT: ${details.company.companyVatNumber}`, { size: 9, color: gray });
  y -= 28;

  // Vendor / invoice info
  line('Vendor', { size: 10, f: bold, color: navy });
  line('Invoice Details', { size: 10, f: bold, color: navy, x: marginX + width / 2 });
  y -= 14;
  line(`Name: ${details.vendor.name}`, { size: 9 });
  line(`Invoice Date: ${formatDate(details.invoiceDate)}`, { size: 9, x: marginX + width / 2 });
  y -= 13;
  line(`Vendor Code: ${details.vendor.vendorCode}`, { size: 9 });
  line(`Due Date: ${formatDate(details.dueDate)}`, { size: 9, x: marginX + width / 2 });
  y -= 13;
  line(`Email: ${details.vendor.vendorEmail}`, { size: 9 });
  line(`Payment Terms: ${details.paymentTerms}`, { size: 9, x: marginX + width / 2 });
  y -= 13;
  line(`Total Stops: ${details.totalStops}`, { size: 9, x: marginX + width / 2 });
  y -= 24;

  // Line items table
  const subtotal = details.details.reduce((sum, d) => sum + d.total, 0);
  const vat = details.hasVat ? subtotal * 0.2 : 0;
  const total = subtotal + vat;
  const totalDeductions = Object.values(details.deductions).reduce((a, b) => a + b, 0);
  const balanceDue = total - totalDeductions;

  page.drawRectangle({ x: marginX, y: y - 4, width, height: 16, color: navy });
  page.drawText('DATE', { x: marginX + 4, y, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText('ROUTE', { x: marginX + 90, y, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText('AMOUNT', { x: marginX + width - 60, y, size: 8, font: bold, color: rgb(1, 1, 1) });
  y -= 18;

  const maxRows = Math.min(details.details.length, 28);
  for (let i = 0; i < maxRows; i++) {
    const item = details.details[i];
    if (y < 140) break;
    line(formatDate(item.date), { size: 8.5 });
    line(item.route, { size: 8.5, x: marginX + 90 });
    line(money(item.total), { size: 8.5, x: marginX + width - 60 });
    y -= 13;
  }
  if (details.details.length > maxRows) {
    line(`+ ${details.details.length - maxRows} more day(s)`, { size: 8, color: gray });
    y -= 13;
  }
  y -= 12;

  // Deductions + summary
  const dedEntries: [string, number][] = (
    [
      ['Traffic Penalties', details.deductions.trafficPenalty],
      ['Pre-Payments', details.deductions.prePayment],
      ['Others', details.deductions.other],
      ['Liquidation Damages', details.deductions.liquidationDamage],
      ['Repair Damages', details.deductions.fixDamage],
    ] as [string, number][]
  ).filter(([, v]) => v > 0);

  line('Deductions', { size: 10, f: bold, color: red });
  line('Summary', { size: 10, f: bold, x: marginX + width / 2 });
  y -= 14;

  if (dedEntries.length === 0) {
    line('None', { size: 9, color: gray });
  } else {
    dedEntries.forEach(([label, value]) => {
      line(`${label}: -${money(value)}`, { size: 9 });
      y -= 13;
    });
    y += 13;
  }

  line(`Subtotal: ${money(subtotal)}`, { size: 9, x: marginX + width / 2 });
  y -= 13;
  line(`VAT (20%): ${money(vat)}`, { size: 9, x: marginX + width / 2 });
  y -= 13;
  line(`Invoice Total: ${money(total)}`, { size: 9, f: bold, x: marginX + width / 2 });
  y -= 30;

  page.drawRectangle({ x: marginX, y: y - 8, width, height: 28, color: navy });
  page.drawText('Balance Due:', { x: marginX + 8, y: y + 2, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText(money(balanceDue), { x: marginX + width - 120, y: y + 2, size: 12, font: bold, color: rgb(1, 1, 1) });

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}
