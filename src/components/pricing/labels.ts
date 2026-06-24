import type { PremiumType, PropertyBasis } from '#/services/pricing'

export const PROPERTY_BASIS_LABEL: Record<PropertyBasis, string> = {
  BATIMENT: 'Bâtiment',
  LOCATIVE: 'Valeur locative',
  AUCUN: 'Aucun',
}

export const PREMIUM_TYPE_LABEL: Record<PremiumType, string> = {
  POURCENTAGE: 'Pourcentage',
  FORFAIT: 'Forfait',
}
