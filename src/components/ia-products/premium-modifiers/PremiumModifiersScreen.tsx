import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Percent, Plus, Trash2 } from 'lucide-react'
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
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { Button } from '#/components/ui/button'
import { Pagination } from '#/components/ui/Pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatSignedPercent } from '#/lib/format'
import { parseIaErrorList } from '#/lib/ia-errors'
import { cn } from '#/lib/utils'
import {
  deletePremiumModifier,
  getPremiumModifiers,
} from '#/services/ia-standard'
import type { PremiumModifierResponse } from '#/services/ia-standard'
import {
  isForbidden,
  noWriteTitle,
  RetryAction,
  ScreenNote,
} from '../shared/screen-kit'
import { PremiumModifierDialog } from './PremiumModifierDialog'
import { MODIFIER_TYPE_LABELS } from './modifier-payload'

const PAGE_SIZE = 20
export function PremiumModifiersScreen({
  page = 0,
  onPageChange,
}: {
  /** Page courante, à partir de 0 (portée par l'URL). */
  page?: number
  onPageChange?: (page: number) => void
} = {}) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('premiummodifier:write')
  const setPage = (value: number) => onPageChange?.(value)
  // `undefined` : fermé ; `null` : création ; sinon édition.
  const [editing, setEditing] = useState<
    PremiumModifierResponse | null | undefined
  >(undefined)
  const [deleting, setDeleting] = useState<PremiumModifierResponse | null>(null)
  const [deleteErrors, setDeleteErrors] = useState<string[]>([])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ia-standard', 'premium-modifiers', { page, size: PAGE_SIZE }],
    queryFn: () =>
      getPremiumModifiers({ page, size: PAGE_SIZE, sort: 'code,asc' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePremiumModifier(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'premium-modifiers'],
      })
      toast.success('Règle supprimée.')
      setDeleting(null)
      if (data && data.content.length === 1 && page > 0) setPage(page - 1)
    },
    onError: (err) => setDeleteErrors(parseIaErrorList(err)),
  })

  // `?page=` au-delà de la dernière page : retour à la dernière page réelle.
  const lastPage = data ? data.totalPages - 1 : -1
  const outOfRange = lastPage >= 0 && page > lastPage
  useEffect(() => {
    if (outOfRange) onPageChange?.(lastPage)
  }, [outOfRange, lastPage])

  const modifiers = outOfRange ? [] : (data?.content ?? [])
  const active = modifiers.filter((m) => m.isActive).length
  const surcharges = modifiers.filter(
    (m) => m.modifierType === 'SURCHARGE',
  ).length
  const discounts = modifiers.length - surcharges
  const partial = (data?.totalPages ?? 0) > 1
  const loading = isLoading || outOfRange

  return (
    <>
      <Toolbar
        actions={
          <span title={noWriteTitle('Majorations & réductions', canWrite)}>
            <Button
              className="rounded-[11px]"
              disabled={!canWrite}
              onClick={() => setEditing(null)}
            >
              <Plus />
              Nouvelle règle
            </Button>
          </span>
        }
      />

      <ResultCount
        note={partial ? 'Détails calculés sur la page affichée.' : undefined}
      >
        {loading
          ? 'Chargement…'
          : `${data?.totalElements ?? 0} règle${(data?.totalElements ?? 0) > 1 ? 's' : ''} · ${active} active${active > 1 ? 's' : ''} · ${surcharges} majoration${surcharges > 1 ? 's' : ''} · ${discounts} réduction${discounts > 1 ? 's' : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Code</DataTableHead>
              <DataTableHead>Libellé</DataTableHead>
              <DataTableHead>Type</DataTableHead>
              <DataTableHead className="text-right">Taux</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={5} columns={[20, 48, 20, 12, 14, 16]} />
            ) : isError ? (
              <TableErrorState
                colSpan={6}
                forbidden={isForbidden(error)}
                title="Impossible de charger les majorations et réductions."
                action={<RetryAction onRetry={() => void refetch()} />}
              />
            ) : modifiers.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={Percent}
                title="Aucune majoration ni réduction."
                description="Créez une règle pour l’appliquer aux cotations."
              />
            ) : (
              modifiers.map((m) => (
                <TableRow key={m.id} className="hover:bg-[#f6f8fc]">
                  <TableCell
                    className={cn(
                      FIRST_CELL_CLASS,
                      'font-mono text-[13px] font-semibold',
                    )}
                  >
                    {m.code}
                  </TableCell>
                  <TableCell className="max-w-[300px] text-[13.5px]">
                    <TruncatedText lines={2}>{m.label}</TruncatedText>
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={m.modifierType === 'SURCHARGE' ? 'warning' : 'info'}
                    >
                      {MODIFIER_TYPE_LABELS[m.modifierType]}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right text-[13.5px] font-semibold tabular-nums">
                    {formatSignedPercent(m.rate, m.modifierType)}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={m.isActive ? 'success' : 'neutral'}>
                      {m.isActive ? 'Actif' : 'Inactif'}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="pr-[22px] text-right">
                    <span
                      className="inline-flex items-center justify-end gap-1"
                      title={noWriteTitle('Majorations & réductions', canWrite)}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifier ${m.code}`}
                        disabled={!canWrite}
                        onClick={() => setEditing(m)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${m.code}`}
                        disabled={!canWrite}
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteErrors([])
                          setDeleting(m)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 0}
        isLast={data?.last ?? true}
        onPrev={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
      />

      <ScreenNote>
        Les devis déjà émis conservent leur copie : modifier ou supprimer n’a
        pas d’effet sur eux.
      </ScreenNote>

      {editing !== undefined && (
        <PremiumModifierDialog
          modifier={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Supprimer cette règle ?"
        description={
          deleteErrors.length
            ? deleteErrors.join(' ')
            : deleting
              ? `« ${deleting.code} » ne sera plus proposée. Les devis déjà émis ne sont pas affectés.`
              : undefined
        }
        confirmLabel={deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />
    </>
  )
}
