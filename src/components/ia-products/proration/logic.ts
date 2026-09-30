import { z } from 'zod'
import type {
  CreateProrationPayload,
  ProrationResponse,
} from '#/services/proration-coefficients'

export const PRORATION_PRODUCT = 'IA_STANDARD' as const
export const PRORATION_QUERY_KEY = ['proration-coefficients', PRORATION_PRODUCT]

/** Durées (en mois) contrôlées par l'avertissement de couverture. */
export const COVERAGE_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export interface DefaultTranche {
  minMonths: number
  maxMonths: number | null
  coefficient: number
}

/** Grille appliquée par le backend quand aucune tranche n'existe (constante front). */
export const DEFAULT_PRORATION_GRID: readonly DefaultTranche[] = [
  { minMonths: 1, maxMonths: 3, coefficient: 0.6 },
  { minMonths: 4, maxMonths: 6, coefficient: 0.8 },
  { minMonths: 7, maxMonths: 9, coefficient: 0.9 },
  { minMonths: 10, maxMonths: null, coefficient: 1 },
]

type Range = Pick<ProrationResponse, 'minMonths' | 'maxMonths'>

export function sortByMinMonths<T extends Range>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      a.minMonths - b.minMonths ||
      (a.maxMonths ?? Infinity) - (b.maxMonths ?? Infinity),
  )
}

/** « 1 – 3 mois » ou « 10 mois et + » quand il n'y a pas de maximum. */
export function formatDuration(min: number, max: number | null): string {
  if (max === null) return `${min} mois et +`
  if (max === min) return `${min} mois`
  return `${min} – ${max} mois`
}

/** Maximum affiché : « ∞ » si `null`. */
export function formatMaxMonths(max: number | null): string {
  return max === null ? '∞' : String(max)
}

export interface CoverageReport {
  /** Paires de tranches qui se chevauchent (triées par min). */
  overlaps: [Range, Range][]
  /** Durées de 1 à 12 mois couvertes par aucune tranche. */
  uncoveredMonths: number[]
}

function rangesOverlap(a: Range, b: Range): boolean {
  return (
    a.minMonths <= (b.maxMonths ?? Infinity) &&
    b.minMonths <= (a.maxMonths ?? Infinity)
  )
}

/** Détecte chevauchements et durées 1..12 non couvertes. Liste vide → rien à signaler. */
export function analyzeCoverage(rows: readonly Range[]): CoverageReport {
  if (rows.length === 0) return { overlaps: [], uncoveredMonths: [] }
  const sorted = sortByMinMonths(rows)
  const overlaps: [Range, Range][] = []
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (rangesOverlap(sorted[i], sorted[j]))
        overlaps.push([sorted[i], sorted[j]])
    }
  }
  const uncoveredMonths = COVERAGE_MONTHS.filter(
    (m) =>
      !sorted.some((r) => r.minMonths <= m && m <= (r.maxMonths ?? Infinity)),
  )
  return { overlaps, uncoveredMonths }
}

// ---------------------------------------------------------------------------
// Validation du formulaire (saisie texte)
// ---------------------------------------------------------------------------

const INT_RE = /^\d+$/

function isPositiveInt(raw: string): boolean {
  return (
    INT_RE.test(raw) && Number(raw) >= 1 && Number.isSafeInteger(Number(raw))
  )
}

export const minMonthsSchema = z
  .string()
  .trim()
  .min(1, 'La durée minimale est requise.')
  .refine(isPositiveInt, 'Saisissez un entier supérieur ou égal à 1.')

export function validateMinMonths(raw: string): string | undefined {
  const r = minMonthsSchema.safeParse(raw)
  return r.success ? undefined : r.error.issues[0].message
}

export function validateMaxMonths(
  raw: string,
  minRaw: string,
  unlimited: boolean,
): string | undefined {
  if (unlimited) return undefined
  const value = raw.trim()
  if (!value)
    return 'La durée maximale est requise (ou cochez « Sans limite »).'
  if (!isPositiveInt(value)) return 'Saisissez un entier supérieur ou égal à 1.'
  const min = minRaw.trim()
  if (INT_RE.test(min) && Number(value) < Number(min))
    return 'Le maximum doit être supérieur ou égal au minimum.'
  return undefined
}

/** Accepte la virgule décimale. */
export function parseDecimal(raw: string): number {
  return Number(raw.trim().replace(',', '.'))
}

export const coefficientSchema = z
  .string()
  .trim()
  .min(1, 'Le coefficient est requis.')
  .superRefine((raw, ctx) => {
    const normalized = raw.replace(',', '.')
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      ctx.addIssue({ code: 'custom', message: 'Saisissez un nombre valide.' })
      return
    }
    const value = Number(normalized)
    if (value < 0 || value > 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Le coefficient doit être compris entre 0 et 1.',
      })
  })

export function validateCoefficient(raw: string): string | undefined {
  const r = coefficientSchema.safeParse(raw)
  return r.success ? undefined : r.error.issues[0].message
}

export interface ProrationFormValues {
  minMonths: string
  maxMonths: string
  unlimited: boolean
  coefficient: string
}

/** Corps API depuis le formulaire (valeurs supposées valides) ; `null` si sans limite. */
export function buildProrationPayload(
  values: ProrationFormValues,
): CreateProrationPayload {
  return {
    product: PRORATION_PRODUCT,
    minMonths: Number(values.minMonths.trim()),
    maxMonths: values.unlimited ? null : Number(values.maxMonths.trim()),
    coefficient: parseDecimal(values.coefficient),
  }
}

export function trancheToFormValues(t: ProrationResponse): ProrationFormValues {
  return {
    minMonths: String(t.minMonths),
    maxMonths: t.maxMonths === null ? '' : String(t.maxMonths),
    unlimited: t.maxMonths === null,
    coefficient: String(t.coefficient),
  }
}
