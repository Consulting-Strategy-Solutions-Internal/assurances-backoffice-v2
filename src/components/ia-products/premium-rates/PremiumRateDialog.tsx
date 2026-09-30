import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { parseIaError } from '#/lib/ia-errors'
import { createPremiumRate, updatePremiumRate } from '#/services/ia-standard'
import type {
  PremiumRateResponse,
  RiskClassResponse,
} from '#/services/ia-standard'
import { parseRateInput, validateRateInput } from './rate-schema'

const RATE_FIELDS = [
  { name: 'death', label: 'Décès' },
  { name: 'permanentDisability', label: 'Invalidité permanente' },
  { name: 'medicalExpenses', label: 'Frais médicaux' },
] as const

interface PremiumRateDialogProps {
  riskClass: RiskClassResponse
  /** Absent : création ; présent : modification (classe inchangée). */
  rate: PremiumRateResponse | null
  onClose: () => void
}

export function PremiumRateDialog({
  riskClass,
  rate,
  onClose,
}: PremiumRateDialogProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: {
      death: number
      permanentDisability: number
      medicalExpenses: number
    }) =>
      rate
        ? updatePremiumRate(rate.id, values)
        : createPremiumRate({ riskClassId: riskClass.id, ...values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'premium-rates'],
      })
      toast.success(rate ? 'Barème mis à jour.' : 'Barème défini.')
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      death: rate ? String(rate.death) : '',
      permanentDisability: rate ? String(rate.permanentDisability) : '',
      medicalExpenses: rate ? String(rate.medicalExpenses) : '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setServerFields({})
      try {
        await mutateAsync({
          death: parseRateInput(value.death),
          permanentDisability: parseRateInput(value.permanentDisability),
          medicalExpenses: parseRateInput(value.medicalExpenses),
        })
      } catch (err) {
        const parsed = parseIaError(err)
        const known = new Set<string>(RATE_FIELDS.map((f) => f.name))
        const fields: Record<string, string> = {}
        const others: string[] = []
        for (const [key, msg] of Object.entries(parsed.fields)) {
          if (known.has(key)) fields[key] = msg
          else others.push(msg)
        }
        setServerFields(fields)
        setServerError(
          parsed.message ?? (others.length ? others.join(' ') : null),
        )
      }
    },
  })

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow={`Classe ${riskClass.classNumber}`}
      title={rate ? 'Modifier le barème' : 'Définir le barème'}
      description={riskClass.description}
      onSubmit={() => void form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : rate ? 'Enregistrer' : 'Définir'
      }
      pending={isPending}
      error={serverError}
    >
      {RATE_FIELDS.map(({ name, label }) => (
        <form.Field
          key={name}
          name={name}
          validators={{
            onBlur: ({ value }) => validateRateInput(value),
            onSubmit: ({ value }) => validateRateInput(value),
          }}
        >
          {(field) => (
            <FormField
              id={`rate-${name}`}
              label={`${label} (‰)`}
              type="text"
              required
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              hint="Entre 0,01 et 100 ‰, 2 décimales maximum."
              error={field.state.meta.errors[0] ?? serverFields[name]}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
