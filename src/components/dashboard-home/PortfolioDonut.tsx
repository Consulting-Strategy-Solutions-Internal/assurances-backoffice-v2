import { useState } from 'react'
import { Cell, Pie, PieChart as RePieChart } from 'recharts'
import { PieChart } from 'lucide-react'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { SectionCard } from '#/components/layout/SectionCard'
import { EmptyState } from '#/components/layout/EmptyState'
import { CHART } from '#/lib/dashboard-theme'
import {
  compactFcfa,
  productBreakdown,
  sumPremiums,
} from '#/lib/dashboard-stats'
import { formatFcfa } from '#/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { BlockError, BlockSkeleton } from './BlockState'
import { useDashboardSubscriptions } from './queries'

const COLORS = [CHART.brand, CHART.gold, CHART.blue, CHART.green, CHART.gray]

const pctFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

type Scope = 'ACTIVE' | 'ALL'

export function PortfolioDonut() {
  const [scope, setScope] = useState<Scope>('ALL')
  const [hovered, setHovered] = useState<number | null>(null)
  const { data, isLoading, error } = useDashboardSubscriptions()

  const rows = data
    ? scope === 'ACTIVE'
      ? data.items.filter((c) => c.status === 'ACTIVE')
      : data.items
    : []
  const slices = productBreakdown(rows)
  const total = compactFcfa(sumPremiums(rows))
  const pieData = slices.map((s, i) => ({
    ...s,
    // Short id: ChartContainer turns config keys into CSS variables, so a
    // product label with spaces would produce an invalid `--color-…` name.
    id: `slice-${i}`,
    fill: COLORS[i % COLORS.length],
  }))
  const config = Object.fromEntries(
    pieData.map((s) => [s.id, { label: s.label, color: s.fill }]),
  ) satisfies ChartConfig

  return (
    <SectionCard
      bodyClassName="flex flex-1 items-center"
      title="Répartition du portefeuille"
      description={
        scope === 'ACTIVE'
          ? 'Primes par produit · contrats actifs'
          : 'Primes par produit · tous les contrats'
      }
      action={
        <SegmentedPills
          label="Périmètre"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'ALL', label: 'Tous' },
            { value: 'ACTIVE', label: 'Actifs' },
          ]}
        />
      }
    >
      {isLoading ? (
        <BlockSkeleton height="h-36" />
      ) : error ? (
        <BlockError error={error} />
      ) : slices.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={PieChart}
          title="Aucun contrat à répartir."
        />
      ) : (
        <div className="flex w-full flex-wrap items-center gap-[22px]">
          <div className="relative size-44 shrink-0">
            <ChartContainer
              config={config}
              className="relative z-10 aspect-square size-full"
              label={`Répartition des primes : ${slices.map((s) => `${s.label} ${pctFmt.format(s.pct)} %`).join(', ')}`}
            >
              <RePieChart accessibilityLayer>
                <ChartTooltip
                  content={({ active, payload }) => {
                    const s = payload.at(0)?.payload as
                      | (typeof pieData)[number]
                      | undefined
                    if (!s) return null
                    return (
                      <ChartTooltipContent
                        active={active}
                        payload={payload}
                        title={s.label}
                        hideLabels
                        formatter={() => formatFcfa(s.premium)}
                        extra={`${pctFmt.format(s.pct)} % du portefeuille · ${s.count} contrat${s.count > 1 ? 's' : ''}`}
                      />
                    )
                  }}
                />
                <Pie
                  data={pieData}
                  dataKey="premium"
                  nameKey="label"
                  innerRadius="66%"
                  outerRadius="100%"
                  paddingAngle={pieData.length > 1 ? 2 : 0}
                  stroke="none"
                  cornerRadius={3}
                  isAnimationActive
                  animationDuration={800}
                  onMouseEnter={(_, i) => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {pieData.map((s, i) => (
                    <Cell
                      key={s.label}
                      fill={s.fill}
                      opacity={hovered === null || hovered === i ? 1 : 0.35}
                    />
                  ))}
                </Pie>
              </RePieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[19px] leading-tight font-extrabold tracking-[-0.03em]">
                {total.value}
              </div>
              <div className="text-[10.5px] font-semibold text-muted-foreground">
                {total.unit}
              </div>
            </div>
          </div>
          <div className="flex min-w-[150px] flex-1 flex-col gap-3">
            {slices.map((s, i) => (
              <div
                key={s.label}
                className="flex items-center gap-2.5 transition-opacity"
                style={{
                  opacity: hovered === null || hovered === i ? 1 : 0.45,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                title={`${s.count} contrat${s.count > 1 ? 's' : ''} · ${formatFcfa(s.premium)}`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">
                    {s.label}
                  </span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {s.count} contrat{s.count > 1 ? 's' : ''}
                  </span>
                </span>
                <span className="text-[13px] font-bold text-muted-foreground">
                  {pctFmt.format(s.pct)} %
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
