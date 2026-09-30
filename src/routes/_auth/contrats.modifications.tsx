import { pageHead } from '#/lib/page-title'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FilePenLine } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  DeltaKindBadge,
  ReceiptStatusBadge,
} from '#/components/amendments/AmendmentBadges'
import { AmendmentsGate } from '#/components/amendments/AmendmentsGate'
import { FilterSelect } from '#/components/claims/FilterSelect'
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
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import { isForbidden } from '#/lib/api-error'
import {
  AMENDMENT_PRODUCTS,
  amendmentListSearchSchema,
  AMENDMENT_PRODUCT_LABELS,
  AMENDMENT_STATUSES,
  amendmentProduct,
} from '#/lib/amendments'
import type { Amendment, AmendmentListSearch } from '#/lib/amendments'
import { formatClaimDate } from '#/lib/claims'
import { formatFcfa } from '#/lib/utils'
import { amendmentsKeys, getAmendments } from '#/services/amendments'

export const Route = createFileRoute('/_auth/contrats/modifications')({
  head: pageHead('Modifications de contrat'),
  validateSearch: amendmentListSearchSchema,
  component: AmendmentsRoute,
})

const COLUMNS = 7

const SORT_OPTIONS: Array<{
  value: AmendmentListSearch['sort']
  label: string
}> = [
  { value: 'createdAt,desc', label: 'Création : plus récentes' },
  { value: 'createdAt,asc', label: 'Création : plus anciennes' },
  { value: 'updatedAt,desc', label: 'Mise à jour : plus récentes' },
  { value: 'updatedAt,asc', label: 'Mise à jour : plus anciennes' },
]

// Onglets au pluriel (ce sont des files) ; les pastilles de statut restent au singulier.
const TAB_LABELS: Record<(typeof AMENDMENT_STATUSES)[number], string> = {
  DRAFT: 'À traiter',
  AWAITING_PAYMENT: 'En attente de paiement',
  APPLIED: 'Appliquées',
  DELETED: 'Supprimées',
}

const STATUS_OPTIONS = AMENDMENT_STATUSES.map((status) => ({
  value: status,
  label: TAB_LABELS[status],
}))

function productLabel(amendment: Amendment) {
  const product = amendmentProduct(amendment)
  return product ? AMENDMENT_PRODUCT_LABELS[product] : '—'
}

export function AmendmentsListContent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters = {
    status: search.status,
    product: search.product,
    page: search.page,
    size: search.size,
    sort: search.sort,
  }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: amendmentsKeys.list(filters),
    queryFn: () => getAmendments(filters),
    retry: false,
  })
  const rows = data?.content ?? []
  const forbidden = isForbidden(error)
  const hasProductFilter = search.product !== undefined

  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
    })
  const reset = () =>
    navigate({
      search: (previous) => ({ ...previous, product: undefined, page: 0 }),
    })
  const open = (amendment: Amendment) =>
    void navigate({
      to: '/contrats/modifications/$amendmentId',
      params: { amendmentId: String(amendment.id) },
      // La vue de la liste suit le détail : « Retour » la retrouve.
      search: {
        status: search.status,
        product: search.product,
        page: search.page,
        size: search.size,
        sort: search.sort,
      },
    })

  const emptyTitle = hasProductFilter
    ? 'Aucune modification ne correspond à ce filtre.'
    : `Aucune modification dans l’onglet « ${TAB_LABELS[search.status]} ».`
  const retry = (
    <Button
      variant="outline"
      className="rounded-[11px]"
      onClick={() => void refetch()}
    >
      Réessayer
    </Button>
  )
  const resetLink = hasProductFilter ? (
    <button
      type="button"
      onClick={reset}
      className="text-[13px] font-semibold text-primary hover:underline"
    >
      Réinitialiser les filtres
    </button>
  ) : undefined

  return (
    <>
      <PageHeader
        title="Modifications de contrat"
        subtitle="Modifications préparées par les clients et les agents : examen, validation ou suppression."
      />

      <Toolbar
        filters={
          <>
            <SegmentedPills
              label="Statut"
              value={search.status}
              options={STATUS_OPTIONS}
              scrollable
              onChange={(status) => updateSearch({ status })}
            />
            <FilterSelect
              label="Produit"
              value={search.product ?? ''}
              allLabel="Tous les produits"
              options={AMENDMENT_PRODUCTS.map((product) => ({
                value: product,
                label: AMENDMENT_PRODUCT_LABELS[product],
              }))}
              onChange={(value) =>
                updateSearch({
                  product: value ? (value as typeof search.product) : undefined,
                })
              }
            />
            <FilterSelect
              label="Tri"
              className="col-span-2 @xl/main:col-span-1 @xl/main:w-[240px]"
              value={search.sort}
              options={SORT_OPTIONS}
              onChange={(value) =>
                updateSearch({ sort: value as typeof search.sort })
              }
            />
          </>
        }
        actions={
          hasProductFilter ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-[10px]"
              onClick={reset}
            >
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />

      <ResultCount>
        {isLoading
          ? 'Chargement…'
          : error || !data
            ? '—'
            : `${data.totalElements} modification${data.totalElements > 1 ? 's' : ''}`}
      </ResultCount>

      <DataTableCard
        mobileCards={
          <MobileCardList
            items={rows}
            getKey={(amendment) => amendment.id}
            onActivate={open}
            isLoading={isLoading}
            error={!!error}
            forbidden={forbidden}
            errorTitle="Impossible de charger les modifications."
            errorAction={retry}
            empty={{ icon: FilePenLine, title: emptyTitle, action: resetLink }}
            renderCard={(amendment) => (
              <MobileCardContent
                title={`Contrat n° ${amendment.subscriptionId}`}
                subtitle={productLabel(amendment)}
                status={<DeltaKindBadge kind={amendment.delta.kind} />}
                value={formatFcfa(amendment.delta.total)}
                meta={
                  <>
                    {formatClaimDate(amendment.createdAt, true)}
                    {amendment.receipt && (
                      <div className="mt-1">
                        <ReceiptStatusBadge status={amendment.receipt.status} />
                      </div>
                    )}
                  </>
                }
              />
            )}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left">
                Créée le
              </DataTableHead>
              <DataTableHead>Contrat n°</DataTableHead>
              <DataTableHead>Produit</DataTableHead>
              <DataTableHead>Écart</DataTableHead>
              <DataTableHead className="text-right">Montant</DataTableHead>
              <DataTableHead>Quittance</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={[28, 20, 24, 20, 24, 28]} trailing />
            ) : error ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger les modifications."
                action={retry}
              />
            ) : rows.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={FilePenLine}
                title={emptyTitle}
                action={resetLink}
              />
            ) : (
              rows.map((amendment) => (
                <ClickableRow
                  key={amendment.id}
                  onActivate={() => open(amendment)}
                >
                  <DataTableCell
                    first
                    sticky="left"
                    className="whitespace-nowrap"
                  >
                    <div className="font-semibold">
                      {formatClaimDate(amendment.createdAt)}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {amendment.createdAt.slice(11, 16)}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="font-semibold whitespace-nowrap tabular-nums">
                    {amendment.subscriptionId}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {productLabel(amendment)}
                  </DataTableCell>
                  <DataTableCell>
                    <DeltaKindBadge kind={amendment.delta.kind} />
                  </DataTableCell>
                  <DataTableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
                    {formatFcfa(amendment.delta.total)}
                  </DataTableCell>
                  <DataTableCell>
                    {amendment.receipt ? (
                      <ReceiptStatusBadge status={amendment.receipt.status} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </DataTableCell>
                  <RowChevron />
                </ClickableRow>
              ))
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

function AmendmentsRoute() {
  return (
    <AmendmentsGate>
      <AmendmentsListContent />
    </AmendmentsGate>
  )
}
