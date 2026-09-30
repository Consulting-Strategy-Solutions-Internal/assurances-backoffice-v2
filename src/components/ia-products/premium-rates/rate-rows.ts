import type {
  PremiumRateResponse,
  RiskClassResponse,
} from '#/services/ia-standard'

export interface RateRow {
  riskClass: RiskClassResponse
  /** `null` : la classe n'a pas de barème (« Non cotable »). */
  rate: PremiumRateResponse | null
}

/** Une ligne par classe (triée par numéro), jointe à son barème par riskClassId. */
export function buildRateRows(
  classes: RiskClassResponse[],
  rates: PremiumRateResponse[],
): RateRow[] {
  const byClass = new Map(rates.map((r) => [r.riskClassId, r]))
  return [...classes]
    .sort((a, b) => a.classNumber - b.classNumber)
    .map((riskClass) => ({
      riskClass,
      rate: byClass.get(riskClass.id) ?? null,
    }))
}
