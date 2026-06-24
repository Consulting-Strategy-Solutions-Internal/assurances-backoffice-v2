import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { apiErrorMessage } from '#/lib/api-error'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { LegalQualityModal } from '#/components/pricing/LegalQualityModal'
import { LegalQualityCard } from '#/components/pricing/LegalQualityCard'
import { WarrantyModal } from '#/components/pricing/WarrantyModal'
import { IaPricing } from '#/components/ia-pricing/IaPricing'
import { getCategories, getProduct } from '#/services/products'
import {
  deleteLegalQuality,
  getLegalQualities,
  getWarranties,
} from '#/services/pricing'
import type { LegalQualityResponse } from '#/services/pricing'

export const Route = createFileRoute('/_auth/products_/$productId')({
  component: ProductPricingPage,
})

function BackLink() {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="mb-3 -ml-2 rounded-[10px] text-muted-foreground"
    >
      <Link to="/products">
        <ArrowLeft />
        Retour au catalogue
      </Link>
    </Button>
  )
}

function ProductPricingPage() {
  const { productId } = Route.useParams()
  const id = Number(productId)
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const [showAddLq, setShowAddLq] = useState(false)
  const [editingLq, setEditingLq] = useState<LegalQualityResponse | null>(null)
  const [deletingLq, setDeletingLq] = useState<LegalQualityResponse | null>(
    null,
  )
  const [showWarranty, setShowWarranty] = useState(false)

  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    retry: false,
  })

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['product-categories', 'all'],
    queryFn: () => getCategories(0, 200),
    retry: false,
  })

  const category = useMemo(
    () =>
      categoriesData?.content.find((c) => c.id === product?.categoryId) ?? null,
    [categoriesData, product],
  )
  const isMrh = category?.calculationType === 'MRH'
  const isIa = category?.calculationType === 'IA'

  const { data: legalQualitiesData } = useQuery({
    queryKey: ['legal-qualities', id],
    queryFn: () => getLegalQualities(id),
    retry: false,
    enabled: isMrh,
  })

  const { data: warrantiesData } = useQuery({
    queryKey: ['warranties', 'all'],
    queryFn: () => getWarranties(0, 200),
    retry: false,
    enabled: isMrh,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLegalQuality,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-qualities', id] })
      toast.success('Qualité juridique supprimée.')
      setDeletingLq(null)
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  if (isLoading || categoriesLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="p-9 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      </Card>
    )
  }

  if (error || !product) {
    return (
      <>
        <BackLink />
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-destructive">
            Produit introuvable.
          </div>
        </Card>
      </>
    )
  }

  const legalQualities = legalQualitiesData?.content ?? []
  const warranties = warrantiesData?.content ?? []

  return (
    <>
      <BackLink />

      {showAddLq && (
        <LegalQualityModal productId={id} onClose={() => setShowAddLq(false)} />
      )}
      {editingLq && (
        <LegalQualityModal
          productId={id}
          legalQuality={editingLq}
          onClose={() => setEditingLq(null)}
        />
      )}
      {showWarranty && <WarrantyModal onClose={() => setShowWarranty(false)} />}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            {product.label}
          </h1>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Configuration tarifaire · code {product.productCode}
            {category ? ` · ${category.name}` : ''}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
        >
          Modèle&nbsp;: {category?.calculationType ?? 'Non défini'}
        </Badge>
      </div>

      {!isMrh ? (
        isIa ? (
          <IaPricing productId={id} />
        ) : (
          <Card className="gap-0 py-0">
            <div className="p-9 text-center text-[13.5px] text-muted-foreground">
              La configuration tarifaire détaillée n'est disponible que pour les
              modèles de calcul <span className="font-semibold">MRH</span> et{' '}
              <span className="font-semibold">IA</span>.
              {category
                ? ` La catégorie « ${category.name} » utilise le modèle ${category.calculationType ?? 'non défini'}.`
                : ''}
            </div>
          </Card>
        )
      ) : (
        <div className="flex flex-col gap-6">
          {/* Garanties (catalogue global) */}
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-[22px] py-3.5">
              <div className="text-[13.5px] font-bold">
                Garanties (catalogue)
                <span className="ml-2 text-[12px] font-medium text-muted-foreground tabular-nums">
                  {warranties.length}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[10px]"
                onClick={() => setShowWarranty(true)}
                disabled={!can('warranty:write')}
                title={
                  can('warranty:write')
                    ? undefined
                    : "Vous n'avez pas la permission requise (warranty:write)."
                }
              >
                <Plus />
                Nouvelle garantie
              </Button>
            </div>
            {warranties.length === 0 ? (
              <div className="px-[22px] py-6 text-[13px] text-muted-foreground">
                Aucune garantie dans le catalogue. Créez-en pour pouvoir les
                lier aux qualités juridiques.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-[18px]">
                {warranties.map((w) => (
                  <Badge
                    key={w.id}
                    variant="secondary"
                    className="rounded-md px-2.5 py-1 text-[12.5px] font-medium"
                  >
                    {w.name}
                    <span className="ml-1.5 text-muted-foreground tabular-nums">
                      · taxe {w.taxRate}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Qualités juridiques */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">
                Qualités juridiques
              </h2>
              <Button
                type="button"
                size="sm"
                className="rounded-[10px]"
                onClick={() => setShowAddLq(true)}
                disabled={!can('legalquality:write')}
                title={
                  can('legalquality:write')
                    ? undefined
                    : "Vous n'avez pas la permission requise (legalquality:write)."
                }
              >
                <Plus />
                Nouvelle qualité juridique
              </Button>
            </div>

            {legalQualities.length === 0 ? (
              <Card className="gap-0 py-0">
                <div className="p-9 text-center text-[13.5px] text-muted-foreground">
                  Aucune qualité juridique. Ajoutez-en une pour définir ses taux
                  de base et ses garanties.
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {legalQualities.map((lq) => (
                  <LegalQualityCard
                    key={lq.id}
                    legalQuality={lq}
                    onEdit={() => setEditingLq(lq)}
                    onDelete={() => setDeletingLq(lq)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deletingLq}
        title="Supprimer la qualité juridique"
        description={
          deletingLq
            ? `La qualité « ${deletingLq.name} » et ses taux/garanties associés seront supprimés.`
            : undefined
        }
        confirmLabel={deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deletingLq && deleteMutation.mutate(deletingLq.id)}
        onOpenChange={(open) => {
          if (!open) setDeletingLq(null)
        }}
      />
    </>
  )
}
