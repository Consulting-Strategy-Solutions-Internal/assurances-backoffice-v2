import type { KeyboardEvent } from 'react'

/**
 * Dashboard helpers. Visual styling lives in shadcn components + the NSIA tokens
 * in styles.css; this module only carries the bits that can't be a token:
 * the status → Badge colour map and the raw hex used by the bespoke data-viz.
 */

/** Status → Tailwind classes for a <Badge>, matching the design's pill() map. */
export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Réglé':
    case 'Validé':
    case 'Actif':
    case 'Sain':
      return 'bg-[#e7f6ee] text-[#167347]'
    case 'En expertise':
    case 'En attente':
      return 'bg-[#fef3da] text-[#8a6600]'
    case 'Onboarding':
    case 'Déclaré':
      return 'bg-[#e7eefb] text-[#1f53b0]'
    case 'Rejeté':
    case 'Suspendu':
      return 'bg-[#fbe9e9] text-[#c0392b]'
    case 'Résilié':
    case 'Inactif':
      return 'bg-[#f0f1f4] text-[#5b6577]'
    default:
      return 'bg-[#f0f1f4] text-[#5b6577]'
  }
}

export type PillTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

/** Semantic tone → Tailwind classes for a pill/badge (same palette as `statusBadgeClass`). */
export const PILL_TONES: Record<PillTone, string> = {
  success: 'bg-[#e7f6ee] text-[#167347]',
  warning: 'bg-[#fef3da] text-[#8a6600]',
  info: 'bg-[#e7eefb] text-[#1f53b0]',
  danger: 'bg-[#fbe9e9] text-[#c0392b]',
  neutral: 'bg-[#f0f1f4] text-[#5b6577]',
}

/** Raw hex for data-viz fills (donut, bars) that cannot use a semantic token. */
export const CHART = {
  brand: '#00337f',
  gold: '#ffc61e',
  blue: '#4f7fcf',
  green: '#2aa06b',
  gray: '#dde2ea',
} as const

/**
 * Text link/button that acts as an action (« Tout voir → », « Ouvrir »):
 * a 36 px tall hit area (negative margin keeps the visual alignment).
 */
export const ACTION_LINK_CLASS =
  '-mx-2 inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[13px] font-semibold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Props that make a clickable table row keyboard-activatable (Enter/Space). */
export function clickableRow(onClick: () => void) {
  return {
    onClick,
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
  }
}

/** Case-insensitive "row matches free-text query" check over an object's string values. */
export function matchesQuery(row: object, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return Object.values(row).some(
    (v) => typeof v === 'string' && v.toLowerCase().includes(q),
  )
}
