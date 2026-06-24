import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { createAccessory } from '#/services/accessories'
import { getProducts } from '#/services/products'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'

const numField = z
  .string()
  .min(1, 'Ce champ est requis')
  .refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
    'Valeur numérique invalide (≥ 0)',
  )

const schema = z.object({
  productId: z.string().min(1, 'Le produit est requis'),
  minPremium: numField,
  maxPremium: numField,
  amount: numField,
})

type FieldName = keyof typeof schema.shape

interface AddAccessoryModalProps {
  onClose: () => void
}

export function AddAccessoryModal({ onClose }: AddAccessoryModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getProducts(0, 200),
    retry: false,
  })
  const productOptions = (productsData?.content ?? []).map((p) => ({
    value: String(p.id),
    label: `${p.label} · ${p.productCode}`,
  }))
  const noProducts = !!productsData && productOptions.length === 0

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createAccessory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessories'] })
      onClose()
    },
  })

  const fieldValidator = (name: FieldName) => ({
    onBlur: ({ value }: { value: string }) => {
      const r = schema.shape[name].safeParse(value)
      return r.success ? undefined : r.error.issues[0].message
    },
    onSubmit: ({ value }: { value: string }) => {
      const r = schema.shape[name].safeParse(value)
      return r.success ? undefined : r.error.issues[0].message
    },
  })

  const form = useForm({
    defaultValues: {
      productId: '',
      minPremium: '',
      maxPremium: '',
      amount: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      if (Number(value.minPremium) > Number(value.maxPremium)) {
        setServerError('La prime minimale ne peut pas dépasser la maximale.')
        return
      }
      try {
        await mutateAsync({
          productId: Number(value.productId),
          minPremium: Number(value.minPremium),
          maxPremium: Number(value.maxPremium),
          amount: Number(value.amount),
        })
      } catch (error) {
        setServerError(apiErrorMessage(error))
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Accessoires"
      title="Nouvel accessoire"
      description="Frais d'accessoire appliqué à un produit selon la prime."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : "Créer l'accessoire"}
      pending={isPending}
      submitDisabled={noProducts}
      error={serverError}
    >
      <form.Field name="productId" validators={fieldValidator('productId')}>
        {(field) => (
          <FormSelect
            id="productId"
            label="Produit"
            required
            disabled={noProducts}
            placeholder="Sélectionner un produit"
            value={field.state.value}
            options={productOptions}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint={
              noProducts
                ? 'Aucun produit disponible — créez-en un dans le catalogue.'
                : undefined
            }
          />
        )}
      </form.Field>

      <form.Field name="minPremium" validators={fieldValidator('minPremium')}>
        {(field) => (
          <FormField
            id="minPremium"
            label="Prime minimale (FCFA)"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="maxPremium" validators={fieldValidator('maxPremium')}>
        {(field) => (
          <FormField
            id="maxPremium"
            label="Prime maximale (FCFA)"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="amount" validators={fieldValidator('amount')}>
        {(field) => (
          <FormField
            id="amount"
            label="Montant de l'accessoire (FCFA)"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
