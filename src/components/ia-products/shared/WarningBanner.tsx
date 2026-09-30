import type { ReactNode } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { cn } from '#/lib/utils'

interface WarningBannerProps {
  children: ReactNode
  title?: string
  className?: string
  /** `warning` (ambre, défaut), `info` (bleu) ou `danger` (rouge) — mêmes teintes que les pastilles. */
  tone?: 'warning' | 'info' | 'danger'
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
  const tint = {
    warning: 'bg-[#fef3da] text-[#8a6600]',
    info: 'bg-[#e7eefb] text-[#1f53b0]',
    danger: 'bg-[#fbe9e9] text-[#c0392b]',
  }[tone]
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-4 py-3 text-[13px]',
        tint,
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
