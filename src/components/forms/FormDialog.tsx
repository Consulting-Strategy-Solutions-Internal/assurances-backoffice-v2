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

interface FormDialogProps {
  onClose: () => void
  eyebrow: string
  title: string
  description?: string
  onSubmit: () => void
  submitLabel: string
  pending?: boolean
  error?: string | null
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
  error,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <DialogHeader className="gap-0 border-b p-6 text-left">
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
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto p-6">
            {children}
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2.5 border-t p-6 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-[11px]">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
