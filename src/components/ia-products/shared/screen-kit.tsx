import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { isForbidden } from '#/lib/api-error'

export { isForbidden }

/** Ligne d’information sous un tableau (note métier, effets de bord). */
export function ScreenNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3.5 px-1 text-[12.5px] text-muted-foreground">
      {children}
    </p>
  )
}

/** Bouton « Réessayer » des états d’erreur. */
export function RetryAction({ onRetry }: { onRetry: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-[10px]"
      onClick={onRetry}
    >
      Réessayer
    </Button>
  )
}

/** Infobulle « droit manquant » posée sur un conteneur de boutons désactivés. */
export function noWriteTitle(area: string, canWrite: boolean) {
  return canWrite
    ? undefined
    : `Vous n’avez pas les droits requis (${area} — Modifier).`
}
