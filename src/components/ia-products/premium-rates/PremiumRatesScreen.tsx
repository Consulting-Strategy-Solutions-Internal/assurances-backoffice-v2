import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { usePermissions } from '#/components/dashboard/use-permissions'
import {
  DataTableCard,
  DataTableHead,
  FIRST_CELL_CLASS,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { formatPermille } from '#/lib/format'
import { parseIaErrorList } from '#/lib/ia-errors'
import { cn } from '#/lib/utils'
import {
  deletePremiumRate,
  getPremiumRates,
  getRiskClasses,
} from '#/services/ia-standard'
import { isForbidden, noWriteTitle, RetryAction } from '../shared/screen-kit'
import { StatusBadge } from '../risk-classes/StatusBadge'
import { PremiumRateDialog } from './PremiumRateDialog'
import { buildRateRows } from './rate-rows'
import type { RateRow } from './rate-rows'

export type RateFilter = 'ALL' | 'QUOTABLE' | 'MISSING'
const FILTERS: { value: RateFilter; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'QUOTABLE', label: 'Cotables' },
  { value: 'MISSING', label: 'Sans barème' },
]

export function PremiumRatesScreen({
  filter = 'ALL',
  onFilterChange,
}: {
  /** Filtre courant (porté par l'URL). */
  filter?: RateFilter
  onFilterChange?: (filter: RateFilter) => void
} = {}) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('riskclasspremiumrate:write')
  const [editing, setEditing] = useState<RateRow | null>(null)
  const [deleting, setDeleting] = useState<RateRow | null>(null)
  const [deleteErrors, setDeleteErrors] = useState<string[]>([])

  const classesQuery = useQuery({
    queryKey: ['ia-standard', 'risk-classes', { status: 'ALL', all: true }],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getRiskClasses({ status: 'ALL', page, size, sort: 'classNumber,asc' }),
      ),
  })
  const ratesQuery = useQuery({
    queryKey: ['ia-standard', 'premium-rates', { all: true }],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getPremiumRates({ page, size, sort: 'id,desc' }),
      ),
  })

  const allRows = useMemo(
    () =>
      buildRateRows(
        classesQuery.data?.items ?? [],
        ratesQuery.data?.items ?? [],
      ),
    [classesQuery.data, ratesQuery.data],
  )
  const rows = allRows.filter((r) =>
    filter === 'ALL' ? true : filter === 'QUOTABLE' ? !!r.rate : !r.rate,
  )

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePremiumRate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'premium-rates'],
      })
      toast.success('Barème supprimé.')
      setDeleting(null)
    },
    onError: (err) => setDeleteErrors(parseIaErrorList(err)),
  })

  const isLoading = classesQuery.isLoading || ratesQuery.isLoading
  const isError = classesQuery.isError || ratesQuery.isError

  const error = classesQuery.error ?? ratesQuery.error
  const retry = () => {
    void classesQuery.refetch()
    void ratesQuery.refetch()
  }
  const quotable = allRows.filter((r) => r.rate).length
  const notQuotable = allRows.length - quotable
  const firstMissing = allRows.find((r) => !r.rate) ?? null

  return (
    <>
      <Toolbar
        filters={
          <SegmentedPills
            label="Filtrer les classes"
            value={filter}
            onChange={(value) => onFilterChange?.(value)}
            options={FILTERS}
          />
        }
        actions={
          <span
            title={
              noWriteTitle('Barèmes', canWrite) ??
              (firstMissing
                ? undefined
                : 'Toutes les classes ont déjà un barème.')
            }
          >
            <Button
              className="rounded-[11px]"
              disabled={!canWrite || !firstMissing}
              onClick={() => firstMissing && setEditing(firstMissing)}
            >
              <Plus /> Définir un barème
            </Button>
          </span>
        }
      />

      <ResultCount
        note={
          classesQuery.data?.capped || ratesQuery.data?.capped
            ? 'Liste plafonnée : toutes les classes ou tous les barèmes ne sont pas affichés.'
            : undefined
        }
      >
        {isError
          ? 'Barèmes indisponibles'
          : isLoading
            ? 'Chargement…'
            : `${rows.length} classe${rows.length > 1 ? 's' : ''} · ${quotable} cotable${quotable > 1 ? 's' : ''}${notQuotable > 0 ? ` · ${notQuotable} sans barème` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>N° classe</DataTableHead>
              <DataTableHead>Description</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead className="pl-6 text-right">
                Décès (‰)
              </DataTableHead>
              <DataTableHead className="text-right">
                Invalidité perm. (‰)
              </DataTableHead>
              <DataTableHead className="text-right">
                Frais méd. (‰)
              </DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows
                rows={4}
                columns={[8, 60, 16, 16, 16, 16, 24]}
              />
            ) : isError ? (
              <TableErrorState
                colSpan={7}
                forbidden={isForbidden(error)}
                title="Impossible de charger les barèmes."
                action={<RetryAction onRetry={retry} />}
              />
            ) : rows.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                icon={Layers}
                title={
                  allRows.length > 0
                    ? 'Aucune classe ne correspond à ce filtre.'
                    : 'Aucune classe de risque.'
                }
                description={
                  allRows.length > 0
                    ? undefined
                    : 'Créez d’abord une classe dans l’onglet « Classes & métiers ».'
                }
                action={
                  allRows.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => onFilterChange?.('ALL')}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      Afficher toutes les classes
                    </button>
                  ) : undefined
                }
              />
            ) : (
              rows.map((row) => (
                <TableRow key={row.riskClass.id} className="hover:bg-[#f6f8fc]">
                  <TableCell
                    className={cn(
                      FIRST_CELL_CLASS,
                      'text-[13.5px] font-bold tabular-nums',
                    )}
                  >
                    {row.riskClass.classNumber}
                  </TableCell>
                  <TableCell className="max-w-[150px] text-[13.5px]">
                    <TruncatedText lines={2}>
                      {row.riskClass.description}
                    </TruncatedText>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={row.riskClass.active} />
                  </TableCell>
                  {row.rate ? (
                    <>
                      <TableCell className="pl-6 text-right text-[13.5px] tabular-nums">
                        {formatPermille(row.rate.death)}
                      </TableCell>
                      <TableCell className="text-right text-[13.5px] tabular-nums">
                        {formatPermille(row.rate.permanentDisability)}
                      </TableCell>
                      <TableCell className="text-right text-[13.5px] tabular-nums">
                        {formatPermille(row.rate.medicalExpenses)}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={3} className="text-center">
                      <StatusPill tone="warning">Non cotable</StatusPill>
                    </TableCell>
                  )}
                  <TableCell className="pr-[22px] text-right">
                    <span
                      className="inline-flex items-center justify-end gap-1"
                      title={noWriteTitle('Barèmes', canWrite)}
                    >
                      {row.rate ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Modifier le barème de la classe ${row.riskClass.classNumber}`}
                            disabled={!canWrite}
                            onClick={() => setEditing(row)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Supprimer le barème de la classe ${row.riskClass.classNumber}`}
                            disabled={!canWrite}
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteErrors([])
                              setDeleting(row)
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-[10px]"
                          disabled={!canWrite}
                          onClick={() => setEditing(row)}
                        >
                          Définir le barème
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>

      {editing && (
        <PremiumRateDialog
          riskClass={editing.riskClass}
          rate={editing.rate}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Supprimer ce barème ?"
        description={
          deleteErrors.length
            ? deleteErrors.join(' ')
            : deleting
              ? `La classe ${deleting.riskClass.classNumber} deviendra « Non cotable » tant qu'un nouveau barème n'est pas défini.`
              : undefined
        }
        confirmLabel={deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting?.rate) deleteMutation.mutate(deleting.rate.id)
        }}
      />
    </>
  )
}
