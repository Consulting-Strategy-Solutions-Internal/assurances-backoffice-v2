import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { createAgency, getPartnerAgencies } from '#/services/agencies'
import type { CreateAgencyPayload } from '#/services/agencies'

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

interface AgenciesStepProps {
  partnerId: number
}

export function AgenciesStep({ partnerId }: AgenciesStepProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['agencies', partnerId],
    queryFn: () => getPartnerAgencies(partnerId),
  })

  const agencies = data?.content ?? []

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CreateAgencyPayload) =>
      createAgency(partnerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies', partnerId] })
      setShowForm(false)
      form.reset()
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
            setServerError('Une agence avec ce code distributeur existe déjà.')
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
    <div>
      <h3>Agences</h3>
      <p style={{ color: '#6b7280' }}>
        Cette étape est optionnelle. Vous pouvez ajouter des agences ou passer
        directement aux agents.
      </p>

      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Code distributeur</th>
              <th>Email</th>
              <th>Localisation</th>
            </tr>
          </thead>
          <tbody>
            {agencies.length === 0 ? (
              <tr>
                <td colSpan={4}>Aucune agence pour ce partenaire.</td>
              </tr>
            ) : (
              agencies.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.distributorCode}</td>
                  <td>{a.email ?? ''}</td>
                  <td>{a.location ?? ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {data?.last === false && (
        <p style={{ color: '#b45309', margin: '8px 0 0', fontSize: '13px' }}>
          Liste tronquée (100+ éléments) · toutes les agences ne sont pas
          affichées.
        </p>
      )}

      {!showForm ? (
        <div style={{ marginTop: '12px' }}>
          <button type="button" onClick={() => setShowForm(true)}>
            Ajouter une agence
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          style={{ marginTop: '16px' }}
        >
          {FIELDS.map(({ name, label, type, required }) => (
            <form.Field
              key={name}
              name={name}
              validators={{
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
              }}
            >
              {(field) => (
                <div>
                  <label htmlFor={`agency-${name}`}>
                    {label}
                    {required && <span style={{ color: 'red' }}> *</span>}
                  </label>
                  <br />
                  <input
                    id={`agency-${name}`}
                    type={type}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    style={
                      field.state.meta.errors.length > 0
                        ? { outline: '2px solid red' }
                        : undefined
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p style={{ color: 'red', margin: '4px 0 0' }}>
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          ))}

          {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" disabled={isPending}>
              {isPending ? 'Création...' : "Créer l'agence"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setServerError(null)
                form.reset()
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
