import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { apiErrorMessage } from '#/lib/api-error'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { createAgency, getPartnerAgencies } from '#/services/agencies'
import type { CreateAgencyPayload } from '#/services/agencies'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
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

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'
const errorBanner = 'rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive'

export function AgenciesStep({ partnerId }: { partnerId: number }) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
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
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Une agence avec ce code distributeur existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <div>
      <div className="text-[16px] font-bold tracking-[-0.01em]">Agences</div>
      <p className="mt-1 mb-4 text-[13.5px] text-muted-foreground">
        Étape optionnelle. Ajoutez des agences ou passez directement aux agents.
      </p>

      {isLoading ? (
        <p className="text-[13.5px] text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headCls, 'pl-[18px]')}>Nom</TableHead>
                <TableHead className={headCls}>Code distributeur</TableHead>
                <TableHead className={headCls}>Email</TableHead>
                <TableHead className={cn(headCls, 'pr-[18px]')}>Localisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-8 text-center text-[13.5px] text-muted-foreground">
                    Aucune agence pour ce partenaire.
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="py-3 pl-[18px] text-[13.5px] font-semibold">
                      {a.name}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] font-semibold text-muted-foreground">
                      {a.distributorCode}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">
                      {a.email ?? ''}
                    </TableCell>
                    <TableCell className="py-3 pr-[18px] text-[13px] text-muted-foreground">
                      {a.location ?? ''}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {data?.last === false && (
        <p className="mt-2 text-[13px] text-[#9a7400]">
          Liste tronquée (100+ éléments) · toutes les agences ne sont pas
          affichées.
        </p>
      )}

      {!showForm ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-[10px]"
            onClick={() => setShowForm(true)}
            disabled={!can('agency:write')}
            title={
              can('agency:write')
                ? undefined
                : "Vous n'avez pas la permission requise (agency:write)."
            }
          >
            <Plus />
            Ajouter une agence
          </Button>
        </div>
      ) : (
        <form
          className="mt-5 flex max-w-[460px] flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
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
                <FormField
                  id={`agency-${name}`}
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

          {serverError && <p className={errorBanner}>{serverError}</p>}

          <div className="flex gap-2.5">
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            >
              {isPending ? 'Création…' : "Créer l'agence"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-[11px]"
              onClick={() => {
                setShowForm(false)
                setServerError(null)
                form.reset()
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
