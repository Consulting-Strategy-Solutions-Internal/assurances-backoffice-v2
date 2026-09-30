/**
 * Pure aggregation helpers of the dashboard. The backend exposes no stats
 * endpoint, so every figure is computed client-side from list endpoints.
 */
import type { Period } from '#/components/dashboard/shell'

export interface ContractLike {
  status: string
  totalPremium: number
  createdAt: string
  activatedAt?: string | null
  productSnapshot?: { productLabel?: string | null } | null
}

export interface DateRange {
  /** Inclusive. */
  start: Date
  /** Exclusive. */
  end: Date
}

export interface PeriodRanges {
  current: DateRange
  previous: DateRange
}

/** `date` moved back by `months`, keeping day and time; clamped to the end of a shorter month. */
function shiftBackMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() - months, 1)
  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate()
  // 31 Mar → February has no 31st: stop at the end of February.
  if (date.getDate() > daysInMonth) {
    return new Date(first.getFullYear(), first.getMonth() + 1, 1)
  }
  return new Date(
    first.getFullYear(),
    first.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  )
}

/**
 * Calendar period containing `now` (`current`, full period) and the previous
 * one limited to the **same elapsed duration** (`previous`): 1–3 Sept is
 * compared with 1–3 Aug, today until now with yesterday until the same hour.
 * A day that does not exist in the previous month is clamped to its end.
 */
export function periodRanges(period: Period, now: Date): PeriodRanges {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (period) {
    case 'Jour':
      return {
        current: { start: new Date(y, m, d), end: new Date(y, m, d + 1) },
        previous: {
          start: new Date(y, m, d - 1),
          end: new Date(
            y,
            m,
            d - 1,
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds(),
          ),
        },
      }
    case 'Mois':
      return {
        current: { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) },
        previous: {
          start: new Date(y, m - 1, 1),
          end: shiftBackMonths(now, 1),
        },
      }
    case 'Trimestre': {
      const q = Math.floor(m / 3) * 3
      return {
        current: { start: new Date(y, q, 1), end: new Date(y, q + 3, 1) },
        previous: {
          start: new Date(y, q - 3, 1),
          end: shiftBackMonths(now, 3),
        },
      }
    }
    case 'Année':
      return {
        current: { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) },
        previous: {
          start: new Date(y - 1, 0, 1),
          end: shiftBackMonths(now, 12),
        },
      }
  }
}

export const PERIOD_PHRASE: Record<Period, string> = {
  Jour: 'aujourd’hui',
  Mois: 'sur le mois',
  Trimestre: 'sur le trimestre',
  Année: 'sur l’année',
}

export function inRange(iso: string | null | undefined, range: DateRange) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= range.start.getTime() && t < range.end.getTime()
}

export function sumPremiums(rows: readonly { totalPremium: number }[]): number {
  return rows.reduce((acc, r) => acc + r.totalPremium, 0)
}

export interface PortfolioStats {
  activeCount: number
  activePremium: number
  pendingCount: number
  pendingPremium: number
}

export function portfolioStats(
  contracts: readonly ContractLike[],
): PortfolioStats {
  const active = contracts.filter((c) => c.status === 'ACTIVE')
  const pending = contracts.filter((c) => c.status === 'PENDING_PAYMENT')
  return {
    activeCount: active.length,
    activePremium: sumPremiums(active),
    pendingCount: pending.length,
    pendingPremium: sumPremiums(pending),
  }
}

export interface PeriodActivation {
  count: number
  premium: number
}

/** Contracts whose activation (`activatedAt`) falls in the range. */
export function activationsInRange(
  contracts: readonly ContractLike[],
  range: DateRange,
): PeriodActivation {
  const rows = contracts.filter((c) => inRange(c.activatedAt, range))
  return { count: rows.length, premium: sumPremiums(rows) }
}

export function countCreatedInRange(
  rows: readonly { createdAt: string }[],
  range: DateRange,
): number {
  return rows.filter((r) => inRange(r.createdAt, range)).length
}

/** % change vs the previous period; null when there is no base to compare. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** Below this many items in the previous period, a % change is misleading. */
export const MIN_TREND_BASE = 5

export interface TrendInfo {
  direction: 'up' | 'down' | 'flat'
  /** `↑ 500 % · 2 → 12`, or `+10 · 2 → 12` when the base is too small for a %. */
  label: string
}

/**
 * Trend badge text that always shows its base. The % is hidden when the base
 * is 0 or below `MIN_TREND_BASE` (`baseCount`, the number of items behind the
 * previous value); the absolute delta (`+10`) is shown instead. `fmt` formats
 * the values (default: French integers); `fmtDelta` formats the delta.
 */
export function describeTrend(
  current: number,
  previous: number,
  opts: {
    baseCount?: number
    fmt?: (n: number) => string
  } = {},
): TrendInfo | undefined {
  const fmt = opts.fmt ?? ((n: number) => nf.format(n))
  const baseCount = opts.baseCount ?? previous
  if (current === previous) {
    if (current === 0) return undefined
    return {
      direction: 'flat',
      label: `= · ${fmt(previous)} → ${fmt(current)}`,
    }
  }
  const direction = current > previous ? 'up' : 'down'
  const range = `${fmt(previous)} → ${fmt(current)}`
  const change =
    baseCount >= MIN_TREND_BASE ? percentChange(current, previous) : null
  if (change === null) {
    const delta = current - previous
    return {
      direction,
      label: `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))} · ${range}`,
    }
  }
  return {
    direction,
    label: `${direction === 'up' ? '↑' : '↓'} ${nf.format(Math.abs(change))} % · ${range}`,
  }
}

export interface MonthBucket {
  /** `YYYY-MM` */
  key: string
  /** Short French label (« sept. »). */
  label: string
  year: number
  premium: number
  count: number
}

const MONTH_LABELS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
]

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Premiums and number of contracts activated per month over the last `months`
 * months (current month included), oldest first. Empty months are kept.
 */
export function monthlyActivations(
  contracts: readonly ContractLike[],
  now: Date,
  months = 12,
): MonthBucket[] {
  const buckets: MonthBucket[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: monthKey(d),
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      premium: 0,
      count: 0,
    })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const c of contracts) {
    if (!c.activatedAt) continue
    const at = new Date(c.activatedAt)
    if (Number.isNaN(at.getTime())) continue
    const bucket = byKey.get(monthKey(at))
    if (!bucket) continue
    bucket.premium += c.totalPremium
    bucket.count += 1
  }
  return buckets
}

export interface ProductSlice {
  label: string
  premium: number
  count: number
  /** Share of the total premium, 0–100 (1 decimal). */
  pct: number
}

export const UNKNOWN_PRODUCT = 'Produit inconnu'
export const OTHER_PRODUCTS = 'Autres'

/**
 * Premium per product, biggest first. Beyond `maxSlices` the tail is grouped
 * into « Autres ». Percentages always describe the premium share.
 */
export function productBreakdown(
  contracts: readonly ContractLike[],
  maxSlices = 5,
): ProductSlice[] {
  const map = new Map<string, { premium: number; count: number }>()
  for (const c of contracts) {
    const label = c.productSnapshot?.productLabel?.trim() || UNKNOWN_PRODUCT
    const cur = map.get(label) ?? { premium: 0, count: 0 }
    cur.premium += c.totalPremium
    cur.count += 1
    map.set(label, cur)
  }
  let slices = [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.premium - a.premium || b.count - a.count)
  if (slices.length > maxSlices) {
    const head = slices.slice(0, maxSlices - 1)
    const tail = slices.slice(maxSlices - 1)
    head.push({
      label: OTHER_PRODUCTS,
      premium: tail.reduce((a, s) => a + s.premium, 0),
      count: tail.reduce((a, s) => a + s.count, 0),
    })
    slices = head
  }
  const total = slices.reduce((a, s) => a + s.premium, 0)
  return slices.map((s) => ({
    ...s,
    pct: total > 0 ? Math.round((s.premium / total) * 1000) / 10 : 0,
  }))
}

/** Converted quotations / quotations that left the draft stage, in % (1 decimal). */
export function conversionRate(
  quotations: readonly { status: string }[],
): number | null {
  const eligible = quotations.filter((q) => q.status !== 'DRAFT')
  if (eligible.length === 0) return null
  const converted = eligible.filter((q) => q.status === 'CONVERTED').length
  return Math.round((converted / eligible.length) * 1000) / 10
}

export function latestBy<T extends { createdAt: string }>(
  rows: readonly T[],
  n: number,
): T[] {
  return [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, n)
}

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** Splits an FCFA amount into a display value and unit (« 2,84 » + « Mds FCFA »). */
export function compactFcfa(value: number): { value: string; unit: string } {
  const abs = Math.abs(value)
  if (abs >= 1e9) return { value: nf.format(value / 1e9), unit: 'Mds FCFA' }
  if (abs >= 1e6) return { value: nf.format(value / 1e6), unit: 'M FCFA' }
  return { value: nf.format(value), unit: 'FCFA' }
}

/** Short axis label (« 1,5 M », « 20 k », « 0 »). */
export function compactAxis(value: number): string {
  if (value >= 1e9) return `${nf.format(value / 1e9)} Md`
  if (value >= 1e6) return `${nf.format(value / 1e6)} M`
  if (value >= 1e3) return `${nf.format(value / 1e3)} k`
  return nf.format(value)
}
