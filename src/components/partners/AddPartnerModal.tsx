import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { Modal } from '#/components/ui/Modal'
import { createPartner } from '#/services/partners'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  distributorCode: z.string().min(1, 'Le code distributeur est requis'),
  email: z.string().email("L'adresse email n'est pas valide").optional().or(z.literal('')),
  location: z.string().optional(),
})

const FIELDS = [
  { name: 'name', label: 'Nom', type: 'text', required: true },
  { name: 'distributorCode', label: 'Code distributeur', type: 'text', required: true },
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
          if (status === 409) setServerError('Un partenaire avec ce code distributeur existe déjà.')
          else if (status && status >= 500) setServerError('Une erreur serveur est survenue.')
          else setServerError('Une erreur est survenue. Veuillez réessayer.')
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <Modal onClose={onClose}>
      <h2>Ajouter un partenaire</h2>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        {FIELDS.map(({ name, label, type, required }) => (
          <form.Field
            key={name}
            name={name}
            validators={required ? {
              onBlur: ({ value }) => {
                const result = (schema.shape[name] as z.ZodString).safeParse(value)
                return result.success ? undefined : result.error.issues[0].message
              },
              onSubmit: ({ value }) => {
                const result = (schema.shape[name] as z.ZodString).safeParse(value)
                return result.success ? undefined : result.error.issues[0].message
              },
            } : undefined}
          >
            {(field) => (
              <div>
                <label htmlFor={name}>
                  {label}{required && <span style={{ color: 'red' }}> *</span>}
                </label><br />
                <input
                  id={name}
                  type={type}
                  value={field.state.value as string}
                  onChange={(e) => field.handleChange(type === 'number' ? Number(e.target.value) as any : e.target.value)}
                  onBlur={field.handleBlur}
                  style={field.state.meta.errors.length > 0 ? { outline: '2px solid red' } : undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <p style={{ color: 'red', margin: '4px 0 0' }}>{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>
        ))}

        {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button type="submit" disabled={isPending}>{isPending ? 'Création...' : 'Créer'}</button>
          <button type="button" onClick={onClose}>Annuler</button>
        </div>
      </form>
    </Modal>
  )
}
