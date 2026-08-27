export function parseTimestamp(date?: string | null, time?: string | null): string | null {
  return date && time ? new Date(date + ' ' + time).toISOString() : null;
}
