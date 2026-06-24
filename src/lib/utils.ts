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
  maximumFractionDigits: 2,
})

/** Formats a number as an FCFA amount (e.g. "10 007,5 FCFA"); '' if undefined. */
export function formatFcfa(value?: number | null): string {
  if (value == null) return ''
  return `${numberFormatter.format(value)} FCFA`
}
