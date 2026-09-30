import type { ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '#/lib/utils'

interface WarningBannerProps {
  children: ReactNode
  title?: string
  className?: string
  /** `warning` (ambre, défaut) ou `info` (bleu) — mêmes teintes que les pastilles. */
  tone?: 'warning' | 'info'
}

/**
 * Bandeau d’alerte non bloquant (avertissements de saisie, chevauchements…),
 * aligné sur les teintes sémantiques du design system.
 */
export function WarningBanner({
  children,
  title,
  className,
  tone = 'warning',
}: WarningBannerProps) {
  const Icon = tone === 'info' ? Info : TriangleAlert
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-4 py-3 text-[13px]',
        tone === 'info'
          ? 'bg-[#e7eefb] text-[#1f53b0]'
          : 'bg-[#fef3da] text-[#8a6600]',
        className,
      )}
    >
      <Icon className="mt-px size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
