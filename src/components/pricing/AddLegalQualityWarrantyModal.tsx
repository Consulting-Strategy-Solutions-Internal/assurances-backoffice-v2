import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  PREMIUM_TYPES,
  createLegalQualityWarranty,
  getWarranties,
} from '#/services/pricing'
import type { PremiumType } from '#/services/pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { PREMIUM_TYPE_LABEL } from '#/components/pricing/labels'

const schema = z.object({
  warrantyId: z.string().min(1, 'La garantie est requise'),
  premiumType: z.string().min(1, 'Le type de prime est requis'),
  value: z
    .string()
    .min(1, 'La valeur est requise')
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
      'Valeur numérique invalide (≥ 0)',
    ),
})

type FieldName = keyof typeof schema.shape

const PREMIUM_TYPE_OPTIONS = PREMIUM_TYPES.map((t) => ({
  value: t,
  label: PREMIUM_TYPE_LABEL[t],
}))

const MANDATORY_OPTIONS = [
  { value: 'NON', label: 'Non' },
  { value: 'OUI', label: 'Oui' },
]

interface AddLegalQualityWarrantyModalProps {
  legalQualityId: number
  /** Warranty ids already linked to this legal quality, excluded from the picker. */
  existingWarrantyIds: number[]
  onClose: () => void
}

export function AddLegalQualityWarrantyModal({
  legalQualityId,
  existingWarrantyIds,
  onClose,
}: AddLegalQualityWarrantyModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: warrantiesData } = useQuery({
    queryKey: ['warranties', 'all'],
    queryFn: () => getWarranties(0, 200),
    retry: false,
  })

  const linked = new Set(existingWarrantyIds)
  const warrantyOptions = (warrantiesData?.content ?? [])
    .filter((w) => !linked.has(w.id))
    .map((w) => ({ value: String(w.id), label: w.name }))
  const noWarranties = !!warrantiesData && warrantyOptions.length === 0

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createLegalQualityWarranty,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['legal-quality-warranties', legalQualityId],
      })
      onClose()
    },
  })

  const fieldValidator = (name: FieldName) => ({
    onBlur: ({ value }: { value: string }) => {
      const r = schema.shape[name].safeParse(value)
      return r.success ? undefined : r.error.issues[0].message
    },
    onSubmit: ({ value }: { value: string }) => {
      const r = schema.shape[name].safeParse(value)
      return r.success ? undefined : r.error.issues[0].message
    },
  })

  const form = useForm({
    defaultValues: {
      warrantyId: '',
      premiumType: '',
      value: '',
      mandatory: 'NON',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const premiumType = value.premiumType as PremiumType
      const amount = Number(value.value)
      try {
        await mutateAsync({
          legalQualityId,
          warrantyId: Number(value.warrantyId),
          premiumType,
          rate: premiumType === 'POURCENTAGE' ? amount : undefined,
          flatAmount: premiumType === 'FORFAIT' ? amount : undefined,
          mandatory: value.mandatory === 'OUI',
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Cette garantie est déjà liée à cette qualité juridique.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Garantie"
      title="Lier une garantie"
      description="Rattachez une garantie du catalogue à cette qualité juridique."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Ajout…' : 'Lier la garantie'}
      pending={isPending}
      submitDisabled={noWarranties}
      error={serverError}
    >
      <form.Field name="warrantyId" validators={fieldValidator('warrantyId')}>
        {(field) => (
          <FormSelect
            id="warrantyId"
            label="Garantie"
            required
            disabled={noWarranties}
            placeholder="Sélectionner une garantie"
            value={field.state.value}
            options={warrantyOptions}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint={
              noWarranties
                ? 'Aucune garantie disponible — créez-en une dans le catalogue.'
                : undefined
            }
          />
        )}
      </form.Field>

      <form.Field name="premiumType" validators={fieldValidator('premiumType')}>
        {(field) => (
          <FormSelect
            id="premiumType"
            label="Type de prime"
            required
            placeholder="Sélectionner un type"
            value={field.state.value}
            options={PREMIUM_TYPE_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.premiumType}>
        {(premiumType) => (
          <form.Field name="value" validators={fieldValidator('value')}>
            {(field) => (
              <FormField
                id="value"
                label={
                  premiumType === 'FORFAIT'
                    ? 'Montant forfaitaire (FCFA)'
                    : 'Taux (%)'
                }
                type="number"
                required
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                error={field.state.meta.errors[0]}
              />
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="mandatory">
        {(field) => (
          <FormSelect
            id="mandatory"
            label="Obligatoire"
            value={field.state.value}
            options={MANDATORY_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            hint="La garantie est-elle incluse d'office dans le contrat ?"
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
