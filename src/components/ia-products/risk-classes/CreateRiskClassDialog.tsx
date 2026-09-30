import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createRiskClass } from '#/services/ia-standard'
import { parseIaError } from '#/lib/ia-errors'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { Switch } from '#/components/ia-products/shared/Switch'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  DESCRIPTION_MAX,
  validateClassNumber,
  validateCreateClass,
  validateDescription,
} from './logic'
import type { OccupationDraft } from './logic'

interface CreateRiskClassDialogProps {
  onClose: () => void
  onCreated: (id: number) => void
}

export function CreateRiskClassDialog({
  onClose,
  onCreated,
}: CreateRiskClassDialogProps) {
  const queryClient = useQueryClient()
  const [classNumber, setClassNumber] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [occupations, setOccupations] = useState<OccupationDraft[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })

  const create = useMutation({
    mutationFn: createRiskClass,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'risk-classes'],
      })
      toast.success(`Classe ${created.classNumber} créée.`)
      onCreated(created.id)
      onClose()
    },
    onError: (err) => {
      const parsed = parseIaError(err)
      setErrors(parsed.fields)
      setGlobalError(
        parsed.message ??
          (Object.keys(parsed.fields).length === 0
            ? 'La création a échoué.'
            : null),
      )
    },
  })

  const submit = () => {
    setGlobalError(null)
    const result = validateCreateClass({
      classNumber,
      description,
      active,
      occupations,
    })
    setErrors(result.errors)
    if (result.payload) create.mutate(result.payload)
  }

  const updateOccupation = (i: number, patch: Partial<OccupationDraft>) =>
    setOccupations((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    )

  const dirty =
    classNumber.trim() !== '' ||
    description.trim() !== '' ||
    occupations.length > 0

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="IA Standard"
      title="Nouvelle classe de risque"
      description="Créez une classe et, si vous le souhaitez, ses premiers métiers."
      onSubmit={submit}
      submitLabel={create.isPending ? 'Création…' : 'Créer la classe'}
      pending={create.isPending}
      error={globalError}
    >
      <FormField
        id="rc-number"
        label="Numéro de classe"
        type="number"
        min={1}
        step={1}
        required
        value={classNumber}
        onChange={(v) => {
          setClassNumber(v)
          clearError('classNumber')
        }}
        onBlur={() => {
          const e = validateClassNumber(classNumber)
          if (e) setErrors((p) => ({ ...p, classNumber: e }))
        }}
        error={errors.classNumber}
      />
      <FormField
        id="rc-description"
        label="Description"
        required
        value={description}
        onChange={(v) => {
          setDescription(v)
          clearError('description')
        }}
        onBlur={() => {
          const e = validateDescription(description)
          if (e) setErrors((p) => ({ ...p, description: e }))
        }}
        error={errors.description}
        hint={`${description.trim().length} / ${DESCRIPTION_MAX}`}
      />
      <div className="flex items-center justify-between rounded-[10px] border px-3.5 py-2.5">
        <Label htmlFor="rc-active" className="text-[13px]">
          Classe active
        </Label>
        <Switch
          id="rc-active"
          checked={active}
          onCheckedChange={setActive}
          aria-label="Classe active"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">Métiers (optionnel)</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[9px]"
            onClick={() =>
              setOccupations((p) => [...p, { description: '', active: true }])
            }
          >
            <Plus /> Ajouter un métier
          </Button>
        </div>
        {occupations.map((o, i) => {
          const key = `occupations[${i}].description`
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <FormField
                  id={`rc-occ-${i}`}
                  label={`Métier ${i + 1}`}
                  value={o.description}
                  onChange={(v) => {
                    updateOccupation(i, { description: v })
                    clearError(key)
                  }}
                  error={errors[key]}
                />
              </div>
              <div className="mt-[26px] flex h-10 items-center gap-2">
                <Switch
                  checked={o.active}
                  onCheckedChange={(v) => updateOccupation(i, { active: v })}
                  aria-label={`Métier ${i + 1} actif`}
                  title={o.active ? 'Actif' : 'Inactif'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Retirer le métier ${i + 1}`}
                  onClick={() => {
                    setOccupations((p) => p.filter((_, idx) => idx !== i))
                    setErrors({})
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </FormDialog>
  )
}
