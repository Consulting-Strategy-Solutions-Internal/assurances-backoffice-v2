import { useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

const SLOT_ID = 'ia-header-action'

/**
 * Emplacement de l’action principale d’un écran IA, à passer en `children`
 * de `PageHeader` : l’écran (qui porte l’état de ses dialogues) y injecte ses
 * boutons via `HeaderActionPortal`.
 */
export function HeaderActionSlot() {
  return <div id={SLOT_ID} className="flex flex-wrap items-center gap-2.5" />
}

/**
 * Rend les actions dans le `HeaderActionSlot` de la page (recette « List
 * page » : action principale dans l’en-tête, pas de barre d’outils à un seul
 * bouton). Sans emplacement dans la page (tests, usage isolé), les rend en
 * ligne, alignées à droite.
 */
export function HeaderActionPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null | undefined>(
    undefined,
  )
  useLayoutEffect(() => {
    setTarget(document.getElementById(SLOT_ID))
  }, [])
  if (target === undefined) return null
  if (target) return createPortal(children, target)
  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-end gap-2.5">
      {children}
    </div>
  )
}
