import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** Formats an ISO date-time as a short French date (e.g. "24 juin 2026"). */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
})

/** Regular no-break space (U+00A0): visible grouping, never wraps. */
const NBSP = '\u00a0'

/**
 * Formats a number as an FCFA amount, without decimals (the franc CFA has no
 * cents) and with a visible no-break space as thousands separator
 * (e.g. "10 008 FCFA"); '' if undefined.
 */
export function formatFcfa(value?: number | null): string {
  if (value == null) return ''
  return `${formatInteger(value)}${NBSP}FCFA`
}

/**
 * Integer with no-break-space grouping (FCFA-style, no unit, no decimals).
 * Not for rates, percentages or coefficients: use `src/lib/format.ts`.
 */
export function formatInteger(value: number): string {
  return numberFormatter.format(value).replace(/[\u202f\u00a0]/g, NBSP)
}
