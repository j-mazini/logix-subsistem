/** Input masks and checks for the UK payment/tax fields — typed straight off a bank card or an HMRC letter. */

/** "204512" / "20 45 12" → "20-45-12", the form UK sort codes are always written in. */
export function formatSortCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.replace(/(\d{2})(?=\d)/g, "$1-");
}

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function formatNiNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
}

/**
 * Validates only what the driver filled in — an empty field is "not provided
 * yet", not an error, since nothing here is captured at sign-up.
 * Returns the first problem found, or null when the form can be saved.
 */
export function validatePaymentDetails(profile: {
  bankSortCode: string;
  bankAccountNumber: string;
  niNumber: string;
  utr: string;
}): string | null {
  const sortCode = profile.bankSortCode.replace(/\D/g, "");
  if (sortCode && sortCode.length !== 6) return "Sort code needs 6 digits";

  const account = profile.bankAccountNumber.replace(/\D/g, "");
  if (account && account.length !== 8) return "Account number needs 8 digits";

  // Two letters, six digits, then a final letter A–D.
  if (profile.niNumber && !/^[A-Z]{2}\d{6}[A-D]$/.test(profile.niNumber)) {
    return "National Insurance number should look like QQ123456C";
  }

  const utr = profile.utr.replace(/\D/g, "");
  if (utr && utr.length !== 10) return "UTR needs 10 digits";

  return null;
}
