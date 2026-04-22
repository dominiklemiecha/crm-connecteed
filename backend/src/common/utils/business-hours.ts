/**
 * Adds a number of business minutes to a start date, skipping weekends
 * and non-business hours.
 *
 * @param startDate  The starting date/time
 * @param minutes    Number of business minutes to add
 * @param businessHours  Business hours window (default 9:00-18:00)
 * @returns The resulting date after adding business minutes
 */
export function addBusinessMinutes(
  startDate: Date,
  minutes: number,
  businessHours?: { start: number; end: number },
): Date {
  const bh = businessHours || { start: 9, end: 18 };
  const businessMinutesPerDay = (bh.end - bh.start) * 60;
  let remaining = minutes;
  const result = new Date(startDate);

  while (remaining > 0) {
    const dayOfWeek = result.getDay();

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      result.setDate(result.getDate() + 1);
      result.setHours(bh.start, 0, 0, 0);
      continue;
    }

    const currentHour = result.getHours() + result.getMinutes() / 60;

    // Before business hours — advance to start
    if (currentHour < bh.start) {
      result.setHours(bh.start, 0, 0, 0);
      continue;
    }

    // After business hours — advance to next day start
    if (currentHour >= bh.end) {
      result.setDate(result.getDate() + 1);
      result.setHours(bh.start, 0, 0, 0);
      continue;
    }

    // During business hours
    const minutesLeftToday = (bh.end - currentHour) * 60;
    if (remaining <= minutesLeftToday) {
      result.setTime(result.getTime() + remaining * 60000);
      remaining = 0;
    } else {
      remaining -= minutesLeftToday;
      result.setDate(result.getDate() + 1);
      result.setHours(bh.start, 0, 0, 0);
    }
  }

  return result;
}
