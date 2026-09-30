import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import {
  PREMIUM_TYPE_LABELS,
  buildLineWarrantyPayload,
  lineFieldSpec,
  lineFieldsFor,
  validateDecimalInput,
} from '#/lib/mrh-tariff'
import type { LineField } from '#/lib/mrh-tariff'
import {
  getLegalQualityWarranty,
  updateLegalQualityWarranty,
} from '#/services/mrh-tariff'
import type {
  LegalQualityResponse,
  LegalQualityWarrantyResponse,
  WarrantyResponse,
} from '#/services/mrh-tariff'
import { MRH_KEYS, splitServerError, writeBack } from './grid-kit'

const ALL_LINE_FIELDS = ['rate', 'flatAmount', 'capitalShare', 'mandatory']

type LineValues = Record<LineField, string> & { mandatory: boolean }

export function LineWarrantyDialog({
  line,
  legalQuality,
  warranty,
  onClose,
}: {
  line: LegalQualityWarrantyResponse
  legalQuality: LegalQualityResponse
  warranty: WarrantyResponse | undefined
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFields, setServerFields] = useState<Record<string, string>>({})
  const modeFields = lineFieldsFor(line.premiumType)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: LineValues) => {
      await updateLegalQualityWarranty(
        line.id,
        buildLineWarrantyPayload(line, values),
      )
      return getLegalQualityWarranty(line.id)
    },
    onSuccess: (fresh) => {
      writeBack(queryClient, MRH_KEYS.lines, fresh)
      toast.success('Garantie mise à jour.')
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      rate: line.rate == null ? '' : String(line.rate),
      flatAmount: line.flatAmount == null ? '' : String(line.flatAmount),
      capitalShare: line.capitalShare == null ? '' : String(line.capitalShare),
      mandatory: line.mandatory,
    } satisfies LineValues,
    onSubmit: async ({ value }) => {
      setServerError(null)
      setServerFields({})
      try {
        await mutateAsync(value)
      } catch (err) {
        // Un champ hors mode refusé par le serveur part en bandeau.
        const shown = [...modeFields, 'mandatory']
        const split = splitServerError(err, ALL_LINE_FIELDS)
        const visible = Object.fromEntries(
          Object.entries(split.fields).filter(([k]) => shown.includes(k)),
        )
        const hidden = Object.entries(split.fields)
          .filter(([k]) => !shown.includes(k))
          .map(([k, msg]) => `Champ « ${k} » : ${msg}`)
        setServerFields(visible)
        setServerError(
          [split.banner, ...hidden].filter(Boolean).join(' ') || null,
        )
      }
    },
  })

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)
  const name = warranty?.name ?? `Garantie #${line.warrantyId}`

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow={`${legalQuality.name} · ${PREMIUM_TYPE_LABELS[line.premiumType]}`}
      title={name}
      description="Le mode de calcul, la situation et la garantie sont fixés par la grille NSIA."
      onSubmit={() => void form.handleSubmit()}
      submitLabel={isPending ? 'Enregistrement…' : 'Enregistrer'}
      pending={isPending}
      error={serverError}
    >
      {modeFields.map((fieldName) => {
        const spec = lineFieldSpec(line.premiumType, fieldName)
        const validate = ({ value }: { value: string }) =>
          validateDecimalInput(value, { max: spec.max })
        return (
          <form.Field
            key={fieldName}
            name={fieldName}
            validators={{ onBlur: validate, onSubmit: validate }}
          >
            {(field) => (
              <FormField
                id={`line-${fieldName}`}
                label={spec.label}
                required
                value={field.state.value}
                onChange={(v) => {
                  setServerFields((prev) => {
                    if (!(fieldName in prev)) return prev
                    const { [fieldName]: _removed, ...rest } = prev
                    return rest
                  })
                  field.handleChange(v)
                }}
                onBlur={field.handleBlur}
                hint={spec.hint}
                error={field.state.meta.errors[0] ?? serverFields[fieldName]}
              />
            )}
          </form.Field>
        )
      })}
      <form.Field name="mandatory">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="line-mandatory"
                checked={field.state.value}
                onCheckedChange={(checked) =>
                  field.handleChange(checked === true)
                }
              />
              <Label htmlFor="line-mandatory" className="text-[13px]">
                Garantie obligatoire
              </Label>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Toujours incluse dans le devis ; sinon, le souscripteur la coche
              s’il la veut.
            </p>
            {serverFields.mandatory && (
              <p className="text-[12px] text-destructive">
                {serverFields.mandatory}
              </p>
            )}
          </div>
        )}
      </form.Field>
    </FormDialog>
  )
}
