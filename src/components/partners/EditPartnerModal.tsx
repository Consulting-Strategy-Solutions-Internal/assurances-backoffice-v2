import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { updatePartner } from '#/services/partners'
import type { PartnerResponse } from '#/services/partners'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z
    .string()
    .email("L'adresse email n'est pas valide")
    .optional()
    .or(z.literal('')),
  location: z.string().optional(),
})

const FIELDS = [
  { name: 'name', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'location', label: 'Localisation', type: 'text', required: false },
] as const

interface EditPartnerModalProps {
  partner: PartnerResponse
  onClose: () => void
}

export function EditPartnerModal({ partner, onClose }: EditPartnerModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: { name: string; email?: string; location?: string }) =>
      updatePartner(partner.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partner', partner.id] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      name: partner.name,
      email: partner.email ?? '',
      location: partner.location ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          name: value.name,
          email: value.email || undefined,
          location: value.location || undefined,
        })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status && status >= 500)
            setServerError('Une erreur serveur est survenue.')
          else setServerError('Une erreur est survenue. Veuillez réessayer.')
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Partenaires"
      title="Modifier le partenaire"
      description={partner.name}
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      <FormField
        id="distributorCode"
        label="Code distributeur"
        value={partner.distributorCode}
        disabled
        hint="Le code distributeur n'est pas modifiable."
      />

      {FIELDS.map(({ name, label, type, required }) => (
        <form.Field
          key={name}
          name={name}
          validators={{
            onBlur: ({ value }) => {
              const result = schema.shape[name].safeParse(value)
              return result.success ? undefined : result.error.issues[0].message
            },
            onSubmit: ({ value }) => {
              const result = schema.shape[name].safeParse(value)
              return result.success ? undefined : result.error.issues[0].message
            },
          }}
        >
          {(field) => (
            <FormField
              id={name}
              label={label}
              type={type}
              required={required}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
