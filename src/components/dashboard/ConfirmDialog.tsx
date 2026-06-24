import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/**
 * Destructive confirmation built on the shadcn AlertDialog, in the NSIA design
 * language. The confirm button keeps the dialog open (preventDefault) so the
 * caller can show a pending state and close on success.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive,
  pending,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl sm:max-w-[420px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[19px] font-extrabold tracking-[-0.02em]">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-[13.5px] leading-relaxed">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2.5">
          <AlertDialogCancel disabled={pending} className="rounded-[11px]">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className={cn(
              'rounded-[11px]',
              destructive && buttonVariants({ variant: 'destructive' }),
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
