import type { ReactNode } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useConfirmDiscard } from './unsaved-changes'

interface FormDialogProps {
  onClose: () => void
  eyebrow: string
  title: string
  description?: string
  onSubmit: () => void
  submitLabel: string
  pending?: boolean
  /** Disables the primary submit (e.g. when a required picker has no options). */
  submitDisabled?: boolean
  error?: string | null
  /**
   * The form holds unsaved edits: closing (overlay, Échap, Annuler, ×) then
   * asks « Abandonner les modifications ? ». Pass `form.state.isDirty`
   * (via `useStore(form.store, s => s.isDirty)`).
   */
  dirty?: boolean
  /** `wide` (760 px, taller body) for dense two-column forms. */
  size?: 'default' | 'wide'
  children: ReactNode
}

/**
 * Standard form modal in the NSIA design language: a shadcn Dialog with an
 * "eyebrow + title + subtitle" header, a scrollable body, and a footer with
 * Annuler + a primary submit. The whole thing is a <form>, so Enter submits.
 */
export function FormDialog({
  onClose,
  eyebrow,
  title,
  description,
  onSubmit,
  submitLabel,
  pending,
  submitDisabled,
  error,
  dirty = false,
  size = 'default',
  children,
}: FormDialogProps) {
  const { requestClose, dialog } = useConfirmDiscard(dirty && !pending)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose(onClose)
      }}
    >
      <DialogContent
        size={size === 'wide' ? 'wide' : 'default'}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          size !== 'wide' && 'sm:max-w-[460px]',
        )}
      >
        <DialogHeader className="shrink-0 gap-0 border-b p-4 text-left sm:p-6">
          <div className="mb-[7px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            {eyebrow}
          </div>
          <DialogTitle className="text-[21px] font-extrabold tracking-[-0.025em]">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-[3px] text-[13.5px]">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {children}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="grid shrink-0 grid-cols-2 gap-2.5 border-t p-4 sm:flex sm:justify-end sm:p-6">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-[11px]"
              >
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || submitDisabled}
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
        {dialog}
      </DialogContent>
    </Dialog>
  )
}
