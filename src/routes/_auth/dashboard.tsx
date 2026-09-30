import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { AttentionCard } from '#/components/dashboard-home/AttentionCard'
import { ClaimsToProcess } from '#/components/dashboard-home/ClaimsToProcess'
import { KpiSection } from '#/components/dashboard-home/KpiSection'
import { LatestContracts } from '#/components/dashboard-home/LatestContracts'
import { PortfolioDonut } from '#/components/dashboard-home/PortfolioDonut'
import { PremiumsChart } from '#/components/dashboard-home/PremiumsChart'
import {
  useDashboardClients,
  useDashboardQuotations,
  useDashboardSubscriptions,
} from '#/components/dashboard-home/queries'
import { DEFAULT_MAX_PAGES } from '#/lib/fetch-all-pages'

export const Route = createFileRoute('/_auth/dashboard')({
  head: pageHead("Vue d'ensemble"),
  component: DashboardPage,
})

const numberFormat = new Intl.NumberFormat('fr-FR')

function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Vue d’ensemble"
        subtitle="Activité du portefeuille, calculée en direct à partir des contrats, cotations, clients et sinistres."
      />
      <KpiSection />

      <div className="mb-[18px] grid gap-[18px] xl:grid-cols-[2fr_1fr]">
        <LatestContracts />
        <PortfolioDonut />
      </div>

      <PremiumsChart />

      <div className="grid gap-[18px] xl:grid-cols-[2fr_1fr]">
        <ClaimsToProcess />
        <AttentionCard />
      </div>

      <CapNote />
    </>
  )
}

/** Discreet note when a list was truncated by the pagination safety cap. */
function CapNote() {
  const subs = useDashboardSubscriptions()
  const quotes = useDashboardQuotations()
  const clients = useDashboardClients()
  const capped = [
    subs.data?.capped && 'contrats',
    quotes.data?.capped && 'cotations',
    clients.data?.capped && 'clients',
  ].filter((x): x is string => !!x)
  if (capped.length === 0) return null
  return (
    <p className="mt-4 text-[12px] text-muted-foreground">
      Les chiffres portent sur les{' '}
      {numberFormat.format(DEFAULT_MAX_PAGES * 100)} éléments les plus récents (
      {capped.join(', ')}) : au-delà, ils sont partiels.
    </p>
  )
}
