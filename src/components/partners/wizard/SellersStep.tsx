import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { apiErrorMessage } from '#/lib/api-error'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { getPartnerAgencies } from '#/services/agencies'
import {
  createAgencySeller,
  createPartnerSeller,
  getAgencySellers,
  getPartnerSellers,
} from '#/services/sellers'
import type { CreateSellerPayload, SellerResponse } from '#/services/sellers'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Label } from '#/components/ui/label'
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
  phoneNumber: z.string().min(1, 'Le téléphone est requis'),
  distributorCode: z.string().min(1, 'Le code distributeur est requis'),
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
] as const

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'
const errorBanner =
  'rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive'

type SellerRow = SellerResponse & { attachment: string }

export function SellersStep({ partnerId }: { partnerId: number }) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
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
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          firstName: value.firstName,
          lastName: value.lastName,
          phoneNumber: value.phoneNumber,
          distributorCode: value.distributorCode,
          email: value.email || undefined,
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Un agent avec ce code distributeur existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <div>
      <div className="text-[16px] font-bold tracking-[-0.01em]">Agents</div>
      <p className="mt-1 mb-4 text-[13.5px] text-muted-foreground">
        Ajoutez des agents rattachés directement au partenaire ou à l'une de ses
        agences.
      </p>

      {listLoading ? (
        <p className="text-[13.5px] text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(headCls, 'pl-[18px]')}>Nom</TableHead>
                <TableHead className={headCls}>Téléphone</TableHead>
                <TableHead className={headCls}>Code distributeur</TableHead>
                <TableHead className={headCls}>Email</TableHead>
                <TableHead className={cn(headCls, 'pr-[18px]')}>
                  Rattachement
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-[13.5px] text-muted-foreground"
                  >
                    Aucun agent pour ce partenaire.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow key={`${s.attachment}-${s.id}`}>
                    <TableCell className="py-3 pl-[18px] text-[13.5px] font-semibold">
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">
                      {s.phoneNumber}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] font-semibold text-muted-foreground">
                      {s.distributorCode}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">
                      {s.email ?? ''}
                    </TableCell>
                    <TableCell className="py-3 pr-[18px]">
                      <Badge
                        variant="secondary"
                        className="rounded-md text-[11.5px]"
                      >
                        {s.attachment}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {truncated && (
        <p className="mt-2 text-[13px] text-[#9a7400]">
          Liste tronquée (100+ éléments) · tous les agents ne sont pas affichés.
        </p>
      )}

      {!showForm ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-[10px]"
            onClick={() => setShowForm(true)}
            disabled={!can('seller:write')}
            title={
              can('seller:write')
                ? undefined
                : "Vous n'avez pas la permission requise (seller:write)."
            }
          >
            <Plus />
            Ajouter un agent
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seller-target" className="text-[13px]">
              Rattachement<span className="text-destructive">*</span>
            </Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger
                id="seller-target"
                className="h-10 w-full rounded-[10px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Partenaire (direct)</SelectItem>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={`agency-${a.id}`}>
                    Agence : {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <FormField
                  id={`seller-${name}`}
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
              {isPending ? 'Création…' : "Créer l'agent"}
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
