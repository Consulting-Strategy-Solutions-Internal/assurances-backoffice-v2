import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteRiskClass,
  getRiskClass,
  setRiskClassStatus,
  updateRiskClass,
} from '#/services/ia-standard'
import type { RiskClassDetailResponse } from '#/services/ia-standard'
import { parseIaError, parseIaErrorList } from '#/lib/ia-errors'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { FormField } from '#/components/forms/FormField'
import { useConfirmDiscard } from '#/components/forms/unsaved-changes'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { TextareaField } from '#/components/ia-products/shared/TextareaField'
import { Switch } from '#/components/ia-products/shared/Switch'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { OccupationsSection } from './OccupationsSection'
import { ReasonList, StatusBadge } from './StatusBadge'
import {
  DESCRIPTION_MAX,
  validateClassNumber,
  validateDescription,
} from './logic'

const NO_WRITE = "Vous n'avez pas le droit de modifier les classes de risque."

interface RiskClassDrawerProps {
  classId: number | null
  onClose: () => void
}

export function RiskClassDrawer({ classId, onClose }: RiskClassDrawerProps) {
  // Garde le dernier id pour que le contenu survive à l'animation de fermeture.
  const [shownId, setShownId] = useState<number | null>(classId)
  useEffect(() => {
    if (classId !== null) setShownId(classId)
  }, [classId])
  const id = classId ?? shownId
  const [formDirty, setFormDirty] = useState(false)
  const [occDirty, setOccDirty] = useState(false)
  const { requestClose, dialog } = useConfirmDiscard(formDirty || occDirty)
  // Une saisie non enregistrée ne doit pas survivre au changement de classe.
  useEffect(() => {
    setFormDirty(false)
    setOccDirty(false)
  }, [id])

  const { data, isPending, isError } = useQuery({
    queryKey: ['ia-standard', 'risk-classes', 'detail', id],
    queryFn: () => getRiskClass(id as number),
    enabled: id !== null,
  })

  return (
    <Sheet
      open={classId !== null}
      onOpenChange={(open) => !open && requestClose(onClose)}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[520px] gap-0 p-0 sm:max-w-[520px]"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
          <div className="flex flex-col gap-0">
            <div className="mb-[6px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Classe de risque
            </div>
            <SheetTitle className="flex items-center gap-2 text-[21px] font-extrabold tracking-[-0.025em]">
              {data ? `Classe ${data.classNumber}` : 'Chargement…'}
              {data && <StatusBadge active={data.active} />}
            </SheetTitle>
            <SheetDescription asChild>
              <div className="mt-[3px] text-[13.5px]">
                <TruncatedText lines={2}>{data?.description}</TruncatedText>
              </div>
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Fermer"
              className="size-[34px] shrink-0 rounded-[9px]"
            >
              <X className="size-[17px]" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-[26px] py-6">
          {isPending && (
            <p className="text-[13.5px] text-muted-foreground">Chargement…</p>
          )}
          {isError && (
            <p className="text-[13.5px] text-destructive">
              Impossible de charger cette classe (elle a peut-être été
              supprimée).
            </p>
          )}
          {data && (
            <DrawerBody
              detail={data}
              onDeleted={onClose}
              onFormDirtyChange={setFormDirty}
              onOccupationDirtyChange={setOccDirty}
            />
          )}
        </div>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({
  detail,
  onDeleted,
  onFormDirtyChange,
  onOccupationDirtyChange,
}: {
  detail: RiskClassDetailResponse
  onDeleted: () => void
  onFormDirtyChange: (dirty: boolean) => void
  onOccupationDirtyChange: (dirty: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('riskclass:write')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteReasons, setDeleteReasons] = useState<string[] | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ia-standard', 'risk-classes'] })

  const toggle = useMutation({
    mutationFn: () => setRiskClassStatus(detail.id, !detail.active),
    onSuccess: (updated) => {
      void invalidate()
      toast.success(updated.active ? 'Classe activée.' : 'Classe désactivée.')
    },
    onError: (err) => toast.error(parseIaErrorList(err).join(' ')),
  })

  const remove = useMutation({
    mutationFn: () => deleteRiskClass(detail.id),
    onSuccess: () => {
      void invalidate()
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'premium-rates'],
      })
      setConfirmDelete(false)
      toast.success(`Classe ${detail.classNumber} supprimée.`)
      onDeleted()
    },
    onError: (err) => {
      setConfirmDelete(false)
      setDeleteReasons(parseIaErrorList(err))
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <ClassForm
        key={detail.id}
        detail={detail}
        canWrite={canWrite}
        onDirtyChange={onFormDirtyChange}
      />

      <div className="flex items-center justify-between rounded-[10px] border px-3.5 py-2.5">
        <div>
          <Label htmlFor="rc-detail-active" className="text-[13px]">
            Classe active
          </Label>
          <p className="text-[12px] text-muted-foreground">
            Désactiver la classe ne modifie pas ses métiers.
          </p>
        </div>
        <Switch
          id="rc-detail-active"
          checked={detail.active}
          disabled={!canWrite || toggle.isPending}
          title={canWrite ? undefined : NO_WRITE}
          aria-label="Classe active"
          onCheckedChange={() => toggle.mutate()}
        />
      </div>

      <Separator />

      <OccupationsSection
        riskClass={detail}
        canWrite={canWrite}
        onDirtyChange={onOccupationDirtyChange}
      />

      <Separator />

      <div className="flex flex-col gap-2.5">
        {deleteReasons && (
          <ReasonList
            title="Suppression de la classe impossible"
            reasons={deleteReasons}
          />
        )}
        <div title={canWrite ? undefined : NO_WRITE} className="w-fit">
          <Button
            variant="outline"
            className="rounded-[11px] text-destructive hover:text-destructive"
            disabled={!canWrite}
            onClick={() => {
              setDeleteReasons(null)
              setConfirmDelete(true)
            }}
          >
            <Trash2 /> Supprimer la classe
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Supprimer la classe ${detail.classNumber} ?`}
        description={`Ses ${detail.occupations.length} métier(s) seront également supprimés. Cette action est définitive.`}
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onOpenChange={setConfirmDelete}
      />
    </div>
  )
}

function ClassForm({
  detail,
  canWrite,
  onDirtyChange,
}: {
  detail: RiskClassDetailResponse
  canWrite: boolean
  onDirtyChange: (dirty: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [classNumber, setClassNumber] = useState(String(detail.classNumber))
  const [description, setDescription] = useState(detail.description)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const dirty =
    classNumber.trim() !== String(detail.classNumber) ||
    description.trim() !== detail.description

  useEffect(() => {
    onDirtyChange(dirty)
    return () => onDirtyChange(false)
  }, [dirty, onDirtyChange])

  const save = useMutation({
    mutationFn: () =>
      updateRiskClass(detail.id, {
        classNumber: Number(classNumber.trim()),
        description: description.trim(),
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'risk-classes'],
      })
      setClassNumber(String(updated.classNumber))
      setDescription(updated.description)
      toast.success('Classe mise à jour.')
    },
    onError: (err) => {
      const p = parseIaError(err)
      setErrors(p.fields)
      setGlobalError(
        p.message ??
          (Object.keys(p.fields).length === 0
            ? 'La mise à jour a échoué.'
            : null),
      )
    },
  })

  const submit = () => {
    setGlobalError(null)
    const next: Record<string, string> = {}
    const n = validateClassNumber(classNumber)
    if (n) next.classNumber = n
    const d = validateDescription(description)
    if (d) next.description = d
    setErrors(next)
    if (Object.keys(next).length === 0) save.mutate()
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <FormField
        id="rc-detail-number"
        label="Numéro de classe"
        type="number"
        min={1}
        step={1}
        required
        value={classNumber}
        disabled={!canWrite}
        onChange={(v) => {
          setClassNumber(v)
          setErrors((p) => ({ ...p, classNumber: '' }))
        }}
        error={errors.classNumber || undefined}
      />
      <TextareaField
        id="rc-detail-description"
        label="Description"
        required
        rows={4}
        maxLength={DESCRIPTION_MAX}
        value={description}
        disabled={!canWrite}
        onChange={(v) => {
          setDescription(v)
          setErrors((p) => ({ ...p, description: '' }))
        }}
        error={errors.description || undefined}
      />
      {globalError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
          {globalError}
        </p>
      )}
      <div className="flex gap-2.5" title={canWrite ? undefined : NO_WRITE}>
        <Button
          type="submit"
          className="rounded-[11px]"
          disabled={!canWrite || !dirty || save.isPending}
        >
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        {dirty && (
          <Button
            type="button"
            variant="outline"
            className="rounded-[11px]"
            disabled={save.isPending}
            onClick={() => {
              setClassNumber(String(detail.classNumber))
              setDescription(detail.description)
              setErrors({})
              setGlobalError(null)
            }}
          >
            Annuler
          </Button>
        )}
      </div>
    </form>
  )
}
