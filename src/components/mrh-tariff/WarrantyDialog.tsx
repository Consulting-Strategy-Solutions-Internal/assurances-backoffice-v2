import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { parseDecimalInput, validateDecimalInput } from '#/lib/mrh-tariff'
import { getWarranty, updateWarranty } from '#/services/mrh-tariff'
import type { WarrantyResponse } from '#/services/mrh-tariff'
import { MRH_KEYS, splitServerError, writeBack } from './grid-kit'

const FORM_FIELDS = ['name', 'taxRate'] as const

export function WarrantyDialog({
  warranty,
  onClose,
}: {
  warranty: WarrantyResponse
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: { name: string; taxRate: string }) => {
      await updateWarranty(warranty.id, {
        name: values.name.trim(),
        taxRate: parseDecimalInput(values.taxRate),
      })
      return getWarranty(warranty.id)
    },
    onSuccess: (fresh) => {
      writeBack(queryClient, MRH_KEYS.warranties, fresh)
      toast.success('Garantie mise à jour.')
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { name: warranty.name, taxRate: String(warranty.taxRate) },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setServerFields({})
      try {
        await mutateAsync(value)
      } catch (err) {
        const { fields, banner } = splitServerError(err, FORM_FIELDS)
        setServerFields(fields)
        setServerError(banner)
      }
    },
  })

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)
  const requireName = ({ value }: { value: string }) =>
    value.trim() === '' ? 'Le libellé est requis.' : undefined
  const validateTax = ({ value }: { value: string }) =>
    validateDecimalInput(value, {})

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow={`Garantie · ${warranty.code}`}
      title="Modifier la garantie"
      description="Le code est fixé par la grille NSIA."
      onSubmit={() => void form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="name"
        validators={{ onBlur: requireName, onSubmit: requireName }}
      >
        {(field) => (
          <FormField
            id="warranty-name"
            label="Libellé"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0] ?? serverFields.name}
          />
        )}
      </form.Field>
      <form.Field
        name="taxRate"
        validators={{ onBlur: validateTax, onSubmit: validateTax }}
      >
        {(field) => (
          <FormField
            id="warranty-tax"
            label="Taux de taxe (%)"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0] ?? serverFields.taxRate}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
