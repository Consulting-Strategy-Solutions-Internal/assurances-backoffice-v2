import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { addRateTableProduct } from '#/services/rate-tables'
import { getProducts } from '#/services/products'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormSelect } from '#/components/forms/FormSelect'

const productSchema = z.string().min(1, 'Le produit est requis')

interface AddRateTableProductModalProps {
  rateTableId: number
  /** Product ids already linked to this rate table, excluded from the picker. */
  existingProductIds: number[]
  onClose: () => void
}

export function AddRateTableProductModal({
  rateTableId,
  existingProductIds,
  onClose,
}: AddRateTableProductModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getProducts(0, 200),
    retry: false,
  })

  const linked = new Set(existingProductIds)
  const productOptions = (productsData?.content ?? [])
    .filter((p) => !linked.has(p.id))
    .map((p) => ({
      value: String(p.id),
      label: `${p.label} · ${p.productCode}`,
    }))
  const noneAvailable = !!productsData && productOptions.length === 0

  const { mutateAsync, isPending } = useMutation({
    mutationFn: addRateTableProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rate-table-products', rateTableId],
      })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { productId: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          rateTableId,
          productId: Number(value.productId),
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Ce produit est déjà rattaché à cette grille.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Grille tarifaire"
      title="Ajouter un produit"
      description="Rattachez un produit du catalogue à cette grille."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Ajout…' : 'Ajouter le produit'}
      pending={isPending}
      submitDisabled={noneAvailable}
      error={serverError}
    >
      <form.Field
        name="productId"
        validators={{
          onBlur: ({ value }) => {
            const result = productSchema.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const result = productSchema.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormSelect
            id="productId"
            label="Produit"
            required
            disabled={noneAvailable}
            placeholder="Sélectionner un produit"
            value={field.state.value}
            options={productOptions}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint={
              noneAvailable
                ? 'Tous les produits du catalogue sont déjà rattachés à cette grille.'
                : undefined
            }
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
