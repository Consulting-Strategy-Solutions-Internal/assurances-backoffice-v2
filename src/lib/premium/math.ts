/**
 * Pure premium-math primitives — a faithful client-side port of the backend
 * `PremiumMath` (see assurances-backend-v2 context/formule-cotation-{mrh,ia}.md).
 * Used only for back-office *simulation* (premium preview); the real quotation
 * is computed and persisted server-side by a seller account.
 *
 * Rates are expressed per-mille (‰) for base/risk rates and percent (%) for
 * tax/surcharge rates, exactly as the backend stores them.
 */

export interface AccessoryBracket {
  minPremium: number
  maxPremium: number
  amount: number
}

export interface ProrationBracket {
  minMonths: number
  maxMonths?: number | null
  coefficient: number
}

/** Raised when the tariff data can't yield a single, unambiguous result. */
export class PremiumError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PremiumError'
  }
}

/** value × pct / 100. */
export function percent(value: number, pct: number): number {
  return (value * pct) / 100
}

/** value × rate / 1000 — rates expressed in ‰. */
export function perMille(value: number, rate: number): number {
  return (value * rate) / 1000
}

/** null/undefined → 0. */
export function nz(value: number | null | undefined): number {
  return value == null ? 0 : value
}

/** Monetary rounding: 2 decimals, half-up (all premium amounts are positive). */
export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Accessory amount for the bracket whose [min, max] contains the net premium.
 * No brackets → 0 (product without accessory). Exactly one bracket must cover
 * the net premium: 0 matches (incomplete config) or >1 (overlap) → error.
 */
export function findAccessory(
  brackets: AccessoryBracket[],
  netPremium: number,
): number {
  if (brackets.length === 0) return 0
  const matches = brackets.filter(
    (b) => netPremium >= nz(b.minPremium) && netPremium <= nz(b.maxPremium),
  )
  if (matches.length > 1) {
    throw new PremiumError(
      `Tranches d'accessoire en chevauchement pour une prime nette de ${netPremium}.`,
    )
  }
  if (matches.length === 0) {
    throw new PremiumError(
      `Aucune tranche d'accessoire ne couvre la prime nette de ${netPremium}.`,
    )
  }
  return nz(matches[0].amount)
}

/**
 * Short-term proration coefficient for a duration (months). No bands → 1.00
 * (no proration). Otherwise exactly one band must cover the duration
 * (maxMonths null = open upper bound); 0 or >1 matches → error.
 */
export function findProration(
  brackets: ProrationBracket[],
  durationMonths: number,
): number {
  return findProrationBracket(brackets, durationMonths)?.coefficient ?? 1
}

/** Returns the exact configured band selected for a duration, or null for ×1. */
export function findProrationBracket(
  brackets: ProrationBracket[],
  durationMonths: number,
): ProrationBracket | null {
  if (brackets.length === 0) return null
  const matches = brackets.filter(
    (b) =>
      durationMonths >= b.minMonths &&
      (b.maxMonths == null || durationMonths <= b.maxMonths),
  )
  if (matches.length > 1) {
    throw new PremiumError(
      `Bandes de prorata en chevauchement pour une durée de ${durationMonths} mois.`,
    )
  }
  if (matches.length === 0) {
    throw new PremiumError(
      `Aucune bande de prorata ne couvre la durée de ${durationMonths} mois.`,
    )
  }
  return matches[0]
}
