import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Pagination } from '#/components/ui/Pagination'
import { cn, formatDate } from '#/lib/utils'
import { matchesQuery } from '#/lib/dashboard-theme'
import { apiErrorMessage } from '#/lib/api-error'
import { useShell } from '#/components/dashboard/shell'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { AddRateTableModal } from '#/components/rate-tables/AddRateTableModal'
import { EditRateTableModal } from '#/components/rate-tables/EditRateTableModal'
import {
  RATE_TABLE_STATUS_META,
  RateTableStatusBadge,
} from '#/components/rate-tables/RateTableStatusBadge'
import {
  archiveRateTable,
  deleteRateTable,
  getRateTables,
  publishRateTable,
} from '#/services/rate-tables'
import type { RateTableResponse } from '#/services/rate-tables'

export const Route = createFileRoute('/_auth/products_/grille-tarifaire')({
  component: GrilleTarifairePage,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

const STATUS_TABS = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'Brouillons', value: 'DRAFT' },
  { label: 'Publiées', value: 'PUBLISHED' },
  { label: 'Archivées', value: 'ARCHIVED' },
] as const

type StatusFilter = (typeof STATUS_TABS)[number]['value']
type ConfirmAction = 'publish' | 'archive' | 'delete'

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={5}
        className="py-9 text-center text-[13.5px] text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

function GrilleTarifairePage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const canWrite = can('ratetable:write')
  const noPerm = "Vous n'avez pas la permission requise (ratetable:write)."
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<RateTableResponse | null>(null)
  const [confirm, setConfirm] = useState<{
    action: ConfirmAction
    table: RateTableResponse
  } | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['rate-tables', page, statusFilter],
    queryFn: () =>
      getRateTables(
        page,
        20,
        statusFilter === 'ALL' ? undefined : statusFilter,
      ),
    retry: false,
  })

  // Recover from a now-empty page after a delete by stepping back instead of
  // stranding the user on a blank page.
  useEffect(() => {
    if (!isLoading && data && data.content.length === 0 && page > 0) {
      setPage((p) => p - 1)
    }
  }, [isLoading, data, page])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rate-tables'] })

  const publishMutation = useMutation({
    mutationFn: publishRateTable,
    onSuccess: () => {
      invalidate()
      toast.success('Grille publiée.')
      setConfirm(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveRateTable,
    onSuccess: () => {
      invalidate()
      toast.success('Grille archivée.')
      setConfirm(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRateTable,
    onSuccess: () => {
      invalidate()
      toast.success('Grille supprimée.')
      setConfirm(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const pending =
    publishMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending

  const rows = useMemo(
    () =>
      (data?.content ?? []).filter((r) =>
        matchesQuery(
          {
            version: r.version,
            statut: RATE_TABLE_STATUS_META[r.status].label,
          },
          search,
        ),
      ),
    [data, search],
  )

  const onStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter)
    setPage(0)
  }

  const runConfirm = () => {
    if (!confirm) return
    const id = confirm.table.id
    if (confirm.action === 'publish') publishMutation.mutate(id)
    else if (confirm.action === 'archive') archiveMutation.mutate(id)
    else deleteMutation.mutate(id)
  }

  // Keep the last action so the dialog keeps its label/colour during the close
  // animation (when `confirm` is already null) instead of flashing the delete copy.
  const lastActionRef = useRef<ConfirmAction>('delete')
  if (confirm) lastActionRef.current = confirm.action
  const activeAction = confirm?.action ?? lastActionRef.current

  const CONFIRM_COPY: Record<
    ConfirmAction,
    { title: string; confirmLabel: string; destructive: boolean }
  > = {
    publish: {
      title: 'Publier la grille',
      confirmLabel: pending ? 'Publication…' : 'Publier',
      destructive: false,
    },
    archive: {
      title: 'Archiver la grille',
      confirmLabel: pending ? 'Archivage…' : 'Archiver',
      destructive: false,
    },
    delete: {
      title: 'Supprimer la grille',
      confirmLabel: pending ? 'Suppression…' : 'Supprimer',
      destructive: true,
    },
  }
  const confirmConfig = CONFIRM_COPY[activeAction]

  const confirmDescription = !confirm
    ? undefined
    : confirm.action === 'publish'
      ? `La grille « ${confirm.table.version} » sera publiée. Toute grille actuellement publiée sera archivée.`
      : confirm.action === 'archive'
        ? `La grille « ${confirm.table.version} » sera archivée.`
        : confirm.table.status === 'PUBLISHED'
          ? `La grille « ${confirm.table.version} » est actuellement publiée (en production). La supprimer laissera le catalogue sans grille publiée — cette action est irréversible.`
          : `La grille « ${confirm.table.version} » sera supprimée de la liste.`

  return (
    <>
      <PageHeader
        title="Grille tarifaire"
        subtitle="Versions de grilles tarifaires · brouillon, publication & archivage"
        action="Nouvelle grille"
        onAction={() => setShowAdd(true)}
        actionDisabled={!canWrite}
        actionTitle={canWrite ? undefined : noPerm}
      />

      {showAdd && <AddRateTableModal onClose={() => setShowAdd(false)} />}
      {editing && (
        <EditRateTableModal
          rateTable={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-1.5 border-b px-[18px] py-3.5">
          <Tabs value={statusFilter} onValueChange={onStatusChange}>
            <TabsList className="h-auto gap-1.5 bg-transparent p-0">
              {STATUS_TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-[9px] px-3.5 py-[7px] text-[12.5px] font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>
                Version
              </TableHead>
              <TableHead className={headCls}>Statut</TableHead>
              <TableHead className={headCls}>Créée le</TableHead>
              <TableHead className={headCls}>Modifiée le</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <MessageRow>Chargement…</MessageRow>
            ) : error ? (
              <MessageRow>
                Impossible de charger les grilles tarifaires.
              </MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>
                {search
                  ? 'Aucune grille ne correspond à votre recherche.'
                  : 'Aucune grille tarifaire pour le moment.'}
              </MessageRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-transparent">
                  <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-semibold">
                    {r.version}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <RateTableStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] tabular-nums text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] tabular-nums text-muted-foreground">
                    {formatDate(r.updatedAt)}
                  </TableCell>
                  <TableCell className="py-3.5 pr-[22px]">
                    <div className="flex justify-end gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="rounded-[9px]"
                      >
                        <Link
                          to="/products/grille-tarifaire/$rateTableId"
                          params={{ rateTableId: String(r.id) }}
                        >
                          Produits
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[9px]"
                        onClick={() => setEditing(r)}
                        disabled={!canWrite}
                        title={canWrite ? undefined : noPerm}
                      >
                        Modifier
                      </Button>
                      {r.status === 'PUBLISHED' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-[9px]"
                          onClick={() =>
                            setConfirm({ action: 'archive', table: r })
                          }
                          disabled={!canWrite}
                          title={canWrite ? undefined : noPerm}
                        >
                          Archiver
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-[9px] border-[#1c8a57]/30 text-[#1c8a57] hover:bg-[#1c8a57]/10 hover:text-[#1c8a57]"
                          onClick={() =>
                            setConfirm({ action: 'publish', table: r })
                          }
                          disabled={!canWrite}
                          title={canWrite ? undefined : noPerm}
                        >
                          Publier
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() =>
                          setConfirm({ action: 'delete', table: r })
                        }
                        disabled={!canWrite}
                        title={canWrite ? undefined : noPerm}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 0}
        isLast={data?.last ?? true}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirmConfig.title}
        description={confirmDescription}
        confirmLabel={confirmConfig.confirmLabel}
        destructive={confirmConfig.destructive}
        pending={pending}
        onConfirm={runConfirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      />
    </>
  )
}
