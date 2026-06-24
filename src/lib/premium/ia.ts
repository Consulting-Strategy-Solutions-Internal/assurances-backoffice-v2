/**
 * Client-side IA (Individuel Accident) premium simulation.
 * Faithful port of the backend `IaPremiumCalculator`
 * (assurances-backend-v2 context/formule-cotation-ia.md §3).
 *
 *   PD/PIP/PFM = capital × taux‰ / 1000     PA = 0
 *   TMaj       = Σ surprimes des modificateurs applicables (âge ∈ [minAge,maxAge] | code coché)
 *   Tmin       = réduction saisie
 *   PNT        = (PD+PIP+PFM+PA) × (1+TMaj) × (1−Tmin)
 *   accessoire = tranche [min,max] contenant la PNT
 *   taxe       = (PNT + accessoire) × 14,5 %
 *   PTTC       = PNT + accessoire + taxe
 *   PTTC dû    = PTTC × c(durée)
 */
import {
  type AccessoryBracket,
  PremiumError,
  type ProrationBracket,
  findAccessory,
  findProration,
  money,
  nz,
  perMille,
  percent,
} from '#/lib/premium/math'

export type TriggerType = 'AGE' | 'MANUAL'

/** IA tax rate — backend constant (formule-cotation-ia.md §3.5). */
export const IA_TAX_RATE = 14.5

export interface IaModifierLine {
  code: string
  label: string
  rate: number
  triggerType: TriggerType
  minAge?: number
  maxAge?: number
}

export interface IaInput {
  deathCapital: number
  permanentDisabilityCapital: number
  medicalExpensesCapital: number
  deathRate: number
  permanentDisabilityRate: number
  medicalExpensesRate: number
  insuredAge?: number
  appliedModifierCodes: Set<string>
  reductionRate: number
  durationMonths: number
  modifiers: IaModifierLine[]
  accessories: AccessoryBracket[]
  prorationBrackets: ProrationBracket[]
}

export interface IaAppliedModifier {
  code: string
  label: string
  rate: number
}

export interface IaResult {
  pd: number
  pip: number
  pfm: number
  pa: number
  sumPrimes: number
  surchargePercent: number
  reductionPercent: number
  applied: IaAppliedModifier[]
  pnt: number
  fees: number
  tax: number
  pttc: number
  durationMonths: number
  coefficient: number
  pttcDue: number
}

/** A modifier applies if triggered by age range, or checked manually. */
function applies(
  m: IaModifierLine,
  age: number | undefined,
  appliedCodes: Set<string>,
): boolean {
  if (m.triggerType === 'AGE') {
    return (
      age != null &&
      m.minAge != null &&
      m.maxAge != null &&
      age >= m.minAge &&
      age <= m.maxAge
    )
  }
  return appliedCodes.has(m.code)
}

export function computeIa(input: IaInput): IaResult {
  const pd = perMille(nz(input.deathCapital), nz(input.deathRate))
  const pip = perMille(
    nz(input.permanentDisabilityCapital),
    nz(input.permanentDisabilityRate),
  )
  const pfm = perMille(
    nz(input.medicalExpensesCapital),
    nz(input.medicalExpensesRate),
  )
  const pa = 0
  const sumPrimes = pd + pip + pfm + pa

  let surchargePercent = 0
  const applied: IaAppliedModifier[] = []
  for (const m of input.modifiers) {
    if (applies(m, input.insuredAge, input.appliedModifierCodes)) {
      surchargePercent += nz(m.rate)
      applied.push({ code: m.code, label: m.label, rate: m.rate })
    }
  }

  const reductionPercent = nz(input.reductionRate)
  if (reductionPercent < 0 || reductionPercent > 100) {
    throw new PremiumError('Le taux de réduction doit être compris entre 0 et 100.')
  }

  const tMaj = surchargePercent / 100
  const tMin = reductionPercent / 100
  const pnt = sumPrimes * (1 + tMaj) * (1 - tMin)

  const fees = findAccessory(input.accessories, pnt)
  const tax = percent(pnt + fees, IA_TAX_RATE)
  const pttc = pnt + fees + tax

  if (input.durationMonths <= 0) {
    throw new PremiumError('La durée doit être d’au moins 1 mois.')
  }
  const coefficient = findProration(input.prorationBrackets, input.durationMonths)
  const pttcDue = pttc * coefficient

  return {
    pd: money(pd),
    pip: money(pip),
    pfm: money(pfm),
    pa: money(pa),
    sumPrimes: money(sumPrimes),
    surchargePercent,
    reductionPercent,
    applied,
    pnt: money(pnt),
    fees: money(fees),
    tax: money(tax),
    pttc: money(pttc),
    durationMonths: input.durationMonths,
    coefficient,
    pttcDue: money(pttcDue),
  }
}
