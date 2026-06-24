import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { updateRateTable } from '#/services/rate-tables'
import type { RateTableResponse } from '#/services/rate-tables'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const versionSchema = z.string().min(1, 'La version est requise')

interface EditRateTableModalProps {
  rateTable: RateTableResponse
  onClose: () => void
}

export function EditRateTableModal({
  rateTable,
  onClose,
}: EditRateTableModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: { version: string }) =>
      updateRateTable(rateTable.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-tables'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { version: rateTable.version },
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
      title="Modifier la grille"
      description={`Version « ${rateTable.version} »`}
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
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
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
