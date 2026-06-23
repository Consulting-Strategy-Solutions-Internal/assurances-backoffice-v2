interface StepperProps {
  steps: string[]
  current: number
  onStepClick?: (index: number) => void
}

export function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        margin: '16px 0',
      }}
    >
      {steps.map((label, index) => {
        const isActive = index === current
        const isDone = index < current
        return (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                cursor: onStepClick ? 'pointer' : 'default',
                padding: 0,
                color: isActive ? '#111' : isDone ? '#16a34a' : '#9ca3af',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `2px solid ${isActive ? '#111' : isDone ? '#16a34a' : '#d1d5db'}`,
                  fontSize: '13px',
                }}
              >
                {isDone ? '✓' : index + 1}
              </span>
              {label}
            </button>
            {index < steps.length - 1 && (
              <span
                style={{ width: '32px', height: '1px', background: '#d1d5db' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
