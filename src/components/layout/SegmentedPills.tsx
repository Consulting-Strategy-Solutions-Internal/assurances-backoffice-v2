import { cn } from '#/lib/utils'

/**
 * Compact single-choice filter (pill group). Use inside a `Toolbar` for 2-4
 * mutually exclusive options such as status or gender; use a `Select` beyond that.
 */
export function SegmentedPills<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** Accessible name of the group (not displayed). */
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="col-span-2 inline-flex rounded-[10px] bg-[#f0f2f6] p-0.5 @xl/main:col-span-1 @max-xl/main:[&>button]:flex-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
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
}
