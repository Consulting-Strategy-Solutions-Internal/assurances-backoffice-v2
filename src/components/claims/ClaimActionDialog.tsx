import { useState } from 'react'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { ClaimTransition } from '#/services/claims'

const details: Record<
  ClaimTransition,
  { title: string; label: string; required: boolean; notifying: boolean }
> = {
  review: {
    title: 'Prendre en charge le sinistre',
    label: 'Prendre en charge',
    required: false,
    notifying: false,
  },
  'request-info': {
    title: 'Demander des pièces',
    label: 'Envoyer la demande',
    required: true,
    notifying: true,
  },
  approve: {
    title: 'Approuver le sinistre',
    label: 'Approuver',
    required: false,
    notifying: true,
  },
  reject: {
    title: 'Rejeter le sinistre',
    label: 'Rejeter',
    required: true,
    notifying: true,
  },
}

export function ClaimActionDialog({
  action,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  action: ClaimTransition
  pending: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (comment?: string) => void
}) {
  const config = details[action]
  const [comment, setComment] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const submit = () => {
    const trimmed = comment.trim()
    if (config.required && !trimmed) {
      setValidation(
        action === 'reject'
          ? 'Le motif du rejet est obligatoire.'
          : 'Le commentaire est obligatoire.',
      )
      return
    }
    onConfirm(trimmed || undefined)
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.notifying
              ? 'Cette action notifiera le client. Elle ne pourra pas être annulée.'
              : 'Confirmez la prise en charge de ce dossier.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="action-comment">
            Commentaire{config.required ? ' *' : ' (optionnel)'}
          </Label>
          <textarea
            id="action-comment"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value)
              setValidation(null)
            }}
            aria-invalid={!!validation}
            className="rounded-[10px] border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-right text-xs text-muted-foreground">
            {comment.length}/1000
          </span>
          {validation && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {validation}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            disabled={pending}
            onClick={submit}
          >
            {pending ? 'Traitement…' : config.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
