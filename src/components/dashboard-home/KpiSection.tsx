import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Banknote,
  CalendarCheck,
  FileText,
  Hourglass,
  Percent,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import { KpiCard } from '#/components/dashboard/KpiCard'
import type { Period } from '#/components/dashboard/shell'
import { useShell } from '#/components/dashboard/shell'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { KpiRow } from '#/components/layout/KpiRow'
import { ScrollShadow } from '#/components/layout/ScrollShadow'
import {
  activationsInRange,
  compactFcfa,
  conversionRate,
  countCreatedInRange,
  describeTrend,
  inRange,
  periodRanges,
  PERIOD_PHRASE,
  portfolioStats,
} from '#/lib/dashboard-stats'
import { formatFcfa } from '#/lib/utils'
import {
  useDashboardClaims,
  useDashboardClients,
  useDashboardContractCounts,
  useDashboardQuotations,
  useDashboardSubscriptions,
} from './queries'

/**
 * Activity block: on phones a horizontal strip (swipe, ~1.5 cards visible) so
 * the 8 KPIs do not push the first table down; a grid from 576 px of content.
 */
const ACTIVITY_STRIP_CLASS =
  '@max-xl/main:mb-2 @max-xl/main:flex @max-xl/main:w-max @max-xl/main:gap-3 @max-xl/main:px-0.5 @max-xl/main:pt-1 @max-xl/main:pb-2 @max-xl/main:[&>*]:w-[228px] @max-xl/main:[&>*]:shrink-0 @xl/main:px-1 @xl/main:pt-1.5 @xl/main:pb-3'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'Jour', label: 'Jour' },
  { value: 'Mois', label: 'Mois' },
  { value: 'Trimestre', label: 'Trimestre' },
  { value: 'Année', label: 'Année' },
]

const numberFormat = new Intl.NumberFormat('fr-FR')

/** `value` + `unit` props of a `KpiCard` for an amount (« 75,8 » + « M FCFA »); `…` / `—` without unit. */
function money(
  q: { isLoading: boolean; isError: boolean },
  amount: number,
): { value: string; unit?: string } {
  if (q.isLoading) return { value: '…' }
  if (q.isError) return { value: '—' }
  return compactFcfa(amount)
}

const TREND_CLASS = {
  up: 'bg-[#e7f6ee] text-[#167347]',
  down: 'bg-[#fbe9e9] text-[#cf3d3d]',
  flat: 'bg-[#f0f1f4] text-[#5b6577]',
}

function trendOf(
  current: number,
  previous: number,
  opts?: Parameters<typeof describeTrend>[2],
) {
  const t = describeTrend(current, previous, opts)
  return t && { label: t.label, class: TREND_CLASS[t.direction] }
}

const fcfaShort = (n: number) => {
  const { value, unit } = compactFcfa(n)
  return unit === 'FCFA' ? value : `${value} ${unit.replace(' FCFA', '')}`
}

const LINK_CLASS =
  'block h-full rounded-2xl [&>*]:h-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** KPI card that opens the matching list; keeps the card's own subtle hover. */
function KpiLink({
  to,
  label,
  children,
}: {
  to: 'sinistres' | 'clients' | 'cotations' | 'support'
  label: string
  children: ReactNode
}) {
  const aria = `${label} : ouvrir la liste`
  switch (to) {
    case 'sinistres':
      return (
        <Link
          to="/sinistres"
          search={{ status: 'OPEN', page: 0, size: 20, sort: 'createdAt,desc' }}
          aria-label={aria}
          className={LINK_CLASS}
        >
          {children}
        </Link>
      )
    case 'clients':
      return (
        <Link
          to="/clients"
          search={{ page: 0, size: 20, sort: 'lastName,asc' }}
          aria-label={aria}
          className={LINK_CLASS}
        >
          {children}
        </Link>
      )
    case 'support':
      return (
        <Link
          to="/support"
          search={{ page: 0, size: 20 }}
          aria-label={aria}
          className={LINK_CLASS}
        >
          {children}
        </Link>
      )
    case 'cotations':
      return (
        <Link to="/cotations" aria-label={aria} className={LINK_CLASS}>
          {children}
        </Link>
      )
  }
}

/** Value shown while loading (`…`) or when the request failed (`—`). */
function pick<T>(
  q: { isLoading: boolean; isError: boolean },
  render: () => T,
): T | string {
  if (q.isLoading) return '…'
  if (q.isError) return '—'
  return render()
}

export function KpiSection() {
  const { period, setPeriod } = useShell()
  const subs = useDashboardSubscriptions()
  const counts = useDashboardContractCounts()
  const claims = useDashboardClaims()
  const clients = useDashboardClients()
  const quotes = useDashboardQuotations()

  const now = new Date()
  const ranges = periodRanges(period, now)
  const stats = subs.data ? portfolioStats(subs.data.items) : null
  const act = subs.data
    ? {
        cur: activationsInRange(subs.data.items, ranges.current),
        prev: activationsInRange(subs.data.items, ranges.previous),
      }
    : null
  const newClients = clients.data
    ? {
        cur: countCreatedInRange(clients.data.items, ranges.current),
        prev: countCreatedInRange(clients.data.items, ranges.previous),
      }
    : null
  // Conversion of the quotations created in the selected period only.
  const rate = quotes.data
    ? conversionRate(
        quotes.data.items.filter((q) => inRange(q.createdAt, ranges.current)),
      )
    : null
  const phrase = PERIOD_PHRASE[period]

  return (
    <>
      <KpiRow>
        <KpiCard
          hoverHighlight
          icon={<FileText className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={pick(counts, () =>
            numberFormat.format(counts.data?.active ?? 0),
          )}
          label="Contrats actifs"
        />
        <KpiCard
          hoverHighlight
          icon={<Banknote className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          {...money(subs, stats?.activePremium ?? 0)}
          label="Primes des contrats actifs"
        />
        <KpiCard
          hoverHighlight
          icon={<Hourglass className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={pick(counts, () =>
            numberFormat.format(counts.data?.pending ?? 0),
          )}
          label="En attente de paiement"
          trend={
            stats && stats.pendingPremium > 0
              ? {
                  label: formatFcfa(stats.pendingPremium),
                  class: 'bg-[#fef3da] text-[#8a6600]',
                }
              : undefined
          }
        />
        <KpiLink to="sinistres" label="Sinistres en cours">
          <KpiCard
            hoverHighlight
            icon={<TriangleAlert className="size-5 text-destructive" />}
            iconClass="bg-[#d64545]/10"
            value={pick(claims, () =>
              numberFormat.format(claims.data?.openCount ?? 0),
            )}
            label="Sinistres en cours"
          />
        </KpiLink>
      </KpiRow>

      <SubHeading
        title={`Activité ${phrase}`}
        hint="Variations par rapport à la même durée de la période précédente."
        action={
          <SegmentedPills
            label="Période d’activité"
            value={period}
            options={PERIODS}
            onChange={setPeriod}
          />
        }
      />
      {/* Room (and the matching negative margins) for the hover lift/shadow that the scroller's overflow-hidden would clip. */}
      <ScrollShadow className="@xl/main:-mx-1 @xl/main:-mt-1.5 @xl/main:-mb-3">
        <KpiRow className={ACTIVITY_STRIP_CLASS}>
          <KpiCard
            hoverHighlight
            icon={<CalendarCheck className="size-5 text-[#167347]" />}
            iconClass="bg-[#1c8a57]/10"
            value={pick(subs, () => numberFormat.format(act?.cur.count ?? 0))}
            label={`Contrats activés · ${phrase}`}
            trend={act ? trendOf(act.cur.count, act.prev.count) : undefined}
          />
          <KpiCard
            hoverHighlight
            icon={<Banknote className="size-5 text-primary" />}
            iconClass="bg-primary/[0.08]"
            {...money(subs, act?.cur.premium ?? 0)}
            label={`Primes activées · ${phrase}`}
            trend={
              act
                ? trendOf(act.cur.premium, act.prev.premium, {
                    baseCount: act.prev.count,
                    fmt: fcfaShort,
                  })
                : undefined
            }
          />
          <KpiLink to="clients" label="Nouveaux clients">
            <KpiCard
              hoverHighlight
              icon={<UserPlus className="size-5 text-[#1f53b0]" />}
              iconClass="bg-[#1f53b0]/10"
              value={pick(clients, () =>
                numberFormat.format(newClients?.cur ?? 0),
              )}
              label={`Nouveaux clients · ${phrase}`}
              trend={
                newClients
                  ? trendOf(newClients.cur, newClients.prev)
                  : undefined
              }
            />
          </KpiLink>
          <KpiLink to="cotations" label="Cotations converties en contrat">
            <KpiCard
              hoverHighlight
              icon={<Percent className="size-5 text-[#8a6600]" />}
              iconClass="bg-[#ffc61e]/20"
              value={pick(quotes, () =>
                rate === null
                  ? '—'
                  : new Intl.NumberFormat('fr-FR', {
                      maximumFractionDigits: 1,
                    }).format(rate),
              )}
              unit={
                quotes.isLoading || quotes.isError || rate === null
                  ? undefined
                  : '%'
              }
              label={`Cotations converties · ${phrase}`}
            />
          </KpiLink>
        </KpiRow>
      </ScrollShadow>
    </>
  )
}

function SubHeading({
  title,
  hint,
  action,
}: {
  title: string
  hint: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {title}
        </h2>
        <span className="text-[12.5px] text-muted-foreground">{hint}</span>
      </div>
      {action}
    </div>
  )
}
