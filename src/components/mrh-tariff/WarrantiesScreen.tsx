import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, ShieldCheck } from 'lucide-react'
import { usePermissions } from '#/components/dashboard/use-permissions'
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { ResultCount } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  RetryAction,
  isForbidden,
  noWriteTitle,
} from '#/components/ia-products/shared/screen-kit'
import { formatPercent } from '#/lib/format'
import { MRH_WARRANTY_CODES, getWarranties } from '#/services/mrh-tariff'
import type { WarrantyResponse } from '#/services/mrh-tariff'
import { MRH_KEYS } from './grid-kit'
import { WarrantyDialog } from './WarrantyDialog'

/** Ordre de la grille NSIA (Incendie d'abord). */
export function sortWarranties<T extends { code: string }>(rows: T[]): T[] {
  const rank = (code: string) =>
    (MRH_WARRANTY_CODES as readonly string[]).indexOf(code)
  return [...rows].sort((a, b) => rank(a.code) - rank(b.code))
}

export function WarrantiesScreen() {
  const { can } = usePermissions()
  const canWrite = can('warranty:write')
  const [editing, setEditing] = useState<WarrantyResponse | null>(null)
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: MRH_KEYS.warranties,
    queryFn: getWarranties,
  })
  const rows = sortWarranties(data?.content ?? [])

  return (
    <div>
      <ResultCount>
        {isPending
          ? 'Chargement…'
          : `${rows.length} garantie${rows.length > 1 ? 's' : ''} · grille NSIA figée`}
      </ResultCount>
      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Garantie</DataTableHead>
              <DataTableHead>Taux de taxe</DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeletonRows rows={6} columns={[56, 20, 12]} />
            ) : isError ? (
              <TableErrorState
                colSpan={3}
                forbidden={isForbidden(error)}
                title="Impossible de charger les garanties."
                action={<RetryAction onRetry={() => void refetch()} />}
              />
            ) : rows.length === 0 ? (
              <TableEmptyState
                colSpan={3}
                icon={ShieldCheck}
                title="Aucune garantie."
                description="La grille NSIA est chargée par le serveur."
              />
            ) : (
              rows.map((w) => (
                <TableRow key={w.id} className="hover:bg-[#f6f8fc]">
                  <DataTableCell first>
                    <div className="text-[13.5px] font-semibold break-words">
                      {w.name}
                    </div>
                  </DataTableCell>
                  <TableCell className="text-[13.5px] whitespace-nowrap tabular-nums">
                    {formatPercent(w.taxRate)}
                  </TableCell>
                  <DataTableCell className="pr-[22px] text-right">
                    <span title={noWriteTitle('Garanties', canWrite)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifier la garantie ${w.name}`}
                        disabled={!canWrite}
                        onClick={() => setEditing(w)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </span>
                  </DataTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      {editing && (
        <WarrantyDialog warranty={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
