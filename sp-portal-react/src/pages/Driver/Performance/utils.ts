/**
 * Ported 1:1 from the reference app's app/(private)/current-performance/utils.ts —
 * value -> semantic color-class classifiers shared by MonthlyAverages and
 * DailyBreakdownTable.
 */

export function getTimeWindowClass(twValue: string): string {
  if (twValue === 'N/A' || twValue === '--:--' || twValue === '0.0%') return 'na-value';

  const percentage = parseFloat(twValue);
  if (percentage >= 90) return 'positive-value';
  if (percentage >= 80 && percentage < 90) return 'warning-value';
  return 'negative-value';
}

export function getSporHClass(sporHValue: string): string {
  if (sporHValue === 'N/A' || sporHValue === '--:--' || sporHValue === '0.0') return 'na-value';

  const value = parseFloat(sporHValue);
  // 80-89 is treated as a (yellow) warning band first, then >=90 as positive,
  // then falls back to the original SPOR-H threshold of 18 stops/hour.
  if (value >= 80 && value < 90) return 'warning-value';
  if (value >= 90) return 'positive-value';
  if (value >= 18.0) return 'positive-value';
  return 'negative-value';
}
