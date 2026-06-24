import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  },
  {
    name: 'contentsPremiumRate',
    label: 'Taux contenu',
    hint: 'Taux de prime appliqué à la valeur du contenu.',
  },
  {
    name: 'rentalValuePremiumRate',
    label: 'Taux valeur locative',
    hint: 'Taux appliqué à la valeur locative.',
  },
  {
    name: 'minimumContentsValue',
    label: 'Valeur minimale du contenu',
    hint: 'Plancher de valeur de contenu (FCFA).',
  },
] as const

function numberValidator({ value }: { value: string }) {
  if (value === '') return undefined
  const n = Number(value)
  return !Number.isNaN(n) && n >= 0
    ? undefined
    : 'Valeur numérique invalide (≥ 0)'
}

const toNumber = (v: string) => (v === '' ? undefined : Number(v))

export function BaseRateModal({
  legalQualityId,
  baseRate,
  onClose,
}: BaseRateModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

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
      try {
        await mutateAsync({
          buildingPremiumRate: toNumber(value.buildingPremiumRate),
          contentsPremiumRate: toNumber(value.contentsPremiumRate),
          rentalValuePremiumRate: toNumber(value.rentalValuePremiumRate),
          minimumContentsValue: toNumber(value.minimumContentsValue),
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict:
              'Un taux de base existe déjà pour cette qualité juridique.',
          }),
        )
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
      {FIELDS.map(({ name, label, hint }) => (
        <form.Field
          key={name}
          name={name}
          validators={{ onBlur: numberValidator, onSubmit: numberValidator }}
        >
          {(field) => (
            <FormField
              id={name}
              label={label}
              type="number"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
              hint={hint}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
