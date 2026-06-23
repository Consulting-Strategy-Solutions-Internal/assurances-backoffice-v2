import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { getPartnerAgencies } from '#/services/agencies'
import {
  createAgencySeller,
  createPartnerSeller,
  getAgencySellers,
  getPartnerSellers,
} from '#/services/sellers'
import type { CreateSellerPayload, SellerResponse } from '#/services/sellers'

const schema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  phoneNumber: z.string().min(1, 'Le téléphone est requis'),
  distributorCode: z.string().min(1, 'Le code distributeur est requis'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  email: z
    .string()
    .email("L'adresse email n'est pas valide")
    .optional()
    .or(z.literal('')),
})

const TEXT_FIELDS = [
  { name: 'firstName', label: 'Prénom', type: 'text', required: true },
  { name: 'lastName', label: 'Nom', type: 'text', required: true },
  { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: true },
  {
    name: 'distributorCode',
    label: 'Code distributeur',
    type: 'text',
    required: true,
  },
  { name: 'email', label: 'Email', type: 'email', required: false },
  { name: 'password', label: 'Mot de passe', type: 'password', required: true },
] as const

interface SellersStepProps {
  partnerId: number
}

type SellerRow = SellerResponse & { attachment: string }

export function SellersStep({ partnerId }: SellersStepProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  // 'partner' ou `agency-<id>`
  const [target, setTarget] = useState('partner')

  const { data: agenciesData } = useQuery({
    queryKey: ['agencies', partnerId],
    queryFn: () => getPartnerAgencies(partnerId),
  })
  const agencies = agenciesData?.content ?? []

  const { data: partnerSellersData, isLoading: partnerSellersLoading } =
    useQuery({
      queryKey: ['sellers', 'partner', partnerId],
      queryFn: () => getPartnerSellers(partnerId),
    })

  const agencySellerResults = useQueries({
    queries: agencies.map((a) => ({
      queryKey: ['sellers', 'agency', a.id],
      queryFn: () => getAgencySellers(a.id),
    })),
  })

  const rows: SellerRow[] = [
    ...(partnerSellersData?.content ?? []).map((s) => ({
      ...s,
      attachment: 'Partenaire (direct)',
    })),
    ...agencies.flatMap((a, i) =>
      (agencySellerResults[i]?.data?.content ?? []).map((s) => ({
        ...s,
        attachment: `Agence : ${a.name}`,
      })),
    ),
  ]

  const listLoading =
    partnerSellersLoading || agencySellerResults.some((q) => q.isLoading)

  // Les listes ne chargent qu'une page ; on prévient si des éléments sont masqués.
  const truncated =
    partnerSellersData?.last === false ||
    agenciesData?.last === false ||
    agencySellerResults.some((q) => q.data?.last === false)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CreateSellerPayload) => {
      if (target === 'partner') return createPartnerSeller(partnerId, payload)
      const agencyId = Number(target.replace('agency-', ''))
      return createAgencySeller(agencyId, payload)
    },
    onSuccess: () => {
      if (target === 'partner') {
        queryClient.invalidateQueries({
          queryKey: ['sellers', 'partner', partnerId],
        })
      } else {
        const agencyId = Number(target.replace('agency-', ''))
        queryClient.invalidateQueries({
          queryKey: ['sellers', 'agency', agencyId],
        })
      }
      setShowForm(false)
      form.reset()
    },
  })

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      distributorCode: '',
      email: '',
      password: '',
      pinCode: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          firstName: value.firstName,
          lastName: value.lastName,
          phoneNumber: value.phoneNumber,
          distributorCode: value.distributorCode,
          password: value.password,
          email: value.email || undefined,
          pinCode:
            value.pinCode === '' || Number.isNaN(Number(value.pinCode))
              ? undefined
              : Number(value.pinCode),
        })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 409)
            setServerError('Un agent avec ce code distributeur existe déjà.')
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
      <h3>Agents (sellers)</h3>
      <p style={{ color: '#6b7280' }}>
        Ajoutez des agents rattachés directement au partenaire ou à l'une de ses
        agences.
      </p>

      {listLoading ? (
        <p>Chargement...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Code distributeur</th>
              <th>Email</th>
              <th>Rattachement</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Aucun agent pour ce partenaire.</td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={`${s.attachment}-${s.id}`}>
                  <td>
                    {s.firstName} {s.lastName}
                  </td>
                  <td>{s.phoneNumber}</td>
                  <td>{s.distributorCode}</td>
                  <td>{s.email ?? ''}</td>
                  <td>{s.attachment}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {truncated && (
        <p style={{ color: '#b45309', margin: '8px 0 0', fontSize: '13px' }}>
          Liste tronquée (100+ éléments) · tous les agents ne sont pas affichés.
        </p>
      )}

      {!showForm ? (
        <div style={{ marginTop: '12px' }}>
          <button type="button" onClick={() => setShowForm(true)}>
            Ajouter un agent
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
          <div>
            <label htmlFor="seller-target">
              Rattachement <span style={{ color: 'red' }}>*</span>
            </label>
            <br />
            <select
              id="seller-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="partner">Partenaire (direct)</option>
              {agencies.map((a) => (
                <option key={a.id} value={`agency-${a.id}`}>
                  Agence : {a.name}
                </option>
              ))}
            </select>
          </div>

          {TEXT_FIELDS.map(({ name, label, type, required }) => (
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
                  <label htmlFor={`seller-${name}`}>
                    {label}
                    {required && <span style={{ color: 'red' }}> *</span>}
                  </label>
                  <br />
                  <input
                    id={`seller-${name}`}
                    type={type}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete={
                      type === 'password' ? 'new-password' : undefined
                    }
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

          <form.Field name="pinCode">
            {(field) => (
              <div>
                <label htmlFor="seller-pinCode">Code PIN</label>
                <br />
                <input
                  id="seller-pinCode"
                  type="number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          {serverError && <p style={{ color: 'red' }}>{serverError}</p>}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" disabled={isPending}>
              {isPending ? 'Création...' : "Créer l'agent"}
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
