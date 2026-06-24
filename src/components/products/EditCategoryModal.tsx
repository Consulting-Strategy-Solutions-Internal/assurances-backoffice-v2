import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { PRODUCT_CALCULATION_TYPES, updateCategory } from '#/services/products'
import type {
  ProductCalculationType,
  ProductCategoryResponse,
} from '#/services/products'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'

const nameSchema = z.string().min(1, 'Le nom est requis')

const CALCULATION_OPTIONS = PRODUCT_CALCULATION_TYPES.map((t) => ({
  value: t,
  label: t,
}))

interface EditCategoryModalProps {
  category: ProductCategoryResponse
  onClose: () => void
}

export function EditCategoryModal({
  category,
  onClose,
}: EditCategoryModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      calculationType?: ProductCalculationType
    }) => updateCategory(category.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      // Les libellés de catégorie s'affichent dans la liste des produits.
      queryClient.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      name: category.name,
      description: category.description ?? '',
      calculationType: category.calculationType ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          name: value.name,
          description: value.description || undefined,
          calculationType: value.calculationType
            ? (value.calculationType as ProductCalculationType)
            : undefined,
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Une catégorie avec ce nom existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Catégories"
      title="Modifier la catégorie"
      description={category.name}
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const result = nameSchema.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const result = nameSchema.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="name"
            label="Nom"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormField
            id="description"
            label="Description"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="calculationType">
        {(field) => (
          <FormSelect
            id="calculationType"
            label="Type de calcul"
            placeholder="Aucun"
            includeNone
            value={field.state.value}
            options={CALCULATION_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            hint="Mode de calcul de prime appliqué aux produits de la catégorie."
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
