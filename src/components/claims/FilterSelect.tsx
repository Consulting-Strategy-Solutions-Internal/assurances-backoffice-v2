import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'

/** Radix forbids an empty-string item value, so « Tous » uses a sentinel. */
const ALL_VALUE = '__all__'

export interface FilterOption {
  value: string
  label: string
}

/**
 * Toolbar-sized select for server-side filters: exposes '' for « no filter ».
 * `label` is the accessible name; `allLabel` the text of the reset option
 * (omit it for a sort select that always has a value).
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
  className,
  fluid,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  allLabel?: string
  className?: string
  /** Full width below 576 px of content (170 px above); `Toolbar` already does it for its direct children. */
  fluid?: boolean
}) {
  return (
    <Select
      value={value === '' ? (allLabel ? ALL_VALUE : undefined) : value}
      onValueChange={(next) => onChange(next === ALL_VALUE ? '' : next)}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-10 rounded-[10px] bg-card',
          fluid ? 'w-full @xl/main:w-[170px]' : 'w-[170px]',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
