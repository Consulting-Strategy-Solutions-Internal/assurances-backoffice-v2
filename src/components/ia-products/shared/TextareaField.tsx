import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'

interface TextareaFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  error?: string
  /** Longueur maximale : affiche un compteur « n / max ». */
  maxLength: number
  rows?: number
}

/** Label + zone de texte multi-ligne avec compteur de caractères (≤ max). */
export function TextareaField({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  disabled,
  error,
  maxLength,
  rows = 3,
}: TextareaFieldProps) {
  const length = value.trim().length
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : `${id}-count`}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          'w-full resize-y rounded-[10px] border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive',
          disabled && 'bg-muted text-muted-foreground',
        )}
      />
      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-[12px] font-medium text-destructive"
          >
            {error}
          </p>
        ) : (
          <span />
        )}
        <p
          id={`${id}-count`}
          className={cn(
            'shrink-0 text-[12px] tabular-nums text-muted-foreground',
            length > maxLength && 'font-semibold text-destructive',
          )}
        >
          {length} / {maxLength}
        </p>
      </div>
    </div>
  )
}
