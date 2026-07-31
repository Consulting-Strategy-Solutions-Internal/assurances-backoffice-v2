import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { createBaseRate, updateBaseRate } from '#/services/pricing'
import type { BaseRateResponse } from '#/services/pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

interface BaseRateModalProps {
  legalQualityId: number
  /** Existing base rate to edit, or null to create one. */
  baseRate: BaseRateResponse | null
  onClose: () => void
}

const FIELDS = [
  {
    name: 'buildingPremiumRate',
    label: 'Taux bâtiment',
    hint: 'Taux de prime appliqué à la valeur du bâtiment.',
    max: 1000,
  },
  {
    name: 'contentsPremiumRate',
    label: 'Taux contenu',
    hint: 'Taux de prime appliqué à la valeur du contenu.',
    max: 1000,
  },
  {
    name: 'rentalValuePremiumRate',
    label: 'Taux valeur locative',
    hint: 'Taux appliqué à la valeur locative.',
    max: 1000,
  },
  {
    name: 'minimumContentsValue',
    label: 'Valeur minimale du contenu',
    hint: 'Plancher de valeur de contenu (FCFA).',
    max: undefined,
  },
] as const

type FieldName = (typeof FIELDS)[number]['name']

function validationErrors(error: unknown): Partial<Record<FieldName, string>> {
  if (!isAxiosError(error) || error.response?.status !== 400) return {}
  const data = error.response.data
  if (!data || typeof data !== 'object') return {}
  const errors = (data as Record<string, unknown>).errors
  if (!errors || typeof errors !== 'object') return {}

  const result: Partial<Record<FieldName, string>> = {}
  for (const { name } of FIELDS) {
    const message = (errors as Record<string, unknown>)[name]
    if (typeof message === 'string') result[name] = message
  }
  return result
}

function numberValidator(value: string, max?: number) {
  if (value === '') return undefined
  const n = Number(value)
  if (Number.isNaN(n) || n < 0) return 'Valeur numérique invalide (≥ 0)'
  return max !== undefined && n > max
    ? `La valeur ne doit pas dépasser ${max}`
    : undefined
}

const toNumber = (v: string) => (v === '' ? undefined : Number(v))

export function BaseRateModal({
  legalQualityId,
  baseRate,
  onClose,
}: BaseRateModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({})

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      buildingPremiumRate?: number
      contentsPremiumRate?: number
      rentalValuePremiumRate?: number
      minimumContentsValue?: number
    }) =>
      baseRate
        ? updateBaseRate(baseRate.id, data)
        : createBaseRate({ legalQualityId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-rate', legalQualityId] })
      onClose()
    },
  })

  const initial = (n?: number) => (n === undefined ? '' : String(n))
  const form = useForm({
    defaultValues: {
      buildingPremiumRate: initial(baseRate?.buildingPremiumRate),
      contentsPremiumRate: initial(baseRate?.contentsPremiumRate),
      rentalValuePremiumRate: initial(baseRate?.rentalValuePremiumRate),
      minimumContentsValue: initial(baseRate?.minimumContentsValue),
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setFieldErrors({})
      try {
        await mutateAsync({
          buildingPremiumRate: toNumber(value.buildingPremiumRate),
          contentsPremiumRate: toNumber(value.contentsPremiumRate),
          rentalValuePremiumRate: toNumber(value.rentalValuePremiumRate),
          minimumContentsValue: toNumber(value.minimumContentsValue),
        })
      } catch (error) {
        const errors = validationErrors(error)
        setFieldErrors(errors)
        const firstInvalidField = FIELDS.find(({ name }) => errors[name])
        if (firstInvalidField) {
          requestAnimationFrame(() =>
            document.getElementById(firstInvalidField.name)?.focus(),
          )
        } else {
          setServerError(
            apiErrorMessage(error, {
              conflict:
                'Un taux de base existe déjà pour cette qualité juridique.',
            }),
          )
        }
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Taux de base"
      title={
        baseRate ? 'Modifier les taux de base' : 'Définir les taux de base'
      }
      description="Taux de prime de base pour cette qualité juridique."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      {FIELDS.map(({ name, label, hint, max }) => (
        <form.Field
          key={name}
          name={name}
          validators={{
            onBlur: ({ value }) => numberValidator(value, max),
            onSubmit: ({ value }) => numberValidator(value, max),
          }}
        >
          {(field) => (
            <FormField
              id={name}
              label={label}
              type="number"
              min={0}
              max={max}
              step="any"
              value={field.state.value}
              onChange={(value) => {
                setFieldErrors((errors) => ({ ...errors, [name]: undefined }))
                field.handleChange(value)
              }}
              onBlur={field.handleBlur}
              error={fieldErrors[name] ?? field.state.meta.errors[0]}
              hint={hint}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
