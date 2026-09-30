import { ScrollShadow } from '#/components/layout/ScrollShadow'
import { cn } from '#/lib/utils'

/**
 * Compact single-choice filter (pill group). Use inside a `Toolbar` for 2-4
 * mutually exclusive options such as status or gender; use a `Select` beyond that.
 *
 * `scrollable` (opt-in) is for options with long labels: one-line pills that
 * scroll horizontally inside a `ScrollShadow` below 576 px of content (the
 * active pill stays in view) instead of wrapping onto several lines.
 */
export function SegmentedPills<T extends string>({
  label,
  value,
  options,
  onChange,
  scrollable = false,
}: {
  /** Accessible name of the group (not displayed). */
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  scrollable?: boolean
}) {
  const group = (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex rounded-[10px] bg-[#f0f2f6] p-0.5',
        scrollable
          ? 'min-w-full @xl/main:min-w-0 [&>button]:shrink-0 [&>button]:whitespace-nowrap @max-xl/main:[&>button]:flex-1'
          : 'col-span-2 @xl/main:col-span-1 @max-xl/main:[&>button]:flex-1',
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            data-state={
              scrollable ? (active ? 'active' : 'inactive') : undefined
            }
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-9 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
  if (!scrollable) return group
  return (
    <ScrollShadow className="col-span-2 min-w-0 rounded-[10px] @xl/main:col-span-1">
      {group}
    </ScrollShadow>
  )
}
