import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createRiskClassPremiumRate,
  updateRiskClassPremiumRate,
} from '#/services/ia-pricing'
import type { RiskClassPremiumRateResponse } from '#/services/ia-pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

interface RiskClassPremiumRateModalProps {
  riskClassId: number
  /** Existing premium rate to edit, or null to create one. */
  premiumRate: RiskClassPremiumRateResponse | null
  onClose: () => void
}

const FIELDS = [
  {
    name: 'death',
    label: 'Taux décès',
    hint: 'Taux de prime appliqué au capital décès.',
  },
  {
    name: 'permanentDisability',
    label: 'Taux invalidité permanente',
    hint: 'Taux de prime appliqué au capital invalidité permanente (IPP).',
  },
  {
    name: 'medicalExpenses',
    label: 'Taux frais médicaux',
    hint: 'Taux de prime appliqué au capital frais médicaux.',
  },
] as const

function rateValidator({ value }: { value: string }) {
  if (value.trim() === '') return 'Ce taux est requis'
  const n = Number(value)
  // The API caps each premium rate at 100 (percentage).
  return !Number.isNaN(n) && n >= 0 && n <= 100
    ? undefined
    : 'Taux invalide (entre 0 et 100)'
}

export function RiskClassPremiumRateModal({
  riskClassId,
  premiumRate,
  onClose,
}: RiskClassPremiumRateModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      death: number
      permanentDisability: number
      medicalExpenses: number
    }) =>
      premiumRate
        ? updateRiskClassPremiumRate(premiumRate.id, data)
        : createRiskClassPremiumRate({ riskClassId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['risk-class-premium-rate', riskClassId],
      })
      onClose()
    },
  })

  const initial = (n?: number) => (n === undefined ? '' : String(n))
  const form = useForm({
    defaultValues: {
      death: initial(premiumRate?.death),
      permanentDisability: initial(premiumRate?.permanentDisability),
      medicalExpenses: initial(premiumRate?.medicalExpenses),
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          death: Number(value.death),
          permanentDisability: Number(value.permanentDisability),
          medicalExpenses: Number(value.medicalExpenses),
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Un taux de prime existe déjà pour cette classe.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Taux de prime"
      title={premiumRate ? 'Modifier les taux' : 'Définir les taux'}
      description="Taux de prime par garantie pour cette classe de risque."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      {FIELDS.map(({ name, label, hint }) => (
        <form.Field
          key={name}
          name={name}
          validators={{ onBlur: rateValidator, onSubmit: rateValidator }}
        >
          {(field) => (
            <FormField
              id={name}
              label={label}
              type="number"
              required
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
