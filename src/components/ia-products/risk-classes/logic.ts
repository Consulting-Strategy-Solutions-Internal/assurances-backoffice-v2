import type {
  CreateOccupationPayload,
  CreateRiskClassPayload,
  RiskClassResponse,
} from '#/services/ia-standard'

export const DESCRIPTION_MAX = 255
export const SEARCH_MIN_CHARS = 2
export const SEARCH_PAGE_SIZE = 20

/** Message d'erreur du numéro de classe (entier ≥ 1 requis), sinon undefined. */
export function validateClassNumber(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return 'Le numéro de classe est requis.'
  if (!/^\d+$/.test(value) || Number(value) < 1)
    return 'Le numéro doit être un entier supérieur ou égal à 1.'
  if (!Number.isSafeInteger(Number(value))) return 'Ce numéro est trop grand.'
  return undefined
}

/** Message d'erreur d'une description (requise, non vide, ≤ 255), sinon undefined. */
export function validateDescription(
  raw: string,
  label = 'La description',
): string | undefined {
  const value = raw.trim()
  if (!value) return `${label} est requise.`
  if (value.length > DESCRIPTION_MAX)
    return `${label} ne doit pas dépasser ${DESCRIPTION_MAX} caractères.`
  return undefined
}

export interface OccupationDraft {
  description: string
  active: boolean
}

export interface CreateClassDraft {
  classNumber: string
  description: string
  active: boolean
  occupations: OccupationDraft[]
}

export interface CreateClassValidation {
  /** Erreurs par champ, clés identiques à celles du backend (`occupations[0].description`). */
  errors: Record<string, string>
  payload: CreateRiskClassPayload | null
}

/** Valide le brouillon de création et construit le corps de la requête. */
export function validateCreateClass(
  draft: CreateClassDraft,
): CreateClassValidation {
  const errors: Record<string, string> = {}
  const numberError = validateClassNumber(draft.classNumber)
  if (numberError) errors.classNumber = numberError
  const descriptionError = validateDescription(draft.description)
  if (descriptionError) errors.description = descriptionError
  draft.occupations.forEach((o, i) => {
    const e = validateDescription(o.description, 'Le libellé du métier')
    if (e) errors[`occupations[${i}].description`] = e
  })
  if (Object.keys(errors).length > 0) return { errors, payload: null }

  const occupations: CreateOccupationPayload[] = draft.occupations.map((o) => ({
    description: o.description.trim(),
    active: o.active,
  }))
  const payload: CreateRiskClassPayload = {
    classNumber: Number(draft.classNumber.trim()),
    description: draft.description.trim(),
    active: draft.active,
  }
  if (occupations.length > 0) payload.occupations = occupations
  return { errors, payload }
}

/** Classes proposées pour un reclassement : actives uniquement, hors classe courante. */
export function reclassTargets(
  classes: RiskClassResponse[],
  currentClassId: number,
): RiskClassResponse[] {
  return classes
    .filter((c) => c.active && c.id !== currentClassId)
    .sort((a, b) => a.classNumber - b.classNumber)
}

/** Vrai si la chaîne de recherche (trim) est assez longue pour interroger le serveur. */
export function canSearch(q: string): boolean {
  return q.trim().length >= SEARCH_MIN_CHARS
}
