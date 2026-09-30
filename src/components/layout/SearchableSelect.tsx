import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { CheckIcon, ChevronDownIcon, Search, X } from 'lucide-react'
import { cn } from '#/lib/utils'
import { filterOptions, normalizeSearch } from '#/lib/search'
import type { SearchableOption } from '#/lib/search'

const SEARCH_DEBOUNCE_MS = 250

export { filterOptions, normalizeSearch }
export type { SearchableOption }

/**
 * Toolbar-sized combobox: a trigger that opens a searchable list. Same
 * contract as a plain select — `value === ''` means « no filter » (the
 * `allLabel` entry). Keyboard: ↑/↓ to move, Entrée to pick, Échap to close.
 */
export function SearchableSelect({
  label,
  value,
  onChange,
  allLabel,
  hideAllOption = false,
  options,
  placeholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat.',
  disabled,
  disabledHint,
  loading,
  onSearch,
  selectedLabel,
  className,
  id,
}: {
  /** Accessible name of the control. */
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  /** Required field: no « all » entry in the list; `allLabel` is only the placeholder. */
  hideAllOption?: boolean
  options: SearchableOption[]
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  /** Why the control is disabled: shown as tooltip and as small text under it. */
  disabledHint?: string
  /** Shows « Chargement… » in the list (options still loading or server search running). */
  loading?: boolean
  /**
   * Server-side search: called (debounced, 250 ms) with the typed query — `''`
   * when the list opens. Local filtering is then skipped; `options` must hold
   * the server results.
   */
  onSearch?: (query: string) => void
  /** Label of the selected value when it is not in `options` (server search). */
  selectedLabel?: string
  className?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)
  const selectedText =
    selected?.label ?? (value && selectedLabel ? selectedLabel : undefined)
  const hasSelection = selected !== undefined || selectedText !== undefined

  // Server search: debounce the query while the list is open.
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch
  useEffect(() => {
    if (!open || !onSearchRef.current) return
    const timer = setTimeout(
      () => onSearchRef.current?.(query),
      query === '' ? 0 : SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [open, query])

  // Entry 0 is « all » (hidden while searching), then the filtered options.
  const entries = useMemo(() => {
    const filtered = onSearch ? options : filterOptions(options, query)
    return query.trim() || hideAllOption
      ? filtered
      : [{ value: '', label: allLabel }, ...filtered]
  }, [options, query, allLabel, onSearch, hideAllOption])

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const move = (delta: number) => {
    if (entries.length === 0) return
    const next = (active + delta + entries.length) % entries.length
    setActive(next)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery('')
          setActive(
            Math.max(
              0,
              entries.findIndex((e) => e.value === value),
            ),
          )
        }
      }}
    >
      <div className={cn('relative w-[220px]', className)}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            aria-label={`${label} : ${selectedText ?? allLabel}`}
            title={disabled ? disabledHint : undefined}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-[10px] border border-input bg-card px-3 text-left text-sm shadow-xs outline-none transition-[color,box-shadow]',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              hasSelection && 'pr-10',
            )}
          >
            <span
              className={cn(
                'flex-1 truncate',
                !hasSelection && 'text-muted-foreground',
              )}
            >
              {selectedText ?? allLabel}
            </span>
            {!hasSelection && (
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </PopoverPrimitive.Trigger>
        {hasSelection && !disabled && (
          <button
            type="button"
            aria-label={`Effacer le filtre ${label}`}
            onClick={() => onChange('')}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="size-3.5" />
          </button>
        )}
        {disabled && disabledHint && (
          <p className="mt-1 text-[11.5px] leading-tight text-muted-foreground">
            {disabledHint}
          </p>
        )}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[260px] rounded-[12px] border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-label={`Rechercher : ${label}`}
              aria-activedescendant={
                entries.length ? `${listId}-${active}` : undefined
              }
              value={query}
              placeholder={placeholder}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  move(1)
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  move(-1)
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const entry = entries.at(active)
                  if (entry) pick(entry.value)
                }
              }}
              className="h-9 w-full rounded-[8px] border border-input bg-background pr-2 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto"
          >
            {entries.length === 0 && loading ? null : entries.length === 0 ? (
              <li className="px-2.5 py-6 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </li>
            ) : (
              entries.map((entry, index) => {
                const isSelected = entry.value === value
                return (
                  <li
                    key={entry.value || '__all__'}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(entry.value)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-sm',
                      index === active && 'bg-accent text-accent-foreground',
                      entry.value === '' && 'text-muted-foreground',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{entry.label}</span>
                      {'hint' in entry && entry.hint ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {entry.hint}
                        </span>
                      ) : null}
                    </span>
                    {isSelected && (
                      <CheckIcon className="size-4 shrink-0 text-primary" />
                    )}
                  </li>
                )
              })
            )}
            {loading && (
              <li
                role="status"
                className="px-2.5 py-3 text-center text-sm text-muted-foreground"
              >
                Chargement…
              </li>
            )}
          </ul>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
