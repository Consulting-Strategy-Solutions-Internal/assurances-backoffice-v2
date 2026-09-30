import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Briefcase,
  Compass,
  CornerDownLeft,
  Headset,
  Loader2,
  Search,
  Share2,
  TriangleAlert,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import { flattenGroups } from './search-logic'
import type { SearchGroupId, SearchResult } from './search-logic'
import { useDebouncedValue } from './use-debounced-value'
import { useGlobalSearch } from './use-global-search'

const GROUP_ICONS: Record<SearchGroupId, LucideIcon> = {
  pages: Compass,
  clients: Users,
  partners: Share2,
  admins: UserCog,
  tickets: Headset,
  claims: TriangleAlert,
  occupations: Briefcase,
}

/**
 * Topbar global search: results panel grouped by type (pages, clients,
 * sinistres…). Ctrl/⌘+K focuses it, ↑/↓ move, Entrée opens, Échap closes;
 * the field is cleared on every navigation.
 */
export function GlobalSearch() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [isMac, setIsMac] = useState(false)
  const debounced = useDebouncedValue(value, 200)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const { groups, searching, loading } = useGlobalSearch(debounced)
  const items = useMemo(() => flattenGroups(groups), [groups])
  // The typed text is ahead of the debounced one: keep the « pending » state honest.
  const settled = debounced.trim() === value.trim()
  const busy = loading || !settled
  const showEmpty =
    searching &&
    settled &&
    !loading &&
    items.length === 0 &&
    !groups.some((g) => g.error)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform))
  }, [])

  // Cleared on route change.
  useEffect(() => {
    setValue('')
    setOpen(false)
    inputRef.current?.blur()
  }, [pathname])

  useEffect(() => {
    setActive(0)
  }, [debounced, groups.length])

  // Ctrl/⌘+K anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click outside closes.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const go = (result: SearchResult) => {
    setOpen(false)
    setValue('')
    void navigate({
      to: result.target.to,
      params: result.target.params,
      search: result.target.search,
    } as never)
  }

  const move = (delta: number) => {
    if (items.length === 0) return
    const next = (active + delta + items.length) % items.length
    setActive(next)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  const activeId = items[active] ? `${listId}-${active}` : undefined
  let index = -1

  return (
    <div ref={containerRef} className="w-full max-w-[330px] sm:relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-[13px] size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Recherche globale"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? activeId : undefined}
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder="Rechercher un client, un sinistre…"
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              move(1)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              move(-1)
            } else if (e.key === 'Enter') {
              const result = items.at(active)
              if (open && result) {
                e.preventDefault()
                go(result)
              }
            } else if (e.key === 'Escape') {
              if (open) {
                e.preventDefault()
                setOpen(false)
              } else if (value) {
                setValue('')
              } else {
                inputRef.current?.blur()
              }
            }
          }}
          className="h-10 w-full rounded-[11px] border border-input bg-card pr-16 pl-9 text-[13.5px] shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {busy && searching && (
            <Loader2
              aria-hidden
              className="size-3.5 animate-spin text-muted-foreground"
            />
          )}
          {value ? (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => {
                setValue('')
                inputRef.current?.focus()
              }}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground sm:block">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          )}
        </div>
      </div>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Résultats de la recherche"
          className="absolute top-full right-4 left-4 z-30 mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-[14px] border bg-popover p-1.5 text-popover-foreground shadow-lg sm:right-auto sm:left-0 sm:w-[min(520px,calc(100vw-2rem))]"
        >
          {!searching && (
            <p className="px-2.5 pt-1.5 pb-1 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Accès rapide
            </p>
          )}
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group.id]
            return (
              <div key={group.id} role="group" aria-label={group.label}>
                {searching && (
                  <p className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    <Icon className="size-3.5" />
                    {group.label}
                    {group.total > 0 && (
                      <span className="font-semibold tabular-nums">
                        {group.total}
                      </span>
                    )}
                  </p>
                )}
                {group.loading ? (
                  <div className="flex items-center gap-2 px-2.5 py-2 text-[13px] text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Recherche en cours…
                  </div>
                ) : group.error ? (
                  <p
                    role="status"
                    className="px-2.5 py-2 text-[13px] text-muted-foreground"
                  >
                    {group.error === 'forbidden'
                      ? 'Accès refusé pour cette source.'
                      : 'Impossible de charger cette source.'}
                  </p>
                ) : (
                  group.results.map((result) => {
                    index += 1
                    const i = index
                    const isActive = i === active
                    const seeAll = result.kind === 'seeAll'
                    return (
                      <div
                        key={result.id}
                        id={`${listId}-${i}`}
                        data-index={i}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(result)}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2',
                          isActive && 'bg-accent text-accent-foreground',
                          seeAll && 'text-[13px] font-semibold text-primary',
                        )}
                      >
                        {!seeAll && (
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                            <Icon className="size-3.5" />
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span
                            title={result.title}
                            className={cn(
                              'truncate text-[13.5px]',
                              !seeAll && 'font-semibold',
                            )}
                          >
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="truncate text-[12px] text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
          {showEmpty && (
            <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat pour « {debounced.trim()} ».
            </p>
          )}
          {searching && !settled && items.length === 0 && (
            <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">
              Recherche en cours…
            </p>
          )}
        </div>
      )}
    </div>
  )
}
