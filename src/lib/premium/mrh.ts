/**
 * Client-side MRH (Multirisque Habitation) premium simulation.
 * Faithful port of the backend `MrhPremiumCalculator`
 * (assurances-backend-v2 context/formule-cotation-mrh.md §3).
 *
 *   Assiette A      = CC×tC/1000 + (VB×tB/1000 | VL×tL/1000 | 0) selon propertyBasis
 *   prime(garantie) = forfait                if FORFAIT
 *                   = (rate/100) × A         if POURCENTAGE
 *   PNT             = Σ prime(garanties retenues : obligatoires + optionnelles cochées)
 *   accessoire      = tranche [min,max] contenant la PNT
 *   taxe            = Σ prime(g)×taxRate(g)/100 + accessoire×25/100
 *   TTC             = PNT + accessoire + taxe
 */
import {
  PremiumError,
  findAccessory,
  money,
  nz,
  perMille,
  percent,
} from '#/lib/premium/math'
import type { AccessoryBracket } from '#/lib/premium/math'

export type PropertyBasis = 'BATIMENT' | 'LOCATIVE' | 'AUCUN'
export type PremiumType = 'POURCENTAGE' | 'FORFAIT'

/** Accessory tax rate — backend constant (formule-cotation-mrh.md §3.5). */
export const ACCESSORY_TAX_RATE = 25

export interface MrhWarrantyTariff {
  warrantyId: number
  warrantyName: string
  premiumType: PremiumType
  rate?: number
  flatAmount?: number
  mandatory: boolean
  taxRate: number
}

export interface MrhInput {
  contentsValue: number
  buildingValue?: number
  rentalValue?: number
  propertyBasis: PropertyBasis
  contentsRate: number
  buildingRate?: number
  rentalRate?: number
  tariffs: MrhWarrantyTariff[]
  selectedWarrantyIds: Set<number>
  accessories: AccessoryBracket[]
}

export interface MrhWarrantyLine {
  warrantyId: number
  warrantyName: string
  premiumType: PremiumType
  base?: number
  premium: number
  mandatory: boolean
  taxRate: number
  lineTax: number
}

export interface MrhResult {
  assiette: number
  lines: MrhWarrantyLine[]
  netPremium: number
  fees: number
  warrantyTax: number
  accessoryTax: number
  tax: number
  gross: number
}

function computeAssiette(input: MrhInput): number {
  const baseContents = perMille(nz(input.contentsValue), nz(input.contentsRate))
  const baseProperty =
    input.propertyBasis === 'BATIMENT'
      ? perMille(nz(input.buildingValue), nz(input.buildingRate))
      : input.propertyBasis === 'LOCATIVE'
        ? perMille(nz(input.rentalValue), nz(input.rentalRate))
        : 0
  return baseContents + baseProperty
}

export function computeMrh(input: MrhInput): MrhResult {
  const assiette = computeAssiette(input)
  const selected = input.selectedWarrantyIds

  const lines: MrhWarrantyLine[] = []
  let netPremium = 0
  let warrantyTax = 0

  for (const t of input.tariffs) {
    const retained = t.mandatory || selected.has(t.warrantyId)
    if (!retained) continue

    let base: number | undefined
    let premium: number
    if (t.premiumType === 'FORFAIT') {
      if (t.flatAmount == null) {
        throw new PremiumError(
          `Forfait manquant pour la garantie « ${t.warrantyName} ».`,
        )
      }
      base = undefined
      premium = t.flatAmount
    } else {
      if (t.rate == null) {
        throw new PremiumError(
          `Taux manquant pour la garantie « ${t.warrantyName} ».`,
        )
      }
      base = assiette
      premium = percent(assiette, t.rate)
    }
    const lineTax = percent(premium, t.taxRate)

    netPremium += premium
    warrantyTax += lineTax
    lines.push({
      warrantyId: t.warrantyId,
      warrantyName: t.warrantyName,
      premiumType: t.premiumType,
      base: base == null ? undefined : money(base),
      premium: money(premium),
      mandatory: t.mandatory,
      taxRate: t.taxRate,
      lineTax: money(lineTax),
    })
  }

  const fees = findAccessory(input.accessories, netPremium)
  const accessoryTax = percent(fees, ACCESSORY_TAX_RATE)
  const tax = warrantyTax + accessoryTax
  const gross = netPremium + fees + tax

  return {
    assiette: money(assiette),
    lines,
    netPremium: money(netPremium),
    fees: money(fees),
    warrantyTax: money(warrantyTax),
    accessoryTax: money(accessoryTax),
    tax: money(tax),
    gross: money(gross),
  }
}
