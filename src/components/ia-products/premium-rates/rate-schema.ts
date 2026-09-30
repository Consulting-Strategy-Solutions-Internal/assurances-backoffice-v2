import { z } from 'zod'

export const RATE_MIN = 0.01
export const RATE_MAX = 100

/** Accepte la virgule décimale française. */
export function parseRateInput(raw: string): number {
  return Number(raw.trim().replace(',', '.'))
}

/**
 * Taux saisi (‰ ou %) : requis, 0,01 ≤ x ≤ 100, 2 décimales maximum
 * (0 refusé) — identique aux contraintes du backend.
 */
export const rateInputSchema = z
  .string()
  .trim()
  .min(1, 'Ce taux est requis.')
  .superRefine((raw, ctx) => {
    const normalized = raw.replace(',', '.')
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      ctx.addIssue({ code: 'custom', message: 'Saisissez un nombre valide.' })
      return
    }
    const value = Number(normalized)
    if (value < RATE_MIN || value > RATE_MAX) {
      ctx.addIssue({
        code: 'custom',
        message: 'Le taux doit être compris entre 0,01 et 100.',
      })
      return
    }
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      ctx.addIssue({ code: 'custom', message: '2 décimales maximum.' })
    }
  })

/** Premier message d'erreur d'un taux saisi, ou `undefined` s'il est valide. */
export function validateRateInput(raw: string): string | undefined {
  const result = rateInputSchema.safeParse(raw)
  return result.success ? undefined : result.error.issues[0].message
}
