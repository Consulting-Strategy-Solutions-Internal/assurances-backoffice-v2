import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { MrhSimulationForm } from '#/components/quotations/MrhSimulationForm'
import { IaSimulationForm } from '#/components/quotations/IaSimulationForm'
import { getCategories, getProducts } from '#/services/products'

export const Route = createFileRoute('/_auth/cotations_/simulation')({
  component: SimulationPage,
})

function SimulationPage() {
  const [productId, setProductId] = useState('')

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getProducts(0, 200),
    retry: false,
  })
  const categoriesQuery = useQuery({
    queryKey: ['product-categories', 'all'],
    queryFn: () => getCategories(0, 200),
    retry: false,
  })

  const products = productsQuery.data?.content ?? []

  const calcTypeByCategory = useMemo(() => {
    const map = new Map(
      (categoriesQuery.data?.content ?? []).map(
        (c) => [c.id, c.calculationType] as const,
      ),
    )
    return (categoryId: number) => map.get(categoryId)
  }, [categoriesQuery.data])

  const selectedProduct = products.find((p) => String(p.id) === productId)
  const calcType = selectedProduct
    ? calcTypeByCategory(selectedProduct.categoryId)
    : undefined

  return (
    <>
      <PageHeader
        title="Simulation"
        subtitle="Calculez une prime par produit · aperçu, sans enregistrement"
      />

      <div className="mb-[18px] flex items-start gap-2.5 rounded-[12px] border border-primary/20 bg-primary/[0.04] px-4 py-3 text-[12.5px] text-muted-foreground">
        <Info className="mt-px size-4 shrink-0 text-primary" />
        <p>
          La simulation calcule la prime à partir des tarifs en vigueur
          (taux de base, garanties, accessoires, coefficients). C'est un aperçu :
          l'enregistrement d'une cotation se fait depuis l'application agent.
        </p>
      </div>

      <Card className="mb-[18px] gap-0 p-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[13px]">Produit</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="h-10 w-full rounded-[10px] sm:max-w-[460px]">
              <SelectValue
                placeholder={
                  productsQuery.isLoading
                    ? 'Chargement…'
                    : 'Sélectionner un produit à simuler'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => {
                const type = calcTypeByCategory(p.categoryId)
                return (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.label}
                    {type ? ` · ${type}` : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {!selectedProduct ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-muted-foreground">
            Choisissez un produit pour lancer une simulation.
          </div>
        </Card>
      ) : !calcType ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-muted-foreground">
            La catégorie de ce produit n'a pas de modèle de calcul
            (calculationType) configuré. Renseignez-le dans Produits ›
            Catégories pour pouvoir simuler.
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[15px] font-bold">{selectedProduct.label}</span>
            <Badge
              variant="secondary"
              className="rounded-md px-2 py-0.5 text-[11.5px] font-semibold"
            >
              {calcType === 'MRH'
                ? 'Multirisque Habitation'
                : 'Individuel Accident'}
            </Badge>
          </div>
          {calcType === 'MRH' ? (
            <MrhSimulationForm product={selectedProduct} />
          ) : (
            <IaSimulationForm product={selectedProduct} />
          )}
        </>
      )}
    </>
  )
}
