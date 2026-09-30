import { Check } from 'lucide-react'
import { cn } from '#/lib/utils'

interface StepperProps {
  steps: string[]
  current: number
  onStepClick?: (index: number) => void
}

/**
 * Step indicator. From `sm` up: every step (numbered circle + label). Below
 * `sm` (phones): « Étape n sur N » + the current label and a progress bar,
 * so the wizard never wraps on several lines.
 */
export function Stepper({ steps, current, onStepClick }: StepperProps) {
  const total = steps.length
  const currentLabel = steps.at(current)
  return (
    <>
      <div
        className="sm:hidden"
        role="group"
        aria-label={`Étape ${current + 1} sur ${total}`}
      >
        <p
          aria-current="step"
          className="text-[13.5px] font-semibold text-primary"
        >
          Étape {current + 1} sur {total}
          {currentLabel ? ` · ${currentLabel}` : ''}
        </p>
        <div className="mt-1 flex gap-1" aria-hidden={!onStepClick}>
          {steps.map((label, index) => {
            const bar = (
              <span
                className={cn(
                  'block h-1 w-full rounded-full',
                  index < current
                    ? 'bg-[#1c8a57]'
                    : index === current
                      ? 'bg-primary'
                      : 'bg-border',
                )}
              />
            )
            return onStepClick ? (
              <button
                key={label}
                type="button"
                aria-label={`Étape ${index + 1} : ${label}`}
                onClick={() => onStepClick(index)}
                className="flex h-9 flex-1 cursor-pointer items-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                {bar}
              </button>
            ) : (
              <span key={label} className="flex h-4 flex-1 items-center">
                {bar}
              </span>
            )
          })}
        </div>
      </div>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {steps.map((label, index) => {
          const isActive = index === current
          const isDone = index < current
          return (
            <div key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 text-[13.5px] transition-colors',
                  onStepClick ? 'cursor-pointer' : 'cursor-default',
                  isActive
                    ? 'font-semibold text-primary'
                    : isDone
                      ? 'font-medium text-[#167347]'
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
                  className={cn(
                    'h-px w-8',
                    isDone ? 'bg-[#1c8a57]' : 'bg-border',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
