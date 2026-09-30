import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

/** Toolbar layout: 2-column grid below 576 px of content, inline wrapping row above. */
export const TOOLBAR_CLASS = cn(
  'grid grid-cols-2 gap-2',
  '@xl/main:flex @xl/main:flex-wrap @xl/main:items-center @xl/main:gap-3',
  // Below 576 px every direct control (Select, SearchableSelect…) fills its grid cell,
  // except Radix Select's hidden native <select> (rendered until hydration), which
  // would otherwise be stretched to the toolbar's width and scroll the page.
  '@max-xl/main:[&>*:not(select[aria-hidden])]:w-full! @max-xl/main:[&>*]:min-w-0',
)

/**
 * Filter bar above a table: a card holding the search field, filter controls
 * (`SegmentedPills`, `Select`) and, right-aligned, the page's secondary actions.
 * Place `ResultCount` right under it. Below 576 px of content the controls sit
 * in a 2-column grid (search, pills, date range and actions span both columns,
 * selects take one cell each and fill it).
 */
export function Toolbar({
  search,
  filters,
  actions,
  className,
}: {
  /** Usually a `ToolbarSearch`. */
  search?: ReactNode
  /** Filter controls, laid out inline and wrapping. */
  filters?: ReactNode
  /** Right-aligned actions (export, import…). */
  actions?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('mb-4 gap-0 p-3.5', className)}>
      <div className={TOOLBAR_CLASS}>
        {search}
        {filters}
        {actions && (
          <div className="col-span-2 flex flex-wrap items-center gap-2.5 @xl/main:col-span-1 @xl/main:ml-auto @max-xl/main:[&>*]:flex-1">
            {actions}
          </div>
        )}
      </div>
    </Card>
  )
}

/** Search input with a leading icon, sized for `Toolbar`. */
export function ToolbarSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Accessible name, e.g. « Rechercher un client ». */
  label: string
}) {
  // The parent's `value` usually lives in the URL and only catches up once the
  // navigation commits: rendering it directly while typing put the previous
  // value back and dropped letters. The input keeps its own draft and only
  // follows `value` while it isn't being edited (e.g. « Réinitialiser »).
  const [draft, setDraft] = useState(value)
  const editing = useRef(false)
  useEffect(() => {
    if (!editing.current) setDraft(value)
  }, [value])
  return (
    <div className="relative col-span-2 min-w-0 flex-1 @xl/main:col-span-1 @xl/main:min-w-[240px]">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onFocus={() => (editing.current = true)}
        onBlur={() => {
          editing.current = false
          setDraft(value)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          onChange(e.target.value)
        }}
        className="h-10 rounded-[10px] pl-9"
      />
    </div>
  )
}

/** Line under the toolbar: « 12 clients » on the left, an optional note on the right. */
export function ResultCount({
  children,
  note,
}: {
  children: ReactNode
  /** Warning/info text (e.g. partial data), shown right-aligned. */
  note?: ReactNode
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-1 text-[13px] text-muted-foreground">
      <span className="whitespace-nowrap">{children}</span>
      {note && (
        <span className="basis-full text-[#8a6600] sm:basis-auto sm:text-right">
          {note}
        </span>
      )}
    </div>
  )
}
