import { useEffect, useRef, useState } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { Button } from '#/components/ui/button'
import { percentToCents } from '#/lib/commission-scheme-validation'
import { cn } from '#/lib/utils'

/** One share of a split; `value` is the draft string (« 60 », « 33,5 »). */
export interface SharePart {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

const TOTAL = 10_000 // 100 % in hundredths of a percent
const STEP = 50 // 0,5 %
// Clearly distinct hues: navy / gold for two parts, navy / sky / gold for three.
const PALETTES: Record<number, readonly string[]> = {
  2: ['#003380', '#e0a800'],
  3: ['#003380', '#6b9bea', '#e0a800'],
}

/** Hundredths of a percent → draft string (« 60 », « 62,5 », « 33,33 »). */
export function centsToPercent(cents: number): string {
  return (cents / 100)
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',')
}

/**
 * Eases a displayed number towards `target` (ease-out, ~280 ms) so the
 * percentages glide while a thumb is dragged instead of flickering.
 * Intermediate values are rounded to 0,1 % to keep the digits calm.
 */
function useTweened(target: number, duration = 280): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  const shownRef = useRef(target)
  shownRef.current = shown

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(target)
      return
    }
    from.current = shownRef.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const value = from.current + (target - from.current) * eased
      setShown(t === 1 ? target : Math.round(value / 10) * 10)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return shown
}

/** Fixed-width, smoothly updating percentage (hundredths of a percent in). */
function AnimatedPercent({ cents }: { cents: number }) {
  const shown = useTweened(cents)
  return (
    // Fixed-width slot holding number + « % » together: the unit hugs the
    // number, and the slot width never changes while the value animates.
    <span className="inline-block min-w-[6.5ch] whitespace-nowrap tabular-nums">
      {(shown / 100).toLocaleString('fr-FR', {
        minimumFractionDigits: cents % 100 === 0 ? 0 : 1,
        maximumFractionDigits:
          cents % 100 === 0 ? (shown % 100 === 0 ? 0 : 1) : 2,
      })}
      <span className="ml-[0.08em] text-[14px] font-bold text-muted-foreground">
        %
      </span>
    </span>
  )
}

/** Default split when the block is still empty (edit mode keeps its values). */
export function defaultSplit(parts: number): number[] {
  return parts === 2 ? [5_000, 5_000] : [4_000, 3_000, 3_000]
}

/** Boundaries (thumb positions) from the parts, and back. */
export function partsToThumbs(parts: number[]): number[] {
  return parts
    .slice(0, -1)
    .map((_, i) => parts.slice(0, i + 1).reduce((sum, p) => sum + p, 0))
}

export function thumbsToParts(thumbs: number[]): number[] {
  const bounds = [0, ...thumbs, TOTAL]
  return bounds.slice(1).map((b, i) => b - bounds[i])
}

/**
 * Splits 100 % between 2 or 3 beneficiaries with a slider: one thumb for two
 * parts, two thumbs for three. The parts always add up to 100 %, so the block
 * total can't be wrong. Keyboard: ←/→ by 0,5 %, Shift+←/→ by 0,01 %, Page
 * ↑/↓ by 5 %. Existing precise values are never snapped until their thumb is
 * moved.
 *
 * When `onConfirmedChange` is given, a block that had to be pre-filled with the
 * default split (`confirmed === false`) is flagged as « à confirmer »: the
 * administrator confirms it explicitly or by moving a thumb (R1-13).
 */
export function ShareSplitter({
  label,
  parts,
  confirmed = true,
  onConfirmedChange,
}: {
  /** Accessible name of the slider (e.g. « Répartition niveau 2 »). */
  label: string
  parts: SharePart[]
  /** False while the displayed split is only the pre-filled default. */
  confirmed?: boolean
  onConfirmedChange?: (confirmed: boolean) => void
}) {
  const cents = parts.map((p) => percentToCents(p.value))
  const complete = cents.every((c): c is number => c !== null)
  const sum = complete ? cents.reduce((s, c) => s + c, 0) : null
  const values = complete && sum === TOTAL ? cents : defaultSplit(parts.length)

  // An empty or inconsistent block starts from a valid default split.
  useEffect(() => {
    if (complete && sum === TOTAL) return
    onConfirmedChange?.(false)
    values.forEach((c, i) => parts[i].onChange(centsToPercent(c)))
    // Only on mount: afterwards the slider keeps the parts consistent.
  }, [])

  const thumbs = partsToThumbs(values)

  // Pushes new thumb positions to the parts (only those that changed).
  function emit(next: number[]) {
    thumbsToParts(next).forEach((c, i) => {
      if (c !== values[i]) parts[i].onChange(centsToPercent(c))
    })
    onConfirmedChange?.(true)
  }

  // Shift+←/→ moves a thumb by 0,01 %: the slider's own step is 0,5 %.
  function fineTune(event: React.KeyboardEvent, index: number) {
    if (!event.shiftKey) return
    const dir =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -1
          : 0
    if (dir === 0) return
    event.preventDefault()
    event.stopPropagation()
    const low = index === 0 ? 0 : thumbs[index - 1]
    const high = index === thumbs.length - 1 ? TOTAL : thumbs[index + 1]
    const moved = Math.min(high, Math.max(low, thumbs[index] + dir))
    if (moved === thumbs[index]) return
    emit(thumbs.map((t, i) => (i === index ? moved : t)))
  }
  const colors = PALETTES[parts.length] ?? PALETTES[3]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {parts.map((part, i) => (
          <div key={part.id} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: colors[i] }}
            />
            <div className="min-w-0">
              <div className="truncate text-[12.5px] text-muted-foreground">
                {part.label}
              </div>
              <div
                id={`${part.id}-value`}
                className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] tabular-nums"
              >
                <AnimatedPercent cents={values[i]} />
              </div>
              {part.error && (
                <p role="alert" className="text-[12px] text-destructive">
                  {part.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <SliderPrimitive.Root
        value={thumbs}
        min={0}
        max={TOTAL}
        step={STEP}
        minStepsBetweenThumbs={0}
        onValueChange={emit}
        aria-label={label}
        className="relative flex h-9 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative flex h-3 w-full grow overflow-hidden rounded-full">
          {values.map((c, i) => (
            <span
              key={parts[i].id}
              className="h-full"
              style={{ width: `${c / 100}%`, backgroundColor: colors[i] }}
            />
          ))}
        </SliderPrimitive.Track>
        {thumbs.map((t, i) => (
          <SliderPrimitive.Thumb
            key={parts[i].id}
            aria-label={`Limite ${parts[i].label} / ${parts[i + 1].label}`}
            onKeyDown={(event) => fineTune(event, i)}
            aria-valuetext={`${parts[i].label} ${centsToPercent(values[i])} %, ${parts[i + 1].label} ${centsToPercent(values[i + 1])} %`}
            className={cn(
              'block size-6 cursor-grab rounded-full border-[3px] border-white bg-card shadow-[0_1px_4px_rgba(0,37,94,0.35)] outline-none transition-shadow active:cursor-grabbing',
              'focus-visible:ring-[4px] focus-visible:ring-ring/40',
            )}
          >
            <span className="sr-only">{centsToPercent(t)} %</span>
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Root>

      <div className="flex justify-between gap-2 text-[11.5px] text-muted-foreground tabular-nums">
        <span>0 %</span>
        <span className="text-center">
          Glissez {thumbs.length > 1 ? 'les curseurs' : 'le curseur'} · ←/→ 0,5
          % · Maj+←/→ 0,01 % · Page ↑/↓ 5 %
        </span>
        <span>100 %</span>
      </div>

      {!confirmed && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#fef3da] px-3.5 py-2.5 text-[12.5px] text-[#8a6600]">
          <span className="min-w-0 flex-1">
            Répartition par défaut : ajustez-la avec le curseur ou confirmez-la
            telle quelle pour pouvoir enregistrer.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-[9px]"
            onClick={() => onConfirmedChange?.(true)}
          >
            Confirmer cette répartition
          </Button>
        </div>
      )}
    </div>
  )
}
