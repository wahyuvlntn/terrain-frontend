/** A `start` / `end` URL value as the page uses it: '' when it is not a date (a bad link) */
export const validDay = (value: string | null) =>
  value && Number.isNaN(Date.parse(value)) ? '' : value;

export function parseTimestamp(date?: string | null, time?: string | null): string | null {
  return date && time ? new Date(date + ' ' + time).toISOString() : null;
}
