import type { PageResponse } from '#/lib/page'
import { MAX_PAGE_SIZE } from '#/lib/page'

export const DEFAULT_MAX_PAGES = 20

export interface AllPages<T> {
  items: T[]
  /** Total announced by the backend (may exceed `items.length` when capped). */
  total: number
  /** True when the safety cap stopped the loop before the last page. */
  capped: boolean
}

function idOf(item: unknown): unknown {
  return typeof item === 'object' && item !== null && 'id' in item
    ? item.id
    : undefined
}

/**
 * Walks a paginated endpoint until `last` (size 100 = backend maximum).
 * The hard `maxPages` cap protects the browser and the API from a runaway
 * loop; callers should sort newest-first so the cap drops the oldest rows.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<PageResponse<T>>,
  maxPages: number = DEFAULT_MAX_PAGES,
): Promise<AllPages<T>> {
  const items: T[] = []
  // Rows inserted while we page shift the following pages: a row can then be
  // returned twice. Rows carrying an `id` are deduplicated on it.
  const seen = new Set<unknown>()
  let total = 0
  for (let page = 0; page < maxPages; page++) {
    const res = await fetchPage(page, MAX_PAGE_SIZE)
    for (const item of res.content) {
      const id = idOf(item)
      if (id !== undefined) {
        if (seen.has(id)) continue
        seen.add(id)
      }
      items.push(item)
    }
    total = res.totalElements
    if (res.last || res.content.length === 0) {
      return { items, total, capped: false }
    }
  }
  return { items, total, capped: true }
}
