import { Link, useNavigate } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import { ClaimStatusBadge } from '#/components/claims/ClaimStatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  ClickableRow,
  DataTableCell,
  DataTableHead,
  FIRST_CELL_CLASS,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { isForbidden } from '#/lib/api-error'
import { SectionCard } from '#/components/layout/SectionCard'
import { formatClaimDate } from '#/lib/claims'
import { useDashboardClaims } from './queries'
import { ACTION_LINK_CLASS } from '#/lib/dashboard-theme'
import { cn } from '#/lib/utils'

export function ClaimsToProcess() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useDashboardClaims()

  return (
    <SectionCard
      flush
      title="Sinistres à traiter"
      description="Déclarés ou en instruction · les plus anciens d’abord"
      action={
        <div className="flex items-center gap-2 sm:gap-3">
          {data && data.toProcessCount > 0 && (
            <span className="rounded-full bg-[#ffc61e]/[0.22] px-2 py-px text-[11.5px] font-bold text-[#8a6600]">
              {data.toProcessCount}
            </span>
          )}
          <Link
            to="/sinistres"
            search={{ page: 0, size: 20, sort: 'createdAt,desc' }}
            className={cn(ACTION_LINK_CLASS, 'whitespace-nowrap')}
          >
            Tout voir →
          </Link>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <DataTableHead first>Référence</DataTableHead>
            <DataTableHead>Client</DataTableHead>
            <DataTableHead hideBelow="md">Produit</DataTableHead>
            <DataTableHead>Statut</DataTableHead>
            <DataTableHead hideBelow="md">Déclaré le</DataTableHead>
            <DataTableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows
              rows={3}
              columns={[28, 28, 24, 24, 22]}
              hideBelow={[undefined, undefined, 'md', undefined, 'md']}
              trailing
            />
          ) : error ? (
            <TableErrorState
              colSpan={6}
              forbidden={isForbidden(error)}
              title="Impossible de charger les sinistres."
            />
          ) : !data || data.toProcess.length === 0 ? (
            <TableEmptyState
              colSpan={6}
              icon={CircleCheck}
              title="Aucun sinistre à traiter."
              description="Les nouvelles déclarations apparaîtront ici."
            />
          ) : (
            data.toProcess.map((c) => (
              <ClickableRow
                key={c.id}
                onActivate={() =>
                  void navigate({
                    to: '/sinistres/$claimId',
                    params: { claimId: String(c.id) },
                  })
                }
              >
                <TableCell
                  className={`${FIRST_CELL_CLASS} font-bold whitespace-nowrap text-primary`}
                >
                  {c.claimNumber}
                </TableCell>
                <TableCell className="font-semibold">
                  {c.clientName ?? `Client n° ${c.clientId}`}
                </TableCell>
                <DataTableCell hideBelow="md" className="text-muted-foreground">
                  {c.productLabel}
                </DataTableCell>
                <TableCell>
                  <ClaimStatusBadge status={c.status} />
                </TableCell>
                <DataTableCell
                  hideBelow="md"
                  className="whitespace-nowrap text-muted-foreground"
                >
                  {formatClaimDate(c.createdAt)}
                </DataTableCell>
                <RowChevron />
              </ClickableRow>
            ))
          )}
        </TableBody>
      </Table>
    </SectionCard>
  )
}
