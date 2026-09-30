import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, Upload, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
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
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import { HeaderActionPortal } from '../shared/header-action'
import { isForbidden, RetryAction } from '../shared/screen-kit'
import { formatClaimDate } from '#/lib/claims'
import { parseIaErrorList } from '#/lib/ia-errors'
import { formatFcfa } from '#/lib/utils'
import { deleteAccessory, getAccessories } from '#/services/accessories'
import type { AccessoryResponse } from '#/services/accessories'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { AccessoryFormDialog } from './AccessoryFormDialog'
import { ImportAccessoriesDialog } from './ImportAccessoriesDialog'
import {
  describeGap,
  describeRange,
  findGaps,
  findOverlaps,
} from './accessories-logic'

const NO_PERMISSION = 'Vous n’avez pas la permission requise (accessory:write).'

export function IaAccessoriesScreen() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canRead = can('accessory:read')
  const canWrite = can('accessory:write')
  const writeTitle = canWrite ? undefined : NO_PERMISSION

  const [editing, setEditing] = useState<AccessoryResponse | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState<AccessoryResponse | null>(null)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [
      'accessories',
      'IA_STANDARD',
      { all: true, sort: 'minPremium,asc' },
    ],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getAccessories({
          product: 'IA_STANDARD',
          page,
          size,
          sort: 'minPremium,asc',
        }),
      ),
    enabled: canRead,
  })
  const accessories = useMemo(() => data?.items ?? [], [data])

  const overlaps = useMemo(() => findOverlaps(accessories), [accessories])
  const gaps = useMemo(() => findGaps(accessories), [accessories])

  const deleteMutation = useMutation({
    mutationFn: deleteAccessory,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['accessories', 'IA_STANDARD'],
      })
      toast.success('Tranche supprimée.')
      setDeleting(null)
    },
    onError: (err) => toast.error(parseIaErrorList(err).join(' ')),
  })

  const hasWarnings =
    !isPending &&
    !isError &&
    accessories.length > 0 &&
    (overlaps.length > 0 || gaps.length > 0)

  const loading = canRead && isPending
  const failed = canRead && isError
  const issues = overlaps.length + gaps.length

  return (
    <div>
      {!canRead && (
        <WarningBanner className="mb-[18px]">
          Vous n’avez pas la permission de consulter les accessoires
          (accessory:read).
        </WarningBanner>
      )}

      {hasWarnings && (
        <WarningBanner
          title="Couverture des tranches à vérifier"
          className="mb-[18px]"
        >
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {overlaps.map(({ a, b }) => (
              <li key={`o-${a.id}-${b.id}`}>
                Chevauchement : {describeRange(a)} et {describeRange(b)}.
              </li>
            ))}
            {gaps.map((g) => (
              <li key={`g-${g.from}`}>
                Aucune tranche ne couvre {describeGap(g)}.
              </li>
            ))}
          </ul>
        </WarningBanner>
      )}

      <HeaderActionPortal>
        <span title={writeTitle}>
          <Button
            type="button"
            variant="outline"
            className="rounded-[11px]"
            disabled={!canWrite}
            onClick={() => setImporting(true)}
          >
            <Upload className="size-4" />
            Importer un CSV
          </Button>
        </span>
        <span title={writeTitle}>
          <Button
            type="button"
            className="rounded-[11px]"
            disabled={!canWrite}
            onClick={() => setEditing('new')}
          >
            <Plus className="size-4" />
            Ajouter une tranche
          </Button>
        </span>
      </HeaderActionPortal>
      <ResultCount
        note={
          data?.capped
            ? `Seules les ${accessories.length} premières tranches sur ${data.total} sont affichées.`
            : undefined
        }
      >
        {loading
          ? 'Chargement…'
          : `${accessories.length} tranche${accessories.length > 1 ? 's' : ''} de prime nette${accessories.length > 0 ? ` · frais maximum ${formatFcfa(Math.max(...accessories.map((a) => a.amount)))}` : ''}${issues > 0 ? ` · ${issues} chevauchement${issues > 1 ? 's' : ''} ou trou${issues > 1 ? 's' : ''}` : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left" stickyFrom="sm">
                Tranche de prime nette
              </DataTableHead>
              <DataTableHead>Frais accessoires</DataTableHead>
              <DataTableHead hideBelow="md">Mise à jour</DataTableHead>
              <DataTableHead sticky="right" className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!canRead ? (
              <TableErrorState colSpan={4} forbidden />
            ) : loading ? (
              <TableSkeletonRows
                rows={4}
                columns={[48, 24, 24, 16]}
                hideBelow={[undefined, undefined, 'md', undefined]}
              />
            ) : failed ? (
              <TableErrorState
                colSpan={4}
                forbidden={isForbidden(error)}
                title="Impossible de charger les accessoires."
                action={<RetryAction onRetry={() => void refetch()} />}
              />
            ) : accessories.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={Wallet}
                title="Aucune tranche définie."
                description="Ajoutez une tranche ou importez un fichier CSV."
              />
            ) : (
              accessories.map((a) => (
                <TableRow key={a.id} className="hover:bg-[#f6f8fc]">
                  <DataTableCell
                    first
                    sticky="left"
                    stickyFrom="sm"
                    className="text-[13.5px] font-semibold tabular-nums"
                  >
                    {describeRange(a)}
                  </DataTableCell>
                  <TableCell className="text-[13.5px] whitespace-nowrap tabular-nums">
                    {formatFcfa(a.amount)}
                  </TableCell>
                  <DataTableCell
                    hideBelow="md"
                    className="text-[13px] whitespace-nowrap text-muted-foreground"
                  >
                    {formatClaimDate(a.updatedAt)}
                  </DataTableCell>
                  <DataTableCell
                    sticky="right"
                    className="pr-[22px] text-right"
                  >
                    <span title={writeTitle} className="inline-flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Modifier la tranche"
                        disabled={!canWrite}
                        onClick={() => setEditing(a)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Supprimer la tranche"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={!canWrite}
                        onClick={() => setDeleting(a)}
                      >
                        <Trash2 className="size-4" />
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
        <AccessoryFormDialog
          accessory={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && (
        <ImportAccessoriesDialog onClose={() => setImporting(false)} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette tranche ?"
        description={
          deleting
            ? `La tranche ${describeRange(deleting)} sera supprimée définitivement.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
