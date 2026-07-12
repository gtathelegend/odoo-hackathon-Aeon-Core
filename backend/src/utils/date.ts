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

/** Return true when the given date is strictly in the past. */
export function isPast(date: Date | string | number): boolean {
  return new Date(date).getTime() < Date.now();
}
