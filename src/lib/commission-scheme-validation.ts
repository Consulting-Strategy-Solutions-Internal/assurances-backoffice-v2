import type {
  CommissionLevel,
  CommissionSchemePayload,
} from '#/services/commission-schemes'

export interface CommissionSchemeDraft {
  partnerId: number | null
  productId: number | null
  commissionRate: string
  maxLevel: CommissionLevel
  level2PartnerShare: string
  level2SellerShare: string
  level3PartnerShare: string
  level3AgencyShare: string
  level3SellerShare: string
}

export type CommissionShareField = Exclude<
  keyof CommissionSchemeDraft,
  'partnerId' | 'productId' | 'commissionRate' | 'maxLevel'
>

export interface CommissionSchemeValidation {
  valid: boolean
  errors: Partial<Record<keyof CommissionSchemeDraft, string>>
  level2Total: number | null
  level3Total: number | null
  payload: CommissionSchemePayload | null
}

const LEVEL_2_FIELDS = ['level2PartnerShare', 'level2SellerShare'] as const
const LEVEL_3_FIELDS = [
  'level3PartnerShare',
  'level3AgencyShare',
  'level3SellerShare',
] as const

export function percentToCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(normalized)) {
    return null
  }
  const [whole, decimal = ''] = normalized.split('.')
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
}

function validateFields(
  draft: CommissionSchemeDraft,
  fields: readonly CommissionShareField[],
  errors: CommissionSchemeValidation['errors'],
): number | null {
  let total = 0
  let complete = true
  for (const field of fields) {
    const cents = percentToCents(draft[field])
    if (cents === null) {
      errors[field] =
        'Saisissez un pourcentage entre 0,00 et 100,00 (2 décimales maximum).'
      complete = false
    } else {
      total += cents
    }
  }
  return complete ? total : null
}

export function validateCommissionScheme(
  draft: CommissionSchemeDraft,
  lockedPair?: { partnerId: number; productId: number },
): CommissionSchemeValidation {
  const errors: CommissionSchemeValidation['errors'] = {}
  if (draft.partnerId === null) errors.partnerId = 'Sélectionnez un partenaire.'
  if (draft.productId === null) errors.productId = 'Sélectionnez un produit.'
  const commissionRate = percentToCents(draft.commissionRate)
  if (commissionRate === null) {
    errors.commissionRate =
      'Saisissez le taux négocié entre 0,00 et 100,00 (2 décimales maximum).'
  }
  if (
    lockedPair &&
    (draft.partnerId !== lockedPair.partnerId ||
      draft.productId !== lockedPair.productId)
  ) {
    errors.partnerId = 'Le couple partenaire / produit est immuable en édition.'
    errors.productId = 'Le couple partenaire / produit est immuable en édition.'
  }

  let level2Total: number | null = null
  let level3Total: number | null = null
  if (draft.maxLevel >= 2) {
    level2Total = validateFields(draft, LEVEL_2_FIELDS, errors)
    if (level2Total !== null && level2Total !== 10_000) {
      errors.level2PartnerShare =
        'Les parts du niveau 2 doivent totaliser exactement 100 %.'
    }
  }
  if (draft.maxLevel === 3) {
    level3Total = validateFields(draft, LEVEL_3_FIELDS, errors)
    if (level3Total !== null && level3Total !== 10_000) {
      errors.level3PartnerShare =
        'Les parts du niveau 3 doivent totaliser exactement 100 %.'
    }
  }

  const valid = Object.keys(errors).length === 0
  const toRate = (field: CommissionShareField) => {
    const cents = percentToCents(draft[field])
    return cents === null ? null : cents / 100
  }
  const payload =
    valid &&
    draft.partnerId !== null &&
    draft.productId !== null &&
    commissionRate !== null
      ? {
          partnerId: draft.partnerId,
          productId: draft.productId,
          commissionRate: commissionRate / 100,
          maxLevel: draft.maxLevel,
          level2PartnerShare:
            draft.maxLevel >= 2 ? toRate('level2PartnerShare') : null,
          level2SellerShare:
            draft.maxLevel >= 2 ? toRate('level2SellerShare') : null,
          level3PartnerShare:
            draft.maxLevel === 3 ? toRate('level3PartnerShare') : null,
          level3AgencyShare:
            draft.maxLevel === 3 ? toRate('level3AgencyShare') : null,
          level3SellerShare:
            draft.maxLevel === 3 ? toRate('level3SellerShare') : null,
        }
      : null

  return { valid, errors, level2Total, level3Total, payload }
}

export function formatShareTotal(total: number | null): string {
  if (total === null) return 'Total incomplet'
  const value = (total / 100).toFixed(2).replace('.', ',')
  if (total === 10_000) return `${value} % — OK`
  if (total < 10_000) {
    return `${value} % — il manque ${((10_000 - total) / 100).toFixed(2).replace('.', ',')} %`
  }
  return `${value} % — dépassement de ${((total - 10_000) / 100).toFixed(2).replace('.', ',')} %`
}
