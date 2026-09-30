import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from './fetch-all-pages'
import type { PageResponse } from './page'

function makePage(
  page: number,
  pages: number,
  size: number,
): PageResponse<number> {
  return {
    content: Array.from({ length: size }, (_, i) => page * size + i),
    page,
    size,
    totalElements: pages * size,
    totalPages: pages,
    last: page === pages - 1,
  }
}

describe('fetchAllPages', () => {
  it('walks every page until last', async () => {
    const fetchPage = vi.fn((p: number) => Promise.resolve(makePage(p, 3, 2)))
    const res = await fetchAllPages(fetchPage)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(res.items).toEqual([0, 1, 2, 3, 4, 5])
    expect(res.capped).toBe(false)
    expect(res.total).toBe(6)
  })

  it('asks for the maximum page size', async () => {
    const fetchPage = vi.fn((p: number, size: number) =>
      Promise.resolve(makePage(p, 1, size)),
    )
    await fetchAllPages(fetchPage)
    expect(fetchPage).toHaveBeenCalledWith(0, 100)
  })

  it('stops at the safety cap and flags it', async () => {
    const fetchPage = vi.fn((p: number) => Promise.resolve(makePage(p, 50, 1)))
    const res = await fetchAllPages(fetchPage, 4)
    expect(fetchPage).toHaveBeenCalledTimes(4)
    expect(res.capped).toBe(true)
    expect(res.items).toHaveLength(4)
    expect(res.total).toBe(50)
  })

  it('handles an empty result', async () => {
    const res = await fetchAllPages(() =>
      Promise.resolve({
        content: [],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
        last: true,
      }),
    )
    expect(res).toEqual({ items: [], total: 0, capped: false })
  })
})

describe('fetchAllPages dedupe', () => {
  it('drops rows seen twice (same id) when rows shift between pages', async () => {
    const pages = [
      [{ id: 3 }, { id: 2 }],
      [{ id: 2 }, { id: 1 }],
    ]
    const res = await fetchAllPages((p) =>
      Promise.resolve({
        content: pages[p],
        page: p,
        size: 2,
        totalElements: 3,
        totalPages: 2,
        last: p === 1,
      }),
    )
    expect(res.items.map((i) => i.id)).toEqual([3, 2, 1])
  })
})
