import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

interface FormFieldProps {
  id: string
  label: string
  type?: string
  min?: number
  max?: number
  step?: number | 'any'
  required?: boolean
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
  disabled?: boolean
  /** HTML `autocomplete` token (`username`, `current-password`, `new-password`, `email`…). */
  autoComplete?: string
  /** Password fields only: adds a show/hide button. */
  revealable?: boolean
}

/** Label + shadcn Input + hint/error, styled in the NSIA design language. */
export function FormField({
  id,
  label,
  type = 'text',
  min,
  max,
  step,
  required,
  value,
  onChange,
  onBlur,
  error,
  hint,
  disabled,
  autoComplete,
  revealable,
}: FormFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const canReveal = revealable && type === 'password'
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={canReveal && revealed ? 'text' : type}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          aria-required={required}
          value={value}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          className={cn(
            'h-10 rounded-[10px]',
            canReveal && 'pr-11',
            disabled && 'bg-muted text-muted-foreground',
          )}
        />
        {canReveal && (
          <button
            type="button"
            aria-label={
              revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
            aria-pressed={revealed}
            onClick={() => setRevealed((r) => !r)}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {revealed ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
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
