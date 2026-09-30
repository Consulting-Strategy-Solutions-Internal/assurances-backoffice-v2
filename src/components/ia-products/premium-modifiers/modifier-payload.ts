import { z } from 'zod'
import type {
  CreatePremiumModifierPayload,
  ModifierType,
} from '#/services/ia-standard'
import { parseRateInput } from '../premium-rates/rate-schema'

export const MODIFIER_TYPE_LABELS: Record<ModifierType, string> = {
  SURCHARGE: 'Majoration',
  DISCOUNT: 'Réduction',
}

/** Longueur maximale retenue pour un code (le backend accepte 255). */
export const MODIFIER_CODE_MAX = 50
/** Mots en majuscules (lettres, chiffres) séparés par un seul « _ », commençant par une lettre. */
export const MODIFIER_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/

export const MODIFIER_CODE_HINT =
  "Identifiant technique : majuscules, chiffres et « _ », commençant par une lettre (ex. SPORT_DANGEREUX, DEUX_ROUES_49CM3). Il est proposé d'après le libellé."

export const modifierCodeSchema = z
  .string()
  .trim()
  .min(1, 'Le code est requis.')
  .min(3, '3 caractères minimum.')
  .max(MODIFIER_CODE_MAX, `${MODIFIER_CODE_MAX} caractères maximum.`)
  .regex(/^[A-Z]/, 'Le code doit commencer par une lettre.')
  .regex(
    MODIFIER_CODE_PATTERN,
    'Utilisez des majuscules, des chiffres et un seul « _ » entre les mots (ex. SPORT_DANGEREUX).',
  )

/**
 * Normalise la saisie du code au fil de la frappe : accents retirés, majuscules,
 * espaces / tirets / points → « _ », autres caractères supprimés.
 */
export function normalizeModifierCode(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s\-.]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

/** Code proposé d'après le libellé (« Pratique d'un sport dangereux » → PRATIQUE_D_UN_SPORT_DANGEREUX). */
export function suggestModifierCode(label: string): string {
  return normalizeModifierCode(label.replace(/['’]/g, ' '))
    .replace(/_+/g, '_')
    .replace(/^[_0-9]+/, '')
    .slice(0, MODIFIER_CODE_MAX)
    .replace(/_+$/, '')
}

export interface ModifierFormValues {
  code: string
  label: string
  modifierType: ModifierType
  /** Saisie brute du taux en %. */
  rate: string
  isActive: boolean
}

/** Corps POST/PUT : code trim + majuscules, triggerType toujours `MANUAL`. */
export function buildModifierPayload(
  values: ModifierFormValues,
): CreatePremiumModifierPayload {
  return {
    code: values.code.trim().toUpperCase(),
    label: values.label.trim(),
    modifierType: values.modifierType,
    rate: parseRateInput(values.rate),
    triggerType: 'MANUAL',
    isActive: values.isActive,
  }
}
