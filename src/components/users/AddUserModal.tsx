import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { Modal } from '#/components/ui/Modal'
import { createUser } from '#/services/users'
import { getRoles } from '#/services/roles'

const schema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z.string().min(1, "L'email est requis").email("L'adresse email n'est pas valide"),
  phoneNumber: z.string().min(1, 'Le téléphone est requis'),
  addressLine1: z.string().min(1, "L'adresse est requise"),
  addressLine2: z.string().optional(),
  roleId: z.number({ message: 'Le rôle est requis' }).min(1, 'Le rôle est requis'),
})

const FIELDS = [
  { name: 'firstName', label: 'Prénom', type: 'text', required: true },
  { name: 'lastName', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: true },
  { name: 'addressLine1', label: 'Adresse', type: 'text', required: true },
  { name: 'addressLine2', label: 'Adresse (complément)', type: 'text', required: false },
] as const

interface AddUserModalProps {
  onClose: () => void
}

export function AddUserModal({ onClose }: AddUserModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: { firstName: '', lastName: '', email: '', phoneNumber: '', addressLine1: '', addressLine2: '', roleId: 0 },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync(value)
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 409) setServerError('Un utilisateur avec cet email existe déjà.')
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
      <h2>Ajouter un administrateur</h2>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>

        <form.Field
          name="roleId"
          validators={{
            onBlur: ({ value }) => (!value || value === 0 ? 'Le rôle est requis' : undefined),
            onSubmit: ({ value }) => (!value || value === 0 ? 'Le rôle est requis' : undefined),
          }}
        >
          {(field) => (
            <div>
              <label htmlFor="roleId">Rôle <span style={{ color: 'red' }}>*</span></label><br />
              <select
                id="roleId"
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
                onBlur={field.handleBlur}
                style={field.state.meta.errors.length > 0 ? { outline: '2px solid red' } : undefined}
              >
                <option value={0} disabled>— Sélectionner un rôle —</option>
                {rolesData?.content.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {field.state.meta.errors.length > 0 && (
                <p style={{ color: 'red', margin: '4px 0 0' }}>{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>

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
                  onChange={(e) => field.handleChange(e.target.value)}
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
