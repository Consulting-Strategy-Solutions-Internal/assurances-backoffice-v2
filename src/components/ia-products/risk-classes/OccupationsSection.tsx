import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  addOccupation,
  deleteOccupation,
  getRiskClasses,
  setOccupationStatus,
  updateOccupation,
} from '#/services/ia-standard'
import type {
  OccupationResponse,
  RiskClassDetailResponse,
} from '#/services/ia-standard'
import { fetchAllPages } from '#/lib/fetch-all-pages'
import { parseIaError, parseIaErrorList } from '#/lib/ia-errors'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import { FormSelect } from '#/components/forms/FormSelect'
import { Switch } from '#/components/ia-products/shared/Switch'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { StatusBadge, ReasonList } from './StatusBadge'
import { reclassTargets, validateDescription } from './logic'

const NO_WRITE = "Vous n'avez pas le droit de modifier les classes de risque."

interface OccupationsSectionProps {
  riskClass: RiskClassDetailResponse
  canWrite: boolean
  /** Signale une saisie non enregistrée (nouveau métier, renommage en cours). */
  onDirtyChange?: (dirty: boolean) => void
}

export function OccupationsSection({
  riskClass,
  canWrite,
  onDirtyChange,
}: OccupationsSectionProps) {
  const queryClient = useQueryClient()
  const [newDescription, setNewDescription] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [toDelete, setToDelete] = useState<OccupationResponse | null>(null)
  const [deleteReasons, setDeleteReasons] = useState<string[] | null>(null)
  const [editDirty, setEditDirty] = useState(false)
  const dirty =
    newDescription.trim() !== '' || (editingId !== null && editDirty)
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ia-standard', 'risk-classes'] })

  const add = useMutation({
    mutationFn: (description: string) =>
      addOccupation(riskClass.id, { description, active: true }),
    onSuccess: () => {
      void invalidate()
      setNewDescription('')
      setAddError(null)
      toast.success('Métier ajouté.')
    },
    onError: (err) => {
      const p = parseIaError(err)
      setAddError(
        Object.values(p.fields).at(0) ?? p.message ?? 'Ajout impossible.',
      )
    },
  })

  const toggle = useMutation({
    mutationFn: (o: OccupationResponse) => setOccupationStatus(o.id, !o.active),
    onSuccess: (o) => {
      void invalidate()
      toast.success(o.active ? 'Métier activé.' : 'Métier désactivé.')
    },
    onError: (err) => toast.error(parseIaErrorList(err).join(' ')),
  })

  const remove = useMutation({
    mutationFn: (o: OccupationResponse) => deleteOccupation(o.id),
    onSuccess: () => {
      void invalidate()
      setToDelete(null)
      toast.success('Métier supprimé.')
    },
    onError: (err) => {
      setToDelete(null)
      setDeleteReasons(parseIaErrorList(err))
    },
  })

  const submitAdd = () => {
    const e = validateDescription(newDescription, 'Le libellé du métier')
    if (e) {
      setAddError(e)
      return
    }
    setAddError(null)
    add.mutate(newDescription.trim())
  }

  const addDisabled = !canWrite || !riskClass.active
  const addReason = !canWrite
    ? NO_WRITE
    : !riskClass.active
      ? 'Activez la classe pour y ajouter un métier.'
      : undefined

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-bold">
          Métiers ({riskClass.occupations.length})
        </h3>
      </div>

      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          submitAdd()
        }}
      >
        <div className="flex gap-2" title={addReason}>
          <Input
            aria-label="Nouveau métier"
            aria-invalid={!!addError}
            placeholder="Ajouter un métier…"
            value={newDescription}
            disabled={addDisabled}
            onChange={(e) => {
              setNewDescription(e.target.value)
              setAddError(null)
            }}
            className="h-9 rounded-[10px]"
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 rounded-[10px]"
            disabled={addDisabled || add.isPending}
          >
            <Plus /> Ajouter
          </Button>
        </div>
        {!riskClass.active && (
          <p className="text-[12px] text-muted-foreground">
            Cette classe est inactive : activez-la pour y ajouter des métiers.
          </p>
        )}
        {addError && (
          <p role="alert" className="text-[12px] font-medium text-destructive">
            {addError}
          </p>
        )}
      </form>

      {deleteReasons && (
        <ReasonList
          title="Suppression du métier impossible"
          reasons={deleteReasons}
        />
      )}

      {riskClass.occupations.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-muted-foreground">
          Aucun métier dans cette classe.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-[12px] border">
          {riskClass.occupations.map((o) =>
            editingId === o.id ? (
              <OccupationEditRow
                key={o.id}
                occupation={o}
                currentClassId={riskClass.id}
                onDirtyChange={setEditDirty}
                onDone={() => {
                  setEditDirty(false)
                  setEditingId(null)
                }}
              />
            ) : (
              <li
                key={o.id}
                className="flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <TruncatedText className="flex-1 text-[13.5px]">
                  {o.description}
                </TruncatedText>
                {!o.active && <StatusBadge active={false} />}
                <Switch
                  checked={o.active}
                  disabled={!canWrite || toggle.isPending}
                  title={canWrite ? undefined : NO_WRITE}
                  aria-label={`${o.active ? 'Désactiver' : 'Activer'} ${o.description}`}
                  onCheckedChange={() => toggle.mutate(o)}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Modifier ${o.description}`}
                  title={canWrite ? 'Renommer / reclasser' : NO_WRITE}
                  disabled={!canWrite}
                  onClick={() => {
                    setDeleteReasons(null)
                    setEditingId(o.id)
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Supprimer ${o.description}`}
                  title={canWrite ? 'Supprimer' : NO_WRITE}
                  disabled={!canWrite}
                  onClick={() => {
                    setDeleteReasons(null)
                    setToDelete(o)
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce métier ?"
        description={
          toDelete
            ? `« ${toDelete.description} » sera supprimé définitivement.`
            : undefined
        }
        confirmLabel="Supprimer"
        destructive
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
      />
    </section>
  )
}

function OccupationEditRow({
  occupation,
  currentClassId,
  onDirtyChange,
  onDone,
}: {
  occupation: OccupationResponse
  currentClassId: number
  onDirtyChange: (dirty: boolean) => void
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [description, setDescription] = useState(occupation.description)
  const [targetClassId, setTargetClassId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editDirty =
    description.trim() !== occupation.description || targetClassId !== ''
  useEffect(() => {
    onDirtyChange(editDirty)
  }, [editDirty, onDirtyChange])

  const { data: activeClasses } = useQuery({
    queryKey: ['ia-standard', 'risk-classes', 'active-all'],
    queryFn: () =>
      fetchAllPages((page, size) =>
        getRiskClasses({
          status: 'ACTIVE',
          page,
          size,
          sort: 'classNumber,asc',
        }),
      ),
  })
  const targets = reclassTargets(activeClasses?.items ?? [], currentClassId)

  const save = useMutation({
    mutationFn: () =>
      updateOccupation(occupation.id, {
        description: description.trim(),
        riskClassId: targetClassId ? Number(targetClassId) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ia-standard', 'risk-classes'],
      })
      toast.success(targetClassId ? 'Métier reclassé.' : 'Métier renommé.')
      onDone()
    },
    onError: (err) => {
      const p = parseIaError(err)
      setError(
        Object.values(p.fields).at(0) ??
          p.message ??
          'Modification impossible.',
      )
    },
  })

  const submit = () => {
    const e = validateDescription(description, 'Le libellé du métier')
    if (e) {
      setError(e)
      return
    }
    setError(null)
    save.mutate()
  }

  return (
    <li className="flex flex-col gap-2.5 bg-muted/40 px-3.5 py-3">
      <Input
        aria-label="Libellé du métier"
        aria-invalid={!!error}
        value={description}
        onChange={(e) => {
          setDescription(e.target.value)
          setError(null)
        }}
        className="h-9 rounded-[10px]"
      />
      <FormSelect
        id={`occ-class-${occupation.id}`}
        label="Reclasser dans"
        value={targetClassId}
        onChange={setTargetClassId}
        options={targets.map((c) => ({
          value: String(c.id),
          label: `Classe ${c.classNumber} — ${c.description}`,
        }))}
        includeNone
        noneLabel="Ne pas changer de classe"
        placeholder="Ne pas changer de classe"
        hint="Seules les classes actives sont proposées."
      />
      {error && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="rounded-[10px]"
          disabled={save.isPending}
          onClick={submit}
        >
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-[10px]"
          disabled={save.isPending}
          onClick={onDone}
        >
          Annuler
        </Button>
      </div>
    </li>
  )
}
