import { describe, expect, it } from 'vitest'
import {
  activationsInRange,
  compactAxis,
  compactFcfa,
  conversionRate,
  countCreatedInRange,
  inRange,
  latestBy,
  monthlyActivations,
  describeTrend,
  percentChange,
  periodRanges,
  portfolioStats,
  productBreakdown,
  sumPremiums,
} from './dashboard-stats'
import type { ContractLike } from './dashboard-stats'

const NOW = new Date(2026, 8, 30, 15, 0, 0) // 30 sept. 2026

function contract(
  over: Partial<ContractLike> & { label?: string },
): ContractLike {
  return {
    status: 'ACTIVE',
    totalPremium: 100,
    createdAt: '2026-09-01T10:00:00',
    activatedAt: null,
    productSnapshot: { productLabel: over.label ?? 'IA Standard' },
    ...over,
  }
}

describe('periodRanges', () => {
  it('day', () => {
    const { current, previous } = periodRanges('Jour', NOW)
    expect(current.start).toEqual(new Date(2026, 8, 30))
    expect(current.end).toEqual(new Date(2026, 9, 1))
    expect(previous.start).toEqual(new Date(2026, 8, 29))
  })
  it('month', () => {
    const { current, previous } = periodRanges('Mois', NOW)
    expect(current.start).toEqual(new Date(2026, 8, 1))
    expect(current.end).toEqual(new Date(2026, 9, 1))
    expect(previous.start).toEqual(new Date(2026, 7, 1))
  })
  it('quarter', () => {
    const { current, previous } = periodRanges('Trimestre', NOW)
    expect(current.start).toEqual(new Date(2026, 6, 1))
    expect(current.end).toEqual(new Date(2026, 9, 1))
    expect(previous.start).toEqual(new Date(2026, 3, 1))
  })
  it('year, across the year boundary for the previous period', () => {
    const { current, previous } = periodRanges('Année', NOW)
    expect(current.start).toEqual(new Date(2026, 0, 1))
    expect(previous.start).toEqual(new Date(2025, 0, 1))
    expect(previous.end).toEqual(new Date(2025, 8, 30, 15, 0, 0))
  })
  describe('previous period covers the same elapsed duration', () => {
    it('day: yesterday until the same hour', () => {
      const { current, previous } = periodRanges('Jour', NOW)
      expect(previous.start).toEqual(new Date(2026, 8, 29))
      expect(previous.end).toEqual(new Date(2026, 8, 29, 15, 0, 0))
      expect(current.end.getTime()).toBeGreaterThan(NOW.getTime())
    })
    it('month: 1–3 Sept vs 1–3 Aug', () => {
      const { previous } = periodRanges('Mois', new Date(2026, 8, 3, 10, 30))
      expect(previous.start).toEqual(new Date(2026, 7, 1))
      expect(previous.end).toEqual(new Date(2026, 7, 3, 10, 30))
    })
    it('month: 31 Mar clamps to the end of February (28 days)', () => {
      const { previous } = periodRanges('Mois', new Date(2026, 2, 31, 9))
      expect(previous.start).toEqual(new Date(2026, 1, 1))
      expect(previous.end).toEqual(new Date(2026, 2, 1))
    })
    it('month: 31 Mar clamps to the end of February (leap year, 29 days)', () => {
      const { previous } = periodRanges('Mois', new Date(2028, 2, 31, 9))
      expect(previous.start).toEqual(new Date(2028, 1, 1))
      expect(previous.end).toEqual(new Date(2028, 2, 1))
    })
    it('month: 30 Mar maps to 28 Feb midnight bound, not beyond', () => {
      const { previous } = periodRanges('Mois', new Date(2026, 2, 28, 9))
      expect(previous.end).toEqual(new Date(2026, 1, 28, 9))
    })
    it('quarter: 15 Aug (Q3) vs 15 May (Q2)', () => {
      const { previous } = periodRanges('Trimestre', new Date(2026, 7, 15, 8))
      expect(previous.start).toEqual(new Date(2026, 3, 1))
      expect(previous.end).toEqual(new Date(2026, 4, 15, 8))
    })
    it('quarter: 31 May clamps to the end of February', () => {
      const { previous } = periodRanges('Trimestre', new Date(2026, 4, 31, 8))
      expect(previous.start).toEqual(new Date(2026, 0, 1))
      expect(previous.end).toEqual(new Date(2026, 2, 1))
    })
    it('year: 29 Feb clamps to 1 Mar of a non-leap previous year', () => {
      const { previous } = periodRanges('Année', new Date(2028, 1, 29, 8))
      expect(previous.start).toEqual(new Date(2027, 0, 1))
      expect(previous.end).toEqual(new Date(2027, 2, 1))
    })
    it('year: 30 Sept 2026 vs 30 Sept 2025', () => {
      const { previous } = periodRanges('Année', NOW)
      expect(previous.end).toEqual(new Date(2025, 8, 30, 15, 0, 0))
    })
    it('never runs past the full previous period', () => {
      for (const period of ['Jour', 'Mois', 'Trimestre', 'Année'] as const) {
        for (let d = 0; d < 400; d += 7) {
          const now = new Date(2027, 0, 1 + d, 23, 59)
          const { current, previous } = periodRanges(period, now)
          expect(previous.end.getTime()).toBeLessThanOrEqual(
            current.start.getTime(),
          )
          expect(previous.end.getTime()).toBeGreaterThan(
            previous.start.getTime(),
          )
        }
      }
    })
  })
  it('month in January looks back to December', () => {
    const { previous } = periodRanges('Mois', new Date(2026, 0, 15))
    expect(previous.start).toEqual(new Date(2025, 11, 1))
  })
})

describe('inRange', () => {
  const { current } = periodRanges('Mois', NOW)
  it('is start-inclusive and end-exclusive', () => {
    expect(inRange('2026-09-01T00:00:00', current)).toBe(true)
    expect(inRange('2026-09-30T23:59:59', current)).toBe(true)
    expect(inRange('2026-10-01T00:00:00', current)).toBe(false)
    expect(inRange('2026-08-31T23:59:59', current)).toBe(false)
  })
  it('rejects missing or invalid dates', () => {
    expect(inRange(null, current)).toBe(false)
    expect(inRange('nope', current)).toBe(false)
  })
})

describe('portfolioStats / sums', () => {
  const rows = [
    contract({ status: 'ACTIVE', totalPremium: 294 }),
    contract({ status: 'ACTIVE', totalPremium: 293 }),
    contract({ status: 'PENDING_PAYMENT', totalPremium: 7000 }),
    contract({ status: 'CANCELLED', totalPremium: 999 }),
  ]
  it('splits active and pending', () => {
    expect(portfolioStats(rows)).toEqual({
      activeCount: 2,
      activePremium: 587,
      pendingCount: 1,
      pendingPremium: 7000,
    })
  })
  it('handles an empty list', () => {
    expect(portfolioStats([])).toEqual({
      activeCount: 0,
      activePremium: 0,
      pendingCount: 0,
      pendingPremium: 0,
    })
    expect(sumPremiums([])).toBe(0)
  })
})

describe('period figures', () => {
  const rows = [
    contract({ activatedAt: '2026-09-29T10:00:00', totalPremium: 200 }),
    contract({ activatedAt: '2026-09-02T10:00:00', totalPremium: 50 }),
    contract({ activatedAt: '2026-08-15T10:00:00', totalPremium: 70 }),
    contract({ status: 'PENDING_PAYMENT', activatedAt: null }),
  ]
  it('counts activations per period using activatedAt', () => {
    const r = periodRanges('Mois', NOW)
    expect(activationsInRange(rows, r.current)).toEqual({
      count: 2,
      premium: 250,
    })
    expect(activationsInRange(rows, r.previous)).toEqual({
      count: 1,
      premium: 70,
    })
    expect(activationsInRange(rows, periodRanges('Jour', NOW).current)).toEqual(
      {
        count: 0,
        premium: 0,
      },
    )
  })
  it('counts created rows in a range', () => {
    const clients = [
      { createdAt: '2026-09-10T00:00:00' },
      { createdAt: '2026-01-10T00:00:00' },
    ]
    expect(
      countCreatedInRange(clients, periodRanges('Mois', NOW).current),
    ).toBe(1)
    expect(
      countCreatedInRange(clients, periodRanges('Année', NOW).current),
    ).toBe(2)
  })
  it('percentChange needs a base', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(5, 0)).toBeNull()
  })
})

describe('monthlyActivations', () => {
  it('returns 12 buckets oldest first including empty months', () => {
    const rows = [
      contract({ activatedAt: '2026-09-29T10:00:00', totalPremium: 200 }),
      contract({ activatedAt: '2026-09-01T00:00:00', totalPremium: 50 }),
      contract({ activatedAt: '2025-10-05T10:00:00', totalPremium: 10 }),
      contract({ activatedAt: '2025-09-30T10:00:00', totalPremium: 999 }), // out of window
      contract({ activatedAt: null }),
    ]
    const b = monthlyActivations(rows, NOW)
    expect(b).toHaveLength(12)
    expect(b[0].key).toBe('2025-10')
    expect(b[11].key).toBe('2026-09')
    expect(b[11]).toMatchObject({ premium: 250, count: 2, label: 'sept.' })
    expect(b[0]).toMatchObject({ premium: 10, count: 1 })
    expect(b.slice(1, 11).every((m) => m.count === 0 && m.premium === 0)).toBe(
      true,
    )
  })
  it('crosses the year boundary', () => {
    const b = monthlyActivations([], new Date(2026, 1, 10))
    expect(b[0].key).toBe('2025-03')
    expect(b[11].key).toBe('2026-02')
  })
})

describe('productBreakdown', () => {
  it('sums premium per product, biggest first, with shares', () => {
    const rows = [
      contract({ label: 'IA Standard', totalPremium: 300 }),
      contract({ label: 'IA Pour Tous', totalPremium: 700 }),
      contract({ label: 'IA Standard', totalPremium: 100 }),
    ]
    const s = productBreakdown(rows)
    expect(s.map((x) => x.label)).toEqual(['IA Pour Tous', 'IA Standard'])
    expect(s[0]).toMatchObject({ premium: 700, count: 1, pct: 63.6 })
    expect(s[1]).toMatchObject({ premium: 400, count: 2, pct: 36.4 })
  })
  it('groups the tail into Autres and labels unknown products', () => {
    const rows = ['A', 'B', 'C', 'D'].map((label, i) =>
      contract({ label, totalPremium: 40 - i * 10 }),
    )
    rows.push(contract({ productSnapshot: null, totalPremium: 1 }))
    const s = productBreakdown(rows, 3)
    expect(s.map((x) => x.label)).toEqual(['A', 'B', 'Autres'])
    expect(s[2]).toMatchObject({ premium: 31, count: 3 })
  })
  it('is empty-safe and zero-premium safe', () => {
    expect(productBreakdown([])).toEqual([])
    expect(productBreakdown([contract({ totalPremium: 0 })])[0].pct).toBe(0)
  })
})

describe('conversionRate', () => {
  it('ignores drafts', () => {
    const q = [
      { status: 'CONVERTED' },
      { status: 'CONVERTED' },
      { status: 'QUOTED' },
      { status: 'EXPIRED' },
      { status: 'DRAFT' },
    ]
    expect(conversionRate(q)).toBe(50)
  })
  it('rounds to one decimal and handles empty', () => {
    const q = [
      ...Array.from({ length: 15 }, () => ({ status: 'CONVERTED' })),
      { status: 'QUOTED' },
      { status: 'QUOTED' },
    ]
    expect(conversionRate(q)).toBe(88.2)
    expect(conversionRate([])).toBeNull()
    expect(conversionRate([{ status: 'DRAFT' }])).toBeNull()
  })
})

describe('latestBy', () => {
  it('sorts by createdAt desc and truncates without mutating', () => {
    const rows = [
      { id: 1, createdAt: '2026-09-01T00:00:00' },
      { id: 2, createdAt: '2026-09-03T00:00:00' },
      { id: 3, createdAt: '2026-09-02T00:00:00' },
    ]
    expect(latestBy(rows, 2).map((r) => r.id)).toEqual([2, 3])
    expect(rows[0].id).toBe(1)
  })
})

describe('formatting', () => {
  it('compactFcfa picks the unit', () => {
    expect(compactFcfa(587)).toEqual({ value: '587', unit: 'FCFA' })
    expect(compactFcfa(2_840_000_000)).toEqual({
      value: '2,84',
      unit: 'Mds FCFA',
    })
    expect(compactFcfa(12_400_000)).toEqual({ value: '12,4', unit: 'M FCFA' })
  })
  it('compactAxis', () => {
    expect(compactAxis(0)).toBe('0')
    expect(compactAxis(2500)).toMatch(/^2,5\s?k$/)
    expect(compactAxis(1_500_000)).toMatch(/^1,5\s?M$/)
  })
})

describe('describeTrend', () => {
  it('shows % with its base when the base is large enough', () => {
    expect(describeTrend(12, 10)?.label).toBe('↑ 20 % · 10 → 12')
    expect(describeTrend(5, 10)?.label).toBe('↓ 50 % · 10 → 5')
  })
  it('hides % when the base is below 5 or 0', () => {
    expect(describeTrend(12, 2)?.label).toBe('+10 · 2 → 12')
    expect(describeTrend(3, 0)?.label).toBe('+3 · 0 → 3')
    expect(describeTrend(1, 4)?.direction).toBe('down')
  })
  it('uses baseCount for amounts', () => {
    expect(describeTrend(900, 100, { baseCount: 2 })?.label).toBe(
      '+800 · 100 → 900',
    )
  })
  it('is empty when nothing happened', () => {
    expect(describeTrend(0, 0)).toBeUndefined()
  })
})

describe('conversionRate on a period', () => {
  const quotes = [
    { status: 'CONVERTED', createdAt: '2026-09-05T10:00:00' },
    { status: 'SENT', createdAt: '2026-09-06T10:00:00' },
    { status: 'CONVERTED', createdAt: '2026-01-06T10:00:00' },
  ]
  it('only counts quotations created in the range', () => {
    const cur = periodRanges('Mois', NOW).current
    const inPeriod = quotes.filter((q) => inRange(q.createdAt, cur))
    expect(conversionRate(inPeriod)).toBe(50)
    expect(conversionRate([])).toBeNull()
  })
})
