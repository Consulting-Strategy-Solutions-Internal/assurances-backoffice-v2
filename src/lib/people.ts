/** Nobiliary/linking particles kept in lower case when they are not the first word. */
const PARTICLES = new Set([
  'de',
  'du',
  'des',
  'del',
  'di',
  'da',
  'dos',
  'van',
  'von',
  'der',
  'den',
])

function isAllCaps(word: string): boolean {
  return word === word.toUpperCase() && word !== word.toLowerCase()
}

function letterCount(word: string): number {
  return (word.match(/\p{L}/gu) ?? []).length
}

/** « JEAN-PAUL » → « Jean-Paul », « N'GUESSAN » → « N'Guessan ». */
function titleCaseWord(word: string): string {
  return word
    .toLowerCase()
    .replace(
      /(^|[-'’])(\p{L})/gu,
      (_, sep: string, c: string) => `${sep}${c.toUpperCase()}`,
    )
}

function cleanWord(word: string, index: number): string {
  // Initials (« K. », « A ») and mixed-case words (« McDonald ») are kept as typed.
  if (letterCount(word) < 2 || !isAllCaps(word)) return word
  if (index > 0 && PARTICLES.has(word.toLowerCase())) return word.toLowerCase()
  return titleCaseWord(word)
}

/**
 * Formats a person name for display: trims, collapses whitespace and gives
 * all-caps words a consistent Title Case (« NIAMIEN », « ABOU » →
 * « Niamien Abou »). Mixed-case words are left untouched, particles (« de »,
 * « van »…) stay lower case inside a name. Accepts several parts (first name,
 * last name…) and ignores empty ones.
 */
export function formatPersonName(
  ...parts: (string | null | undefined)[]
): string {
  const words = parts
    .map((p) => p?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
  return words.map(cleanWord).join(' ')
}

/** Up to two uppercase initials from the first and last word of a name. */
export function personInitials(name: string): string {
  const words = formatPersonName(name).split(' ').filter(Boolean)
  if (words.length === 0) return ''
  const first = words[0].charAt(0)
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : ''
  return `${first}${last}`.toUpperCase()
}
