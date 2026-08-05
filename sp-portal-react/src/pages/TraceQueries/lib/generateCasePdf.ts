import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { CASE_TYPE_LABEL, type TraceQueryCase } from '../types';

/**
 * Case closure PDF, sent to DHL as proof of resolution. Same pdf-lib
 * text-drawing approach as MobileInvoice's generateInvoicePdf.ts (the only
 * PDF dependency in this project), extended with pagination and embedded
 * photo evidence — unlike an invoice, a case's evidence photos are the
 * whole point of the artifact.
 */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89; // A4 portrait, points
const MARGIN_X = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BOTTOM_MARGIN = 50;

const NAVY = rgb(0.118, 0.227, 0.541);
const BLACK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.4, 0.4, 0.4);
const RED = rgb(0.71, 0.11, 0.11);
const GREEN = rgb(0.02, 0.4, 0.2);

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime: match[1] };
  } catch {
    return null;
  }
}

/** Wraps text into lines that fit `maxWidth` at the given font/size. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export async function generateCasePdf(c: TraceQueryCase): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 800;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = 800;
  };

  const ensureSpace = (height: number) => {
    if (y - height < BOTTOM_MARGIN) newPage();
  };

  const line = (text: string, opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; gap?: number } = {}) => {
    ensureSpace(opts.size ?? 10);
    page.drawText(text, {
      x: opts.x ?? MARGIN_X,
      y,
      size: opts.size ?? 10,
      font: opts.f ?? font,
      color: opts.color ?? BLACK,
    });
    y -= opts.gap ?? (opts.size ?? 10) + 4;
  };

  const wrapped = (text: string, opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number } = {}) => {
    const size = opts.size ?? 9;
    const lines = wrapText(text, opts.f ?? font, size, opts.maxWidth ?? CONTENT_WIDTH);
    for (const l of lines) line(l, { size, f: opts.f, color: opts.color });
  };

  const rule = () => {
    ensureSpace(14);
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: MARGIN_X + CONTENT_WIDTH, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 14;
  };

  /* ---------- Header ---------- */
  line(`Case ${c.id} — ${CASE_TYPE_LABEL[c.caseType]}`, { size: 16, f: bold, color: NAVY, gap: 22 });
  line('DHL Case Resolution Report', { size: 9, color: GRAY, gap: 18 });

  /* ---------- Case summary ---------- */
  line('Case Details', { size: 11, f: bold, color: NAVY, gap: 16 });
  wrapped(`DHL notification: ${c.dhlDescription}`, { size: 9 });
  line(`Package: ${c.packageId}    Customer: ${c.customer}`, { size: 9 });
  line(`Address: ${c.stopAddress}, ${c.postcode}`, { size: 9 });
  line(`Case value: £${c.caseValue.toFixed(2)}`, { size: 9, f: bold });
  line(`DHL reported: ${formatDateTime(c.dhlReportedAt)}`, { size: 9 });
  line(`Route: ${c.routeName}    Route driver: ${c.driverName}`, { size: 9 });
  if (c.assignedAt) line(`Sent to driver: ${formatDateTime(c.assignedAt)}`, { size: 9 });
  y -= 6;
  rule();

  /* ---------- Timeline ---------- */
  line('Case Timeline', { size: 11, f: bold, color: NAVY, gap: 16 });

  for (const entry of c.updates) {
    ensureSpace(30);
    line(`${entry.authorName} (${entry.authorType === 'driver' ? 'Driver' : 'Admin'}) — ${formatDateTime(entry.createdAt)}`, {
      size: 9.5, f: bold,
    });
    wrapped(entry.note || 'No note provided.', { size: 9, color: BLACK });
    if (entry.outcome) {
      line(entry.outcome === 'resolved' ? 'Outcome: Resolved' : 'Outcome: Not Resolved', {
        size: 9, f: bold, color: entry.outcome === 'resolved' ? GREEN : RED,
      });
    }

    if (entry.photos.length > 0) {
      const thumbSize = 90;
      const gap = 8;
      const perRow = Math.max(1, Math.floor(CONTENT_WIDTH / (thumbSize + gap)));
      let col = 0;

      ensureSpace(thumbSize + 8);
      let rowStartY = y;

      for (const photo of entry.photos) {
        if (col === perRow) {
          col = 0;
          y = rowStartY - thumbSize - gap;
          ensureSpace(thumbSize + 8);
          rowStartY = y;
        }

        const x = MARGIN_X + col * (thumbSize + gap);
        const decoded = decodeDataUrl(photo);
        let embedded: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;

        if (decoded) {
          try {
            if (decoded.mime === 'image/png') embedded = await pdf.embedPng(decoded.bytes);
            else if (decoded.mime === 'image/jpeg' || decoded.mime === 'image/jpg') embedded = await pdf.embedJpg(decoded.bytes);
          } catch {
            embedded = null;
          }
        }

        if (embedded) {
          const scale = Math.min(thumbSize / embedded.width, thumbSize / embedded.height);
          const w = embedded.width * scale;
          const h = embedded.height * scale;
          page.drawRectangle({ x, y: rowStartY - thumbSize, width: thumbSize, height: thumbSize, color: rgb(0.95, 0.95, 0.95) });
          page.drawImage(embedded, { x: x + (thumbSize - w) / 2, y: rowStartY - thumbSize + (thumbSize - h) / 2, width: w, height: h });
        } else {
          page.drawRectangle({ x, y: rowStartY - thumbSize, width: thumbSize, height: thumbSize, color: rgb(0.95, 0.95, 0.95) });
          page.drawText('photo', { x: x + 10, y: rowStartY - thumbSize / 2, size: 8, font, color: GRAY });
        }

        col++;
      }

      y = rowStartY - thumbSize - 12;
    }

    y -= 8;
  }

  rule();

  /* ---------- Outcome + feedback ---------- */
  if (c.status === 'closed') {
    line('Resolution', { size: 11, f: bold, color: NAVY, gap: 16 });
    line(c.outcome === 'resolved' ? 'Outcome: Resolved' : 'Outcome: Not Resolved', {
      size: 10, f: bold, color: c.outcome === 'resolved' ? GREEN : RED,
    });
    if (c.closedAt) line(`Closed: ${formatDateTime(c.closedAt)}`, { size: 9 });
    if (c.deductionRefNumber) {
      line(`Liquidation Damage deduction ${c.deductionRefNumber} — £${c.caseValue.toFixed(2)}`, { size: 9, color: RED });
    }

    if (c.feedback) {
      y -= 6;
      line('Feedback to DHL', { size: 10, f: bold, color: NAVY });
      wrapped(c.feedback, { size: 9 });
      if (c.feedbackAt) line(`Submitted: ${formatDateTime(c.feedbackAt)}`, { size: 8, color: GRAY });
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}
