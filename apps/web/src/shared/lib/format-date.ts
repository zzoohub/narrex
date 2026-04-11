/**
 * Format a date string or Date into a locale-aware short date.
 * Defaults to ko-KR format (e.g. "2026. 4. 12.").
 */
export function formatDate(
  date: string | Date,
  locale: string = 'ko-KR',
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
