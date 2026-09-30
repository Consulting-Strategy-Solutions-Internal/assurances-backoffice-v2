import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Calculator } from 'lucide-react'
import { toast } from 'sonner'
import {
  createFormula,
  deactivateFormula,
  updateFormula,
} from '#/services/ia-for-all'
import type { FormulaResponse } from '#/services/ia-for-all'
import { IA_ERROR_MESSAGES, parseIaError } from '#/lib/ia-errors'
import { formatFcfa } from '#/lib/utils'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { Button } from '#/components/ui/button'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import {
  AMOUNT_LABELS,
  buildFormulaPayload,
  copyFormValues,
  EMPTY_FORM_VALUES,
  formulaToFormValues,
  hasPremiumMismatch,
  premiumSum,
  validateField,
} from './formula-logic'
import type { AmountField, FormulaFormValues } from './formula-logic'

interface FormulaDialogProps {
  /** Formule éditée ; absente = création. */
  formula?: FormulaResponse
  /** Valeurs de départ en création (ex. copie d'une formule utilisée). */
  initialValues?: FormulaFormValues
  onClose: () => void
  /** Demande l'ouverture d'une création pré-remplie. */
  onCopy: (values: FormulaFormValues) => void
}

const GUARANTEE_FIELDS: AmountField[] = [
  'deathCapital',
  'permanentDisabilityCapital',
  'medicalExpenses',
  'dailyAllowance',
]
const PREMIUM_FIELDS: AmountField[] = [
  'netPremium',
  'fees',
  'tax',
  'grossPremium',
]

export function FormulaDialog({
  formula,
  initialValues,
  onClose,
  onCopy,
}: FormulaDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = formula !== undefined
  const [serverError, setServerError] = useState<string | null>(null)
  const [inUse, setInUse] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ia-for-all', 'formulas'] })

  const save = useMutation({
    mutationFn: (values: FormulaFormValues) =>
      formula
        ? updateFormula(formula.id, buildFormulaPayload(values, 'edit'))
        : createFormula(buildFormulaPayload(values, 'create')),
    onSuccess: () => {
      void invalidate()
      toast.success(isEdit ? 'Formule mise à jour.' : 'Formule créée.')
      onClose()
    },
  })

  const deactivate = useMutation({
    mutationFn: () => deactivateFormula(formula?.id ?? 0),
    onSuccess: () => {
      void invalidate()
      toast.success('Formule désactivée.')
      onClose()
    },
    onError: (err) => {
      setInUse(false)
      setServerError(parseIaError(err).message)
    },
  })

  const form = useForm({
    defaultValues:
      initialValues ??
      (formula ? formulaToFormValues(formula) : EMPTY_FORM_VALUES),
    onSubmit: async ({ value }) => {
      setServerError(null)
      setInUse(false)
      try {
        await save.mutateAsync(value)
      } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined
        const formulaInUse =
          isEdit &&
          status === 422 &&
          parseIaError(error).fields.formulaId ===
            IA_ERROR_MESSAGES.FORMULA_IN_USE
        if (formulaInUse) {
          setInUse(true)
          return
        }
        const parsed = parseIaError(error)
        if (status === 409 && !('label' in parsed.fields)) {
          form.setFieldMeta('label', (m) => ({
            ...m,
            errorMap: {
              ...m.errorMap,
              onSubmit: IA_ERROR_MESSAGES.FORMULA_LABEL_ALREADY_EXISTS,
            },
          }))
          return
        }
        const known = Object.keys(EMPTY_FORM_VALUES)
        const unmapped: string[] = []
        for (const [name, message] of Object.entries(parsed.fields)) {
          if (known.includes(name)) {
            form.setFieldMeta(name as keyof FormulaFormValues, (m) => ({
              ...m,
              errorMap: { ...m.errorMap, onSubmit: message },
            }))
          } else unmapped.push(message)
        }
        setServerError(
          parsed.message ?? (unmapped.length ? unmapped.join(' ') : null),
        )
      }
    },
  })

  const pending = save.isPending || deactivate.isPending

  const renderField = (name: AmountField) => (
    <form.Field
      key={name}
      name={name}
      validators={{
        onBlur: ({ value }) => validateField(name, value),
        onSubmit: ({ value }) => validateField(name, value),
      }}
    >
      {(field) => (
        <FormField
          id={name}
          label={`${AMOUNT_LABELS[name]} (FCFA)`}
          type="text"
          required
          value={field.state.value}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          error={field.state.meta.errors[0]}
        />
      )}
    </form.Field>
  )

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)

  return (
    <FormDialog
      size="wide"
      dirty={dirty}
      onClose={onClose}
      eyebrow="IA Pour Tous"
      title={isEdit ? 'Modifier la formule' : 'Nouvelle formule'}
      description={
        isEdit
          ? 'Le statut de la formule reste inchangé.'
          : 'La formule est créée active.'
      }
      onSubmit={() => form.handleSubmit()}
      submitLabel={
        save.isPending
          ? 'Enregistrement…'
          : isEdit
            ? 'Enregistrer'
            : 'Créer la formule'
      }
      pending={pending}
      error={serverError}
    >
      {inUse && formula && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg bg-destructive/10 px-3 py-3 text-[13px] text-destructive"
        >
          <p className="font-medium">{IA_ERROR_MESSAGES.FORMULA_IN_USE}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => deactivate.mutate()}
              className="rounded-[10px] bg-background text-foreground"
            >
              {deactivate.isPending
                ? 'Désactivation…'
                : 'Désactiver cette formule'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => onCopy(copyFormValues(form.state.values))}
              className="rounded-[10px]"
            >
              Créer une nouvelle formule
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form.Field
          name="label"
          validators={{
            onBlur: ({ value }) => validateField('label', value),
            onSubmit: ({ value }) => validateField('label', value),
          }}
        >
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
          name="displayOrder"
          validators={{
            onBlur: ({ value }) => validateField('displayOrder', value),
            onSubmit: ({ value }) => validateField('displayOrder', value),
          }}
        >
          {(field) => (
            <FormField
              id="displayOrder"
              label="Ordre d’affichage"
              type="text"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
              hint="Facultatif."
            />
          )}
        </form.Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          Garanties
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUARANTEE_FIELDS.map(renderField)}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          Prime
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {PREMIUM_FIELDS.map(renderField)}
        </div>
        <form.Subscribe selector={(s) => s.values}>
          {(values) => {
            const sum = premiumSum(values)
            return (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-[10px]"
                  disabled={sum === null}
                  title={
                    sum === null
                      ? 'Renseignez la prime nette, les frais accessoires et la taxe.'
                      : undefined
                  }
                  onClick={() => {
                    if (sum !== null)
                      form.setFieldValue('grossPremium', String(sum))
                  }}
                >
                  <Calculator />
                  Calculer la prime TTC
                </Button>
                <span className="text-[12px] text-muted-foreground">
                  Prime nette + frais accessoires + taxe
                  {sum !== null ? ` = ${formatFcfa(sum)}` : ''}
                </span>
              </div>
            )
          }}
        </form.Subscribe>
      </fieldset>

      <form.Subscribe selector={(s) => s.values}>
        {(values) =>
          hasPremiumMismatch(values) && (
            <WarningBanner title="Prime TTC incohérente">
              Prime nette + frais accessoires + taxe ={' '}
              {formatFcfa(premiumSum(values))}, différent de la prime TTC
              saisie. Vous pouvez tout de même enregistrer.
            </WarningBanner>
          )
        }
      </form.Subscribe>
    </FormDialog>
  )
}
