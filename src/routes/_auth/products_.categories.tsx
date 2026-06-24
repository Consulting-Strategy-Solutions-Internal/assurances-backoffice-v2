import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
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
import { AddCategoryModal } from '#/components/products/AddCategoryModal'
import { EditCategoryModal } from '#/components/products/EditCategoryModal'
import { deleteCategory, getCategories } from '#/services/products'
import type { ProductCategoryResponse } from '#/services/products'

export const Route = createFileRoute('/_auth/products_/categories')({
  component: CategoriesPage,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

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

function CategoriesPage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const canWrite = can('product:write')
  const noPerm = "Vous n'avez pas la permission requise (product:write)."
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ProductCategoryResponse | null>(null)
  const [deleting, setDeleting] = useState<ProductCategoryResponse | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['product-categories', page],
    queryFn: () => getCategories(page),
    retry: false,
  })

  // Recover from a now-empty page after a delete by stepping back instead of
  // stranding the user on a blank page.
  useEffect(() => {
    if (!isLoading && data && data.content.length === 0 && page > 0) {
      setPage((p) => p - 1)
    }
  }, [isLoading, data, page])

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      // La liste des produits affiche le nom des catégories.
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Catégorie supprimée.')
      setDeleting(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const rows = useMemo(
    () =>
      (data?.content ?? []).filter((c) =>
        matchesQuery(
          {
            name: c.name,
            description: c.description ?? '',
            calculationType: c.calculationType ?? '',
          },
          search,
        ),
      ),
    [data, search],
  )

  return (
    <>
      <PageHeader
        title="Catégories"
        subtitle="Familles de produits du catalogue"
        action="Nouvelle catégorie"
        onAction={() => setShowAdd(true)}
        actionDisabled={!canWrite}
        actionTitle={canWrite ? undefined : noPerm}
      />

      {showAdd && <AddCategoryModal onClose={() => setShowAdd(false)} />}
      {editing && (
        <EditCategoryModal
          category={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>
                Catégorie
              </TableHead>
              <TableHead className={headCls}>Description</TableHead>
              <TableHead className={headCls}>Type de calcul</TableHead>
              <TableHead className={headCls}>Créé le</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <MessageRow>Chargement…</MessageRow>
            ) : error ? (
              <MessageRow>Impossible de charger les catégories.</MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>
                {search
                  ? 'Aucune catégorie ne correspond à votre recherche.'
                  : 'Aucune catégorie pour le moment.'}
              </MessageRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id} className="hover:bg-transparent">
                  <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-semibold">
                    {c.name}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate py-3.5 text-[13px] text-muted-foreground">
                    {c.description || '—'}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {c.calculationType ? (
                      <Badge
                        variant="secondary"
                        className="rounded-md px-2 py-0.5 text-[12px] font-semibold"
                      >
                        {c.calculationType}
                      </Badge>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] tabular-nums text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="py-3.5 pr-[22px]">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[9px]"
                        onClick={() => setEditing(c)}
                        disabled={!canWrite}
                        title={canWrite ? undefined : noPerm}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(c)}
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
        open={!!deleting}
        title="Supprimer la catégorie"
        description={
          deleting
            ? `La catégorie « ${deleting.name} » sera archivée. Les produits qui y sont rattachés ne seront plus catégorisés.`
            : undefined
        }
        confirmLabel={deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </>
  )
}
