import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Search } from 'lucide-react'
import { z } from 'zod'
import { assignUserToPartner, createUser, getUsers } from '#/services/users'
import type { CreateUserPayload, UserResponse } from '#/services/users'
import { getRoles } from '#/services/roles'
import { getPartners } from '#/services/partners'
import { cn } from '#/lib/utils'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Label } from '#/components/ui/label'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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

const headCls = 'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'
const errorBanner = 'rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive'
const successBanner = 'rounded-lg bg-[#e7f6ee] px-3 py-2.5 text-[13px] font-medium text-[#1c8a57]'

export function ManagerStep({ partnerId }: { partnerId: number }) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const { can } = usePermissions()
  const canWrite = can('iam:write')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers({ page: 0, size: 200 }),
  })

  const allUsers = usersData?.content ?? []
  const currentManagers = allUsers.filter((u) => u.partnerId === partnerId)

  return (
    <div>
      <div className="text-[16px] font-bold tracking-[-0.01em]">
        Manager du partenaire
      </div>
      <p className="mt-1 mb-4 text-[13.5px] text-muted-foreground">
        Rattachez le responsable qui pilotera ce partenaire.
      </p>

      <CurrentManagers managers={currentManagers} isLoading={isLoading} />

      {usersData?.last === false && (
        <p className="mt-2 text-[13px] text-[#9a7400]">
          Plus de 200 utilisateurs : la détection des managers et la liste de
          sélection peuvent être incomplètes.
        </p>
      )}

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as 'existing' | 'new')}
        className="my-5"
      >
        <TabsList>
          <TabsTrigger value="existing">Utilisateur existant</TabsTrigger>
          <TabsTrigger value="new">Nouveau manager</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'existing' ? (
        <SelectExistingManager
          partnerId={partnerId}
          users={allUsers}
          isLoading={isLoading}
          canWrite={canWrite}
        />
      ) : (
        <CreateNewManager partnerId={partnerId} canWrite={canWrite} />
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
  if (isLoading)
    return <p className="text-[13.5px] text-muted-foreground">Chargement…</p>
  if (managers.length === 0) {
    return (
      <p className="text-[13.5px] text-muted-foreground">
        Aucun manager rattaché à ce partenaire pour l'instant.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {managers.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-xl border bg-[#fafbfc] px-3 py-2.5"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-[12.5px] font-bold text-primary">
              {`${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-[1.3]">
            <div className="text-[13.5px] font-semibold">
              {m.firstName} {m.lastName}
            </div>
            <div className="text-[12px] text-muted-foreground">{m.email}</div>
          </div>
          <Badge variant="secondary" className="rounded-md text-[11.5px]">
            {m.role}
          </Badge>
        </div>
      ))}
    </div>
  )
}

function SelectExistingManager({
  partnerId,
  users,
  isLoading,
  canWrite,
}: {
  partnerId: number
  users: UserResponse[]
  isLoading: boolean
  canWrite: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  if (isLoading)
    return <p className="text-[13.5px] text-muted-foreground">Chargement…</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full max-w-[360px]">
        <Search className="pointer-events-none absolute top-1/2 left-[13px] size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSuccess(false)
          }}
          placeholder="Rechercher un manager (nom, email, rôle)…"
          className="h-10 rounded-[10px] pl-9 text-[13.5px]"
        />
      </div>

      {serverError && <p className={errorBanner}>{serverError}</p>}
      {success && <p className={successBanner}>Manager rattaché au partenaire.</p>}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[18px]')}>Nom</TableHead>
              <TableHead className={headCls}>Email</TableHead>
              <TableHead className={headCls}>Rôle</TableHead>
              <TableHead className={headCls}>Siège actuel</TableHead>
              <TableHead className={cn(headCls, 'pr-[18px] text-right')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-8 text-center text-[13.5px] text-muted-foreground">
                  Aucun manager disponible.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="py-3 pl-[18px] text-[13.5px] font-semibold">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">
                    {u.role}
                  </TableCell>
                  <TableCell className="py-3 text-[13px]">
                    {u.partnerId == null ? (
                      <span className="text-muted-foreground">Aucun</span>
                    ) : (
                      <span
                        className="text-[#9a7400]"
                        title="Déjà manager d'un autre partenaire"
                      >
                        {partnerNameById.get(u.partnerId) ?? `#${u.partnerId}`}{' '}
                        (siège)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 pr-[18px] text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-[9px]"
                      disabled={isPending || !canWrite}
                      title={
                        canWrite
                          ? undefined
                          : "Vous n'avez pas la permission requise (iam:write)."
                      }
                      onClick={() => {
                        setServerError(null)
                        setSuccess(false)
                        mutate(u.id)
                      }}
                    >
                      {isPending && variables === u.id
                        ? 'Rattachement…'
                        : 'Rattacher'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function CreateNewManager({
  partnerId,
  canWrite,
}: {
  partnerId: number
  canWrite: boolean
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const created = await createUser(payload)
      // The create response doesn't reliably carry the new user's id, so fall
      // back to resolving it by email before rattaching (emails are unique).
      let userId: number | undefined = created?.id
      if (userId == null) {
        const list = await getUsers({ page: 0, size: 200 })
        userId = list.content.find(
          (u) => u.email.toLowerCase() === payload.email.toLowerCase(),
        )?.id
      }
      if (userId == null) {
        throw new Error(
          "Le manager a été créé mais reste introuvable pour le rattachement. Rafraîchissez la page et rattachez-le via « Utilisateur existant ».",
        )
      }
      return assignUserToPartner(userId, partnerId)
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
        } else if (error instanceof Error) {
          setServerError(error.message)
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <form
      className="flex max-w-[460px] flex-col gap-4"
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
        {(field) => {
          const error = field.state.meta.errors[0]
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manager-roleId" className="text-[13px]">
                Rôle<span className="text-destructive">*</span>
              </Label>
              <Select
                value={field.state.value ? String(field.state.value) : ''}
                onValueChange={(v) => {
                  field.handleChange(Number(v))
                  field.handleBlur()
                  setSuccess(false)
                }}
              >
                <SelectTrigger
                  id="manager-roleId"
                  aria-invalid={!!error}
                  className="h-10 w-full rounded-[10px]"
                >
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {rolesData?.content.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && (
                <p className="text-[12px] font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        }}
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
            <FormField
              id={`manager-${name}`}
              label={label}
              type={type}
              required={required}
              value={field.state.value}
              onChange={(v) => {
                field.handleChange(v)
                setSuccess(false)
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>
      ))}

      {serverError && <p className={errorBanner}>{serverError}</p>}
      {success && (
        <p className={successBanner}>Manager créé et rattaché au partenaire.</p>
      )}

      <div>
        <Button
          type="submit"
          disabled={isPending || !canWrite}
          title={
            canWrite
              ? undefined
              : "Vous n'avez pas la permission requise (iam:write)."
          }
          className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
        >
          {isPending ? 'Création…' : 'Créer et rattacher'}
        </Button>
      </div>
    </form>
  )
}
