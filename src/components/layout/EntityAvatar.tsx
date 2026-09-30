import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { cn } from '#/lib/utils'

export type AvatarTone =
  | 'brand'
  | 'pink'
  | 'blue'
  | 'green'
  | 'gold'
  | 'violet'
  | 'gray'

const TONES: Record<AvatarTone, string> = {
  brand: 'bg-primary/10 text-primary',
  pink: 'bg-[#fbe8f1] text-[#b02a6b]',
  blue: 'bg-[#e7eefb] text-[#1f53b0]',
  green: 'bg-[#e7f6ee] text-[#167347]',
  gold: 'bg-[#fef3da] text-[#8a6600]',
  violet: 'bg-[#efe9fb] text-[#5b3bb0]',
  gray: 'bg-[#f0f1f4] text-[#5b6577]',
}

const AUTO_TONES: AvatarTone[] = [
  'brand',
  'blue',
  'green',
  'gold',
  'violet',
  'pink',
]

/** Stable tone derived from any string (same seed → same colour, always). */
export function toneFromSeed(seed: string): AvatarTone {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AUTO_TONES[hash % AUTO_TONES.length]
}

/** Up to two initials from a display name (« Awa Koné » → « AK », « NSIA » → « N »). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const [first, second] = words
  return (first.charAt(0) + (second ? second.charAt(0) : '')).toUpperCase()
}

interface EntityAvatarProps {
  /** Display name; initials are derived from it unless `initials` is given. */
  name?: string
  initials?: string
  /** Explicit tone. Omit to derive a stable one from `seed ?? name`. */
  tone?: AvatarTone
  seed?: string
  /** Tailwind size/text classes, default `size-9` (use `size-[72px] text-2xl` in a detail header). */
  className?: string
}

/**
 * Round initials avatar for any entity (client, partner, agent, user, role…).
 * The colour is stable per seed so the same entity always looks the same.
 */
export function EntityAvatar({
  name = '',
  initials,
  tone,
  seed,
  className,
}: EntityAvatarProps) {
  const resolved = tone ?? toneFromSeed(seed ?? name)
  return (
    <Avatar className={cn('size-9', className)}>
      <AvatarFallback className={cn('font-bold', TONES[resolved])}>
        {initials ?? initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
