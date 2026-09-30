import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import type { LegendPayload, TooltipPayloadEntry } from 'recharts'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'

/** Series/slice metadata: label, and a colour (any CSS colour or `var(...)`). */
export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; color?: string; icon?: React.ComponentType }
>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context)
    throw new Error('useChart must be used within <ChartContainer />')
  return context
}

const subscribe = () => () => undefined

/** False during SSR and hydration, true once mounted in the browser. */
function useIsClient() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

/**
 * Responsive chart wrapper. Exposes each config colour as `--color-<key>` so
 * marks can use `fill="var(--color-premium)"`. Rendered client-side only (the
 * ResponsiveContainer needs to measure the DOM); a skeleton of the same size
 * is shown on the server.
 */
function ChartContainer({
  id,
  className,
  children,
  config,
  label,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
  config: ChartConfig
  /** Accessible description of the chart (role="img"). */
  label: string
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`
  const isClient = useIsClient()
  const style = Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => item.color)
      .map(([key, item]) => [`--color-${key}`, item.color]),
  ) as React.CSSProperties

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        role="img"
        aria-label={label}
        style={style}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        {isClient ? (
          <RechartsPrimitive.ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
          >
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        ) : (
          <Skeleton className="size-full" />
        )}
      </div>
    </ChartContext.Provider>
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

/** Tooltip card: a heading, then one row per series (swatch, label, value). */
function ChartTooltipContent({
  active,
  payload,
  title,
  formatter,
  extra,
  hideLabels,
  className,
}: {
  active?: boolean
  payload?: readonly TooltipPayloadEntry[]
  /** Heading, from the hovered datum. */
  title?: React.ReactNode
  /** Custom row value renderer; defaults to the raw value. */
  formatter?: (entry: TooltipPayloadEntry) => React.ReactNode
  /** Only swatch + value per row (the title already names the datum). */
  hideLabels?: boolean
  /** Muted line under the rows. */
  extra?: React.ReactNode
  className?: string
}) {
  const { config } = useChart()
  if (!active || !payload?.length) return null
  return (
    <div
      className={cn(
        'grid min-w-[10rem] gap-1.5 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl',
        className,
      )}
    >
      {title != null && <div className="text-[12.5px] font-bold">{title}</div>}
      <div className="grid gap-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name)
          const item = config[key] as ChartConfig[string] | undefined
          const color =
            (entry.payload as { fill?: string } | undefined)?.fill ??
            entry.color ??
            item?.color
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: color }}
              />
              {hideLabels ? (
                <span className="flex-1" />
              ) : (
                <span className="flex-1 whitespace-nowrap text-muted-foreground">
                  {item?.label ?? entry.name}
                </span>
              )}
              <span className="font-semibold whitespace-nowrap tabular-nums">
                {formatter ? formatter(entry) : String(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
      {extra != null && <div className="text-muted-foreground">{extra}</div>}
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

/** Legend row: colour swatch + label from the ChartConfig. */
function ChartLegendContent({
  payload,
  className,
}: {
  payload?: readonly LegendPayload[]
  className?: string
}) {
  const { config } = useChart()
  if (!payload?.length) return null
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-[18px] pt-3',
        className,
      )}
    >
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.value)
        const item = config[key] as ChartConfig[string] | undefined
        const round = entry.type === 'line'
        return (
          <div key={key} className="flex items-center gap-[7px]">
            <span
              className={cn(
                'size-[11px]',
                round ? 'rounded-full' : 'rounded-[3px]',
              )}
              style={{ background: entry.color }}
            />
            <span className="text-[12.5px] font-semibold text-muted-foreground">
              {item?.label ?? entry.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
}
