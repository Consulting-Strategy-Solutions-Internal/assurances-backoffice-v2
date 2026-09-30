import { useMemo, useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { ClientPicker } from '#/components/claims/ClientPicker'
import {
  mapClaimError,
  maskFrDate,
  parseFrDate,
  validateOccurredOn,
} from '#/lib/claims'
import { cn } from '#/lib/utils'
import { getClaimTypes } from '#/services/claim-types'
import { claimsKeys, createClaim } from '#/services/claims'
import {
  getAllSubscriptions,
  subscriptionLabel,
  subscriptionsAllKey,
  subscriptionsOfClient,
} from '#/services/subscriptions-by-client'

const schema = z.object({
  clientId: z.string().min(1, 'Le client est requis'),
  subscriptionId: z
    .string()
    .regex(/^\d+$/, "L'identifiant du contrat est requis"),
  claimTypeId: z.string().min(1, 'Le type de sinistre est requis'),
  occurredOn: z.string().superRefine((value, ctx) => {
    const message = validateOccurredOn(value)
    if (message) ctx.addIssue({ code: 'custom', message })
  }),
  location: z.string().max(255, '255 caractères maximum'),
  description: z
    .string()
    .trim()
    .min(1, 'La description est requise')
    .max(4000, '4000 caractères maximum'),
})

type FieldName = keyof typeof schema.shape

export function CreateClaimDialog({
  onClose,
  defaultClientId,
}: {
  onClose: () => void
  /** Pre-selects the client (declaration started from a client record). */
  defaultClientId?: number
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({})
  const subscriptionsQuery = useQuery({
    queryKey: subscriptionsAllKey,
    queryFn: getAllSubscriptions,
    staleTime: 60_000,
    retry: false,
  })
  const { data: types } = useQuery({
    queryKey: ['claimTypes', 'claim-picker'],
    queryFn: () => getClaimTypes({ page: 0, size: 100, sort: 'name,asc' }),
    retry: false,
  })
  const mutation = useMutation({ mutationFn: createClaim })
  const form = useForm({
    defaultValues: {
      clientId: defaultClientId ? String(defaultClientId) : '',
      subscriptionId: '',
      claimTypeId: '',
      occurredOn: '',
      location: '',
      description: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setFieldErrors({})
      try {
        const claim = await mutation.mutateAsync({
          clientId: Number(value.clientId),
          subscriptionId: Number(value.subscriptionId),
          claimTypeId: Number(value.claimTypeId),
          occurredOn: parseFrDate(value.occurredOn) ?? value.occurredOn,
          location: value.location.trim() || undefined,
          description: value.description.trim(),
        })
        await queryClient.invalidateQueries({ queryKey: claimsKeys.all })
        await queryClient.setQueryData(claimsKeys.detail(claim.id), claim)
        onClose()
      } catch (error) {
        const mapped = mapClaimError(error)
        if (mapped.kind === 'validation') setFieldErrors(mapped.fields)
        setServerError(mapped.message)
      }
    },
  })
  const validator = (name: FieldName) => ({
    onBlur: ({ value }: { value: string }) => {
      const result = schema.shape[name].safeParse(value)
      return result.success ? undefined : result.error.issues[0].message
    },
    onSubmit: ({ value }: { value: string }) => {
      const result = schema.shape[name].safeParse(value)
      return result.success ? undefined : result.error.issues[0].message
    },
  })
  const typeOptions = (types?.content ?? [])
    .filter((type) => type.active)
    .map((type) => ({
      value: String(type.id),
      label: `${type.name} · ${type.productLabel}`,
    }))

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)
  const clientId = useStore(form.store, (s) => s.values.clientId)
  const contracts = useMemo(
    () =>
      clientId
        ? subscriptionsOfClient(
            subscriptionsQuery.data?.items ?? [],
            Number(clientId),
          )
        : [],
    [clientId, subscriptionsQuery.data],
  )
  const contractOptions = contracts.map((contract) => ({
    value: String(contract.id),
    label: subscriptionLabel(contract),
  }))
  const contractsUnavailable =
    subscriptionsQuery.isError ||
    (!!clientId && !subscriptionsQuery.isLoading && contracts.length === 0)

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="Sinistres"
      title="Déclarer un sinistre"
      description="Déclaration effectuée au nom d’un client. La recevabilité est contrôlée par le serveur."
      onSubmit={() => form.handleSubmit()}
      submitLabel={mutation.isPending ? 'Déclaration…' : 'Déclarer le sinistre'}
      pending={mutation.isPending}
      error={serverError}
    >
      <form.Field name="clientId" validators={validator('clientId')}>
        {(field) => {
          const error = fieldErrors.clientId ?? field.state.meta.errors[0]
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="claim-client" className="text-[13px]">
                Client<span className="text-destructive">*</span>
              </Label>
              <ClientPicker
                id="claim-client"
                label="Client"
                value={field.state.value}
                allLabel="Rechercher un client…"
                hideAllOption
                className="w-full"
                onChange={(next) => {
                  field.handleChange(next)
                  field.handleBlur()
                  form.setFieldValue('subscriptionId', '')
                }}
              />
              {error && (
                <p
                  role="alert"
                  className="text-[12px] font-medium text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>
      <form.Field
        name="subscriptionId"
        validators={validator('subscriptionId')}
      >
        {(field) =>
          contractsUnavailable ? (
            <FormField
              id="subscription-id"
              label="Identifiant du contrat"
              type="number"
              required
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={fieldErrors.subscriptionId ?? field.state.meta.errors[0]}
              hint={
                subscriptionsQuery.isError
                  ? 'La liste des contrats est indisponible : saisissez l’identifiant du contrat. Sa validité sera contrôlée à l’envoi.'
                  : 'Aucun contrat trouvé pour ce client : saisissez l’identifiant du contrat si vous le connaissez. Sa validité sera contrôlée à l’envoi.'
              }
            />
          ) : (
            <FormSelect
              id="subscription-id"
              label="Contrat concerné"
              required
              value={field.state.value}
              options={contractOptions}
              disabled={!clientId || subscriptionsQuery.isLoading}
              placeholder={
                !clientId
                  ? 'Choisissez d’abord un client'
                  : subscriptionsQuery.isLoading
                    ? 'Chargement des contrats…'
                    : 'Sélectionner un contrat'
              }
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={fieldErrors.subscriptionId ?? field.state.meta.errors[0]}
              hint={
                clientId
                  ? 'Contrats de ce client : numéro de police, produit, statut et période de couverture.'
                  : undefined
              }
            />
          )
        }
      </form.Field>
      <form.Field name="claimTypeId" validators={validator('claimTypeId')}>
        {(field) => (
          <FormSelect
            id="claim-type"
            label="Type de sinistre"
            required
            value={field.state.value}
            options={typeOptions}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={fieldErrors.claimTypeId ?? field.state.meta.errors[0]}
          />
        )}
      </form.Field>
      <form.Field name="occurredOn" validators={validator('occurredOn')}>
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="occurred-on">
              Date de survenance<span className="text-destructive">*</span>
            </Label>
            <Input
              id="occurred-on"
              inputMode="numeric"
              autoComplete="off"
              placeholder="jj/mm/aaaa"
              maxLength={10}
              value={field.state.value}
              onChange={(event) =>
                field.handleChange(maskFrDate(event.target.value))
              }
              onBlur={field.handleBlur}
              aria-invalid={
                !!(fieldErrors.occurredOn ?? field.state.meta.errors[0])
              }
            />
            {(fieldErrors.occurredOn ?? field.state.meta.errors[0]) ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {fieldErrors.occurredOn ?? field.state.meta.errors[0]}
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Format jj/mm/aaaa, par exemple 03/09/2026.
              </p>
            )}
          </div>
        )}
      </form.Field>
      <form.Field name="location" validators={validator('location')}>
        {(field) => (
          <FormField
            id="claim-location"
            label="Lieu"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={fieldErrors.location ?? field.state.meta.errors[0]}
          />
        )}
      </form.Field>
      <form.Field name="description" validators={validator('description')}>
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claim-description">
              Description<span className="text-destructive">*</span>
            </Label>
            <textarea
              id="claim-description"
              rows={5}
              maxLength={4000}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              className={cn(
                'rounded-[10px] border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                (fieldErrors.description ?? field.state.meta.errors[0]) &&
                  'border-destructive',
              )}
            />
            <span className="text-right text-xs text-muted-foreground">
              {field.state.value.length}/4000
            </span>
            {(fieldErrors.description ?? field.state.meta.errors[0]) && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {fieldErrors.description ?? field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>
    </FormDialog>
  )
}
