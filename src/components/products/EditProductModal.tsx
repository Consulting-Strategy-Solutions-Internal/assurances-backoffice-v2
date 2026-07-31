import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { getCategories, updateProduct } from '#/services/products'
import type { ProductResponse } from '#/services/products'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'

const schema = z.object({
  label: z.string().min(1, 'Le libellé est requis'),
  productCode: z
    .string()
    .min(1, 'Le code produit est requis')
    .regex(/^\d+$/, 'Le code produit doit être un nombre entier')
    .refine((v) => Number(v) <= 2147483647, 'Le code produit est trop grand'),
  categoryId: z.string().min(1, 'La catégorie est requise'),
})

type FieldName = keyof typeof schema.shape

interface EditProductModalProps {
  product: ProductResponse
  onClose: () => void
}

export function EditProductModal({ product, onClose }: EditProductModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories', 'all'],
    queryFn: () => getCategories(0, 200),
    retry: false,
  })
  const categoryOptions = (categoriesData?.content ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))
  // Guarantee the product's current category is always selectable, even if it
  // falls outside the loaded page — otherwise the Select would show no value.
  if (!categoryOptions.some((o) => o.value === String(product.categoryId))) {
    categoryOptions.push({
      value: String(product.categoryId),
      label: `Catégorie #${product.categoryId}`,
    })
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      label: string
      productCode: number
      categoryId: number
    }) =>
      updateProduct(product.id, {
        ...data,
        discountEnabled: product.discountEnabled,
        maxDiscountRate: product.maxDiscountRate,
        commissionRate: product.commissionRate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
  })

  const fieldValidator = (name: FieldName) => ({
    onBlur: ({ value }: { value: string }) => {
      const result = schema.shape[name].safeParse(value)
      return result.success ? undefined : result.error.issues[0].message
    },
    onSubmit: ({ value }: { value: string }) => {
      const result = schema.shape[name].safeParse(value)
      return result.success ? undefined : result.error.issues[0].message
    },
  })

  const form = useForm({
    defaultValues: {
      label: product.label,
      productCode: String(product.productCode),
      categoryId: String(product.categoryId),
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          label: value.label,
          productCode: Number(value.productCode),
          categoryId: Number(value.categoryId),
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Un produit avec ce code existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Produits"
      title="Modifier le produit"
      description={product.label}
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      <form.Field name="label" validators={fieldValidator('label')}>
        {(field) => (
          <FormField
            id="label"
            label="Libellé"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="productCode" validators={fieldValidator('productCode')}>
        {(field) => (
          <FormField
            id="productCode"
            label="Code produit"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="Identifiant numérique unique du produit."
          />
        )}
      </form.Field>

      <form.Field name="categoryId" validators={fieldValidator('categoryId')}>
        {(field) => (
          <FormSelect
            id="categoryId"
            label="Catégorie"
            required
            placeholder="Sélectionner une catégorie"
            value={field.state.value}
            options={categoryOptions}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
