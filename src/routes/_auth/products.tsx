import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '#/components/ui/card'
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
import { ImportCsvDialog } from '#/components/forms/ImportCsvDialog'
import { AddProductModal } from '#/components/products/AddProductModal'
import { EditProductModal } from '#/components/products/EditProductModal'
import { deleteProduct, getCategories, getProducts } from '#/services/products'
import type { ProductResponse } from '#/services/products'

export const Route = createFileRoute('/_auth/products')({
  component: ProductsPage,
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

function ProductsPage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const canWrite = can('product:write')
  const noPerm = "Vous n'avez pas la permission requise (product:write)."
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<ProductResponse | null>(null)
  const [deleting, setDeleting] = useState<ProductResponse | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page],
    queryFn: () => getProducts(page),
    retry: false,
  })

  // Recover from a now-empty page after a delete (e.g. removing the last row of
  // the last page) by stepping back instead of stranding the user on a blank page.
  useEffect(() => {
    if (!isLoading && data && data.content.length === 0 && page > 0) {
      setPage((p) => p - 1)
    }
  }, [isLoading, data, page])

  // All categories, loaded once, to resolve a product's categoryId to its name.
  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories', 'all'],
    queryFn: () => getCategories(0, 200),
    retry: false,
  })

  const categoryName = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of categoriesData?.content ?? []) map.set(c.id, c.name)
    return (id: number) => map.get(id) ?? `Catégorie #${id}`
  }, [categoriesData])

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit supprimé.')
      setDeleting(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const rows = useMemo(
    () =>
      (data?.content ?? []).filter((p) =>
        matchesQuery(
          {
            label: p.label,
            code: String(p.productCode),
            categorie: categoryName(p.categoryId),
          },
          search,
        ),
      ),
    [data, search, categoryName],
  )

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle="Catalogue des produits d'assurance"
        action="Nouveau produit"
        onAction={() => setShowAdd(true)}
        actionDisabled={!canWrite}
        actionTitle={canWrite ? undefined : noPerm}
      >
        <Button
          variant="outline"
          className="rounded-[11px]"
          onClick={() => setShowImport(true)}
          disabled={!canWrite}
          title={canWrite ? undefined : noPerm}
        >
          <Upload />
          Importer (CSV)
        </Button>
      </PageHeader>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} />}
      {editing && (
        <EditProductModal product={editing} onClose={() => setEditing(null)} />
      )}
      {showImport && (
        <ImportCsvDialog
          eyebrow="Produits"
          title="Importer des produits"
          description="Import en masse depuis un fichier CSV (tout ou rien)."
          url="/products/import"
          headerHint="label,productCode,category"
          invalidateKey={['products']}
          onClose={() => setShowImport(false)}
        />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>
                Produit
              </TableHead>
              <TableHead className={headCls}>Code produit</TableHead>
              <TableHead className={headCls}>Catégorie</TableHead>
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
              <MessageRow>Impossible de charger les produits.</MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>
                {search
                  ? 'Aucun produit ne correspond à votre recherche.'
                  : 'Aucun produit pour le moment.'}
              </MessageRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} className="hover:bg-transparent">
                  <TableCell className="py-3.5 pl-[22px] text-[13.5px] font-semibold">
                    {p.label}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] font-semibold tabular-nums text-muted-foreground">
                    {p.productCode}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                    {categoryName(p.categoryId)}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] tabular-nums text-muted-foreground">
                    {formatDate(p.createdAt)}
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
                          to="/products/$productId"
                          params={{ productId: String(p.id) }}
                        >
                          Tarifs
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[9px]"
                        onClick={() => setEditing(p)}
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
                        onClick={() => setDeleting(p)}
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
        title="Supprimer le produit"
        description={
          deleting
            ? `Le produit « ${deleting.label} » sera archivé et retiré du catalogue.`
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
