import { pageHead } from '#/lib/page-title'
import { translateBackendMessage } from '#/lib/backend-messages'
import { Fragment, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Coins,
  Hourglass,
  RotateCcw,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import { useDistributionDirectory } from '#/components/quotations/useDistributionDirectory'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  AppliedCommissionLevel,
  CommissionBeneficiary,
  DistributorCell,
  middleEllipsis,
  OWNER_TYPE_LABELS,
  PaymentReference,
} from '#/components/commissions/CommissionDisplays'
import type { DistributorDisplay } from '#/components/commissions/CommissionDisplays'
import type { Attribution } from '#/components/quotations/useDistributionDirectory'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { usePermissions } from '#/components/dashboard/use-permissions'
import {
  ClickableRow,
  DataTableCard,
  DataTableHead,
  FIRST_CELL_CLASS,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { KpiRow } from '#/components/layout/KpiRow'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { apiErrorMessage } from '#/lib/api-error'
import { mapClaimError } from '#/lib/claims'
import { formatPercent2 } from '#/lib/commission-format'
import { formatDate, formatFcfa } from '#/lib/utils'
import {
  getCommissionDistributions,
  retryCommissionDistribution,
} from '#/services/commission-distributions'
import type {
  CommissionDistributionResponse,
  CommissionStatus,
} from '#/services/commission-distributions'
import { formatPersonName } from '#/lib/people'
import { getAllPartners } from '#/services/commission-reference-data'

const searchSchema = z.object({
  status: z
    .enum(['ON_HOLD', 'DISTRIBUTED', 'SKIPPED'])
    .optional()
    .catch(undefined),
  partnerId: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().min(0).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth/commissions/distributions')({
  head: pageHead('Distributions de commission'),
  validateSearch: searchSchema,
  component: CommissionDistributionsPage,
})

const tabs: Array<{ value: CommissionStatus; label: string }> = [
  { value: 'ON_HOLD', label: 'En attente' },
  { value: 'DISTRIBUTED', label: 'Distribuées' },
  { value: 'SKIPPED', label: 'Ignorées' },
]
const COLUMNS = 8

export function distributionNullableValue(value: number | null): string {
  return value === null ? '—' : formatFcfa(value)
}

function CommissionDistributionsPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canRetry = can('commission:write')
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const status: CommissionStatus = search.status ?? 'ON_HOLD'
  const partnerId =
    status === 'DISTRIBUTED' && search.partnerId ? String(search.partnerId) : ''
  const page = search.page ?? 0
  const setSearch = (next: {
    status?: CommissionStatus
    partnerId?: number | undefined
    page?: number
  }) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
    })
  const [retryTarget, setRetryTarget] =
    useState<CommissionDistributionResponse | null>(null)
  const directory = useDistributionDirectory()
  const [expanded, setExpanded] = useState<number | null>(null)
  const partners = useQuery({
    queryKey: ['partners', 'commission-filter'],
    queryFn: getAllPartners,
    enabled: status === 'DISTRIBUTED',
    retry: false,
  })
  const distributions = useQuery({
    queryKey: ['commission-distributions', status, partnerId, page],
    queryFn: () =>
      getCommissionDistributions({
        status,
        partnerId: partnerId ? Number(partnerId) : undefined,
        page,
        size: 20,
      }),
    retry: false,
  })
  const retryMutation = useMutation({
    mutationFn: retryCommissionDistribution,
    onSuccess: (result) => {
      setRetryTarget(null)
      queryClient.invalidateQueries({ queryKey: ['commission-distributions'] })
      if (result.status === 'ON_HOLD') {
        toast.error(
          `Le rejeu reste en attente : ${result.holdReason ? translateBackendMessage(result.holdReason) : 'configuration encore incohérente'}`,
        )
      } else {
        toast.success('Distribution rejouée avec succès.')
      }
    },
    onError: (error) => {
      setRetryTarget(null)
      toast.error(apiErrorMessage(error))
    },
  })
  const retryingId = retryMutation.isPending ? retryMutation.variables : null

  const content = distributions.data?.content ?? []
  const total = distributions.data?.totalElements ?? content.length
  const failure = distributions.error
  const forbidden =
    failure !== null && mapClaimError(failure).kind === 'forbidden'
  const loading = distributions.isLoading
  const pagePot = content.reduce((sum, item) => sum + (item.potAmount ?? 0), 0)
  const hasPot = content.some((item) => item.potAmount !== null)
  const tabLabel = tabs.find((tab) => tab.value === status)?.label ?? ''
  const kpi = (value: number | string) =>
    loading ? '…' : failure ? '—' : value
  const filtering = status === 'DISTRIBUTED' && partnerId !== ''

  return (
    <>
      <PageHeader
        title="Distributions de commissions"
        subtitle="Corriger les mises en attente et consulter les répartitions figées."
      />

      <KpiRow cols={3}>
        <KpiCard
          icon={<Share2 className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={kpi(total)}
          label={`Distributions · ${tabLabel.toLowerCase()}`}
        />
        <KpiCard
          icon={<Coins className="size-5 text-[#167347]" />}
          iconClass="bg-[#1c8a57]/10"
          value={kpi(hasPot ? formatFcfa(pagePot) : '—')}
          label={`Pot des ${content.length} lignes affichées`}
        />
        <KpiCard
          icon={<Hourglass className="size-5 text-[#8a6600]" />}
          iconClass="bg-[#ffc61e]/20"
          value={kpi(content.length)}
          label="Lignes affichées"
        />
      </KpiRow>

      <Toolbar
        filters={
          <>
            <SegmentedPills
              label="Statut"
              value={status}
              options={tabs}
              onChange={(value) => {
                setSearch({ status: value, partnerId: undefined, page: 0 })
                setExpanded(null)
              }}
            />
            {status === 'DISTRIBUTED' && (
              <SearchableSelect
                id="distribution-partner-filter"
                label="Partenaire bénéficiaire"
                value={partnerId}
                allLabel="Tous les partenaires"
                className="w-[240px]"
                loading={partners.isLoading}
                options={(partners.data ?? []).map((partner) => ({
                  value: String(partner.id),
                  label: partner.name,
                }))}
                onChange={(value) =>
                  setSearch({
                    partnerId: value ? Number(value) : undefined,
                    page: 0,
                  })
                }
              />
            )}
          </>
        }
        actions={
          filtering ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-[11px]"
              onClick={() => setSearch({ partnerId: undefined, page: 0 })}
            >
              Réinitialiser les filtres
            </Button>
          ) : undefined
        }
      />
      {status === 'ON_HOLD' && (
        <p className="mb-3 rounded-lg bg-[#fef3da] px-4 py-2.5 text-[13px] text-[#8a6600]">
          Ces paiements n’ont pas encore pu être répartis entre les
          bénéficiaires. Le motif est indiqué sur chaque ligne ; une fois la
          configuration corrigée (par exemple un schéma de commission manquant),
          cliquez sur « Rejouer ». Le filtre par partenaire n’est disponible que
          sur les distributions déjà faites.
        </p>
      )}
      <ResultCount
        note={
          status === 'DISTRIBUTED'
            ? 'Le filtre partenaire repose sur les lignes déjà distribuées.'
            : undefined
        }
      >
        {loading
          ? 'Chargement…'
          : failure
            ? ''
            : `${total} distribution${total > 1 ? 's' : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Paiement</DataTableHead>
              <DataTableHead>Cotation</DataTableHead>
              <DataTableHead>Distributeur</DataTableHead>
              <DataTableHead>Niveau</DataTableHead>
              <DataTableHead className="text-right">Pot</DataTableHead>
              <DataTableHead>Créée le</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Action
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={[36, 14, 24, 10, 20, 24, 24, 24]} />
            ) : failure ? (
              <TableErrorState
                colSpan={COLUMNS}
                forbidden={forbidden}
                title="Impossible de charger les distributions."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[11px]"
                    onClick={() => void distributions.refetch()}
                  >
                    Réessayer
                  </Button>
                }
              />
            ) : content.length === 0 ? (
              <TableEmptyState
                colSpan={COLUMNS}
                icon={Share2}
                title={
                  filtering
                    ? 'Aucune distribution ne correspond à ce partenaire.'
                    : status === 'ON_HOLD'
                      ? 'Aucune distribution en attente.'
                      : status === 'SKIPPED'
                        ? 'Aucune distribution ignorée.'
                        : 'Aucune distribution pour le moment.'
                }
                description={
                  status === 'ON_HOLD' && !filtering
                    ? 'Toutes les commissions ont pu être réparties.'
                    : undefined
                }
              />
            ) : (
              content.map((item) => {
                const canExpand = item.status === 'DISTRIBUTED'
                const open = expanded === item.id
                return (
                  <Fragment key={item.id}>
                    <RowShell
                      expandable={canExpand}
                      open={open}
                      label={item.paymentReference}
                      onToggle={() => setExpanded(open ? null : item.id)}
                    >
                      <TableCell className={FIRST_CELL_CLASS}>
                        <div className="flex items-center gap-2">
                          {canExpand &&
                            (open ? (
                              <ChevronDown className="size-4 text-primary" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            ))}
                          <div>
                            <PaymentReference
                              reference={item.paymentReference}
                            />
                            <div className="text-[12px] text-muted-foreground">
                              Paiement #{item.paymentId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        #{item.quotationId}
                      </TableCell>
                      <TableCell>
                        <DistributorCell
                          distributor={describeDistributor(
                            directory.resolveCode(item.distributorCode),
                            directory.isLoading,
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <AppliedCommissionLevel level={item.appliedLevel} />
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap tabular-nums">
                        {distributionNullableValue(item.potAmount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        {item.status === 'ON_HOLD' ? (
                          <StatusPill tone="warning">En attente</StatusPill>
                        ) : item.status === 'SKIPPED' ? (
                          <StatusPill tone="neutral">Ignorée</StatusPill>
                        ) : (
                          <StatusPill tone="success">Distribuée</StatusPill>
                        )}
                      </TableCell>
                      <TableCell className="pr-[22px] text-right">
                        {item.status === 'ON_HOLD' ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="w-56 whitespace-normal rounded-md bg-[#fbe9e9] px-2 py-1 text-left text-[12px] font-medium text-[#c0392b]">
                              {item.holdReason
                                ? translateBackendMessage(item.holdReason)
                                : 'Motif non renseigné'}
                            </span>
                            {canRetry && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-[9px]"
                                disabled={retryingId === item.id}
                                onClick={() => setRetryTarget(item)}
                              >
                                <RotateCcw
                                  className={
                                    retryingId === item.id
                                      ? 'animate-spin'
                                      : undefined
                                  }
                                />
                                {retryingId === item.id ? 'Rejeu…' : 'Rejouer'}
                              </Button>
                            )}
                          </div>
                        ) : item.status === 'SKIPPED' ? (
                          <span className="text-[12px] text-muted-foreground">
                            Taux produit à 0
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </RowShell>
                    {open && <DistributionLines distribution={item} />}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      <Pagination
        page={page}
        totalPages={distributions.data?.totalPages ?? 0}
        isLast={distributions.data?.last ?? true}
        onPrev={() => setSearch({ page: page - 1 })}
        onNext={() => setSearch({ page: page + 1 })}
      />
      <ConfirmDialog
        open={retryTarget !== null}
        title="Rejouer cette distribution ?"
        description={
          retryTarget
            ? `Le paiement ${middleEllipsis(retryTarget.paymentReference, 12, 6)} sera de nouveau réparti selon la configuration actuelle. Si elle est toujours incohérente, la distribution restera en attente.`
            : undefined
        }
        confirmLabel={retryMutation.isPending ? 'Rejeu…' : 'Rejouer'}
        pending={retryMutation.isPending}
        onConfirm={() => retryTarget && retryMutation.mutate(retryTarget.id)}
        onOpenChange={(open) => {
          if (!open && !retryMutation.isPending) setRetryTarget(null)
        }}
      />
    </>
  )
}

function describeDistributor(
  attribution: Attribution,
  loading: boolean,
): DistributorDisplay {
  if (attribution.kind === 'unknown') {
    return {
      name: `Code ${attribution.code}`,
      kindLabel: loading ? null : 'Distributeur non retrouvé',
      code: attribution.code,
    }
  }
  const kindLabel =
    attribution.kind === 'seller'
      ? 'Vendeur'
      : attribution.kind === 'agency'
        ? 'Agence'
        : 'Partenaire'
  return {
    name:
      attribution.kind === 'seller'
        ? formatPersonName(attribution.label)
        : attribution.label,
    kindLabel,
    code: attribution.code,
    partnerName:
      attribution.kind === 'partner' ? undefined : attribution.partner?.name,
  }
}

function RowShell({
  expandable,
  open,
  label,
  onToggle,
  children,
}: {
  expandable: boolean
  open: boolean
  label: string
  onToggle: () => void
  children: React.ReactNode
}) {
  if (!expandable) {
    return <TableRow className="hover:bg-[#f6f8fc]">{children}</TableRow>
  }
  return (
    <ClickableRow
      onActivate={onToggle}
      aria-expanded={open}
      aria-label={`Afficher le détail du paiement ${label}`}
    >
      {children}
    </ClickableRow>
  )
}

function DistributionLines({
  distribution,
}: {
  distribution: CommissionDistributionResponse
}) {
  const linesTotal =
    distribution.lines.reduce(
      (sum, line) => sum + Math.round(line.amount * 100),
      0,
    ) / 100
  return (
    <TableRow className="bg-[#f6f8fc] hover:bg-[#f6f8fc]">
      <TableCell colSpan={COLUMNS} className="px-[70px] py-5">
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted-foreground">
          <span>
            Taux produit :{' '}
            <strong>{formatPercent2(distribution.productRate)}</strong>
          </span>
          <span>
            Part nette :{' '}
            <strong>
              {distributionNullableValue(distribution.netPortion)}
            </strong>
          </span>
          <span>
            Somme des lignes : <strong>{formatFcfa(linesTotal)}</strong> / pot{' '}
            <strong>{distributionNullableValue(distribution.potAmount)}</strong>
          </span>
        </div>
        <div className="grid gap-2">
          {distribution.lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 rounded-[9px] border bg-card px-4 py-3 text-[12.5px]"
            >
              <span className="font-semibold">
                <CommissionBeneficiary line={line} />
                {line.ownerType && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {OWNER_TYPE_LABELS[line.ownerType]} #{line.ownerId}
                  </span>
                )}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatPercent2(line.shareRate)}
              </span>
              <span className="font-bold tabular-nums">
                {formatFcfa(line.amount)}
              </span>
            </div>
          ))}
        </div>
      </TableCell>
    </TableRow>
  )
}
