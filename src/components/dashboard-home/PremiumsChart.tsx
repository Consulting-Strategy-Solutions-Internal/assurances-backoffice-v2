import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { formatFcfa } from '#/lib/utils'
import { CHART } from '#/lib/dashboard-theme'
import { compactAxis, monthlyActivations } from '#/lib/dashboard-stats'
import { SectionCard } from '#/components/layout/SectionCard'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart'
import type { ChartConfig } from '#/components/ui/chart'
import { BlockError, BlockSkeleton } from './BlockState'
import { useDashboardSubscriptions } from './queries'

/** Darker gold for the line and dots (`CHART.gold` is ~1.6:1 on white; this is ~4.3:1). */
const COUNT_LINE_COLOR = '#9a7400'

const config = {
  premium: { label: 'Primes activées', color: CHART.brand },
  count: { label: 'Contrats activés', color: COUNT_LINE_COLOR },
} satisfies ChartConfig

const monthName = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
})

function fullMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  return monthName.format(new Date(y, m - 1, 1))
}

export function PremiumsChart() {
  const { data, isLoading, error } = useDashboardSubscriptions()
  const months = data ? monthlyActivations(data.items, new Date(), 12) : []
  const empty = months.every((m) => m.count === 0)
  const maxCount = Math.max(4, ...months.map((m) => m.count))

  return (
    <SectionCard
      className="mb-[18px]"
      title="Primes activées par mois"
      description="12 derniers mois · date d’activation des contrats · en FCFA"
    >
      {isLoading ? (
        <BlockSkeleton height="h-[280px]" />
      ) : error ? (
        <BlockError error={error} />
      ) : (
        <div className="relative">
          <ChartContainer
            config={config}
            className="aspect-auto h-[280px] w-full"
            label={`Primes activées (FCFA, barres) et nombre de contrats activés (courbe) par mois sur les 12 derniers mois : ${months.map((m) => `${m.label} ${m.year}, ${formatFcfa(m.premium)}, ${m.count} contrat${m.count > 1 ? 's' : ''}`).join(' ; ')}`}
          >
            <ComposedChart
              data={months}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="#eef0f4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#e7eaf0' }}
                tickMargin={10}
                interval={0}
                fontSize={11.5}
              />
              <YAxis
                yAxisId="premium"
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={compactAxis}
                fontSize={11}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
                domain={[0, maxCount]}
                tickFormatter={(v: number) => String(Math.round(v))}
                fontSize={11}
                stroke={COUNT_LINE_COLOR}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--color-premium)', opacity: 0.06 }}
                content={({ active, payload }) => {
                  const m = payload.at(0)?.payload as
                    | (typeof months)[number]
                    | undefined
                  return (
                    <ChartTooltipContent
                      active={active}
                      payload={payload}
                      title={
                        m && (
                          <span className="capitalize">{fullMonth(m.key)}</span>
                        )
                      }
                      formatter={(e) =>
                        e.dataKey === 'premium'
                          ? formatFcfa(Number(e.value))
                          : `${e.value}`
                      }
                    />
                  )
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="premium"
                dataKey="premium"
                fill="var(--color-premium)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive
                animationDuration={700}
              />
              <Line
                yAxisId="count"
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: 'var(--color-count)',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive
                animationDuration={900}
              />
            </ComposedChart>
          </ChartContainer>
          {empty && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[230px] items-center justify-center text-[13px] font-semibold text-muted-foreground">
              Aucun contrat activé sur les 12 derniers mois.
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}
