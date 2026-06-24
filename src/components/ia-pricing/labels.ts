import type { ModifierType, TriggerType } from '#/services/ia-pricing'

export const MODIFIER_TYPE_LABEL: Record<ModifierType, string> = {
  PERCENTAGE: 'Pourcentage',
  FIXED_AMOUNT: 'Montant fixe',
  MULTIPLIER: 'Multiplicateur',
  SURCHARGE: 'Surprime',
  DISCOUNT: 'Remise',
}

export const TRIGGER_TYPE_LABEL: Record<TriggerType, string> = {
  AGE: 'Âge',
  MANUAL: 'Manuel',
}

/** Unit hint for a modifier's rate, by modifier type. */
export const MODIFIER_RATE_LABEL: Record<ModifierType, string> = {
  PERCENTAGE: 'Taux (%)',
  SURCHARGE: 'Taux (%)',
  DISCOUNT: 'Taux (%)',
  FIXED_AMOUNT: 'Montant (FCFA)',
  MULTIPLIER: 'Coefficient multiplicateur',
}
