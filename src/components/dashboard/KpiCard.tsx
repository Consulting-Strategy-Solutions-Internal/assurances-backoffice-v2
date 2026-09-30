import type { ReactNode } from 'react'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

interface KpiCardProps {
  variant?: 'light' | 'dark'
  icon: ReactNode
  iconClass: string
  value: ReactNode
  label: string
  trend?: { label: string; class: string }
  /** Au survol, la carte se soulève légèrement (bordure et ombre accentuées). */
  hoverHighlight?: boolean
}

const DARK_CARD =
  'border-[#00255e] bg-[linear-gradient(150deg,#013a8f_0%,#00255e_100%)] text-white shadow-[0_8px_22px_rgba(0,37,94,0.28)]'
// Subtle hover: the card lifts and its border/shadow warm up — no colour swap.
const CARD_HOVER =
  'hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(0,37,94,0.10)]'

export function KpiCard({
  variant = 'light',
  icon,
  iconClass,
  value,
  label,
  trend,
  hoverHighlight = false,
}: KpiCardProps) {
  const dark = variant === 'dark'
  const hover = hoverHighlight && !dark

  return (
    <Card
      className={cn(
        'gap-0 rounded-2xl px-5 py-[19px] shadow-sm',
        dark && DARK_CARD,
        hoverHighlight &&
          'transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1',
        hover && CARD_HOVER,
      )}
    >
      <div className="mb-[18px] flex items-center justify-between">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-[11px]',
            iconClass,
          )}
        >
          {icon}
        </div>
        {trend && (
          <Badge
            className={cn(
              'rounded-full border-transparent px-[9px] py-[3px] text-[12px] font-bold',
              trend.class,
            )}
          >
            {trend.label}
          </Badge>
        )}
      </div>
      <div
        className={cn(
          'text-[30px] leading-none font-extrabold tracking-[-0.035em]',
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          'mt-2 text-[13px] font-medium',
          dark ? 'text-white/70' : 'text-muted-foreground',
        )}
      >
        {label}
      </div>
    </Card>
  )
}
