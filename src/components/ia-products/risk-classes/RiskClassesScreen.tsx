import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { getRiskClasses } from '#/services/ia-standard'
import type { RiskClassStatus } from '#/services/ia-standard'
import { usePermissions } from '#/components/dashboard/use-permissions'
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
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { ResultCount } from '#/components/layout/Toolbar'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Pagination } from '#/components/ui/Pagination'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatClaimDate } from '#/lib/claims'
import { isForbidden, RetryAction } from '../shared/screen-kit'
import { CreateRiskClassDialog } from './CreateRiskClassDialog'
import { OccupationSearch } from './OccupationSearch'
import { RiskClassDrawer } from './RiskClassDrawer'
import { StatusBadge } from './StatusBadge'

const PAGE_SIZE = 20

const FILTERS: { value: RiskClassStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Actives' },
  { value: 'INACTIVE', label: 'Inactives' },
  { value: 'ALL', label: 'Toutes' },
]

export function RiskClassesScreen({
  initialClassId,
  onInitialConsumed,
  status: requestedStatus = 'ACTIVE',
  page = 0,
  onFiltersChange,
}: {
  /** Statut demandé (porté par l'URL). */
  status?: RiskClassStatus
  /** Page courante, à partir de 0 (portée par l'URL). */
  page?: number
  onFiltersChange?: (filters: { status: RiskClassStatus; page: number }) => void
  /** Class whose drawer opens on arrival (deep link from the global search). */
  initialClassId?: number
  /** Called once `initialClassId` has been applied, to clear it from the URL. */
  onInitialConsumed?: () => void
} = {}) {
  const { can, canKnown } = usePermissions()
  const canWrite = can('riskclass:write')
  // Masquer / forcer le filtre dépend du droit : permissions inconnues = refus (L-005).
  const canFilterStatus = canKnown('riskclass:write')
  // Sans `riskclass:write`, le backend ignore `status` et ne renvoie que les
  // classes actives : on n'affiche pas un filtre qui ne filtrerait rien.
  const status: RiskClassStatus = canFilterStatus ? requestedStatus : 'ACTIVE'
  const setStatus = (value: RiskClassStatus) =>
    onFiltersChange?.({ status: value, page: 0 })
  const setPage = (update: (p: number) => number) =>
    onFiltersChange?.({ status, page: update(page) })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (initialClassId === undefined) return
    setSelectedId(initialClassId)
    onInitialConsumed?.()
  }, [initialClassId])

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['ia-standard', 'risk-classes', 'list', status, page],
    queryFn: () =>
      getRiskClasses({
        status,
        page,
        size: PAGE_SIZE,
        sort: 'classNumber,asc',
      }),
    placeholderData: keepPreviousData,
  })

  // `?page=` au-delà de la dernière page : on revient à la dernière page
  // réelle au lieu d'afficher un faux état vide.
  const lastPage = data ? data.totalPages - 1 : -1
  const outOfRange = lastPage >= 0 && page > lastPage
  useEffect(() => {
    // Keep the status the URL asked for: while permissions load, `status` is
    // forced to ACTIVE and must not overwrite a shared `?status=` link.
    if (outOfRange)
      onFiltersChange?.({ status: requestedStatus, page: lastPage })
  }, [outOfRange, lastPage])

  const classes = outOfRange ? [] : (data?.content ?? [])
  const occupations = classes.reduce((n, c) => n + c.occupationCount, 0)
  const withoutOccupation = classes.filter(
    (c) => c.occupationCount === 0,
  ).length
  const partial = (data?.totalPages ?? 0) > 1
  const loading = isPending || outOfRange

  return (
    <div>
      <OccupationSearch
        onSelectClass={setSelectedId}
        filters={
          canFilterStatus ? (
            <SegmentedPills
              label="Filtrer par statut"
              value={status}
              onChange={setStatus}
              options={FILTERS}
            />
          ) : undefined
        }
        actions={
          <span
            title={
              canWrite
                ? undefined
                : 'Vous n’avez pas le droit de créer une classe.'
            }
          >
            <Button
              className="rounded-[11px]"
              disabled={!canWrite}
              onClick={() => setCreating(true)}
            >
              <Plus /> Nouvelle classe
            </Button>
          </span>
        }
      />

      <ResultCount
        note={partial ? 'Détails calculés sur la page affichée.' : undefined}
      >
        {loading
          ? 'Chargement…'
          : `${data?.totalElements ?? 0} classe${(data?.totalElements ?? 0) > 1 ? 's' : ''} · ${occupations} métier${occupations > 1 ? 's' : ''} rattaché${occupations > 1 ? 's' : ''}${withoutOccupation > 0 ? ` · ${withoutOccupation} sans métier` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left">
                N°
              </DataTableHead>
              <DataTableHead>Description</DataTableHead>
              <DataTableHead hideBelow="sm" className="text-right">
                Métiers
              </DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead hideBelow="lg">Mise à jour</DataTableHead>
              <DataTableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows
                rows={6}
                columns={[8, 80, 10, 16, 24]}
                hideBelow={[undefined, undefined, 'sm', undefined, 'lg']}
                trailing
              />
            ) : isError ? (
              <TableErrorState
                colSpan={6}
                forbidden={isForbidden(error)}
                title="Impossible de charger les classes de risque."
                action={<RetryAction onRetry={() => void refetch()} />}
              />
            ) : classes.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={Layers}
                title="Aucune classe ne correspond à ce filtre."
                action={
                  canFilterStatus && status !== 'ALL' ? (
                    <button
                      type="button"
                      onClick={() => setStatus('ALL')}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      Afficher toutes les classes
                    </button>
                  ) : undefined
                }
              />
            ) : (
              classes.map((c) => (
                <ClickableRow
                  key={c.id}
                  aria-label={`Ouvrir la classe ${c.classNumber}`}
                  onActivate={() => setSelectedId(c.id)}
                  selected={selectedId === c.id}
                >
                  <DataTableCell
                    first
                    sticky="left"
                    className="py-3.5 text-[13.5px] font-bold tabular-nums"
                  >
                    {c.classNumber}
                  </DataTableCell>
                  <TableCell className="max-w-[160px] py-3.5 text-[13.5px] @xl/main:max-w-[420px]">
                    <TruncatedText lines={2}>{c.description}</TruncatedText>
                  </TableCell>
                  <DataTableCell
                    hideBelow="sm"
                    className="py-3.5 text-right text-[13.5px] tabular-nums"
                  >
                    {c.occupationCount}
                  </DataTableCell>
                  <TableCell className="py-3.5">
                    <StatusBadge active={c.active} />
                  </TableCell>
                  <DataTableCell
                    hideBelow="lg"
                    className="py-3.5 text-[13px] whitespace-nowrap text-muted-foreground"
                  >
                    {formatClaimDate(c.updatedAt)}
                  </DataTableCell>
                  <RowChevron />
                </ClickableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>

      {data && !outOfRange && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          isLast={data.last}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {creating && (
        <CreateRiskClassDialog
          onClose={() => setCreating(false)}
          onCreated={setSelectedId}
        />
      )}
      <RiskClassDrawer
        classId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
