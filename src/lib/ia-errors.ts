import { isAxiosError } from 'axios'
import { apiErrorMessage } from '#/lib/api-error'

/** Corps d'erreur standard du backend (sauf import CSV). */
export interface ErrorResponse {
  status: number
  message: string
  timestamp: string
  errors?: Record<string, string>
}

/** Traduction FR des codes stables et des clés d'erreur croisées. */
export const IA_ERROR_MESSAGES: Record<string, string> = {
  // Codes stables
  RISK_CLASS_NUMBER_ALREADY_EXISTS: 'Ce numéro de classe existe déjà.',
  RISK_CLASS_NUMBER_LOCKED:
    'Numéro non modifiable : un contrat utilise déjà cette classe.',
  RISK_CLASS_HAS_PREMIUM_RATE: 'Supprimez d’abord le barème de cette classe.',
  RISK_CLASS_HAS_ACTIVE_CONTRACT:
    'Des contrats en cours utilisent cette classe : suppression impossible.',
  OCCUPATION_HAS_ACTIVE_CONTRACT:
    'Des contrats en cours utilisent ce métier : suppression impossible.',
  RISK_CLASS_INACTIVE: 'La classe choisie est inactive.',
  RISK_CLASS_NOT_FOUND: 'La classe choisie n’existe plus.',
  OCCUPATION_DESCRIPTION_ALREADY_EXISTS:
    'Ce métier existe déjà (peut-être dans une autre classe).',
  PREMIUM_RATE_ALREADY_EXISTS: 'Cette classe a déjà un barème.',
  PREMIUM_MODIFIER_CODE_ALREADY_EXISTS: 'Ce code est déjà utilisé.',
  FORMULA_LABEL_ALREADY_EXISTS: 'Une formule porte déjà ce nom.',
  FORMULA_IN_USE:
    'Formule déjà utilisée dans un devis : désactivez-la et créez-en une nouvelle.',
  FORMULA_INACTIVE: 'Cette formule est inactive.',
  AGE_SURCHARGE_NOT_APPLICABLE:
    'La majoration d’âge ne s’applique qu’à IA Standard.',
  LAST_ACCESSORY_HAS_ACTIVE_CONTRACT:
    'Impossible : c’est la dernière tranche du produit et des contrats sont en cours.',
  // Grille MRH (taux de base selon la situation, lignes selon leur mode)
  NOT_ALLOWED_FOR_LEGAL_QUALITY: 'Ce taux ne s’applique pas à cette situation.',
  REQUIRED_FOR_LEGAL_QUALITY: 'Ce taux est obligatoire pour cette situation.',
  NOT_ALLOWED_FOR_PREMIUM_TYPE:
    'Ce champ ne s’applique pas à ce mode de calcul.',
  REQUIRED_FOR_PREMIUM_TYPE: 'Ce champ est obligatoire pour ce mode de calcul.',
  // Clés croisées (validation de plage)
  premiumRangeValid: 'Le maximum doit être supérieur ou égal au minimum.',
  monthRangeValid:
    'La durée maximale doit être supérieure ou égale à la durée minimale.',
  ageSurchargeBandValid:
    'L’âge minimum doit être inférieur ou égal à l’âge maximum.',
}

/** Message de repli pour un message Jakarta (anglais) non reconnu. */
export const IA_FALLBACK_FIELD_MESSAGE = 'Valeur invalide.'
export const IA_CONFLICT_MESSAGE = 'Cet élément existe déjà.'

/** Clé croisée → champ « max » sous lequel l'afficher. */
export const IA_CROSS_KEY_FIELDS: Record<string, string> = {
  premiumRangeValid: 'maxPremium',
  monthRangeValid: 'maxMonths',
  ageSurchargeBandValid: 'ageSurchargeMaxAge',
}

/** Clés d'erreur qui ne correspondent pas à un champ de formulaire. */
export const IA_NON_FIELD_KEYS = [
  'premiumRates',
  'subscriptions',
  'formulaId',
] as const

export interface ParsedIaError {
  /** Message traduit par champ (clés croisées déjà remappées). */
  fields: Record<string, string>
  /** Message global, seulement quand aucune erreur par champ n'est fournie. */
  message: string | null
}

function backendErrors(err: unknown): Record<string, string> | null {
  if (!isAxiosError(err)) return null
  const data: unknown = err.response?.data
  if (!data || typeof data !== 'object') return null
  const errors = (data as { errors?: unknown }).errors
  if (!errors || typeof errors !== 'object') return null
  const entries = Object.entries(errors).filter(
    (e): e is [string, string] => typeof e[1] === 'string',
  )
  return entries.length ? Object.fromEntries(entries) : null
}

function translate(key: string, value: string): string {
  if (key in IA_CROSS_KEY_FIELDS) return IA_ERROR_MESSAGES[key] ?? value
  return IA_ERROR_MESSAGES[value] ?? IA_FALLBACK_FIELD_MESSAGE
}

function globalMessage(err: unknown): string {
  return apiErrorMessage(err, { conflict: IA_CONFLICT_MESSAGE })
}

/**
 * Traduit une erreur backend IA : codes stables → FR, clés croisées → champ
 * « max », messages Jakarta → « Valeur invalide. ». Sans `errors`, renvoie un
 * message global (409 → « Cet élément existe déjà. »).
 */
export function parseIaError(err: unknown): ParsedIaError {
  const errors = backendErrors(err)
  if (!errors) return { fields: {}, message: globalMessage(err) }
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(errors)) {
    fields[IA_CROSS_KEY_FIELDS[key] ?? key] = translate(key, value)
  }
  return { fields, message: null }
}

/**
 * Toutes les raisons d'une erreur sous forme de liste (ex. suppression de
 * classe : `premiumRates` ET `subscriptions`). Sans `errors` : le message global.
 */
export function parseIaErrorList(err: unknown): string[] {
  const errors = backendErrors(err)
  if (!errors) return [globalMessage(err)]
  return Object.entries(errors).map(([key, value]) => translate(key, value))
}

/**
 * Message de bandeau pour un dialogue : le message global, sinon les erreurs
 * serveur portant sur des clés qui ne sont pas des champs du formulaire
 * (ex. `product`, `triggerType`), qui seraient sinon perdues.
 */
/** French names of the IA DTO keys a dialog may not show (accessories, modifiers). */
const ORPHAN_FIELD_LABELS: Partial<Record<string, string>> = {
  product: 'Produit',
  minPremium: 'Prime minimale',
  maxPremium: 'Prime maximale',
  amount: 'Montant',
  code: 'Code',
  label: 'Libellé',
  modifierType: 'Type',
  rate: 'Taux',
  triggerType: 'Déclencheur',
  isActive: 'Statut actif',
}

export function orphanBannerMessage(
  parsed: ParsedIaError,
  formFields: readonly string[],
): string | null {
  if (parsed.message) return parsed.message
  const orphan = Object.entries(parsed.fields)
    .filter(([key]) => !formFields.includes(key))
    .map(([key, message]) => {
      // Clés métier (`subscriptions`…) : le message se suffit à lui-même.
      if ((IA_NON_FIELD_KEYS as readonly string[]).includes(key)) return message
      const label = ORPHAN_FIELD_LABELS[key]
      return label ? `${label} : ${message}` : `Champ « ${key} » : ${message}`
    })
  return orphan.join(' ') || null
}
