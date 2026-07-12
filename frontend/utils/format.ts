/** Formatting helpers. */

/** Format a date value as a locale date string. */
export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString();
}

/** Format a date value as a locale date-time string. */
export function formatDateTime(value: string | number | Date): string {
  return new Date(value).toLocaleString();
}

/** Truncate a string to a maximum length with an ellipsis. */
export function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max)}\u2026` : value;
}
