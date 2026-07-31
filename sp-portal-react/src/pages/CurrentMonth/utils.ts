export const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const formatTime = (timeString: string): string => {
  return timeString.substring(0, 5);
};

export const formatCurrency = (amount: string): string => {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(parseFloat(amount));
};

export const getVehicleIcon = (vehicleModel: string): string => {
  const model = vehicleModel.toLowerCase();

  if (model.includes('van') || model.includes('bullet') || model.includes('transit')) {
    return 'bi-truck';
  } else if (model.includes('car') || model.includes('sedan')) {
    return 'bi-car-front';
  } else if (model.includes('bike') || model.includes('motorcycle')) {
    return 'bi-bicycle';
  } else if (model.includes('cargo')) {
    return 'bi-box-seam';
  }

  return 'bi-truck';
};

export const calculateAvgHourlyRate = (amountTotal: string, workedHours: string | null): string => {
  if (!workedHours) return "£0.00";
  const hours = parseFloat(workedHours);
  if (hours === 0) return "£0.00";
  const amount = parseFloat(amountTotal);
  const avg = amount / hours;
  return formatCurrency(avg.toFixed(2));
};
