import { Link, useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  ClickableRow,
  DataTableHead,
  FIRST_CELL_CLASS,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { isForbidden } from '#/lib/api-error'
import { SectionCard } from '#/components/layout/SectionCard'
import { latestBy } from '#/lib/dashboard-stats'
import { formatDate, formatFcfa } from '#/lib/utils'
import type { SubscriptionResponse } from '#/services/subscriptions'
import { useDashboardSubscriptions } from './queries'
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge'

export const moreLink =
  'text-[13px] font-semibold text-primary whitespace-nowrap hover:underline'

function insuredName(s: SubscriptionResponse) {
  const name = [s.insured?.firstName, s.insured?.lastName]
    .filter(Boolean)
    .join(' ')
  return name || `Client n° ${s.clientId}`
}

export function LatestContracts() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useDashboardSubscriptions()
  const rows = data ? latestBy(data.items, 5) : []

  return (
    <SectionCard
      flush
      title="Derniers contrats"
      description="Les 5 contrats les plus récents · une ligne ouvre la fiche du client"
      action={
        <Link
          to="/clients"
          search={{ page: 0, size: 20, sort: 'lastName,asc' }}
          className={moreLink}
        >
          Voir les clients →
        </Link>
      }
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <DataTableHead first>Assuré</DataTableHead>
            <DataTableHead>Produit</DataTableHead>
            <DataTableHead className="text-right">Prime</DataTableHead>
            <DataTableHead>Statut</DataTableHead>
            <DataTableHead>Créé le</DataTableHead>
            <DataTableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows
              rows={5}
              columns={[32, 24, 20, 28, 22]}
              trailing
            />
          ) : error ? (
            <TableErrorState
              colSpan={6}
              forbidden={isForbidden(error)}
              title="Impossible de charger les contrats."
            />
          ) : rows.length === 0 ? (
            <TableEmptyState
              colSpan={6}
              icon={FileText}
              title="Aucun contrat pour le moment."
            />
          ) : (
            rows.map((s) => (
              <ClickableRow
                key={s.id}
                onActivate={() =>
                  void navigate({
                    to: '/clients/$clientId',
                    params: { clientId: String(s.clientId) },
                  })
                }
              >
                <TableCell className={FIRST_CELL_CLASS}>
                  <div className="font-semibold">{insuredName(s)}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {s.policyNumber ?? `Contrat n° ${s.id}`}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.productSnapshot?.productLabel ?? '—'}
                </TableCell>
                <TableCell className="text-right font-bold whitespace-nowrap tabular-nums">
                  {formatFcfa(s.totalPremium)}
                </TableCell>
                <TableCell>
                  <SubscriptionStatusBadge status={s.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(s.createdAt)}
                </TableCell>
                <RowChevron />
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SectionCard>
  )
}
