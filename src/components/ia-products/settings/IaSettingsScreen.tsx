import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TriangleAlert, PackageX } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { EmptyState } from '#/components/layout/EmptyState'
import { InfoList, InfoRow } from '#/components/layout/InfoList'
import { SectionCard } from '#/components/layout/SectionCard'
import { isForbidden } from '../shared/screen-kit'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { FormField } from '#/components/forms/FormField'
import { useUnsavedChangesGuard } from '#/components/forms/unsaved-changes'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { Switch } from '#/components/ia-products/shared/Switch'
import { apiErrorMessage } from '#/lib/api-error'
import { parseIaError } from '#/lib/ia-errors'
import { findIaProduct, getProduct, updateProduct } from '#/services/products'
import type { ProductResponse } from '#/services/products'
import {
  SETTINGS_QUERY_KEY,
  buildUpdateProductPayload,
  parseSettingsForm,
  productToFormValues,
  validateMaxAge,
  validateMaxDiscountRate,
  validateMinAge,
  validateSurchargeRate,
} from './logic'
import type { SettingsFormValues } from './logic'

const FORM_FIELDS = [
  'ageSurchargeMinAge',
  'ageSurchargeMaxAge',
  'ageSurchargeRate',
  'discountEnabled',
  'maxDiscountRate',
]

function SettingsForm({ product }: { product: ProductResponse }) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('product:write')
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      // Le PUT remplace tout : on relit le produit juste avant pour ne pas
      // écraser une modification faite entre-temps (ex. commissionRate).
      const fresh = await getProduct(product.id)
      const payload = buildUpdateProductPayload(
        fresh,
        parseSettingsForm(values),
      )
      return updateProduct(fresh.id, payload)
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, saved)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Réglages enregistrés.')
    },
  })

  const form = useForm({
    defaultValues: productToFormValues(product),
    onSubmit: async ({ value }) => {
      setServerFields({})
      setServerError(null)
      try {
        await mutateAsync(value)
      } catch (error) {
        const parsed = parseIaError(error)
        setServerFields(parsed.fields)
        const orphan = Object.entries(parsed.fields)
          .filter(([key]) => !FORM_FIELDS.includes(key))
          .map(([, message]) => message)
        setServerError(parsed.message ?? (orphan.join(' ') || null))
      }
    },
  })

  const fieldError = (name: string, local: string | undefined) =>
    local ?? serverFields[name]

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)
  const discountEnabled = useStore(form.store, (s) => s.values.discountEnabled)
  const { dialog: guardDialog } = useUnsavedChangesGuard(dirty)

  return (
    <form
      className="flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      {guardDialog}
      <div className="grid items-start gap-[18px] lg:grid-cols-2">
        <SectionCard
          className="lg:h-full"
          title="Majoration liée à l’âge"
          description="S’applique aux assurés dont l’âge est dans la tranche ci-dessous."
          bodyClassName="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field
              name="ageSurchargeMinAge"
              validators={{
                onBlur: ({ value }) => validateMinAge(value),
                onSubmit: ({ value }) => validateMinAge(value),
              }}
            >
              {(field) => (
                <FormField
                  id="ageSurchargeMinAge"
                  label="Âge minimum"
                  type="number"
                  min={0}
                  max={65}
                  step={1}
                  required
                  disabled={!canWrite}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  error={fieldError(
                    'ageSurchargeMinAge',
                    field.state.meta.errors[0],
                  )}
                />
              )}
            </form.Field>
            <form.Field
              name="ageSurchargeMaxAge"
              validators={{
                onBlur: ({ value, fieldApi }) =>
                  validateMaxAge(
                    value,
                    fieldApi.form.getFieldValue('ageSurchargeMinAge'),
                  ),
                onSubmit: ({ value, fieldApi }) =>
                  validateMaxAge(
                    value,
                    fieldApi.form.getFieldValue('ageSurchargeMinAge'),
                  ),
              }}
            >
              {(field) => (
                <FormField
                  id="ageSurchargeMaxAge"
                  label="Âge maximum"
                  type="number"
                  min={0}
                  max={65}
                  step={1}
                  required
                  disabled={!canWrite}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  error={fieldError(
                    'ageSurchargeMaxAge',
                    field.state.meta.errors[0],
                  )}
                />
              )}
            </form.Field>
          </div>
          <form.Field
            name="ageSurchargeRate"
            validators={{
              onBlur: ({ value }) => validateSurchargeRate(value),
              onSubmit: ({ value }) => validateSurchargeRate(value),
            }}
          >
            {(field) => (
              <FormField
                id="ageSurchargeRate"
                label="Taux de majoration (%)"
                type="text"
                required
                disabled={!canWrite}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                hint="0 désactive la majoration."
                error={fieldError(
                  'ageSurchargeRate',
                  field.state.meta.errors[0],
                )}
              />
            )}
          </form.Field>
        </SectionCard>

        <SectionCard
          className="lg:h-full"
          title="Réduction"
          description="Autorise les vendeurs à accorder une réduction sur la prime."
          bodyClassName="flex flex-col gap-4"
        >
          <form.Field name="discountEnabled">
            {(field) => (
              <div className="flex items-center gap-3">
                <Switch
                  id="discountEnabled"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  disabled={!canWrite}
                />
                <Label htmlFor="discountEnabled" className="text-[13px]">
                  Réduction autorisée
                </Label>
              </div>
            )}
          </form.Field>
          <form.Field
            name="maxDiscountRate"
            validators={{
              onBlur: ({ value }) => validateMaxDiscountRate(value),
              onSubmit: ({ value }) => validateMaxDiscountRate(value),
            }}
          >
            {(field) => (
              <FormField
                id="maxDiscountRate"
                label="Réduction maximale (%)"
                type="text"
                disabled={!canWrite || !discountEnabled}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                hint={
                  discountEnabled
                    ? 'Laissez vide pour ne fixer aucun plafond.'
                    : 'Activez « Réduction autorisée » pour définir un plafond.'
                }
                error={fieldError(
                  'maxDiscountRate',
                  field.state.meta.errors[0],
                )}
              />
            )}
          </form.Field>
        </SectionCard>
      </div>

      {serverError && (
        <p
          role="alert"
          className="rounded-lg bg-[#fbe9e9] px-4 py-3 text-[13px] font-medium text-[#c0392b]"
        >
          {serverError}
        </p>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-5 py-3 shadow-[0_6px_24px_rgba(15,30,60,0.12)] backdrop-blur">
        <p
          aria-live="polite"
          className={
            dirty
              ? 'flex items-center gap-2 text-[13px] font-semibold text-[#8a6600]'
              : 'text-[13px] text-muted-foreground'
          }
        >
          {dirty && (
            <span aria-hidden className="size-2 rounded-full bg-[#ffc61e]" />
          )}
          {dirty ? 'Modifications non enregistrées' : 'Aucune modification'}
        </p>
        <div
          className="flex items-center gap-2.5"
          title={
            canWrite
              ? undefined
              : 'Vous n’avez pas la permission requise (product:write).'
          }
        >
          {dirty && (
            <Button
              type="button"
              variant="outline"
              className="rounded-[11px]"
              disabled={isPending}
              onClick={() => {
                form.reset()
                setServerFields({})
                setServerError(null)
              }}
            >
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            className="rounded-[11px]"
            disabled={!canWrite || !dirty || isPending}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export function IaSettingsScreen() {
  const {
    data: product,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => findIaProduct('IA_STANDARD'),
  })

  if (isPending)
    return (
      <div className="flex flex-col gap-[18px]">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-[18px] lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )

  if (isError)
    return (
      <EmptyState
        variant="card"
        icon={TriangleAlert}
        tone="error"
        title={
          isForbidden(error)
            ? 'Accès refusé.'
            : 'Impossible de charger les réglages.'
        }
        description={apiErrorMessage(error)}
        action={
          <Button
            variant="outline"
            className="rounded-[11px]"
            onClick={() => void refetch()}
          >
            Réessayer
          </Button>
        }
      />
    )

  // `findIaProduct` renvoie null quand le produit n'existe pas.
  if (!product)
    return (
      <EmptyState
        variant="card"
        icon={PackageX}
        title="Le produit IA Standard est introuvable."
        description="Vérifiez qu’il est configuré côté serveur."
      />
    )

  return (
    <div className="flex flex-col gap-[18px]">
      <SectionCard
        title="Produit"
        description="Identification du produit paramétré sur cet écran."
      >
        <InfoList columns={2}>
          <InfoRow label="Produit">{product.label}</InfoRow>
          <InfoRow label="Code NSIA">
            {String(product.productCode)}
            <span
              className="ml-2 text-[11.5px] font-normal text-muted-foreground"
              title="Identifiant technique du produit"
            >
              ({product.code})
            </span>
          </InfoRow>
        </InfoList>
      </SectionCard>
      <SettingsForm key={product.updatedAt} product={product} />
    </div>
  )
}
