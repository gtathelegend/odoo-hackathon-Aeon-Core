/** Return the current timestamp as an ISO string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Format a date as an ISO string, accepting Date | string | number input. */
export function toIso(value: Date | string | number): string {
  return new Date(value).toISOString();
}

/** Add a number of days to a date and return the new date. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Add a number of minutes to a date and return the new date. */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/** Return true when the given date is strictly in the past. */
export function isPast(date: Date | string | number): boolean {
  return new Date(date).getTime() < Date.now();
}

/** Return the difference between two dates in whole milliseconds. */
export function diffMs(a: Date | string | number, b: Date | string | number): number {
  return new Date(a).getTime() - new Date(b).getTime();
}
