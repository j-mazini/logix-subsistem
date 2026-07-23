function ukPhoneNationalDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  let national = digits;
  if (national.startsWith('0044')) national = national.slice(4);
  else if (national.startsWith('44')) national = national.slice(2);
  if (national.startsWith('0')) national = national.slice(1);

  return national;
}

export function isValidUkPhone(value: unknown) {
  if (typeof value !== 'string') return false;
  return /^7\d{9}$/.test(ukPhoneNationalDigits(value));
}

export function formatUkPhone(value: string) {
  const trimmed = value.trim();
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  if (trimmed.startsWith('+') && !digits.startsWith('44')) {
    return `+${digits.slice(0, 12)}`;
  }

  const preferInternational =
    trimmed.startsWith('+44') || digits.startsWith('44') || digits.startsWith('0044');
  const national = ukPhoneNationalDigits(value).slice(0, 10);

  if (preferInternational) {
    if (national.length <= 4) return `+44 ${national}`.trimEnd();
    if (national.length <= 7) return `+44 ${national.slice(0, 4)} ${national.slice(4)}`;
    return `+44 ${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}`;
  }

  const local = `0${national}`;
  if (local.length <= 5) return local;
  if (local.length <= 8) return `${local.slice(0, 5)} ${local.slice(5)}`;
  return `${local.slice(0, 5)} ${local.slice(5, 8)} ${local.slice(8)}`;
}
