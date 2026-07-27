export const DEPOT_SORT_HOURS = 0.5;

export function parseWorkedHoursToDecimal(hours: string | number): number {
  if (typeof hours === 'number') return hours;
  if (!hours) return 0;

  const parts = String(hours).split(':');
  if (parts.length === 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h + m / 60;
  }

  return parseFloat(String(hours)) || 0;
}

export function formatHours(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

export function getVendorExtraHoursOnly(hours: string | number | undefined | null): number {
  if (!hours) return 0;
  const decimal = parseWorkedHoursToDecimal(hours);
  return Math.max(0, decimal - DEPOT_SORT_HOURS);
}

export function hasSortY(data: any): boolean {
  return data && data.sortY > 0;
}

export function getDepotFromRouteName(routeName) {
  if (!routeName) return '';
  return routeName.substring(0, 2);
}
