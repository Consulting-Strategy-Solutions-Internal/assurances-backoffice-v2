import type { ReactNode } from 'react'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { PILL_TONES, statusBadgeClass } from '#/lib/dashboard-theme'
import type { PillTone } from '#/lib/dashboard-theme'

/**
 * Small coloured status pill. Either pass a known French `status` label
 * (colour inferred by `statusBadgeClass`), or an explicit semantic `tone`
 * with custom `children` for domain statuses (e.g. « Téléphone vérifié »).
 */
export function StatusPill({
  status,
  tone,
  children,
}: {
  status?: string
  tone?: PillTone
  children?: ReactNode
}) {
  return (
    <Badge
      className={cn(
        'border-transparent px-2.5 py-0.5 text-[12px] font-bold',
        tone ? PILL_TONES[tone] : statusBadgeClass(status ?? ''),
      )}
    >
      {children ?? status}
    </Badge>
  )
}
