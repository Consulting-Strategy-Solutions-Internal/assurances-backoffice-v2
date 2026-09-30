import { z } from 'zod'
import type { ProductResponse, UpdateProductPayload } from '#/services/products'

export const SETTINGS_QUERY_KEY = ['products', 'IA_STANDARD']

export const AGE_MIN = 0
export const AGE_MAX = 65

/** Saisie du formulaire (texte pour les champs numériques). */
export interface SettingsFormValues {
  ageSurchargeMinAge: string
  ageSurchargeMaxAge: string
  ageSurchargeRate: string
  discountEnabled: boolean
  maxDiscountRate: string
}

/** Valeurs éditées, déjà converties. */
export interface SettingsEdits {
  ageSurchargeMinAge: number
  ageSurchargeMaxAge: number
  ageSurchargeRate: number
  discountEnabled: boolean
  /** `null` = pas de plafond. */
  maxDiscountRate: number | null
}

const numberOrEmpty = (v: number | null) => (v === null ? '' : String(v))

export function productToFormValues(p: ProductResponse): SettingsFormValues {
  return {
    ageSurchargeMinAge: numberOrEmpty(p.ageSurchargeMinAge),
    ageSurchargeMaxAge: numberOrEmpty(p.ageSurchargeMaxAge),
    ageSurchargeRate: numberOrEmpty(p.ageSurchargeRate),
    discountEnabled: p.discountEnabled,
    maxDiscountRate: numberOrEmpty(p.maxDiscountRate),
  }
}

function ageSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} est requis.`)
    .superRefine((raw, ctx) => {
      if (!/^\d+$/.test(raw)) {
        ctx.addIssue({ code: 'custom', message: 'Saisissez un entier.' })
        return
      }
      const n = Number(raw)
      if (n < AGE_MIN || n > AGE_MAX)
        ctx.addIssue({
          code: 'custom',
          message: `L’âge doit être compris entre ${AGE_MIN} et ${AGE_MAX}.`,
        })
    })
}

export const minAgeSchema = ageSchema('L’âge minimum')
export const maxAgeSchema = ageSchema('L’âge maximum')

/** Pourcentage 0–100 avec 2 décimales maximum (virgule acceptée). */
function percentIssues(raw: string, ctx: z.RefinementCtx) {
  const normalized = raw.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    ctx.addIssue({ code: 'custom', message: 'Saisissez un nombre valide.' })
    return
  }
  if (Number(normalized) > 100) {
    ctx.addIssue({
      code: 'custom',
      message: 'Le taux doit être compris entre 0 et 100.',
    })
    return
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    ctx.addIssue({ code: 'custom', message: '2 décimales maximum.' })
}

export const surchargeRateSchema = z
  .string()
  .trim()
  .min(1, 'Le taux de majoration est requis.')
  .superRefine(percentIssues)

/** Optionnel : vide = pas de plafond. */
export const maxDiscountRateSchema = z
  .string()
  .trim()
  .superRefine((raw, ctx) => {
    if (raw !== '') percentIssues(raw, ctx)
  })

function firstIssue(
  schema: z.ZodType<unknown>,
  value: string,
): string | undefined {
  const r = schema.safeParse(value)
  return r.success ? undefined : r.error.issues[0].message
}

export const validateMinAge = (raw: string) => firstIssue(minAgeSchema, raw)

/** Affiché sous « âge maximum » : format, puis min ≤ max. */
export function validateMaxAge(raw: string, minRaw: string) {
  const own = firstIssue(maxAgeSchema, raw)
  if (own) return own
  if (
    minAgeSchema.safeParse(minRaw).success &&
    Number(raw.trim()) < Number(minRaw.trim())
  )
    return 'L’âge minimum doit être inférieur ou égal à l’âge maximum.'
  return undefined
}

export const validateSurchargeRate = (raw: string) =>
  firstIssue(surchargeRateSchema, raw)
export const validateMaxDiscountRate = (raw: string) =>
  firstIssue(maxDiscountRateSchema, raw)

const toNumber = (raw: string) => Number(raw.trim().replace(',', '.'))

/** Convertit une saisie valide ; champ « plafond » vide → `null`. */
export function parseSettingsForm(v: SettingsFormValues): SettingsEdits {
  return {
    ageSurchargeMinAge: toNumber(v.ageSurchargeMinAge),
    ageSurchargeMaxAge: toNumber(v.ageSurchargeMaxAge),
    ageSurchargeRate: toNumber(v.ageSurchargeRate),
    discountEnabled: v.discountEnabled,
    maxDiscountRate:
      v.maxDiscountRate.trim() === '' ? null : toNumber(v.maxDiscountRate),
  }
}

/**
 * Corps du PUT /products/{id} (remplacement complet) à partir du produit
 * RELU juste avant l'enregistrement et des valeurs éditées.
 * Un champ omis est effacé côté backend : tout ce qui n'est pas édité est
 * recopié tel que relu.
 */
export function buildUpdateProductPayload(
  fresh: ProductResponse,
  edits: SettingsEdits,
): UpdateProductPayload {
  return {
    label: fresh.label,
    productCode: fresh.productCode,
    discountEnabled: edits.discountEnabled,
    maxDiscountRate: edits.maxDiscountRate,
    // Décision utilisateur (2026-09-29) : `commissionRate` n'est jamais affiché
    // ni modifié ici, mais le PUT est un remplacement complet — l'omettre
    // l'effacerait côté backend. On le renvoie donc tel que relu.
    commissionRate: fresh.commissionRate,
    ageSurchargeMinAge: edits.ageSurchargeMinAge,
    ageSurchargeMaxAge: edits.ageSurchargeMaxAge,
    ageSurchargeRate: edits.ageSurchargeRate,
  }
}
