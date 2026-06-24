import { Check } from 'lucide-react'
import { cn } from '#/lib/utils'

interface StepperProps {
  steps: string[]
  current: number
  onStepClick?: (index: number) => void
}

export function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((label, index) => {
        const isActive = index === current
        const isDone = index < current
        return (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              className={cn(
                'flex items-center gap-2 text-[13.5px] transition-colors',
                onStepClick ? 'cursor-pointer' : 'cursor-default',
                isActive
                  ? 'font-semibold text-primary'
                  : isDone
                    ? 'font-medium text-[#1c8a57]'
                    : 'font-medium text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 text-[12.5px] font-bold',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isDone
                      ? 'border-[#1c8a57] bg-[#1c8a57] text-white'
                      : 'border-[#d1d5db] text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-3.5" /> : index + 1}
              </span>
              {label}
            </button>
            {index < steps.length - 1 && (
              <span
                className={cn('h-px w-8', isDone ? 'bg-[#1c8a57]' : 'bg-border')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
