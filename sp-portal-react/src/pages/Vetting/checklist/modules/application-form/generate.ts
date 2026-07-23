import type { ChecklistCandidate } from '../central-driver-record/model';
import { buildApplicationFormPdf, safeFilename } from './build';

function triggerDownload(bytes: Uint8Array, filename: string) {
  const pdfBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatSignatureDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Admin-side: download the prefilled form for a candidate, including the
// typed electronic signature captured during apply when available.
export async function downloadApplicationForm(candidate: ChecklistCandidate) {
  const applicationForm = candidate.checklistDocs.application_form ?? {};
  const signatureStatus =
    applicationForm.signature_status || applicationForm.__documentStatus || '';
  const signatureText =
    applicationForm.signature_text?.trim() ||
    applicationForm.signer_name?.trim() ||
    candidate.name;
  const signature =
    signatureStatus.toLowerCase() === 'signed'
      ? {
          fullName: applicationForm.signer_name?.trim() || candidate.name,
          signatureText,
          date: formatSignatureDate(applicationForm.signed_at),
        }
      : undefined;

  const bytes = await buildApplicationFormPdf({
    name: candidate.name,
    address: candidate.address,
    postcode: candidate.postcode,
    phone: candidate.phone,
    email: candidate.email,
    nin: candidate.nin,
  }, signature);
  triggerDownload(bytes, `BA_Express_Application_Form_${safeFilename(candidate.name)}.pdf`);
}
