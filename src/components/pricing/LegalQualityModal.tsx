import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  PROPERTY_BASES,
  createLegalQuality,
  updateLegalQuality,
} from '#/services/pricing'
import type { LegalQualityResponse, PropertyBasis } from '#/services/pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { PROPERTY_BASIS_LABEL } from '#/components/pricing/labels'

const nameSchema = z.string().min(1, 'Le nom est requis')

const BASIS_OPTIONS = PROPERTY_BASES.map((b) => ({
  value: b,
  label: PROPERTY_BASIS_LABEL[b],
}))

interface LegalQualityModalProps {
  productId: number
  /** When provided, the modal edits this legal quality instead of creating one. */
  legalQuality?: LegalQualityResponse
  onClose: () => void
}

export function LegalQualityModal({
  productId,
  legalQuality,
  onClose,
}: LegalQualityModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!legalQuality

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      propertyBasis?: PropertyBasis
    }) =>
      isEdit
        ? updateLegalQuality(legalQuality.id, { ...data, productId })
        : createLegalQuality({ ...data, productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['legal-qualities', productId],
      })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      name: legalQuality?.name ?? '',
      description: legalQuality?.description ?? '',
      propertyBasis: legalQuality?.propertyBasis ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          name: value.name,
          description: value.description || undefined,
          propertyBasis: value.propertyBasis
            ? (value.propertyBasis as PropertyBasis)
            : undefined,
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Une qualité juridique avec ce nom existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Qualité juridique"
      title={
        isEdit ? 'Modifier la qualité juridique' : 'Nouvelle qualité juridique'
      }
      description={
        isEdit
          ? legalQuality.name
          : 'Définissez une qualité juridique (occupant, propriétaire…) pour ce produit.'
      }
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'
      }
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

      <form.Field name="propertyBasis">
        {(field) => (
          <FormSelect
            id="propertyBasis"
            label="Assiette de prime"
            placeholder="Aucune"
            includeNone
            value={field.state.value}
            options={BASIS_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            hint="Base de calcul du taux : bâtiment, valeur locative, ou aucune."
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
