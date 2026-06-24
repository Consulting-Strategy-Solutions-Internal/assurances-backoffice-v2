import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  createProrationCoefficient,
  updateProrationCoefficient,
} from '#/services/ia-pricing'
import type { ProrationCoefficientResponse } from '#/services/ia-pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const monthSchema = z
  .string()
  .min(1, 'Ce champ est requis')
  .refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
    'Nombre de mois entier invalide (≥ 1)',
  )

const optionalMonthSchema = z
  .string()
  .refine(
    (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1),
    'Nombre de mois entier invalide (≥ 1)',
  )

const coefficientSchema = z
  .string()
  .refine((v) => v.trim() !== '', 'Le coefficient est requis')
  .refine(
    // The API constrains the proration coefficient to the 0–1 range.
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 1,
    'Coefficient invalide (entre 0 et 1)',
  )

const SCHEMAS = {
  minMonths: monthSchema,
  maxMonths: optionalMonthSchema,
  coefficient: coefficientSchema,
} as const
type FieldName = keyof typeof SCHEMAS

interface ProrationCoefficientModalProps {
  productId: number
  /** When provided, the modal edits this coefficient instead of creating one. */
  coefficient?: ProrationCoefficientResponse
  onClose: () => void
}

export function ProrationCoefficientModal({
  productId,
  coefficient,
  onClose,
}: ProrationCoefficientModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!coefficient

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      minMonths: number
      maxMonths?: number
      coefficient: number
    }) =>
      isEdit
        ? updateProrationCoefficient(coefficient.id, { ...data, productId })
        : createProrationCoefficient({ ...data, productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['proration-coefficients', productId],
      })
      onClose()
    },
  })

  const fieldValidator = (name: FieldName) => ({
    onBlur: ({ value }: { value: string }) => {
      const r = SCHEMAS[name].safeParse(value)
      return r.success ? undefined : r.error.issues[0].message
    },
    onSubmit: ({ value }: { value: string }) => {
      const r = SCHEMAS[name].safeParse(value)
      return r.success ? undefined : r.error.issues[0].message
    },
  })

  const form = useForm({
    defaultValues: {
      minMonths: coefficient ? String(coefficient.minMonths) : '',
      maxMonths:
        coefficient?.maxMonths === undefined
          ? ''
          : String(coefficient.maxMonths),
      coefficient: coefficient ? String(coefficient.coefficient) : '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const minMonths = Number(value.minMonths)
      const maxMonths =
        value.maxMonths === '' ? undefined : Number(value.maxMonths)
      if (maxMonths !== undefined && maxMonths < minMonths) {
        setServerError(
          'Le nombre de mois maximum doit être supérieur ou égal au minimum.',
        )
        return
      }
      try {
        await mutateAsync({
          minMonths,
          maxMonths,
          coefficient: Number(value.coefficient),
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Un coefficient couvre déjà cette tranche de durée.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Coefficient de proration"
      title={isEdit ? 'Modifier le coefficient' : 'Nouveau coefficient'}
      description="Coefficient appliqué selon la durée du contrat (en mois)."
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'
      }
      pending={isPending}
      error={serverError}
    >
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="minMonths" validators={fieldValidator('minMonths')}>
          {(field) => (
            <FormField
              id="minMonths"
              label="Mois min."
              type="number"
              required
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Field name="maxMonths" validators={fieldValidator('maxMonths')}>
          {(field) => (
            <FormField
              id="maxMonths"
              label="Mois max."
              type="number"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
              hint="Laisser vide pour « sans limite »."
            />
          )}
        </form.Field>
      </div>

      <form.Field name="coefficient" validators={fieldValidator('coefficient')}>
        {(field) => (
          <FormField
            id="coefficient"
            label="Coefficient"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="Multiplicateur appliqué à la prime (entre 0 et 1) pour cette tranche de durée."
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
