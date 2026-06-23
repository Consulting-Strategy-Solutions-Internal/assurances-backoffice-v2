import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { createPartner } from '#/services/partners'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  distributorCode: z.string().min(1, 'Le code distributeur est requis'),
  email: z
    .string()
    .email("L'adresse email n'est pas valide")
    .optional()
    .or(z.literal('')),
  location: z.string().optional(),
})

const FIELDS = [
  { name: 'name', label: 'Nom', type: 'text', required: true },
  {
    name: 'distributorCode',
    label: 'Code distributeur',
    type: 'text',
    required: true,
  },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'location', label: 'Localisation', type: 'text', required: false },
] as const

interface AddPartnerModalProps {
  onClose: () => void
}

export function AddPartnerModal({ onClose }: AddPartnerModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createPartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { name: '', distributorCode: '', email: '', location: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          name: value.name,
          distributorCode: value.distributorCode,
          email: value.email || undefined,
          location: value.location || undefined,
        })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 409)
            setServerError('Un partenaire avec ce code distributeur existe déjà.')
          else if (status && status >= 500)
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
      title="Nouveau partenaire"
      description="Ajoutez un courtier ou une agence à votre réseau."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : 'Créer le partenaire'}
      pending={isPending}
      error={serverError}
    >
      {FIELDS.map(({ name, label, type, required }) => (
        <form.Field
          key={name}
          name={name}
          validators={
            required
              ? {
                  onBlur: ({ value }) => {
                    const result = schema.shape[name].safeParse(value)
                    return result.success
                      ? undefined
                      : result.error.issues[0].message
                  },
                  onSubmit: ({ value }) => {
                    const result = schema.shape[name].safeParse(value)
                    return result.success
                      ? undefined
                      : result.error.issues[0].message
                  },
                }
              : undefined
          }
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
