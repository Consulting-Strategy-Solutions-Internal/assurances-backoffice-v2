import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { searchOccupations } from '#/services/ia-standard'
import type { ReactNode } from 'react'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { canSearch, SEARCH_MIN_CHARS, SEARCH_PAGE_SIZE } from './logic'

interface OccupationSearchProps {
  onSelectClass: (riskClassId: number) => void
  /** Contrôles de filtre affichés à droite du champ (ex. statut). */
  filters?: ReactNode
  /** Actions alignées à droite de la barre. */
  actions?: ReactNode
}

/**
 * Barre d'outils de l'écran Classes : recherche de métier (avec résultats
 * déroulés dessous), filtres et actions.
 */
export function OccupationSearch({
  onSelectClass,
  filters,
  actions,
}: OccupationSearchProps) {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])

  const enabled = canSearch(q)
  const { data, isFetching, isError } = useQuery({
    queryKey: ['ia-standard', 'risk-classes', 'search', q],
    queryFn: () => searchOccupations({ q, page: 0, size: SEARCH_PAGE_SIZE }),
    enabled,
  })

  const showResults = enabled && canSearch(input)

  return (
    <Card className="mb-4 gap-0 p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher un métier"
            placeholder="Rechercher un métier"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="h-10 rounded-[10px] pl-9"
          />
        </div>
        {filters}
        {actions && (
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {actions}
          </div>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-2">
        {input.trim().length > 0 && !canSearch(input) && (
          <p className="text-[12.5px] text-muted-foreground">
            Saisissez au moins {SEARCH_MIN_CHARS} caractères.
          </p>
        )}
        <p className="text-[12.5px] text-muted-foreground">
          La recherche ne trouve que les métiers actifs des classes actives qui
          ont un barème.
        </p>
        {showResults && (
          <div className="overflow-hidden rounded-[12px] border">
            {isError ? (
              <p className="p-3.5 text-[13px] text-destructive">
                La recherche a échoué. Réessayez dans un instant.
              </p>
            ) : isFetching && !data ? (
              <p className="p-3.5 text-[13px] text-muted-foreground">
                Recherche…
              </p>
            ) : data && data.content.length === 0 ? (
              <p className="p-3.5 text-[13px] text-muted-foreground">
                Aucun métier trouvé.
              </p>
            ) : (
              <ul className="max-h-[260px] divide-y overflow-y-auto">
                {data?.content.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onSelectClass(r.riskClassId)}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-[#f6f8fc]"
                    >
                      <span className="truncate" title={r.description}>
                        {r.description}
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold text-muted-foreground">
                        Classe {r.classNumber}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data && data.totalElements > data.content.length && (
              <p className="border-t px-3.5 py-2 text-[12px] text-muted-foreground">
                {data.totalElements} résultats — affinez la recherche pour voir
                les autres.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
