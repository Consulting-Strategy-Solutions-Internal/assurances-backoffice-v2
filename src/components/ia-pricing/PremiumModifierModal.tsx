import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  MODIFIER_TYPES,
  TRIGGER_TYPES,
  createPremiumModifier,
  updatePremiumModifier,
} from '#/services/ia-pricing'
import type {
  ModifierType,
  PremiumModifierResponse,
  TriggerType,
} from '#/services/ia-pricing'
import { apiErrorMessage } from '#/lib/api-error'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import {
  MODIFIER_RATE_LABEL,
  MODIFIER_TYPE_LABEL,
  TRIGGER_TYPE_LABEL,
} from '#/components/ia-pricing/labels'

const schema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  label: z.string().min(1, 'Le libellé est requis'),
  modifierType: z.string().min(1, 'Le type est requis'),
  triggerType: z.string().min(1, 'Le déclencheur est requis'),
  rate: z
    .string()
    .refine((v) => v.trim() !== '', 'La valeur est requise')
    .refine((v) => !Number.isNaN(Number(v)), 'Valeur numérique invalide'),
  minAge: z
    .string()
    .refine((v) => v.trim() !== '', "L'âge minimum est requis")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
      'Âge entier invalide (≥ 0)',
    ),
  maxAge: z
    .string()
    .refine((v) => v.trim() !== '', "L'âge maximum est requis")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
      'Âge entier invalide (≥ 0)',
    ),
})

type FieldName = keyof typeof schema.shape

const MODIFIER_TYPE_OPTIONS = MODIFIER_TYPES.map((t) => ({
  value: t,
  label: MODIFIER_TYPE_LABEL[t],
}))
const TRIGGER_TYPE_OPTIONS = TRIGGER_TYPES.map((t) => ({
  value: t,
  label: TRIGGER_TYPE_LABEL[t],
}))
const ACTIVE_OPTIONS = [
  { value: 'OUI', label: 'Actif' },
  { value: 'NON', label: 'Inactif' },
]

interface PremiumModifierModalProps {
  riskClassId: number
  /** When provided, the modal edits this modifier instead of creating one. */
  modifier?: PremiumModifierResponse
  onClose: () => void
}

export function PremiumModifierModal({
  riskClassId,
  modifier,
  onClose,
}: PremiumModifierModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = !!modifier

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: {
      code: string
      label: string
      modifierType: ModifierType
      rate: number
      triggerType: TriggerType
      minAge: number
      maxAge: number
      isActive: boolean
    }) =>
      isEdit
        ? updatePremiumModifier(modifier.id, data)
        : createPremiumModifier({ ...data, riskClassId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['premium-modifiers', riskClassId],
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
      code: modifier?.code ?? '',
      label: modifier?.label ?? '',
      modifierType: modifier?.modifierType ?? '',
      rate: modifier ? String(modifier.rate) : '',
      triggerType: modifier?.triggerType ?? '',
      minAge: modifier ? String(modifier.minAge) : '',
      maxAge: modifier ? String(modifier.maxAge) : '',
      isActive: modifier ? (modifier.isActive ? 'OUI' : 'NON') : 'OUI',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const minAge = Number(value.minAge)
      const maxAge = Number(value.maxAge)
      if (maxAge < minAge) {
        setServerError("L'âge maximum doit être supérieur ou égal au minimum.")
        return
      }
      try {
        await mutateAsync({
          code: value.code,
          label: value.label,
          modifierType: value.modifierType as ModifierType,
          rate: Number(value.rate),
          triggerType: value.triggerType as TriggerType,
          minAge,
          maxAge,
          isActive: value.isActive === 'OUI',
        })
      } catch (error) {
        setServerError(
          apiErrorMessage(error, {
            conflict: 'Un modificateur avec ce code existe déjà.',
          }),
        )
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Modificateur de prime"
      title={isEdit ? 'Modifier le modificateur' : 'Nouveau modificateur'}
      description="Surprime, remise ou coefficient appliqué au calcul de la prime."
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'
      }
      pending={isPending}
      error={serverError}
    >
      <form.Field name="code" validators={fieldValidator('code')}>
        {(field) => (
          <FormField
            id="code"
            label="Code"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="Code interne (ex. SURPRIME_SENIOR)."
          />
        )}
      </form.Field>

      <form.Field name="label" validators={fieldValidator('label')}>
        {(field) => (
          <FormField
            id="label"
            label="Libellé"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field
        name="modifierType"
        validators={fieldValidator('modifierType')}
      >
        {(field) => (
          <FormSelect
            id="modifierType"
            label="Type"
            required
            placeholder="Sélectionner un type"
            value={field.state.value}
            options={MODIFIER_TYPE_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.modifierType}>
        {(modifierType) => (
          <form.Field name="rate" validators={fieldValidator('rate')}>
            {(field) => (
              <FormField
                id="rate"
                label={
                  modifierType
                    ? MODIFIER_RATE_LABEL[modifierType as ModifierType]
                    : 'Valeur'
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

      <form.Field name="triggerType" validators={fieldValidator('triggerType')}>
        {(field) => (
          <FormSelect
            id="triggerType"
            label="Déclencheur"
            required
            placeholder="Sélectionner un déclencheur"
            value={field.state.value}
            options={TRIGGER_TYPE_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
            hint="« Âge » applique le modificateur sur une tranche d'âge ; « Manuel » à la demande."
          />
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-3">
        <form.Field name="minAge" validators={fieldValidator('minAge')}>
          {(field) => (
            <FormField
              id="minAge"
              label="Âge minimum"
              type="number"
              required
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Field name="maxAge" validators={fieldValidator('maxAge')}>
          {(field) => (
            <FormField
              id="maxAge"
              label="Âge maximum"
              type="number"
              required
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>
      </div>

      <form.Field name="isActive">
        {(field) => (
          <FormSelect
            id="isActive"
            label="Statut"
            value={field.state.value}
            options={ACTIVE_OPTIONS}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
    </FormDialog>
  )
}
