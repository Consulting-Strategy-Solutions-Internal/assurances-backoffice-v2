import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { apiErrorMessage } from '#/lib/api-error'
import { matchesQuery } from '#/lib/dashboard-theme'
import { useShell } from '#/components/dashboard/shell'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { ImportCsvDialog } from '#/components/forms/ImportCsvDialog'
import { AddAccessoryModal } from '#/components/accessories/AddAccessoryModal'
import { EditAccessoryModal } from '#/components/accessories/EditAccessoryModal'
import {
  AccessoriesByProduct,
  type AccessoryGroup,
} from '#/components/accessories/AccessoriesByProduct'
import { deleteAccessory, getAccessories } from '#/services/accessories'
import type { AccessoryResponse } from '#/services/accessories'
import { getProducts } from '#/services/products'

export const Route = createFileRoute('/_auth/products_/accessoires')({
  component: AccessoriesPage,
})

function AccessoriesPage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const canWrite = can('accessory:write')
  const noPerm = "Vous n'avez pas la permission requise (accessory:write)."
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<AccessoryResponse | null>(null)
  const [deleting, setDeleting] = useState<AccessoryResponse | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['accessories', 'all'],
    queryFn: () => getAccessories(0, 200),
    retry: false,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getProducts(0, 200),
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccessory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
      toast.success('Accessoire supprimé.')
      setDeleting(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  // Group accessories by product, applying the global search to the product
  // label / code so a query narrows whole product blocks.
  const groups = useMemo<AccessoryGroup[]>(() => {
    const products = productsData?.content ?? []
    const productById = new Map(products.map((p) => [p.id, p] as const))
    const byProduct = new Map<number, AccessoryGroup>()

    for (const a of data?.content ?? []) {
      const product = productById.get(a.productId)
      const label = product?.label ?? `Produit #${a.productId}`
      const matches = matchesQuery(
        { label, productCode: String(product?.productCode ?? '') },
        search,
      )
      if (!matches) continue
      let group = byProduct.get(a.productId)
      if (!group) {
        group = {
          productId: a.productId,
          label,
          productCode: product?.productCode,
          items: [],
        }
        byProduct.set(a.productId, group)
      }
      group.items.push(a)
    }

    return [...byProduct.values()].sort((x, y) => x.label.localeCompare(y.label))
  }, [data, productsData, search])

  return (
    <>
      <PageHeader
        title="Accessoires"
        subtitle="Frais d'accessoire appliqués aux produits selon la prime"
        action="Nouvel accessoire"
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

      {showAdd && <AddAccessoryModal onClose={() => setShowAdd(false)} />}
      {showImport && (
        <ImportCsvDialog
          eyebrow="Accessoires"
          title="Importer des accessoires"
          description="Import en masse depuis un fichier CSV (tout ou rien)."
          url="/accessories/import"
          headerHint="productCode,minPremium,maxPremium,amount"
          invalidateKey={['accessories']}
          onClose={() => setShowImport(false)}
        />
      )}
      {editing && (
        <EditAccessoryModal
          accessory={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {isLoading ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        </Card>
      ) : error ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-destructive">
            Impossible de charger les accessoires.
          </div>
        </Card>
      ) : (data?.content.length ?? 0) === 0 ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-muted-foreground">
            Aucun accessoire pour le moment.
          </div>
        </Card>
      ) : groups.length === 0 ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-muted-foreground">
            Aucun accessoire ne correspond à votre recherche.
          </div>
        </Card>
      ) : (
        <AccessoriesByProduct
          groups={groups}
          onEdit={setEditing}
          onDelete={setDeleting}
          canWrite={canWrite}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer l'accessoire"
        description={
          deleting
            ? "Cet accessoire sera supprimé. Les contrats déjà émis ne sont pas impactés."
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
