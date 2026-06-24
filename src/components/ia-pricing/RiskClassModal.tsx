import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { createRiskClass, updateRiskClass } from '#/services/ia-pricing'
import type { RiskClassResponse } from '#/services/ia-pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const classNumberSchema = z
  .string()
  .min(1, 'Le numéro de classe est requis')
  .refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
    'Numéro entier invalide (≥ 1)',
  )

interface RiskClassModalProps {
  productId: number
  /** When provided, the modal edits this risk class instead of creating one. */
  riskClass?: RiskClassResponse
  onClose: () => void
}

export function RiskClassModal({
  productId,
  riskClass,
  onClose,
}: RiskClassModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!riskClass

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: { classNumber: number; description?: string }) =>
      isEdit
        ? updateRiskClass(riskClass.id, { ...data, productId })
        : createRiskClass({ ...data, productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-classes', productId] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      classNumber: riskClass ? String(riskClass.classNumber) : '',
      description: riskClass?.description ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          classNumber: Number(value.classNumber),
          description: value.description || undefined,
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Une classe de risque avec ce numéro existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Classe de risque"
      title={
        isEdit ? 'Modifier la classe de risque' : 'Nouvelle classe de risque'
      }
      description={
        isEdit
          ? `Classe n° ${riskClass.classNumber}`
          : 'Définissez une classe de risque pour ce produit Individuel Accident.'
      }
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'
      }
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="classNumber"
        validators={{
          onBlur: ({ value }) => {
            const r = classNumberSchema.safeParse(value)
            return r.success ? undefined : r.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const r = classNumberSchema.safeParse(value)
            return r.success ? undefined : r.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="classNumber"
            label="Numéro de classe"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="Identifiant numérique de la classe (1, 2, 3…)."
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
    </FormDialog>
  )
}
