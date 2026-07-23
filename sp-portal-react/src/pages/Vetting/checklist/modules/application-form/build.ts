import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Personal details that go onto the BA Express / Driver Application Form.
export interface ApplicationFormFields {
  name: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  nin: string;
}

// Optional sign-off block. `signatureImageDataUrl` is a PNG data URL captured
// from the in-browser signature pad; when absent we render `signatureText` in
// italic as the signature, falling back to the applicant's full name.
export interface ApplicationFormSignature {
  fullName: string;
  date: string; // already formatted for display, e.g. "18 June 2026"
  signatureText?: string;
  signatureImageDataUrl?: string;
}

export function safeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstNames: parts[0] ?? '', surname: '' };
  return {
    firstNames: parts.slice(0, -1).join(' '),
    surname: parts.at(-1) ?? '',
  };
}

function fitText(value: string, maxLength: number) {
  const clean = value.trim();
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1)}…`;
}

// Coordinates measured against the template PDF (A4, 596×842pt, origin
// bottom-left) with a calibration ruler overlay:
//   last CAA declaration text line . baseline ≈ 304
//   FULL NAME / SIGNATURE / DATE labels . baseline ≈ 288
//   printed signature rule (black line) .. y ≈ 261.5
//   "Company Reg No." footer text ....... baseline ≈ 119
// Values must sit between the labels and the rule so they rest on the line
// like a hand-filled form, clear of both the declaration and the footer.
const PERSONAL_ROW_BASELINES = [582, 561, 540, 519, 498, 477, 456];
const SIGN_BLOCK = {
  baseline: 266, // descenders just touch the printed rule at y≈261.5
  ruleY: 261.5,
  fullNameX: 80,
  signatureX: 224,
  dateX: 373,
  signatureWidth: 130,
  signatureHeight: 22, // keeps a drawn signature image below the labels at y≈288
};

/**
 * Load the BA Application Form template, fill the personal details and, when a
 * signature is supplied, stamp the FULL NAME / SIGNATURE / DATE block.
 * Returns the PDF bytes (use for download or upload).
 */
export async function buildApplicationFormPdf(
  fields: ApplicationFormFields,
  signature?: ApplicationFormSignature,
): Promise<Uint8Array> {
  const response = await fetch('/documents/BA_Express_Application_Form.pdf');
  if (!response.ok) throw new Error('Unable to load the BA Express Application Form.');

  const pdf = await PDFDocument.load(await response.arrayBuffer());
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const { firstNames, surname } = splitName(fields.name);

  const rows = [
    fitText(firstNames, 34),
    fitText(surname, 34),
    fitText(fields.address, 52),
    fitText(fields.postcode, 18),
    fitText(fields.phone, 24),
    fitText(fields.email, 48),
    fitText(fields.nin, 20),
  ];

  PERSONAL_ROW_BASELINES.forEach((baseline, index) => {
    page.drawRectangle({
      x: 198,
      y: baseline - 5,
      width: 310,
      height: 18,
      color: rgb(1, 1, 1),
    });
    page.drawText(rows[index] || '—', {
      x: 203,
      y: baseline,
      size: 10,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });
  });

  if (signature) {
    const ink = rgb(0.05, 0.1, 0.4);
    const signatureText = signature.signatureText?.trim() || signature.fullName;

    page.drawText(fitText(signature.fullName, 26), {
      x: SIGN_BLOCK.fullNameX,
      y: SIGN_BLOCK.baseline,
      size: 11,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });

    page.drawText(fitText(signature.date, 18), {
      x: SIGN_BLOCK.dateX,
      y: SIGN_BLOCK.baseline,
      size: 11,
      font,
      color: rgb(0.08, 0.08, 0.08),
    });

    if (signature.signatureImageDataUrl) {
      const png = await pdf.embedPng(signature.signatureImageDataUrl);
      const scaled = png.scaleToFit(SIGN_BLOCK.signatureWidth, SIGN_BLOCK.signatureHeight);
      page.drawImage(png, {
        x: SIGN_BLOCK.signatureX,
        y: SIGN_BLOCK.ruleY + 1, // rest the drawn signature on the printed rule
        width: scaled.width,
        height: scaled.height,
      });
    } else {
      page.drawText(fitText(signatureText, 26), {
        x: SIGN_BLOCK.signatureX,
        y: SIGN_BLOCK.baseline,
        size: 14,
        font: italic,
        color: ink,
      });
    }
  }

  return pdf.save();
}
