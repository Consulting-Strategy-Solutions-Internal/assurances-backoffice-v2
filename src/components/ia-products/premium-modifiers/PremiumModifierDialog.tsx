import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { Label } from '#/components/ui/label'
import { orphanBannerMessage, parseIaError } from '#/lib/ia-errors'
import {
  MODIFIER_TYPES,
  createPremiumModifier,
  updatePremiumModifier,
} from '#/services/ia-standard'
import type { PremiumModifierResponse } from '#/services/ia-standard'
import { Switch } from '../shared/Switch'
import { validateRateInput } from '../premium-rates/rate-schema'
import {
  MODIFIER_CODE_HINT,
  MODIFIER_CODE_MAX,
  MODIFIER_TYPE_LABELS,
  buildModifierPayload,
  modifierCodeSchema,
  normalizeModifierCode,
  suggestModifierCode,
} from './modifier-payload'

const labelSchema = z
  .string()
  .trim()
  .min(1, 'Le libellé est requis.')
  .max(255, '255 caractères maximum.')

function firstError(schema: z.ZodType, value: string): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0].message
}

const MODIFIER_FORM_FIELDS = [
  'code',
  'label',
  'modifierType',
  'rate',
  'isActive',
]

const TYPE_OPTIONS = MODIFIER_TYPES.map((t) => ({
  value: t,
  label: MODIFIER_TYPE_LABELS[t],
}))

interface PremiumModifierDialogProps {
  modifier: PremiumModifierResponse | null
  onClose: () => void
}

export function PremiumModifierDialog({
  modifier,
  onClose,
}: PremiumModifierDialogProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  // En création, le code suit le libellé tant que l'utilisateur ne l'a pas saisi.
  const [codeEdited, setCodeEdited] = useState(modifier !== null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: ReturnType<typeof buildModifierPayload>) =>
      modifier
        ? updatePremiumModifier(modifier.id, payload)
        : createPremiumModifier(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'premium-modifiers'],
      })
      toast.success(modifier ? 'Règle mise à jour.' : 'Règle créée.')
      onClose()
    },
  })

  // Un code existant non conforme reste modifiable tant qu'on n'y touche pas.
  const validateCode = (value: string) =>
    modifier && value === modifier.code
      ? undefined
      : firstError(modifierCodeSchema, value)

  const form = useForm({
    defaultValues: {
      code: modifier?.code ?? '',
      label: modifier?.label ?? '',
      modifierType: modifier?.modifierType ?? 'SURCHARGE',
      rate: modifier ? String(modifier.rate) : '',
      isActive: modifier?.isActive ?? true,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      setServerFields({})
      try {
        await mutateAsync(buildModifierPayload(value))
      } catch (err) {
        const parsed = parseIaError(err)
        setServerFields(parsed.fields)
        setServerError(orphanBannerMessage(parsed, MODIFIER_FORM_FIELDS))
      }
    },
  })

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="Majorations & réductions"
      title={modifier ? 'Modifier la règle' : 'Nouvelle majoration / réduction'}
      description="Les devis déjà émis conservent leur copie : modifier ou supprimer n'a pas d'effet sur eux."
      onSubmit={() => void form.handleSubmit()}
      submitLabel={
        isPending ? 'Enregistrement…' : modifier ? 'Enregistrer' : 'Créer'
      }
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="code"
        validators={{
          onBlur: ({ value }) => validateCode(value),
          onSubmit: ({ value }) => validateCode(value),
        }}
      >
        {(field) => (
          <FormField
            id="modifier-code"
            label="Code"
            required
            value={field.state.value}
            onChange={(v) => {
              setCodeEdited(v !== '')
              field.handleChange(
                normalizeModifierCode(v).slice(0, MODIFIER_CODE_MAX),
              )
            }}
            onBlur={field.handleBlur}
            hint={MODIFIER_CODE_HINT}
            error={field.state.meta.errors[0] ?? serverFields.code}
          />
        )}
      </form.Field>

      <form.Field
        name="label"
        validators={{
          onBlur: ({ value }) => firstError(labelSchema, value),
          onSubmit: ({ value }) => firstError(labelSchema, value),
        }}
      >
        {(field) => (
          <FormField
            id="modifier-label"
            label="Libellé"
            required
            value={field.state.value}
            onChange={(v) => {
              field.handleChange(v)
              if (!codeEdited) {
                form.setFieldValue('code', suggestModifierCode(v))
                // Efface / met à jour une erreur affichée sur le code vide.
                if (form.getFieldMeta('code')?.isTouched) {
                  void form.validateField('code', 'blur')
                }
              }
            }}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0] ?? serverFields.label}
          />
        )}
      </form.Field>

      <form.Field name="modifierType">
        {(field) => (
          <FormSelect
            id="modifier-type"
            label="Type"
            required
            value={field.state.value}
            options={TYPE_OPTIONS}
            onChange={(v) => {
              const type = MODIFIER_TYPES.find((t) => t === v)
              if (type) field.handleChange(type)
            }}
            error={serverFields.modifierType}
          />
        )}
      </form.Field>

      <form.Field
        name="rate"
        validators={{
          onBlur: ({ value }) => validateRateInput(value),
          onSubmit: ({ value }) => validateRateInput(value),
        }}
      >
        {(field) => (
          <FormField
            id="modifier-rate"
            label="Taux (%)"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            hint="Entre 0,01 et 100 %, 2 décimales maximum."
            error={field.state.meta.errors[0] ?? serverFields.rate}
          />
        )}
      </form.Field>

      <form.Field name="isActive">
        {(field) => (
          <div className="flex items-center gap-3">
            <Switch
              id="modifier-active"
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
            <Label htmlFor="modifier-active" className="text-[13px]">
              Active
            </Label>
            {serverFields.isActive && (
              <p role="alert" className="text-[12px] text-destructive">
                {serverFields.isActive}
              </p>
            )}
          </div>
        )}
      </form.Field>
    </FormDialog>
  )
}
