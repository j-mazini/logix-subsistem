export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Tomorrow (next calendar day) in local time, ISO date. */
export function getTomorrowISODate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

/**
 * Day off can be requested for any future day.
 * Only for tomorrow is the 12:00 rule applied.
 */
export function canRequestDayOffForDate(
  requestedDateISO: string,
): { allowed: boolean; message?: string } {
  const now = new Date();
  const todayISO = toISODate(now);
  const tomorrowISO = getTomorrowISODate();

  if (requestedDateISO <= todayISO) {
    return {
      allowed: false,
      message: "Please select a future date for your day off.",
    };
  }

  // Only for tomorrow: must request before 12:00 today
  if (requestedDateISO === tomorrowISO) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour > 12 || (hour === 12 && minute > 0)) {
      return {
        allowed: false,
        message:
          "Day off for tomorrow can only be requested until 12:00 today. It is too late to submit this request.",
      };
    }
  }

  return { allowed: true };
}
