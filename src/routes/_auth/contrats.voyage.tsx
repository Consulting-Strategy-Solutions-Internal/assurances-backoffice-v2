import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Plane } from 'lucide-react'
import { FilterSelect } from '#/components/claims/FilterSelect'
import { ContractGate } from '#/components/contracts/ContractGate'
import { EvoStatusPill } from '#/components/contracts/TravelSections'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  ClickableRow,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import {
  MobileCardContent,
  MobileCardList,
} from '#/components/layout/MobileCardList'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import { isForbidden } from '#/lib/api-error'
import { formatClaimDate } from '#/lib/claims'
import { pageHead } from '#/lib/page-title'
import {
  EVO_STATUS_LABELS,
  TRAVEL_FILTERS,
  parseAbidjanDateTime,
  travelSupervisionSearchSchema,
} from '#/lib/travel'
import type { TravelFilter } from '#/lib/travel'
import { getTravelSupervision, travelKeys } from '#/services/travel'
import type { TravelSupervisionItem } from '#/services/travel'

export const Route = createFileRoute('/_auth/contrats/voyage')({
  head: pageHead('Supervision voyage'),
  validateSearch: travelSupervisionSearchSchema,
  component: TravelSupervisionRoute,
})

const COLUMNS = 9
const PAGE_SIZE = 20

const FILTER_LABELS: Record<TravelFilter, string> = {
  ALL: 'Tous les états',
  ...EVO_STATUS_LABELS,
}

const FILTER_OPTIONS = TRAVEL_FILTERS.map((value) => ({
  value,
  label: FILTER_LABELS[value],
}))

function contractLabel(item: TravelSupervisionItem) {
  return item.policyNumber?.trim() || `Contrat #${item.id}`
}

function clientLabel(item: TravelSupervisionItem) {
  return item.clientId != null ? `Client #${item.clientId}` : '—'
}

/** « Décision possible » / « À partir du … » pour un contrat à trancher ; vide sinon. */
function decisionLabel(item: TravelSupervisionItem, now: Date): string | null {
  if (item.evoIssuanceStatus !== 'TO_RECONCILE') return null
  const from = parseAbidjanDateTime(item.reconcilableFrom)
  if (!from || now.getTime() >= from.getTime()) return 'Décision possible'
  return `À partir du ${formatClaimDate(item.reconcilableFrom, true)}`
}

function coverage(item: TravelSupervisionItem) {
  return `${formatClaimDate(item.coverageStart)} → ${formatClaimDate(item.coverageEnd)}`
}

export function TravelSupervisionContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const evoIssuanceStatus = search.status === 'ALL' ? undefined : search.status
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: travelKeys.supervision(search.status, search.page),
    queryFn: () =>
      getTravelSupervision({
        evoIssuanceStatus,
        page: search.page,
        size: PAGE_SIZE,
      }),
    retry: false,
  })
  const rows = data?.content ?? []
  const forbidden = isForbidden(error)
  // Offre coupée (`app.travel.enabled`) : la route n'existe pas.
  const offerOff = isAxiosError(error) && error.response?.status === 404
  const now = new Date()

  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
    })
  const open = (item: TravelSupervisionItem) =>
    void navigate({
      to: '/contrats/$subscriptionId',
      params: { subscriptionId: String(item.id) },
      // « Retour » ramène à cette vue de la supervision.
      search: { from: 'voyage', status: search.status, page: search.page },
    })

  const emptyTitle =
    search.status === 'ALL'
      ? 'Aucun contrat voyage.'
      : search.status === 'TO_RECONCILE'
        ? 'Aucun contrat voyage à trancher.'
        : `Aucun contrat voyage à l’état « ${EVO_STATUS_LABELS[search.status]} ».`
  const retry = (
    <Button
      variant="outline"
      className="rounded-[11px]"
      onClick={() => void refetch()}
    >
      Réessayer
    </Button>
  )
  const offerOffTitle = 'L’offre voyage n’est pas active sur ce serveur.'
  const offerOffDescription =
    'Aucun contrat voyage à superviser tant qu’elle n’est pas activée.'

  return (
    <>
      <PageHeader
        title="Supervision voyage"
        subtitle="Émission des polices voyage chez EVO : suivi des envois et contrats à trancher."
      />

      <Toolbar
        filters={
          <FilterSelect
            label="État d’émission"
            className="@xl/main:w-[260px]"
            value={search.status}
            options={FILTER_OPTIONS}
            onChange={(value) =>
              updateSearch({ status: value as TravelFilter })
            }
          />
        }
      />

      <ResultCount>
        {isLoading
          ? 'Chargement…'
          : error || !data
            ? '—'
            : `${data.totalElements} contrat${data.totalElements > 1 ? 's' : ''}`}
      </ResultCount>

      <DataTableCard
        mobileCards={
          <MobileCardList
            items={rows}
            getKey={(item) => item.id}
            onActivate={open}
            isLoading={isLoading}
            error={!!error && !offerOff}
            forbidden={forbidden}
            errorTitle="Impossible de charger la supervision voyage."
            errorAction={retry}
            empty={
              offerOff
                ? {
                    icon: Plane,
                    title: offerOffTitle,
                    description: offerOffDescription,
                  }
                : { icon: Plane, title: emptyTitle }
            }
            renderCard={(item) => (
              <MobileCardContent
                title={contractLabel(item)}
                subtitle={`${clientLabel(item)} · ${coverage(item)}`}
                status={<EvoStatusPill status={item.evoIssuanceStatus} />}
                meta={decisionLabel(item, now) ?? undefined}
              />
            )}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left">
                Contrat
              </DataTableHead>
              <DataTableHead>Client</DataTableHead>
              <DataTableHead>État</DataTableHead>
              <DataTableHead className="text-right">Envois</DataTableHead>
              <DataTableHead>Dernier envoi</DataTableHead>
              <DataTableHead>Couverture</DataTableHead>
              <DataTableHead>Décision</DataTableHead>
              <DataTableHead hideBelow="lg">Dernière erreur</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                columns={[28, 20, 24, 10, 24, 28, 24, 32]}
                trailing
              />
            ) : offerOff ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={Plane}
                title={offerOffTitle}
                description={offerOffDescription}
              />
            ) : error ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger la supervision voyage."
                action={retry}
              />
            ) : rows.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={Plane}
                title={emptyTitle}
              />
            ) : (
              rows.map((item) => {
                const decision = decisionLabel(item, now)
                return (
                  <ClickableRow
                    key={item.id}
                    onActivate={() => open(item)}
                    aria-label={`Ouvrir le contrat ${item.policyNumber?.trim() || `#${item.id}`}`}
                  >
                    <DataTableCell
                      first
                      sticky="left"
                      className="font-semibold whitespace-nowrap tabular-nums"
                    >
                      {contractLabel(item)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {clientLabel(item)}
                    </DataTableCell>
                    <DataTableCell>
                      <EvoStatusPill status={item.evoIssuanceStatus} />
                    </DataTableCell>
                    <DataTableCell className="text-right tabular-nums">
                      {item.evoIssuanceAttempts}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {formatClaimDate(item.evoSentAt, true)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {coverage(item)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {decision ? (
                        <span
                          className={
                            decision === 'Décision possible'
                              ? 'font-semibold text-[#8a6600]'
                              : 'text-muted-foreground'
                          }
                        >
                          {decision}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell hideBelow="lg">
                      {item.evoLastError ? (
                        <TruncatedText className="max-w-[260px] text-muted-foreground">
                          {item.evoLastError}
                        </TruncatedText>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                    <RowChevron />
                  </ClickableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      <Pagination
        page={search.page}
        totalPages={data?.totalPages ?? 1}
        isLast={data?.last ?? true}
        onPrev={() => updateSearch({ page: search.page - 1 })}
        onNext={() => updateSearch({ page: search.page + 1 })}
      />
    </>
  )
}

function TravelSupervisionRoute() {
  return (
    <ContractGate>
      <TravelSupervisionContent />
    </ContractGate>
  )
}
