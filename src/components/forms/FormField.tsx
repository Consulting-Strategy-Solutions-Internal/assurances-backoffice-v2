import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

interface FormFieldProps {
  id: string
  label: string
  type?: string
  required?: boolean
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
  disabled?: boolean
}

/** Label + shadcn Input + hint/error, styled in the NSIA design language. */
export function FormField({
  id,
  label,
  type = 'text',
  required,
  value,
  onChange,
  onBlur,
  error,
  hint,
  disabled,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        className={cn('h-10 rounded-[10px]', disabled && 'bg-muted text-muted-foreground')}
      />
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-[12px] font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}
