import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus } from 'lucide-react'
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
import { cn } from '#/lib/utils'
import { apiErrorMessage } from '#/lib/api-error'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { RateTableStatusBadge } from '#/components/rate-tables/RateTableStatusBadge'
import { AddRateTableProductModal } from '#/components/rate-tables/AddRateTableProductModal'
import {
  getRateTable,
  getRateTableProducts,
  removeRateTableProduct,
} from '#/services/rate-tables'
import type { RateTableProductResponse } from '#/services/rate-tables'
import { getCategories, getProducts } from '#/services/products'

export const Route = createFileRoute(
  '/_auth/products_/grille-tarifaire_/$rateTableId',
)({
  component: GrilleDetailPage,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function BackLink() {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="mb-3 -ml-2 rounded-[10px] text-muted-foreground"
    >
      <Link to="/products/grille-tarifaire">
        <ArrowLeft />
        Retour aux grilles
      </Link>
    </Button>
  )
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={4}
        className="py-9 text-center text-[13.5px] text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

function GrilleDetailPage() {
  const { rateTableId } = Route.useParams()
  const id = Number(rateTableId)
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const [showAdd, setShowAdd] = useState(false)
  const [removing, setRemoving] = useState<RateTableProductResponse | null>(
    null,
  )

  const {
    data: rateTable,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['rate-table', id],
    queryFn: () => getRateTable(id),
    retry: false,
  })

  const { data: linksData } = useQuery({
    queryKey: ['rate-table-products', id],
    queryFn: () => getRateTableProducts(id),
    retry: false,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getProducts(0, 200),
    retry: false,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories', 'all'],
    queryFn: () => getCategories(0, 200),
    retry: false,
  })

  const productById = useMemo(() => {
    const map = new Map(
      (productsData?.content ?? []).map((p) => [p.id, p] as const),
    )
    return (pid: number) => map.get(pid)
  }, [productsData])

  const categoryName = useMemo(() => {
    const map = new Map(
      (categoriesData?.content ?? []).map((c) => [c.id, c.name] as const),
    )
    return (cid: number) => map.get(cid) ?? `Catégorie #${cid}`
  }, [categoriesData])

  // Calculation model of a product's category — drives the "configurable?" hint.
  const calcTypeOfCategory = useMemo(() => {
    const map = new Map(
      (categoriesData?.content ?? []).map(
        (c) => [c.id, c.calculationType] as const,
      ),
    )
    return (cid: number) => map.get(cid)
  }, [categoriesData])

  const removeMutation = useMutation({
    mutationFn: removeRateTableProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-table-products', id] })
      toast.success('Produit retiré de la grille.')
      setRemoving(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const links = linksData?.content ?? []
  const existingProductIds = links.map((l) => l.productId)

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="p-9 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      </Card>
    )
  }

  if (error || !rateTable) {
    return (
      <>
        <BackLink />
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-destructive">
            Grille tarifaire introuvable.
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <BackLink />

      {showAdd && (
        <AddRateTableProductModal
          rateTableId={id}
          existingProductIds={existingProductIds}
          onClose={() => setShowAdd(false)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            Grille · {rateTable.version}
          </h1>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Produits rattachés à cette version de grille tarifaire.
          </p>
        </div>
        <RateTableStatusBadge status={rateTable.status} />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b px-[22px] py-3.5">
          <div className="text-[13.5px] font-bold">
            Produits de la grille
            <span className="ml-2 text-[12px] font-medium text-muted-foreground tabular-nums">
              {links.length}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-[10px]"
            onClick={() => setShowAdd(true)}
            disabled={!can('ratetable:write')}
            title={
              can('ratetable:write')
                ? undefined
                : "Vous n'avez pas la permission requise (ratetable:write)."
            }
          >
            <Plus />
            Ajouter un produit
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[22px]')}>
                Produit
              </TableHead>
              <TableHead className={headCls}>Catégorie</TableHead>
              <TableHead className={headCls}>Modèle</TableHead>
              <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <MessageRow>
                Aucun produit dans cette grille. Ajoutez-en un pour configurer
                ses tarifs.
              </MessageRow>
            ) : (
              links.map((link) => {
                const product = productById(link.productId)
                const model = product
                  ? calcTypeOfCategory(product.categoryId)
                  : undefined
                const isMrh = model === 'MRH'
                return (
                  <TableRow key={link.id} className="hover:bg-transparent">
                    <TableCell className="py-3.5 pl-[22px]">
                      <div className="text-[13.5px] font-semibold">
                        {product?.label ?? `Produit #${link.productId}`}
                      </div>
                      {product && (
                        <div className="text-[12px] text-muted-foreground tabular-nums">
                          {product.productCode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                      {product ? categoryName(product.categoryId) : '—'}
                    </TableCell>
                    <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                      {model ?? '—'}
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
                            params={{ productId: String(link.productId) }}
                          >
                            {isMrh
                              ? 'Configurer les tarifs'
                              : 'Voir le produit'}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRemoving(link)}
                          disabled={!can('ratetable:write')}
                          title={
                            can('ratetable:write')
                              ? undefined
                              : "Vous n'avez pas la permission requise (ratetable:write)."
                          }
                        >
                          Retirer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={!!removing}
        title="Retirer le produit"
        description={
          removing
            ? `Le produit « ${
                productById(removing.productId)?.label ??
                `#${removing.productId}`
              } » sera retiré de cette grille. Ses tarifs (au niveau produit) ne sont pas supprimés.`
            : undefined
        }
        confirmLabel={removeMutation.isPending ? 'Retrait…' : 'Retirer'}
        destructive
        pending={removeMutation.isPending}
        onConfirm={() => removing && removeMutation.mutate(removing.id)}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
      />
    </>
  )
}
