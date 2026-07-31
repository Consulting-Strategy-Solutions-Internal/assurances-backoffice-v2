import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { mapClaimError } from '#/lib/claims'
import { getProducts } from '#/services/products'
import {
  claimTypesKeys,
  createClaimType,
  updateClaimType,
} from '#/services/claim-types'
import type { ClaimTypeResponse } from '#/services/claim-types'

const schema = z.object({
  productId: z.string().min(1, 'Le produit est requis'),
  name: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(100, '100 caractères maximum'),
  description: z.string().max(255, '255 caractères maximum'),
})
type FieldName = keyof typeof schema.shape

export function ClaimTypeDialog({
  claimType,
  onClose,
}: {
  claimType?: ClaimTypeResponse
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [active, setActive] = useState(claimType?.active ?? true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | undefined>()
  const { data: products } = useQuery({
    queryKey: ['products', 'claim-type-picker'],
    queryFn: () => getProducts(0, 100),
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: (value: {
      productId: number
      name: string
      description?: string
      active: boolean
    }) =>
      claimType
        ? updateClaimType(claimType.id, {
            name: value.name,
            description: value.description,
            active: value.active,
          })
        : createClaimType(value),
  })
  const form = useForm({
    defaultValues: {
      productId: claimType ? String(claimType.productId) : '',
      name: claimType?.name ?? '',
      description: claimType?.description ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setNameError(undefined)
      try {
        await mutation.mutateAsync({
          productId: Number(value.productId),
          name: value.name.trim(),
          description: value.description.trim() || undefined,
          active,
        })
        await queryClient.invalidateQueries({ queryKey: claimTypesKeys.all })
        onClose()
      } catch (error) {
        const mapped = mapClaimError(error)
        if (mapped.kind === 'conflict') setNameError(mapped.message)
        else if (mapped.kind === 'validation' && mapped.fields.name)
          setNameError(mapped.fields.name)
        else setServerError(mapped.message)
      }
    },
  })
  const validator = (name: FieldName) => ({
    onBlur: ({ value }: { value: string }) => {
      const parsed = schema.shape[name].safeParse(value)
      return parsed.success ? undefined : parsed.error.issues[0].message
    },
    onSubmit: ({ value }: { value: string }) => {
      const parsed = schema.shape[name].safeParse(value)
      return parsed.success ? undefined : parsed.error.issues[0].message
    },
  })
  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Catalogue sinistres"
      title={claimType ? 'Modifier le type' : 'Nouveau type de sinistre'}
      description={
        claimType
          ? 'Le produit associé ne peut pas être modifié.'
          : 'Associez ce type à un produit.'
      }
      onSubmit={() => form.handleSubmit()}
      submitLabel={mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={mutation.isPending}
      error={serverError}
    >
      <form.Field name="productId" validators={validator('productId')}>
        {(field) => (
          <FormSelect
            id="claim-type-product"
            label="Produit"
            required
            disabled={!!claimType}
            value={field.state.value}
            options={(products?.content ?? []).map((product) => ({
              value: String(product.id),
              label: product.label,
            }))}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>
      <form.Field name="name" validators={validator('name')}>
        {(field) => (
          <FormField
            id="claim-type-name"
            label="Nom"
            required
            value={field.state.value}
            onChange={(value) => {
              field.handleChange(value)
              setNameError(undefined)
            }}
            onBlur={field.handleBlur}
            error={nameError ?? field.state.meta.errors[0]}
          />
        )}
      </form.Field>
      <form.Field name="description" validators={validator('description')}>
        {(field) => (
          <FormField
            id="claim-type-description"
            label="Description"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>
      <div className="flex items-center gap-2">
        <Checkbox
          id="claim-type-active"
          checked={active}
          onCheckedChange={(checked) => setActive(checked === true)}
        />
        <Label htmlFor="claim-type-active">
          Type actif et disponible pour les nouvelles déclarations
        </Label>
      </div>
    </FormDialog>
  )
}
