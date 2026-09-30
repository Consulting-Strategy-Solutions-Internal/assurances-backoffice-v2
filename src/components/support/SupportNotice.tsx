import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Lock } from 'lucide-react'
import type { PillTone } from '#/lib/dashboard-theme'
import { cn } from '#/lib/utils'

/** Tinted background + border + dark body text (≥ 7:1) and a coloured icon. */
const TONES: Record<PillTone, string> = {
  info: 'border-[#c9d8f3] bg-[#eef3fc] [&>svg]:text-[#1f53b0]',
  success: 'border-[#bfe3cf] bg-[#edf8f2] [&>svg]:text-[#167347]',
  neutral: 'border-[#dfe2e8] bg-[#f4f5f8] [&>svg]:text-[#5b6577]',
  warning: 'border-[#f1dfae] bg-[#fdf6e4] [&>svg]:text-[#8a6600]',
  danger: 'border-[#efc4c4] bg-[#fdf0f0] [&>svg]:text-[#c0392b]',
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  neutral: Lock,
  warning: AlertTriangle,
  danger: AlertTriangle,
} as const

/** Inline banner used above the thread to explain the ticket state. */
export function SupportNotice({
  tone,
  children,
}: {
  tone: PillTone
  children: ReactNode
}) {
  const Icon = ICONS[tone]
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[13px] leading-relaxed font-medium text-[#0f1b33]',
        TONES[tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
