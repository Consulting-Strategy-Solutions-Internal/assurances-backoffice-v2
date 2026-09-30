import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { TextareaField } from '#/components/ia-products/shared/TextareaField'
import {
  MAX_TEXT_LENGTH,
  buildLegalQualityPayload,
  validateTextLength,
} from '#/lib/mrh-tariff'
import { getLegalQuality, updateLegalQuality } from '#/services/mrh-tariff'
import type { LegalQualityResponse } from '#/services/mrh-tariff'
import {
  MRH_KEYS,
  announceSaved,
  saveThenReread,
  splitServerError,
  writeBack,
} from './grid-kit'

const FORM_FIELDS = ['name', 'description'] as const

export function LegalQualityDialog({
  legalQuality,
  onClose,
}: {
  legalQuality: LegalQualityResponse
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (values: { name: string; description: string }) =>
      saveThenReread(
        () =>
          updateLegalQuality(legalQuality.id, buildLegalQualityPayload(values)),
        () => getLegalQuality(legalQuality.id),
      ),
    onSuccess: (saved) => {
      writeBack(queryClient, MRH_KEYS.legalQualities, saved.entity)
      announceSaved(saved, 'Situation mise à jour.')
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      name: legalQuality.name,
      description: legalQuality.description ?? '',
    },
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
    value.trim() === '' ? 'Le nom est requis.' : validateTextLength(value)
  const checkLength = ({ value }: { value: string }) =>
    validateTextLength(value)
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
      eyebrow="Situation"
      title="Modifier la situation"
      description="La base de calcul et l’occupation sont fixées par la grille NSIA."
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
            id="lq-name"
            label="Nom"
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
        name="description"
        validators={{ onBlur: checkLength, onSubmit: checkLength }}
      >
        {(field) => (
          <TextareaField
            id="lq-description"
            label="Description"
            maxLength={MAX_TEXT_LENGTH}
            value={field.state.value}
            onChange={(v) => {
              clearServer('description')
              field.handleChange(v)
            }}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0] ?? serverFields.description}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
