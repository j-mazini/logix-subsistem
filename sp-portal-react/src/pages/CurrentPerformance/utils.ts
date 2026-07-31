export const getTimeWindowClass = (twValue: string): string => {
  if (twValue === 'N/A' || twValue === '--:--' || twValue === '0.0%') return 'na-value';

  const percentage = parseFloat(twValue);
  if (percentage >= 90) return 'positive-value';
  if (percentage >= 80 && percentage < 90) return 'warning-value';
  return 'negative-value';
};

export const getSporHClass = (sporHValue: string): string => {
  if (sporHValue === 'N/A' || sporHValue === '--:--' || sporHValue === '0.0') return 'na-value';

  const value = parseFloat(sporHValue);
  if (value >= 80 && value < 90) return 'warning-value';
  if (value >= 90) return 'positive-value';
  if (value >= 18.0) return 'positive-value';
  return 'negative-value';
};

export const parseDateLocal = (dateString: string): Date => {
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  return new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
};
