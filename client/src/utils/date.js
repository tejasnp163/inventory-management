/**
 * Format a date string for display. Locale-aware: pass 'ja' for Japanese formatting.
 * Returns '-' for null/undefined/invalid input.
 */
export function formatDate(dateString, locale = 'en') {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  const langLocale = locale === 'ja' ? 'ja-JP' : 'en-US'
  return date.toLocaleDateString(langLocale, { month: 'short', day: 'numeric', year: 'numeric' })
}
