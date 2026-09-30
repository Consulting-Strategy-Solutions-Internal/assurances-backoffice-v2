import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { orphanBannerMessage, parseIaError } from '#/lib/ia-errors'
import {
  ACCESSORY_PRODUCT_LABELS,
  ACCESSORY_PRODUCTS,
  accessoryProductLabel,
  createAccessory,
  updateAccessory,
} from '#/services/accessories'
import type {
  AccessoryProduct,
  AccessoryResponse,
  CreateAccessoryPayload,
} from '#/services/accessories'

const PRODUCT_OPTIONS = ACCESSORY_PRODUCTS.map((value) => ({
  value,
  label: ACCESSORY_PRODUCT_LABELS[value],
}))

function isAccessoryProduct(value: string): value is AccessoryProduct {
  return (ACCESSORY_PRODUCTS as readonly string[]).includes(value)
}

type FieldName = 'minPremium' | 'maxPremium' | 'amount'

const FIELDS: {
  name: FieldName
  label: string
  hint?: string
}[] = [
  {
    name: 'minPremium',
    label: 'Prime nette minimale (FCFA)',
  },
  {
    name: 'maxPremium',
    label: 'Prime nette maximale (FCFA)',
    hint: 'Bornes incluses.',
  },
  { name: 'amount', label: 'Frais d’accessoires (FCFA)' },
]

function validateAmount(raw: string): string | undefined {
  if (raw.trim() === '') return 'Ce champ est requis.'
  const n = Number(raw)
  if (Number.isNaN(n)) return 'Saisissez un nombre valide.'
  if (n < 0) return 'La valeur doit être supérieure ou égale à 0.'
  return undefined
}

interface AccessoryFormDialogProps {
  /** Produit de l'écran : pré-rempli à la création. */
  product: AccessoryProduct
  /** Absent = création. */
  accessory?: AccessoryResponse
  onClose: () => void
}

export function AccessoryFormDialog({
  product,
  accessory,
  onClose,
}: AccessoryFormDialogProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CreateAccessoryPayload) =>
      accessory
        ? updateAccessory(accessory.id, payload)
        : createAccessory(payload),
    onSuccess: () => {
      // Tous les produits : une tranche déplacée quitte une liste pour une autre.
      void queryClient.invalidateQueries({ queryKey: ['accessories'] })
      toast.success(accessory ? 'Tranche modifiée.' : 'Tranche ajoutée.')
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      product: accessory?.product ?? (product as string),
      minPremium: accessory ? String(accessory.minPremium) : '',
      maxPremium: accessory ? String(accessory.maxPremium) : '',
      amount: accessory ? String(accessory.amount) : '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setServerFields({})
      try {
        await mutateAsync({
          product: isAccessoryProduct(value.product) ? value.product : product,
          minPremium: Number(value.minPremium),
          maxPremium: Number(value.maxPremium),
          amount: Number(value.amount),
        })
      } catch (error) {
        const parsed = parseIaError(error)
        setServerFields(parsed.fields)
        setServerError(
          orphanBannerMessage(parsed, [
            'product',
            ...FIELDS.map((f) => f.name),
          ]),
        )
      }
    },
  })

  const validate =
    (name: FieldName) =>
    ({ value }: { value: string }) => {
      const base = validateAmount(value)
      if (base) return base
      if (name === 'maxPremium') {
        const min = form.getFieldValue('minPremium')
        if (validateAmount(min) === undefined && Number(value) < Number(min)) {
          return 'Le maximum doit être supérieur ou égal au minimum.'
        }
      }
      return undefined
    }

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow={`Accessoires — ${ACCESSORY_PRODUCT_LABELS[product]}`}
      title={accessory ? 'Modifier la tranche' : 'Ajouter une tranche'}
      description="Frais d’accessoires appliqués selon la tranche de prime nette."
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        isPending
          ? 'Enregistrement…'
          : accessory
            ? 'Enregistrer'
            : 'Ajouter la tranche'
      }
      pending={isPending}
      error={serverError}
    >
      <form.Field name="product">
        {(field) => (
          <FormSelect
            id="product"
            label="Produit"
            required
            value={field.state.value}
            options={PRODUCT_OPTIONS}
            onChange={(v) => {
              setServerFields((prev) => {
                if (!('product' in prev)) return prev
                const { product: _removed, ...rest } = prev
                return rest
              })
              field.handleChange(v)
            }}
            hint={
              accessory && field.state.value !== accessory.product
                ? `La tranche quittera ${accessoryProductLabel(accessory.product)}.`
                : undefined
            }
            error={serverFields.product}
          />
        )}
      </form.Field>
      {FIELDS.map(({ name, label, hint }) => (
        <form.Field
          key={name}
          name={name}
          validators={{ onBlur: validate(name), onSubmit: validate(name) }}
        >
          {(field) => (
            <FormField
              id={name}
              label={label}
              type="number"
              min={0}
              step="any"
              required
              hint={hint}
              value={field.state.value}
              onChange={(v) => {
                setServerFields((prev) => {
                  if (!(name in prev)) return prev
                  const { [name]: _removed, ...rest } = prev
                  return rest
                })
                field.handleChange(v)
              }}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0] ?? serverFields[name]}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
