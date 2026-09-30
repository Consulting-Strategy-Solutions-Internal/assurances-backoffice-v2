import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import {
  parseDecimalInput,
  validateDecimalInput,
  validateTextLength,
} from '#/lib/mrh-tariff'
import { getWarranty, updateWarranty } from '#/services/mrh-tariff'
import type { WarrantyResponse } from '#/services/mrh-tariff'
import {
  MRH_KEYS,
  announceSaved,
  saveThenReread,
  splitServerError,
  writeBack,
} from './grid-kit'

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
    mutationFn: (values: { name: string; taxRate: string }) =>
      saveThenReread(
        () =>
          updateWarranty(warranty.id, {
            name: values.name.trim(),
            taxRate: parseDecimalInput(values.taxRate),
          }),
        () => getWarranty(warranty.id),
      ),
    onSuccess: (saved) => {
      writeBack(queryClient, MRH_KEYS.warranties, saved.entity)
      announceSaved(saved, 'Garantie mise à jour.')
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
    value.trim() === '' ? 'Le libellé est requis.' : validateTextLength(value)
  const validateTax = ({ value }: { value: string }) =>
    validateDecimalInput(value, {})
  const clearServer = (name: string) =>
    setServerFields((prev) => {
      if (!(name in prev)) return prev
      const { [name]: _removed, ...rest } = prev
      return rest
    })

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="Garantie"
      title="Modifier la garantie"
      description="La garantie elle-même est fixée par la grille NSIA."
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
            onChange={(v) => {
              clearServer('name')
              field.handleChange(v)
            }}
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
            onChange={(v) => {
              clearServer('taxRate')
              field.handleChange(v)
            }}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0] ?? serverFields.taxRate}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
