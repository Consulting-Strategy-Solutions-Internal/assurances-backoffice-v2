import { Fragment, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '#/components/dashboard/PageHeader'
import {
  AppliedCommissionLevel,
  CommissionBeneficiary,
} from '#/components/commissions/CommissionDisplays'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { FormSelect } from '#/components/forms/FormSelect'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Pagination } from '#/components/ui/Pagination'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { apiErrorMessage } from '#/lib/api-error'
import { formatDecimal2, formatPercent2 } from '#/lib/commission-format'
import { cn, formatDate } from '#/lib/utils'
import {
  getCommissionDistributions,
  retryCommissionDistribution,
} from '#/services/commission-distributions'
import type {
  CommissionDistributionResponse,
  CommissionStatus,
} from '#/services/commission-distributions'
import { getAllPartners } from '#/services/commission-reference-data'

export const Route = createFileRoute('/_auth/commissions/distributions')({
  component: CommissionDistributionsPage,
})

const tabs: Array<{ status: CommissionStatus; label: string }> = [
  { status: 'ON_HOLD', label: 'En attente' },
  { status: 'DISTRIBUTED', label: 'Distribuées' },
  { status: 'SKIPPED', label: 'Ignorées' },
]
const headClass =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function distributionNullableValue(value: number | null): string {
  return formatDecimal2(value)
}

function CommissionDistributionsPage() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canRetry = can('commission:write')
  const [status, setStatus] = useState<CommissionStatus>('ON_HOLD')
  const [partnerId, setPartnerId] = useState('')
  const [page, setPage] = useState(0)
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
        partnerId:
          status === 'DISTRIBUTED' && partnerId ? Number(partnerId) : undefined,
        page,
        size: 20,
      }),
    retry: false,
  })
  const retryMutation = useMutation({
    mutationFn: retryCommissionDistribution,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['commission-distributions'] })
      if (result.status === 'ON_HOLD') {
        toast.error(
          `Le rejeu reste en attente : ${result.holdReason ?? 'configuration encore incohérente'}`,
        )
      } else {
        toast.success('Distribution rejouée avec succès.')
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  return (
    <>
      <PageHeader
        title="Distributions de commissions"
        subtitle="Corriger les mises en attente et consulter les répartitions figées"
      />
      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as CommissionStatus)
          setPartnerId('')
          setPage(0)
          setExpanded(null)
        }}
      >
        <TabsList className="mb-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.status} value={tab.status}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {status === 'DISTRIBUTED' && (
        <Card className="mb-4 max-w-md p-4">
          <FormSelect
            id="distribution-partner-filter"
            label="Partenaire bénéficiaire"
            value={partnerId}
            includeNone
            noneLabel="Tous les partenaires"
            options={(partners.data ?? []).map((partner) => ({
              value: String(partner.id),
              label: partner.name,
            }))}
            onChange={(value) => {
              setPartnerId(value)
              setPage(0)
            }}
            hint="Ce filtre repose sur les lignes déjà distribuées."
          />
        </Card>
      )}
      {status === 'ON_HOLD' && (
        <p className="mb-4 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
          La vue « En attente » est volontairement chargée sans filtre
          partenaire : aucune ligne bénéficiaire n'existe avant distribution.
        </p>
      )}
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headClass, 'w-10 pl-[22px]')} />
              <TableHead className={headClass}>Paiement</TableHead>
              <TableHead className={headClass}>Cotation</TableHead>
              <TableHead className={headClass}>Distributeur</TableHead>
              <TableHead className={headClass}>Niveau</TableHead>
              <TableHead className={headClass}>Pot</TableHead>
              <TableHead className={headClass}>Créée le</TableHead>
              <TableHead className={cn(headClass, 'pr-[22px] text-right')}>
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.isLoading ? (
              <MessageRow>Chargement…</MessageRow>
            ) : distributions.error ? (
              <MessageRow destructive>
                Impossible de charger les distributions.
              </MessageRow>
            ) : distributions.data?.content.length === 0 ? (
              <MessageRow>Aucune distribution dans cet état.</MessageRow>
            ) : (
              distributions.data?.content.map((item) => {
                const canExpand = item.status === 'DISTRIBUTED'
                const open = expanded === item.id
                return (
                  <Fragment key={item.id}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell className="pl-[22px]">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canExpand}
                          aria-label="Afficher le détail"
                          onClick={() => setExpanded(open ? null : item.id)}
                        >
                          {canExpand ? (
                            open ? (
                              <ChevronDown />
                            ) : (
                              <ChevronRight />
                            )
                          ) : null}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {item.paymentReference}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          #{item.paymentId}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        #{item.quotationId}
                      </TableCell>
                      <TableCell>{item.distributorCode}</TableCell>
                      <TableCell>
                        <AppliedCommissionLevel level={item.appliedLevel} />
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {distributionNullableValue(item.potAmount)}
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell className="pr-[22px] text-right">
                        {item.status === 'ON_HOLD' ? (
                          <div className="flex flex-col items-end gap-2">
                            <span className="max-w-xs whitespace-normal rounded-md bg-destructive/10 px-2 py-1 text-left text-[11.5px] font-medium text-destructive">
                              {item.holdReason ?? 'Motif non renseigné'}
                            </span>
                            {canRetry && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={retryMutation.isPending}
                                onClick={() => retryMutation.mutate(item.id)}
                              >
                                <RotateCcw />
                                Rejouer
                              </Button>
                            )}
                          </div>
                        ) : item.status === 'SKIPPED' ? (
                          <span className="text-[12px] text-muted-foreground">
                            Taux produit à 0
                          </span>
                        ) : (
                          <span className="text-[12px] text-emerald-700">
                            Distribuée
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {open && <DistributionLines distribution={item} />}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination
        page={page}
        totalPages={distributions.data?.totalPages ?? 0}
        isLast={distributions.data?.last ?? true}
        onPrev={() => setPage((current) => current - 1)}
        onNext={() => setPage((current) => current + 1)}
      />
    </>
  )
}

function MessageRow({
  children,
  destructive,
}: {
  children: React.ReactNode
  destructive?: boolean
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={8}
        className={cn(
          'py-9 text-center text-muted-foreground',
          destructive && 'text-destructive',
        )}
      >
        {children}
      </TableCell>
    </TableRow>
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
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell colSpan={8} className="px-[70px] py-5">
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
            Somme des lignes : <strong>{formatDecimal2(linesTotal)}</strong> /
            pot{' '}
            <strong>{distributionNullableValue(distribution.potAmount)}</strong>
          </span>
        </div>
        <div className="grid gap-2">
          {distribution.lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-[1fr_auto_auto] gap-4 rounded-[9px] border bg-background px-4 py-3 text-[12.5px]"
            >
              <span className="font-semibold">
                <CommissionBeneficiary line={line} />
                {line.ownerType && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    {line.ownerType} #{line.ownerId}
                  </span>
                )}
              </span>
              <span>{formatPercent2(line.shareRate)}</span>
              <span className="font-bold tabular-nums">
                {formatDecimal2(line.amount)}
              </span>
            </div>
          ))}
        </div>
      </TableCell>
    </TableRow>
  )
}
