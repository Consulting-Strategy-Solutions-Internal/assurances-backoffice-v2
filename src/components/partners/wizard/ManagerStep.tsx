import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { assignUserToPartner, createUser, getUsers } from '#/services/users'
import type { CreateUserPayload, UserResponse } from '#/services/users'
import { getRoles } from '#/services/roles'
import { getPartners } from '#/services/partners'
import { SearchInput } from '#/components/ui/SearchInput'

const schema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("L'adresse email n'est pas valide"),
  phoneNumber: z.string().min(1, 'Le téléphone est requis'),
  addressLine1: z.string().min(1, "L'adresse est requise"),
  addressLine2: z.string().optional(),
})

const FIELDS = [
  { name: 'firstName', label: 'Prénom', type: 'text', required: true },
  { name: 'lastName', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: true },
  { name: 'addressLine1', label: 'Adresse', type: 'text', required: true },
  {
    name: 'addressLine2',
    label: 'Adresse (complément)',
    type: 'text',
    required: false,
  },
] as const

interface ManagerStepProps {
  partnerId: number
}

export function ManagerStep({ partnerId }: ManagerStepProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers({ page: 0, size: 200 }),
  })

  const allUsers = usersData?.content ?? []
  const currentManagers = allUsers.filter((u) => u.partnerId === partnerId)

  return (
    <div>
      <h3>Manager du partenaire</h3>

      <CurrentManagers managers={currentManagers} isLoading={isLoading} />

      {usersData?.last === false && (
        <p style={{ color: '#b45309', margin: '8px 0 0', fontSize: '13px' }}>
          Plus de 200 utilisateurs : la détection des managers et la liste de
          sélection peuvent être incomplètes.
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
        <button
          type="button"
          onClick={() => setMode('existing')}
          style={{ fontWeight: mode === 'existing' ? 600 : 400 }}
        >
          Sélectionner un utilisateur existant
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          style={{ fontWeight: mode === 'new' ? 600 : 400 }}
        >
          Créer un nouveau manager
        </button>
      </div>

      {mode === 'existing' ? (
        <SelectExistingManager
          partnerId={partnerId}
          users={allUsers}
          isLoading={isLoading}
        />
      ) : (
        <CreateNewManager partnerId={partnerId} />
      )}
    </div>
  )
}

function CurrentManagers({
  managers,
  isLoading,
}: {
  managers: UserResponse[]
  isLoading: boolean
}) {
  if (isLoading) return <p>Chargement...</p>
  if (managers.length === 0) {
    return (
      <p style={{ color: '#6b7280' }}>
        Aucun manager rattaché à ce partenaire pour l'instant.
      </p>
    )
  }
  return (
    <div>
      <strong>Manager(s) actuel(s) :</strong>
      <ul style={{ margin: '8px 0' }}>
        {managers.map((m) => (
          <li key={m.id}>
            {m.firstName} {m.lastName} · {m.email}{' '}
            <em style={{ color: '#6b7280' }}>({m.role})</em>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SelectExistingManager({
  partnerId,
  users,
  isLoading,
}: {
  partnerId: number
  users: UserResponse[]
  isLoading: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pour afficher le siège actuel (partenaire déjà rattaché) d'un manager.
  const { data: partnersData } = useQuery({
    queryKey: ['partners', 'all'],
    queryFn: () => getPartners(0, 500),
  })
  const partnerNameById = new Map(
    (partnersData?.content ?? []).map((p) => [p.id, p.name]),
  )

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (userId: number) => assignUserToPartner(userId, partnerId),
    onSuccess: () => {
      // Préfixe large : rafraîchit ['users','all'] (ce composant) et ['users', page] (page Administrateurs).
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSuccess(true)
    },
    onError: (error) => {
      if (
        isAxiosError(error) &&
        error.response?.status &&
        error.response.status >= 500
      ) {
        setServerError('Une erreur serveur est survenue.')
      } else {
        setServerError('Impossible de rattacher cet utilisateur.')
      }
    },
  })

  const candidates = users
    // Uniquement des managers (on exclut les administrateurs), et pas ceux déjà sur ce partenaire.
    .filter((u) => u.role.toLowerCase().includes('manager'))
    .filter((u) => u.partnerId !== partnerId)
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      )
    })

  if (isLoading) return <p>Chargement...</p>

  return (
    <div>
      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v)
          setSuccess(false)
        }}
        placeholder="Rechercher un manager (nom, email, rôle)..."
      />
      {serverError && <p style={{ color: 'red' }}>{serverError}</p>}
      {success && (
        <p style={{ color: '#16a34a' }}>Manager rattaché au partenaire.</p>
      )}
      <table style={{ marginTop: '8px' }}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Siège actuel</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {candidates.length === 0 ? (
            <tr>
              <td colSpan={5}>Aucun manager disponible.</td>
            </tr>
          ) : (
            candidates.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.firstName} {u.lastName}
                </td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.partnerId == null ? (
                    <span style={{ color: '#6b7280' }}>Aucun</span>
                  ) : (
                    <span
                      style={{ color: '#b45309' }}
                      title="Déjà manager d'un autre partenaire"
                    >
                      {partnerNameById.get(u.partnerId) ?? `#${u.partnerId}`}{' '}
                      (siège)
                    </span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setServerError(null)
                      setSuccess(false)
                      mutate(u.id)
                    }}
                  >
                    {isPending && variables === u.id
                      ? 'Rattachement...'
                      : 'Rattacher'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function CreateNewManager({ partnerId }: { partnerId: number }) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const user = await createUser(payload)
      return assignUserToPartner(user.id, partnerId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSuccess(true)
      form.reset()
    },
  })

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      roleId: 0,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setSuccess(false)
      try {
        await mutateAsync({
          roleId: value.roleId,
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          phoneNumber: value.phoneNumber,
          addressLine1: value.addressLine1,
          addressLine2: value.addressLine2 || undefined,
        })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 409)
            setServerError('Un utilisateur avec cet email existe déjà.')
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="roleId"
        validators={{
          onBlur: ({ value }) => (!value ? 'Le rôle est requis' : undefined),
          onSubmit: ({ value }) => (!value ? 'Le rôle est requis' : undefined),
        }}
      >
        {(field) => (
          <div>
            <label htmlFor="roleId">
              Rôle <span style={{ color: 'red' }}>*</span>
            </label>
            <br />
            <select
              id="roleId"
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              onBlur={field.handleBlur}
              style={
                field.state.meta.errors.length > 0
                  ? { outline: '2px solid red' }
                  : undefined
              }
            >
              <option value={0} disabled>
                Sélectionner un rôle
              </option>
              {rolesData?.content.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {field.state.meta.errors.length > 0 && (
              <p style={{ color: 'red', margin: '4px 0 0' }}>
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

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
            <div>
              <label htmlFor={name}>
                {label}
                {required && <span style={{ color: 'red' }}> *</span>}
              </label>
              <br />
              <input
                id={name}
                type={type}
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  setSuccess(false)
                }}
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
      {success && (
        <p style={{ color: '#16a34a' }}>
          Manager créé et rattaché au partenaire.
        </p>
      )}

      <div style={{ marginTop: '16px' }}>
        <button type="submit" disabled={isPending}>
          {isPending ? 'Création...' : 'Créer et rattacher'}
        </button>
      </div>
    </form>
  )
}
