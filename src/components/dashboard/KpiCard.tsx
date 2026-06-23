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
}

export function KpiCard({
  variant = 'light',
  icon,
  iconClass,
  value,
  label,
  trend,
}: KpiCardProps) {
  const dark = variant === 'dark'

  return (
    <Card
      className={cn(
        'gap-0 rounded-2xl px-5 py-[19px] shadow-sm',
        dark &&
          'border-[#00255e] bg-[linear-gradient(150deg,#013a8f_0%,#00255e_100%)] text-white shadow-[0_8px_22px_rgba(0,37,94,0.28)]',
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
      <div className="text-[30px] leading-none font-extrabold tracking-[-0.035em]">
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
