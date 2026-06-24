import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { createRateTable } from '#/services/rate-tables'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const versionSchema = z.string().min(1, 'La version est requise')

interface AddRateTableModalProps {
  onClose: () => void
}

export function AddRateTableModal({ onClose }: AddRateTableModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createRateTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-tables'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { version: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({ version: value.version })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Une grille avec cette version existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Grille tarifaire"
      title="Nouvelle grille"
      description="Créez une nouvelle version de grille tarifaire (brouillon)."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : 'Créer la grille'}
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="version"
        validators={{
          onBlur: ({ value }) => {
            const result = versionSchema.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const result = versionSchema.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="version"
            label="Version"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="Identifiant de version, ex. « 2026-T1 » ou « v3 »."
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
