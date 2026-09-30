/** Lower-case, accent-free form used for matching. */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Words of a query, normalised (accents/case ignored), empty ones dropped. */
export function queryWords(query: string): string[] {
  return normalizeSearch(query).split(/\s+/).filter(Boolean)
}

/** True when every word of `query` appears in `haystack` (accents and case ignored). */
export function matchesWords(haystack: string, query: string): boolean {
  const words = queryWords(query)
  if (words.length === 0) return true
  const h = normalizeSearch(haystack)
  return words.every((w) => h.includes(w))
}

export interface SearchableOption {
  value: string
  label: string
  /** Secondary text shown under the label and matched by the search (e.g. a code). */
  hint?: string
}

/** Options whose label or hint contains every word of the query (accents and case ignored). */
export function filterOptions(
  options: SearchableOption[],
  query: string,
): SearchableOption[] {
  if (queryWords(query).length === 0) return options
  return options.filter((o) =>
    matchesWords(`${o.label} ${o.hint ?? ''}`, query),
  )
}
