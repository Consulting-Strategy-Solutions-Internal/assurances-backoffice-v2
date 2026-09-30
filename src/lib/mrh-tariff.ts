import type {
  BaseRateField,
  BaseRateResponse,
  LegalQualityWarrantyResponse,
  MrhLegalQualityCode,
  PremiumType,
  PropertyBasis,
  UpdateBaseRatePayload,
  UpdateLegalQualityPayload,
  UpdateLegalQualityWarrantyPayload,
} from '#/services/mrh-tariff'

export const LEGAL_QUALITY_LABELS: Record<MrhLegalQualityCode, string> = {
  TENANT: 'Locataire',
  OWNER_OCCUPIER: 'Propriétaire occupant',
  NON_OCCUPANT_OWNER: 'Propriétaire non occupant',
  FURNISHED_RENTAL: 'Location meublée',
}

export const PROPERTY_BASIS_LABELS: Record<PropertyBasis, string> = {
  BATIMENT: 'Bâtiment',
  LOCATIVE: 'Risques locatifs',
  AUCUN: 'Aucune',
}

export const PREMIUM_TYPE_LABELS: Record<PremiumType, string> = {
  POURCENTAGE: 'Pourcentage',
  FORFAIT: 'Forfait',
  CAPITAL: 'Capital',
}

/** Ordre et libellés d'écran des taux de base (spec AC-3). */
export const BASE_RATE_FIELDS: {
  name: BaseRateField
  label: string
  unit: 'permille' | 'multiplier' | 'fcfa'
}[] = [
  {
    name: 'buildingPremiumRate',
    label: 'Taux bâtiment (‰)',
    unit: 'permille',
  },
  {
    name: 'rentalValuePremiumRate',
    label: 'Taux risques locatifs (‰)',
    unit: 'permille',
  },
  {
    name: 'rentMultiplier',
    label: 'Multiplicateur du loyer',
    unit: 'multiplier',
  },
  { name: 'contentsPremiumRate', label: 'Taux contenu (‰)', unit: 'permille' },
  {
    name: 'minimumContentsValue',
    label: 'Valeur minimale du contenu (FCFA)',
    unit: 'fcfa',
  },
]

/**
 * Champs de la situation (D-7) : ceux que l'API renvoie non nuls, plus ceux
 * que la base de calcul exige (un taux exigé mais vide en base doit rester
 * saisissable). Le contenu n'est exigé que s'il est déjà couvert.
 */
export function baseRateFieldsFor(
  rate: BaseRateResponse,
  basis?: PropertyBasis,
): BaseRateField[] {
  const required = (name: BaseRateField) => {
    if (basis === undefined) return false
    if (name === 'buildingPremiumRate') return basis !== 'LOCATIVE'
    if (name === 'rentalValuePremiumRate' || name === 'rentMultiplier') {
      return basis === 'LOCATIVE'
    }
    return false
  }
  return BASE_RATE_FIELDS.map((f) => f.name).filter(
    (name) => rate[name] != null || required(name),
  )
}

/** Retire les séparateurs de milliers (espaces, espaces insécables). */
function normalizeDecimal(raw: string): string {
  return raw.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')
}

/** Accepte la virgule décimale et les espaces français (« 15 000,5 »). */
export function parseDecimalInput(raw: string): number {
  return Number(normalizeDecimal(raw))
}

/** Colonnes texte du backend : `varchar(255)`, sans `@Size` côté API. */
export const MAX_TEXT_LENGTH = 255

export function validateTextLength(raw: string): string | undefined {
  return raw.trim().length > MAX_TEXT_LENGTH
    ? `${MAX_TEXT_LENGTH} caractères maximum.`
    : undefined
}

const integerFormatter = new Intl.NumberFormat('fr-FR')

/** Premier message d'erreur d'un nombre saisi, ou `undefined` s'il est valide. */
export function validateDecimalInput(
  raw: string,
  { max, positive = false }: { max?: number; positive?: boolean },
): string | undefined {
  const normalized = normalizeDecimal(raw)
  if (normalized === '') return 'Ce champ est requis.'
  if (!/^\d+(\.\d+)?$/.test(normalized)) return 'Saisissez un nombre valide.'
  const value = Number(normalized)
  if (positive && value === 0) return 'La valeur doit être supérieure à 0.'
  if (max !== undefined && value > max) {
    return `La valeur doit être comprise entre 0 et ${integerFormatter.format(max)}.`
  }
  return undefined
}

/** Taux de base : seulement les champs dont la valeur saisie diffère (D-5). */
export function buildBaseRatePayload(
  rate: BaseRateResponse,
  values: Partial<Record<BaseRateField, string>>,
): UpdateBaseRatePayload {
  const payload: UpdateBaseRatePayload = {}
  for (const [name, raw] of Object.entries(values) as [
    BaseRateField,
    string,
  ][]) {
    // Champ facultatif laissé vide : rien à envoyer (absent = inchangé).
    if (normalizeDecimal(raw) === '') continue
    const value = parseDecimalInput(raw)
    if (value !== rate[name]) payload[name] = value
  }
  return payload
}

/** Situation : nom et description toujours envoyés (D-5). */
export function buildLegalQualityPayload(values: {
  name: string
  description: string
}): UpdateLegalQualityPayload {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    description: description === '' ? null : description,
  }
}

export type LineField = 'rate' | 'flatAmount' | 'capitalShare'

/** Champs saisis selon le mode fixe de la ligne (AC-4). */
export function lineFieldsFor(type: PremiumType): LineField[] {
  switch (type) {
    case 'POURCENTAGE':
      return ['rate']
    case 'FORFAIT':
      return ['flatAmount']
    case 'CAPITAL':
      return ['rate', 'capitalShare']
  }
}

/** Libellé et plafond d'un champ de ligne selon le mode. */
export function lineFieldSpec(
  type: PremiumType,
  field: LineField,
): { label: string; max?: number; hint?: string } {
  if (field === 'flatAmount') return { label: 'Montant forfaitaire (FCFA)' }
  if (field === 'capitalShare') {
    return {
      label: 'Part des capitaux (%)',
      max: 100,
      hint: 'En % des capitaux bâtiment (ou risques locatifs) + contenu.',
    }
  }
  return type === 'CAPITAL'
    ? { label: 'Taux (‰)', max: 1000, hint: 'En ‰ de la part des capitaux.' }
    : { label: 'Taux (%)', max: 1000, hint: 'En % de la prime de base.' }
}

/**
 * Ligne garantie × situation : tous les champs du mode (le backend les exige
 * à chaque appel), `mandatory` seulement s'il change (D-5).
 */
export function buildLineWarrantyPayload(
  line: LegalQualityWarrantyResponse,
  values: Record<LineField, string> & { mandatory: boolean },
): UpdateLegalQualityWarrantyPayload {
  const payload: UpdateLegalQualityWarrantyPayload = {}
  for (const field of lineFieldsFor(line.premiumType)) {
    payload[field] = parseDecimalInput(values[field])
  }
  if (values.mandatory !== line.mandatory) payload.mandatory = values.mandatory
  return payload
}
