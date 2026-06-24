import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'

/** Radix forbids an empty-string item value, so "none" uses a sentinel. */
const NONE_VALUE = '__none__'

export interface SelectOption {
  value: string
  label: string
}

interface FormSelectProps {
  id: string
  label: string
  required?: boolean
  /** The selected value, or '' for nothing selected. */
  value: string
  options: SelectOption[]
  placeholder?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
  disabled?: boolean
  /** Adds an "Aucun" option that maps back to an empty value. */
  includeNone?: boolean
  noneLabel?: string
}

/**
 * Label + shadcn Select + hint/error, mirroring FormField's API so it drops
 * into the same `<form.Field>` pattern. Exposes '' for the empty selection and
 * hides the Radix sentinel used to represent it.
 */
export function FormSelect({
  id,
  label,
  required,
  value,
  options,
  placeholder = 'Sélectionner…',
  onChange,
  onBlur,
  error,
  hint,
  disabled,
  includeNone,
  noneLabel = 'Aucun',
}: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={value === '' ? undefined : value}
        disabled={disabled}
        onValueChange={(v) => {
          onChange?.(v === NONE_VALUE ? '' : v)
          onBlur?.()
        }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={cn(
            'h-10 w-full rounded-[10px]',
            disabled && 'bg-muted text-muted-foreground',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeNone && (
            <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>
          )}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && (
        <p id={`${id}-hint`} className="text-[12px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[12px] font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}
