/**
 * Subset of the Next.js app's week-planner `dateUtils.ts` used by Daily Game Plan's
 * header title ("Daily Game Plan - Monday - 09/04 - Week 15"). Ported verbatim.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

export function formatDate(date: Date | string, format: string = 'yyyy-mm-dd'): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  switch (format) {
    case 'dd/mm':
      return `${day}/${month}`;
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`;
    case 'mm/dd':
      return `${month}/${day}`;
    case 'yyyy-mm-dd':
    default:
      return `${year}-${month}-${day}`;
  }
}

export function getDayNameEn(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

export function getISOWeekNumber(date: Date | string): number | null {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  if (!(d instanceof Date) || Number.isNaN(d.valueOf())) return null;
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return Number.isFinite(weekNumber) ? weekNumber : null;
}
