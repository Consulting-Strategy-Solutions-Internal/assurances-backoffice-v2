import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { createWarranty } from '#/services/pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const nameSchema = z.string().min(1, 'Le nom est requis')
const taxSchema = z
  .string()
  .min(1, 'Le taux de taxe est requis')
  .refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
    'Valeur numérique invalide (≥ 0)',
  )

interface WarrantyModalProps {
  onClose: () => void
}

export function WarrantyModal({ onClose }: WarrantyModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createWarranty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties', 'all'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { name: '', taxRate: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({ name: value.name, taxRate: Number(value.taxRate) })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Une garantie avec ce nom existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Garantie"
      title="Nouvelle garantie"
      description="Ajoutez une garantie au catalogue, réutilisable par les qualités juridiques."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : 'Créer la garantie'}
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const r = nameSchema.safeParse(value)
            return r.success ? undefined : r.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const r = nameSchema.safeParse(value)
            return r.success ? undefined : r.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="name"
            label="Nom"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field
        name="taxRate"
        validators={{
          onBlur: ({ value }) => {
            const r = taxSchema.safeParse(value)
            return r.success ? undefined : r.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const r = taxSchema.safeParse(value)
            return r.success ? undefined : r.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="taxRate"
            label="Taux de taxe"
            type="number"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="Taux de taxe applicable à la garantie."
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
