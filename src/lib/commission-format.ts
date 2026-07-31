export function formatDecimal2(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent2(value: number | null): string {
  return value === null ? '—' : `${formatDecimal2(value)} %`
}
