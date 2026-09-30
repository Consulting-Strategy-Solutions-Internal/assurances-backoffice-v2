import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import { parseIaError } from '#/lib/ia-errors'
import { formatCoefficientPercent } from '#/lib/format'
import {
  createProration,
  updateProration,
} from '#/services/proration-coefficients'
import type { ProrationResponse } from '#/services/proration-coefficients'
import {
  PRORATION_QUERY_KEY,
  buildProrationPayload,
  parseDecimal,
  trancheToFormValues,
  validateCoefficient,
  validateMaxMonths,
  validateMinMonths,
} from './logic'
import type { ProrationFormValues } from './logic'

interface ProrationModalProps {
  /** Tranche à modifier ; absente = création. */
  tranche?: ProrationResponse
  onClose: () => void
}

const EMPTY: ProrationFormValues = {
  minMonths: '',
  maxMonths: '',
  unlimited: false,
  coefficient: '',
}

const FORM_FIELDS = ['minMonths', 'maxMonths', 'coefficient']

export function ProrationModal({ tranche, onClose }: ProrationModalProps) {
  const queryClient = useQueryClient()
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: ProrationFormValues) => {
      const payload = buildProrationPayload(values)
      return tranche
        ? updateProration(tranche.id, payload)
        : createProration(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRORATION_QUERY_KEY })
      toast.success(tranche ? 'Tranche modifiée.' : 'Tranche ajoutée.')
      onClose()
    },
  })

  const form = useForm({
    defaultValues: tranche ? trancheToFormValues(tranche) : EMPTY,
    onSubmit: async ({ value }) => {
      setServerFields({})
      setServerError(null)
      try {
        await mutateAsync(value)
      } catch (error) {
        const parsed = parseIaError(error)
        setServerFields(parsed.fields)
        // Erreurs sur des clés qui ne sont pas des champs du formulaire.
        const orphan = Object.entries(parsed.fields)
          .filter(([key]) => !FORM_FIELDS.includes(key))
          .map(([, message]) => message)
        setServerError(parsed.message ?? (orphan.join(' ') || null))
      }
    },
  })

  const fieldError = (name: string, local: string | undefined) =>
    local ?? serverFields[name]

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="Prorata court terme"
      title={tranche ? 'Modifier la tranche' : 'Ajouter une tranche'}
      description="Coefficient appliqué à la prime selon la durée du contrat (IA Standard)."
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : tranche ? 'Enregistrer' : 'Ajouter'
      }
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="minMonths"
        validators={{
          onBlur: ({ value }) => validateMinMonths(value),
          onSubmit: ({ value }) => validateMinMonths(value),
        }}
      >
        {(field) => (
          <FormField
            id="minMonths"
            label="Durée minimale (mois)"
            type="number"
            min={1}
            step={1}
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={fieldError('minMonths', field.state.meta.errors[0])}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.unlimited}>
        {(unlimited) => (
          <div className="flex flex-col gap-2">
            <form.Field
              name="maxMonths"
              validators={{
                onBlur: ({ value, fieldApi }) =>
                  validateMaxMonths(
                    value,
                    fieldApi.form.getFieldValue('minMonths'),
                    fieldApi.form.getFieldValue('unlimited'),
                  ),
                onSubmit: ({ value, fieldApi }) =>
                  validateMaxMonths(
                    value,
                    fieldApi.form.getFieldValue('minMonths'),
                    fieldApi.form.getFieldValue('unlimited'),
                  ),
              }}
            >
              {(field) => (
                <FormField
                  id="maxMonths"
                  label="Durée maximale (mois)"
                  type="number"
                  min={1}
                  step={1}
                  required={!unlimited}
                  disabled={unlimited}
                  value={unlimited ? '' : field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  error={fieldError('maxMonths', field.state.meta.errors[0])}
                />
              )}
            </form.Field>
            <form.Field name="unlimited">
              {(field) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="unlimited"
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked === true)
                      if (checked === true) form.setFieldValue('maxMonths', '')
                    }}
                  />
                  <Label htmlFor="unlimited" className="text-[13px]">
                    Sans limite (et au-delà)
                  </Label>
                </div>
              )}
            </form.Field>
          </div>
        )}
      </form.Subscribe>

      <form.Field
        name="coefficient"
        validators={{
          onBlur: ({ value }) => validateCoefficient(value),
          onSubmit: ({ value }) => validateCoefficient(value),
        }}
      >
        {(field) => {
          const preview =
            validateCoefficient(field.state.value) === undefined
              ? formatCoefficientPercent(parseDecimal(field.state.value))
              : null
          return (
            <FormField
              id="coefficient"
              label="Coefficient (0 à 1)"
              type="text"
              required
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              hint={
                preview
                  ? `Soit ${preview} de la prime annuelle. Exemple : 0,80.`
                  : 'Exemple : 0,80 pour 80 % de la prime annuelle.'
              }
              error={fieldError('coefficient', field.state.meta.errors[0])}
            />
          )
        }}
      </form.Field>
    </FormDialog>
  )
}
