import { z } from 'zod'
import type {
  CreateFormulaPayload,
  FormulaResponse,
} from '#/services/ia-for-all'

export const AMOUNT_FIELDS = [
  'deathCapital',
  'permanentDisabilityCapital',
  'medicalExpenses',
  'dailyAllowance',
  'netPremium',
  'fees',
  'tax',
  'grossPremium',
] as const
export type AmountField = (typeof AMOUNT_FIELDS)[number]

export const AMOUNT_LABELS: Record<AmountField, string> = {
  deathCapital: 'Capital décès',
  permanentDisabilityCapital: 'Capital invalidité permanente',
  medicalExpenses: 'Frais médicaux',
  dailyAllowance: 'Indemnité journalière',
  netPremium: 'Prime nette',
  fees: 'Frais accessoires',
  tax: 'Taxe',
  grossPremium: 'Prime TTC',
}

/** Valeurs du formulaire : tout est saisi sous forme de texte. */
export interface FormulaFormValues {
  label: string
  displayOrder: string
  deathCapital: string
  permanentDisabilityCapital: string
  medicalExpenses: string
  dailyAllowance: string
  netPremium: string
  fees: string
  tax: string
  grossPremium: string
}

export const EMPTY_FORM_VALUES: FormulaFormValues = {
  label: '',
  displayOrder: '',
  deathCapital: '',
  permanentDisabilityCapital: '',
  medicalExpenses: '',
  dailyAllowance: '',
  netPremium: '',
  fees: '',
  tax: '',
  grossPremium: '',
}

/** Nombre saisi (virgule ou point) ; NaN si vide ou illisible. */
export function parseAmount(raw: string): number {
  const text = raw.trim().replace(',', '.')
  if (text === '') return NaN
  return Number(text)
}

const AMOUNT_RE = /^\d+([.,]\d{1,2})?$/

const amountSchema = z
  .string()
  .trim()
  .min(1, 'Le montant est requis')
  .refine((v) => AMOUNT_RE.test(v), {
    message: '0 ou plus, avec 2 décimales maximum',
  })

export const formulaSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Le libellé est requis')
    .max(255, '255 caractères maximum'),
  displayOrder: z
    .string()
    .trim()
    .refine((v) => v === '' || /^-?\d+$/.test(v), {
      message: 'Entier attendu',
    }),
  deathCapital: amountSchema,
  permanentDisabilityCapital: amountSchema,
  medicalExpenses: amountSchema,
  dailyAllowance: amountSchema,
  netPremium: amountSchema,
  fees: amountSchema,
  tax: amountSchema,
  grossPremium: amountSchema,
})

/** Message d'erreur d'un champ (undefined si valide). */
export function validateField(
  name: keyof FormulaFormValues,
  value: string,
): string | undefined {
  const result = formulaSchema.shape[name].safeParse(value)
  return result.success ? undefined : result.error.issues[0].message
}

/** Montant en centimes entiers (évite les erreurs de flottants). */
export function toCents(value: number): number {
  return Math.round(value * 100)
}

/**
 * Somme nette + accessoires + taxe, ou null tant qu'un des trois montants
 * est illisible.
 */
export function premiumSum(values: {
  netPremium: string
  fees: string
  tax: string
}): number | null {
  const parts = [values.netPremium, values.fees, values.tax].map(parseAmount)
  if (parts.some((p) => Number.isNaN(p))) return null
  return parts.reduce((acc, p) => acc + toCents(p), 0) / 100
}

/**
 * Vrai si la somme diffère de la prime TTC (précision au centime). Faux tant
 * que les quatre montants ne sont pas tous lisibles.
 */
export function hasPremiumMismatch(values: {
  netPremium: string
  fees: string
  tax: string
  grossPremium: string
}): boolean {
  const sum = premiumSum(values)
  const gross = parseAmount(values.grossPremium)
  if (sum === null || Number.isNaN(gross)) return false
  return toCents(sum) !== toCents(gross)
}

/**
 * Corps API. `displayOrder` : en création, omis si vide ; en modification,
 * toujours envoyé (null si vide) car absent = effacé côté backend.
 */
export function buildFormulaPayload(
  values: FormulaFormValues,
  mode: 'create' | 'edit',
): CreateFormulaPayload {
  const order = values.displayOrder.trim()
  const payload: CreateFormulaPayload = {
    label: values.label.trim(),
    deathCapital: parseAmount(values.deathCapital),
    permanentDisabilityCapital: parseAmount(values.permanentDisabilityCapital),
    medicalExpenses: parseAmount(values.medicalExpenses),
    dailyAllowance: parseAmount(values.dailyAllowance),
    netPremium: parseAmount(values.netPremium),
    fees: parseAmount(values.fees),
    tax: parseAmount(values.tax),
    grossPremium: parseAmount(values.grossPremium),
  }
  if (order !== '') payload.displayOrder = Number(order)
  else if (mode === 'edit') payload.displayOrder = null
  return payload
}

export function formulaToFormValues(f: FormulaResponse): FormulaFormValues {
  return {
    label: f.label,
    displayOrder: f.displayOrder === null ? '' : String(f.displayOrder),
    deathCapital: String(f.deathCapital),
    permanentDisabilityCapital: String(f.permanentDisabilityCapital),
    medicalExpenses: String(f.medicalExpenses),
    dailyAllowance: String(f.dailyAllowance),
    netPremium: String(f.netPremium),
    fees: String(f.fees),
    tax: String(f.tax),
    grossPremium: String(f.grossPremium),
  }
}

export const COPY_SUFFIX = ' (copie)'

/** Valeurs pré-remplies pour « Créer une nouvelle formule » (libellé ≤ 255). */
export function copyFormValues(values: FormulaFormValues): FormulaFormValues {
  const base = values.label.trim().slice(0, 255 - COPY_SUFFIX.length)
  return { ...values, label: `${base}${COPY_SUFFIX}` }
}
