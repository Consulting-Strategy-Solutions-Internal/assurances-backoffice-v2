const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
})

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** Taux en ‰ (ex. `4.5` → « 4,5 ‰ ») ; '—' si absent. */
export function formatPermille(value?: number | null): string {
  if (value == null) return '—'
  return `${formatNumber(value)} ‰`
}

/** Pourcentage (ex. `12.5` → « 12,5 % ») ; '—' si absent. */
export function formatPercent(value?: number | null): string {
  if (value == null) return '—'
  return `${formatNumber(value)} %`
}

/** Pourcentage signé pour majorations/réductions (« +5 % » / « −5 % »). */
export function formatSignedPercent(
  value: number,
  type: 'SURCHARGE' | 'DISCOUNT',
): string {
  return `${type === 'SURCHARGE' ? '+' : '−'}${formatNumber(value)} %`
}

/** Coefficient 0–1 affiché en pourcentage (0,8 → « 80 % »). */
export function formatCoefficientPercent(coefficient: number): string {
  // Évite les artefacts flottants (0.07 * 100 = 7.000000000000001).
  return formatPercent(Math.round(coefficient * 10000) / 100)
}
