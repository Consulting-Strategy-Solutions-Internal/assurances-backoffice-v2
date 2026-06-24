import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { createProduct, getCategories } from '#/services/products'
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

interface AddProductModalProps {
  onClose: () => void
}

export function AddProductModal({ onClose }: AddProductModalProps) {
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
  // The categories query has resolved but returned nothing: the user must
  // create a category before a product can be attached to one.
  const noCategories = !!categoriesData && categoryOptions.length === 0

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createProduct,
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
    defaultValues: { label: '', productCode: '', categoryId: '' },
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
      title="Nouveau produit"
      description="Ajoutez un produit au catalogue."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : 'Créer le produit'}
      pending={isPending}
      submitDisabled={noCategories}
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
            disabled={noCategories}
            placeholder="Sélectionner une catégorie"
            value={field.state.value}
            options={categoryOptions}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint={
              noCategories
                ? "Aucune catégorie disponible — créez-en une d'abord dans Produits › Catégories."
                : undefined
            }
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
