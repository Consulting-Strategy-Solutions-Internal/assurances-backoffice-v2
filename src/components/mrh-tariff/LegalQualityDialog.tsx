import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { TextareaField } from '#/components/ia-products/shared/TextareaField'
import { buildLegalQualityPayload } from '#/lib/mrh-tariff'
import { getLegalQuality, updateLegalQuality } from '#/services/mrh-tariff'
import type { LegalQualityResponse } from '#/services/mrh-tariff'
import { MRH_KEYS, splitServerError, writeBack } from './grid-kit'

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
    mutationFn: async (values: { name: string; description: string }) => {
      await updateLegalQuality(
        legalQuality.id,
        buildLegalQualityPayload(values),
      )
      return getLegalQuality(legalQuality.id)
    },
    onSuccess: (fresh) => {
      writeBack(queryClient, MRH_KEYS.legalQualities, fresh)
      toast.success('Situation mise à jour.')
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
    value.trim() === '' ? 'Le nom est requis.' : undefined

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow={`Situation · ${legalQuality.code}`}
      title="Modifier la situation"
      description="Le code, la base de calcul et l’occupation sont fixés par la grille NSIA."
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
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0] ?? serverFields.name}
          />
        )}
      </form.Field>
      <form.Field name="description">
        {(field) => (
          <TextareaField
            id="lq-description"
            label="Description"
            maxLength={500}
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={serverFields.description}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
