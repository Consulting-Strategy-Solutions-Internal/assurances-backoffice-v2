import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

/**
 * Filter bar above a table: a card holding the search field, filter controls
 * (`SegmentedPills`, `Select`) and, right-aligned, the page's secondary actions.
 * Place `ResultCount` right under it.
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
      <div className="flex flex-wrap items-center gap-3">
        {search}
        {filters}
        {actions && (
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
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
  return (
    <div className="relative min-w-[240px] flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
    <div className="mb-2 flex items-center justify-between px-1 text-[13px] text-muted-foreground">
      <span>{children}</span>
      {note && <span className="text-[#8a6600]">{note}</span>}
    </div>
  )
}
