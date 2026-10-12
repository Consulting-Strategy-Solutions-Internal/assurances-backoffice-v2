import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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

const COLUMNS = 7
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

/** Lien vers la fiche client ; le clic n'ouvre pas aussi le contrat de la ligne. */
function ClientCell({ clientId }: { clientId: number | null }) {
  if (clientId == null) return <span className="text-muted-foreground">—</span>
  return (
    <Link
      to="/clients/$clientId"
      params={{ clientId: String(clientId) }}
      className="text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      Client #{clientId}
    </Link>
  )
}

/** « Décision possible » / « À partir du … » pour un contrat à trancher ; vide sinon. */
function decisionLabel(item: TravelSupervisionItem, now: Date): string | null {
  if (item.evoIssuanceStatus !== 'TO_RECONCILE') return null
  const from = parseAbidjanDateTime(item.reconcilableFrom)
  if (!from || now.getTime() >= from.getTime()) return 'Décision possible'
  return `À partir du ${formatClaimDate(item.reconcilableFrom, true)}`
}

/** Date au-dessus, heure dessous : la colonne reste étroite (V1-1). */
function DateTimeCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <>
      <div>{formatClaimDate(value)}</div>
      <div className="text-[12px] text-muted-foreground">
        {value.slice(11, 16)}
      </div>
    </>
  )
}

function DecisionCell({
  item,
  now,
}: {
  item: TravelSupervisionItem
  now: Date
}) {
  const decision = decisionLabel(item, now)
  if (!decision) return <span className="text-muted-foreground">—</span>
  if (decision === 'Décision possible')
    return <span className="font-semibold text-[#8a6600]">{decision}</span>
  return (
    <div className="text-muted-foreground">
      <div>À partir du</div>
      <div className="text-[12px]">
        {formatClaimDate(item.reconcilableFrom, true)}
      </div>
    </div>
  )
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
              {/* Seuils mesurés (V1-1, L-008) : ≈ 888 px tout affiché, 788 sans « Dernier envoi », 674 sans « Client ». */}
              <DataTableHead hideBelow="lg">Client</DataTableHead>
              <DataTableHead>État et dernière erreur</DataTableHead>
              <DataTableHead hideBelow="xl">Dernier envoi</DataTableHead>
              <DataTableHead>Couverture</DataTableHead>
              <DataTableHead>Décision</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={[28, 20, 32, 20, 24, 24]} trailing />
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
                    <DataTableCell hideBelow="lg" className="whitespace-nowrap">
                      <ClientCell clientId={item.clientId} />
                    </DataTableCell>
                    <DataTableCell>
                      <EvoStatusPill status={item.evoIssuanceStatus} />
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {item.evoIssuanceAttempts} envoi
                        {item.evoIssuanceAttempts > 1 ? 's' : ''}
                        {item.evoLastError && (
                          <TruncatedText className="max-w-[200px]">
                            {item.evoLastError}
                          </TruncatedText>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell hideBelow="xl" className="whitespace-nowrap">
                      <DateTimeCell value={item.evoSentAt} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div>{formatClaimDate(item.coverageStart)}</div>
                      <div className="text-[12px] text-muted-foreground">
                        → {formatClaimDate(item.coverageEnd)}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <DecisionCell item={item} now={now} />
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
