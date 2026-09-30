import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { usePermissions } from '#/components/dashboard/use-permissions'
import {
  DataTableCard,
  DataTableHead,
  FIRST_CELL_CLASS,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { SectionCard } from '#/components/layout/SectionCard'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import { isForbidden, RetryAction } from '../shared/screen-kit'
import { apiErrorMessage } from '#/lib/api-error'
import { parseIaErrorList } from '#/lib/ia-errors'
import { formatCoefficientPercent } from '#/lib/format'
import { cn } from '#/lib/utils'
import {
  createProration,
  deleteProration,
  getProrations,
} from '#/services/proration-coefficients'
import type { ProrationResponse } from '#/services/proration-coefficients'
import { ProrationModal } from './ProrationModal'
import {
  DEFAULT_PRORATION_GRID,
  PRORATION_PRODUCT,
  PRORATION_QUERY_KEY,
  analyzeCoverage,
  formatDuration,
  formatMaxMonths,
  sortByMinMonths,
} from './logic'

const coefficientFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function noPermission(permission: string) {
  return `Vous n’avez pas la permission requise (${permission}).`
}

class PartialSeedError extends Error {
  created: number
  reasons: string[]
  constructor(created: number, reasons: string[]) {
    super('partial')
    this.created = created
    this.reasons = reasons
  }
}

export function ProrationScreen() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('prorationcoefficient:write')
  const writeTitle = canWrite
    ? undefined
    : noPermission('prorationcoefficient:write')

  const [editing, setEditing] = useState<ProrationResponse | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ProrationResponse | null>(null)
  const [seeding, setSeeding] = useState(false)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: PRORATION_QUERY_KEY,
    queryFn: () => getProrations(PRORATION_PRODUCT),
  })

  const rows = sortByMinMonths(data ?? [])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRORATION_QUERY_KEY })
      toast.success('Tranche supprimée.')
      setDeleting(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const seedMutation = useMutation({
    // POST séquentiels : on s'arrête à la première erreur et on le dit.
    mutationFn: async () => {
      let created = 0
      for (const tranche of DEFAULT_PRORATION_GRID) {
        try {
          await createProration({ product: PRORATION_PRODUCT, ...tranche })
          created++
        } catch (err) {
          throw new PartialSeedError(created, parseIaErrorList(err))
        }
      }
      return created
    },
    onSuccess: (count) => {
      toast.success(`Grille personnalisée : ${count} tranches créées.`)
      setSeeding(false)
    },
    onError: (err) => {
      if (err instanceof PartialSeedError) {
        const total = DEFAULT_PRORATION_GRID.length
        toast.error(
          `${err.created} tranche(s) créée(s) sur ${total} avant l'échec : ${err.reasons.join(' ')} ` +
            (err.created > 0
              ? 'La grille par défaut ne s’applique plus : complétez les tranches manquantes.'
              : ''),
          { duration: 12000 },
        )
      } else toast.error(apiErrorMessage(err))
      setSeeding(false)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: PRORATION_QUERY_KEY }),
  })

  const coverage = analyzeCoverage(rows)

  const custom = rows.length > 0
  const problems = coverage.overlaps.length + coverage.uncoveredMonths.length

  return (
    <div>
      <Toolbar
        actions={
          <span title={writeTitle}>
            <Button
              className="rounded-[11px]"
              disabled={!canWrite}
              onClick={() => setEditing('new')}
            >
              <Plus className="size-4" />
              Ajouter une tranche
            </Button>
          </span>
        }
      />

      <ResultCount>
        {isError
          ? 'Tranches indisponibles'
          : isPending
            ? 'Chargement…'
            : custom
              ? `${rows.length} tranche${rows.length > 1 ? 's' : ''} personnalisée${rows.length > 1 ? 's' : ''}${problems > 0 ? ` · ${problems} chevauchement${problems > 1 ? 's' : ''} ou durée${problems > 1 ? 's' : ''} non couverte${problems > 1 ? 's' : ''}` : ''}`
              : `Grille par défaut du système · ${DEFAULT_PRORATION_GRID.length} tranches`}
      </ResultCount>

      {custom && (
        <div className="mb-[18px] flex flex-col gap-3">
          <WarningBanner tone="info">
            La grille par défaut du système ne s’applique plus : seules les
            tranches ci-dessous sont utilisées.
          </WarningBanner>
          {coverage.overlaps.length > 0 && (
            <WarningBanner title="Tranches qui se chevauchent">
              <ul className="list-disc pl-4">
                {coverage.overlaps.map(([a, b]) => (
                  <li key={`${a.minMonths}-${b.minMonths}-${a.maxMonths}`}>
                    {formatDuration(a.minMonths, a.maxMonths)} et{' '}
                    {formatDuration(b.minMonths, b.maxMonths)}
                  </li>
                ))}
              </ul>
            </WarningBanner>
          )}
          {coverage.uncoveredMonths.length > 0 && (
            <WarningBanner title="Durées non couvertes">
              La cotation échouera pour : {coverage.uncoveredMonths.join(', ')}{' '}
              mois
            </WarningBanner>
          )}
        </div>
      )}

      {isPending ? (
        <DataTableCard>
          <Table>
            <TableBody>
              <TableSkeletonRows rows={4} columns={[24, 12, 12, 16, 16]} />
            </TableBody>
          </Table>
        </DataTableCard>
      ) : isError ? (
        <DataTableCard>
          <Table>
            <TableBody>
              <TableErrorState
                colSpan={6}
                forbidden={isForbidden(error)}
                title="Impossible de charger les tranches de prorata."
                description={apiErrorMessage(error)}
                action={<RetryAction onRetry={() => void refetch()} />}
              />
            </TableBody>
          </Table>
        </DataTableCard>
      ) : rows.length === 0 ? (
        <SectionCard
          flush
          title="Grille par défaut appliquée par le système"
          description="Aucune tranche n’est définie : cette grille s’applique. Dès qu’une tranche existe, elle est remplacée."
          action={
            <Button
              variant="outline"
              className="rounded-[11px]"
              disabled={!canWrite}
              title={writeTitle}
              onClick={() => setSeeding(true)}
            >
              Personnaliser la grille
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <DataTableHead first>Durée</DataTableHead>
                  <DataTableHead>Coefficient</DataTableHead>
                  <DataTableHead>Pourcentage</DataTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEFAULT_PRORATION_GRID.map((t) => (
                  <TableRow
                    key={t.minMonths}
                    className="text-muted-foreground hover:bg-transparent"
                  >
                    <TableCell className={FIRST_CELL_CLASS}>
                      {formatDuration(t.minMonths, t.maxMonths)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {coefficientFormatter.format(t.coefficient)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCoefficientPercent(t.coefficient)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      ) : (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <DataTableHead first>Durée</DataTableHead>
                <DataTableHead>Min</DataTableHead>
                <DataTableHead>Max</DataTableHead>
                <DataTableHead>Coefficient</DataTableHead>
                <DataTableHead>Pourcentage</DataTableHead>
                <DataTableHead className="pr-[22px] text-right">
                  Actions
                </DataTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="hover:bg-[#f6f8fc]">
                  <TableCell className={cn(FIRST_CELL_CLASS, 'font-semibold')}>
                    {formatDuration(t.minMonths, t.maxMonths)}
                  </TableCell>
                  <TableCell className="tabular-nums">{t.minMonths}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatMaxMonths(t.maxMonths)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {coefficientFormatter.format(t.coefficient)}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone="info">
                      {formatCoefficientPercent(t.coefficient)}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="pr-[22px]">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Modifier la tranche"
                        disabled={!canWrite}
                        title={writeTitle ?? 'Modifier'}
                        onClick={() => setEditing(t)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer la tranche"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!canWrite}
                        title={writeTitle ?? 'Supprimer'}
                        onClick={() => setDeleting(t)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableCard>
      )}

      {editing && (
        <ProrationModal
          tranche={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Supprimer cette tranche ?"
        description={
          deleting
            ? `La tranche ${formatDuration(deleting.minMonths, deleting.maxMonths)} sera supprimée.${
                rows.length === 1
                  ? ' Sans aucune tranche, la grille par défaut du système s’appliquera de nouveau.'
                  : ''
              }`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />

      <ConfirmDialog
        open={seeding}
        onOpenChange={(open) => {
          if (!open && !seedMutation.isPending) setSeeding(false)
        }}
        title="Personnaliser la grille ?"
        description="Les 4 tranches de la grille par défaut seront créées pour que vous puissiez les modifier. Le calcul des cotations ne change pas tant que vous ne modifiez rien."
        confirmLabel="Créer les 4 tranches"
        pending={seedMutation.isPending}
        onConfirm={() => seedMutation.mutate()}
      />
    </div>
  )
}
