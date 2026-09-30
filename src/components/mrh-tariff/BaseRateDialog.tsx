import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import {
  BASE_RATE_FIELDS,
  baseRateFieldsFor,
  buildBaseRatePayload,
  validateDecimalInput,
} from '#/lib/mrh-tariff'
import { getBaseRate, updateBaseRate } from '#/services/mrh-tariff'
import type {
  BaseRateField,
  BaseRateResponse,
  LegalQualityResponse,
} from '#/services/mrh-tariff'
import {
  MRH_KEYS,
  announceSaved,
  saveThenReread,
  splitServerError,
  writeBack,
} from './grid-kit'

const ALL_FIELDS = BASE_RATE_FIELDS.map((f) => f.name)

export function BaseRateDialog({
  legalQuality,
  baseRate,
  onClose,
}: {
  legalQuality: LegalQualityResponse
  baseRate: BaseRateResponse
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  const shown = baseRateFieldsFor(baseRate, legalQuality.propertyBasis)
  const fields = BASE_RATE_FIELDS.filter((f) => shown.includes(f.name))

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: Partial<Record<BaseRateField, string>>) => {
      const payload = buildBaseRatePayload(baseRate, values)
      return saveThenReread(
        () =>
          Object.keys(payload).length > 0
            ? updateBaseRate(baseRate.id, payload)
            : Promise.resolve(baseRate),
        () => getBaseRate(baseRate.id),
      )
    },
    onSuccess: (saved) => {
      writeBack(queryClient, MRH_KEYS.baseRates, saved.entity)
      announceSaved(saved, 'Taux de base mis à jour.')
      onClose()
    },
  })

  const defaultValues: Partial<Record<BaseRateField, string>> =
    Object.fromEntries(
      shown.map((name) => [name, String(baseRate[name] ?? '')]),
    )

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null)
      setServerFields({})
      try {
        await mutateAsync(value)
      } catch (err) {
        // Tous les champs de taux : un refus peut viser un champ masqué.
        const split = splitServerError(err, ALL_FIELDS)
        const visible = Object.fromEntries(
          Object.entries(split.fields).filter(([k]) =>
            shown.includes(k as BaseRateField),
          ),
        )
        const hidden = Object.entries(split.fields)
          .filter(([k]) => !shown.includes(k as BaseRateField))
          .map(([k, msg]) => {
            const label = BASE_RATE_FIELDS.find((f) => f.name === k)?.label ?? k
            return `${label} : ${msg}`
          })
        setServerFields(visible)
        setServerError(
          [split.banner, ...hidden].filter(Boolean).join(' ') || null,
        )
      }
    },
  })

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="Taux de base"
      title={`Taux — ${legalQuality.name}`}
      description="Seuls les taux de cette situation sont modifiables ; un champ inchangé n’est pas envoyé."
      onSubmit={() => void form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      {fields.map(({ name, label, unit }) => {
        // Affiché seulement s'il a une valeur, que l'API ne sait pas vider (D-8).
        const informative = name === 'minimumContentsValue'
        const validate = ({ value }: { value: string | undefined }) =>
          validateDecimalInput(
            value ?? '',
            unit === 'multiplier'
              ? { positive: true }
              : unit === 'fcfa'
                ? {}
                : { max: 1000 },
          )
        return (
          <form.Field
            key={name}
            name={name}
            validators={{ onBlur: validate, onSubmit: validate }}
          >
            {(field) => (
              <FormField
                id={`base-rate-${name}`}
                label={label}
                required
                value={field.state.value ?? ''}
                onChange={(v) => {
                  setServerFields((prev) => {
                    if (!(name in prev)) return prev
                    const { [name]: _removed, ...rest } = prev
                    return rest
                  })
                  field.handleChange(v)
                }}
                onBlur={field.handleBlur}
                hint={
                  unit === 'multiplier'
                    ? 'Risques locatifs = loyer mensuel × ce multiplicateur.'
                    : informative
                      ? 'Pour information : sans effet sur la prime.'
                      : undefined
                }
                error={field.state.meta.errors[0] ?? serverFields[name]}
              />
            )}
          </form.Field>
        )
      })}
    </FormDialog>
  )
}
