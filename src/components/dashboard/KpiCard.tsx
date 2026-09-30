import type { ReactNode } from 'react'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

interface KpiCardProps {
  variant?: 'light' | 'dark'
  icon: ReactNode
  iconClass: string
  value: ReactNode
  /** Unit rendered small next to the value (« FCFA »), so long amounts fit. */
  unit?: string
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
  unit,
  label,
  trend,
  hoverHighlight = false,
}: KpiCardProps) {
  const dark = variant === 'dark'
  const hover = hoverHighlight && !dark

  return (
    <Card
      className={cn(
        // Compact row (icon left, value + label right) on narrow content, the
        // stacked card from 576 px of content (`@container/main`).
        'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-0 rounded-2xl px-3 py-3 shadow-sm',
        '@xl/main:gap-x-0 @xl/main:px-5 @xl/main:py-[19px]',
        dark && DARK_CARD,
        hoverHighlight &&
          'transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1',
        hover && CARD_HOVER,
      )}
    >
      <div
        className={cn(
          'row-span-2 flex size-8 items-center justify-center rounded-[10px] @xl/main:row-span-1 @xl/main:mb-[18px] @xl/main:size-10 @xl/main:rounded-[11px]',
          iconClass,
        )}
      >
        {icon}
      </div>
      <div className="@container/kpi min-w-0 @xl/main:col-span-2 @xl/main:row-start-2">
        {/* Compact: the value shrinks with its slot so 7-digit amounts fit a
            156 px card (FCFA amounts never wrap: non-breaking spaces). */}
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-[clamp(16px,18cqi,24px)] leading-none font-extrabold tracking-[-0.035em] @xl/main:text-[30px]">
          <span className="min-w-0">{value}</span>
          {unit && (
            <span className="text-[13px] font-bold tracking-normal @xl/main:text-[15px]">
              {unit}
            </span>
          )}
        </div>
        <div
          className={cn(
            'mt-1.5 text-[13px] font-medium @xl/main:mt-2',
            dark ? 'text-white/70' : 'text-muted-foreground',
          )}
        >
          {label}
        </div>
      </div>
      {trend && (
        <Badge
          className={cn(
            'col-start-2 mt-1.5 h-auto max-w-full justify-self-start rounded-full border-transparent px-[9px] py-[3px] text-left text-[12px] font-bold whitespace-normal @xl/main:mt-0 @xl/main:whitespace-nowrap @xl/main:col-start-2 @xl/main:row-start-1 @xl/main:mb-[18px] @xl/main:justify-self-end',
            trend.class,
          )}
        >
          {trend.label}
        </Badge>
      )}
    </Card>
  )
}
