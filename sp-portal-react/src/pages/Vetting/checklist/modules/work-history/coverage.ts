export interface EmploymentRecord {
  company: string;
  email?: string;
  role: string;
  start: string;
  end: string;
  method?: string;
}

export interface CoverageResult {
  complete: boolean;
  coveredDays: number;
  requiredDays: number;
  missingDays: number;
  gapCount: number;
  maxGapDays: number;
  hasGapOver28Days: boolean;
  summary: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const brDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parts = brDate
    ? [Number(brDate[3]), Number(brDate[2]), Number(brDate[1])]
    : isoDate
      ? [Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])]
      : null;
  if (!parts) return null;

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function daysBetween(start: Date, end: Date) {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function extractEmploymentRecords(
  fields: Record<string, string>,
  maxRecords = 6,
): EmploymentRecord[] {
  return Array.from({ length: maxRecords }, (_, index) => {
    const slot = index + 1;
    return {
      company: fields[`employer_${slot}_name`] ?? '',
      email: fields[`employer_${slot}_email`] ?? '',
      role: fields[`employer_${slot}_role`] ?? '',
      start: fields[`employer_${slot}_start`] ?? '',
      end: fields[`employer_${slot}_end`] ?? '',
      method: fields[`employer_${slot}_method`] ?? '',
    };
  });
}

export function calculateFiveYearCoverage(
  records: EmploymentRecord[],
  asOf = new Date(),
): CoverageResult {
  const windowEnd = startOfDay(asOf);
  const windowStart = new Date(windowEnd);
  windowStart.setFullYear(windowStart.getFullYear() - 5);

  const intervals = records
    .map((record) => {
      const start = parseDate(record.start);
      const parsedEnd = parseDate(record.end);
      const end = parsedEnd ? addDays(parsedEnd, 1) : windowEnd;
      if (!record.company.trim() || !start) return null;
      if (end <= windowStart || start >= windowEnd) return null;
      return {
        start: start < windowStart ? windowStart : start,
        end: end > windowEnd ? windowEnd : end,
      };
    })
    .filter((item): item is { start: Date; end: Date } => Boolean(item))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Array<{ start: Date; end: Date }> = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) {
      merged.push({ ...interval });
    } else if (interval.end > last.end) {
      last.end = interval.end;
    }
  }

  const coveredDays = merged.reduce(
    (total, interval) => total + daysBetween(interval.start, interval.end),
    0,
  );
  const requiredDays = daysBetween(windowStart, windowEnd);
  const missingDays = Math.max(0, requiredDays - coveredDays);
  const lastInterval = merged[merged.length - 1];
  const gaps: number[] = [];
  if (!merged.length) {
    gaps.push(requiredDays);
  } else if (merged[0].start > windowStart) {
    gaps.push(daysBetween(windowStart, merged[0].start));
  }
  for (let index = 1; index < merged.length; index += 1) {
    gaps.push(daysBetween(merged[index - 1].end, merged[index].start));
  }
  if (lastInterval?.end < windowEnd) {
    gaps.push(daysBetween(lastInterval.end, windowEnd));
  }
  const gapCount = gaps.length;
  const maxGapDays = gaps.length ? Math.max(...gaps) : 0;
  const hasGapOver28Days = maxGapDays >= 28;
  const complete = missingDays === 0;
  const coveredYears = coveredDays / 365;
  const missingMonths = Math.ceil(missingDays / 30);

  return {
    complete,
    coveredDays,
    requiredDays,
    missingDays,
    gapCount,
    maxGapDays,
    hasGapOver28Days,
    summary: complete
      ? `5-year coverage complete (${coveredYears.toFixed(1)} years recorded).`
      : hasGapOver28Days
        ? `5-year coverage flag: ${coveredYears.toFixed(1)} years recorded; largest gap is ${maxGapDays} day(s).`
        : `Coverage incomplete: ${coveredYears.toFixed(1)} years recorded; about ${missingMonths} month(s) missing.`,
  };
}
