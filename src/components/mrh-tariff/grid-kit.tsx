import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { PageResponse } from '#/lib/page'
import { orphanBannerMessage, parseIaError } from '#/lib/ia-errors'

/** Clés de cache de la grille MRH (une page de 100 couvre chaque ressource). */
export const MRH_KEYS = {
  legalQualities: ['mrh-tariff', 'legal-qualities'],
  baseRates: ['mrh-tariff', 'base-rates'],
  warranties: ['mrh-tariff', 'warranties'],
  lines: ['mrh-tariff', 'lines'],
} as const

/**
 * Écrit dans le cache la ressource relue après un `PUT` (spec D-4, L-004),
 * puis invalide la liste pour rester aligné sur le serveur.
 */
export function writeBack<T extends { id: number }>(
  queryClient: QueryClient,
  key: readonly string[],
  fresh: T,
) {
  queryClient.setQueryData<PageResponse<T>>(key, (page) =>
    page
      ? {
          ...page,
          content: page.content.map((row) =>
            row.id === fresh.id ? fresh : row,
          ),
        }
      : page,
  )
  void queryClient.invalidateQueries({ queryKey: key })
}

/**
 * Erreur serveur d'une fenêtre : messages sous les champs du formulaire, le
 * reste (clé hors formulaire, message global) en bandeau.
 */
export function splitServerError(
  err: unknown,
  formFields: readonly string[],
): { fields: Record<string, string>; banner: string | null } {
  const parsed = parseIaError(err)
  const fields = Object.fromEntries(
    Object.entries(parsed.fields).filter(([key]) => formFields.includes(key)),
  )
  return { fields, banner: orphanBannerMessage(parsed, formFields) }
}

/** Code fixe de la grille, affiché comme repère (jamais modifiable). */
export function CodeTag({ children }: { children: ReactNode }) {
  return (
    <code
      className="rounded bg-muted px-1.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground"
      title="Code fixe de la grille NSIA"
    >
      {children}
    </code>
  )
}
