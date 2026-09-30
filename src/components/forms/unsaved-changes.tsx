import { useCallback, useEffect, useState } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'

export const UNSAVED_TITLE = 'Abandonner les modifications ?'
export const UNSAVED_DESCRIPTION =
  'Les informations saisies ne seront pas enregistrées.'

/** Warns the browser (tab close / reload) while `dirty` is true. */
export function useBeforeUnloadGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

/**
 * Confirm-before-closing for modals, drawers and inline editors.
 *
 * ```tsx
 * const { requestClose, dialog } = useConfirmDiscard(form.state.isDirty)
 * <Sheet open onOpenChange={(o) => !o && requestClose(onClose)}> … {dialog}
 * ```
 * `requestClose(fn)` runs `fn` right away when clean, else after the user
 * confirms « Abandonner les modifications ? ». Also guards tab close/reload.
 */
export function useConfirmDiscard(dirty: boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null)
  useBeforeUnloadGuard(dirty)

  const requestClose = useCallback(
    (onClose: () => void) => {
      if (dirty) setPending(() => onClose)
      else onClose()
    },
    [dirty],
  )

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={UNSAVED_TITLE}
      description={UNSAVED_DESCRIPTION}
      confirmLabel="Abandonner"
      cancelLabel="Continuer la modification"
      destructive
      onOpenChange={(open) => {
        if (!open) setPending(null)
      }}
      onConfirm={() => {
        const run = pending
        setPending(null)
        run?.()
      }}
    />
  )

  return { requestClose, dialog }
}

/**
 * Guard for pages, wizards and drawers hosted by a route: blocks in-app
 * navigation (TanStack Router `useBlocker`) and tab close/reload while
 * `dirty`. Render the returned `dialog` once in the component.
 *
 * Do not navigate away yourself after a successful save without first
 * resetting the form (`form.reset()`), or the guard will ask again.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: dirty,
    disabled: !dirty,
    withResolver: true,
  })

  const dialog = (
    <ConfirmDialog
      open={blocker.status === 'blocked'}
      title={UNSAVED_TITLE}
      description={UNSAVED_DESCRIPTION}
      confirmLabel="Quitter la page"
      cancelLabel="Rester"
      destructive
      onOpenChange={(open) => {
        if (!open && blocker.status === 'blocked') blocker.reset()
      }}
      onConfirm={() => {
        if (blocker.status === 'blocked') blocker.proceed()
      }}
    />
  )

  return { dialog, blocked: blocker.status === 'blocked' }
}
