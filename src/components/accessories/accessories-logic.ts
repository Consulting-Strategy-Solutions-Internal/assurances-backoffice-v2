import { formatFcfa } from '#/lib/utils'

export interface Range {
  id?: number
  minPremium: number
  maxPremium: number
}

export interface Overlap<T extends Range> {
  a: T
  b: T
}

export interface Gap {
  /** Première prime non couverte (entier). */
  from: number
  /** Dernière prime non couverte (entier). */
  to: number
}

function sortByMin<T extends Range>(ranges: readonly T[]): T[] {
  return [...ranges].sort(
    (x, y) => x.minPremium - y.minPremium || x.maxPremium - y.maxPremium,
  )
}

/**
 * Paires de tranches qui se chevauchent. Les bornes sont inclusives : deux
 * tranches [0 – 10 000] et [10 000 – 20 000] se chevauchent (10 000 est
 * couvert deux fois).
 */
export function findOverlaps<T extends Range>(
  ranges: readonly T[],
): Overlap<T>[] {
  const sorted = sortByMin(ranges)
  const pairs: Overlap<T>[] = []
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].minPremium > sorted[i].maxPremium) break
      pairs.push({ a: sorted[i], b: sorted[j] })
    }
  }
  return pairs
}

/**
 * Trous entre tranches consécutives (triées par min), bornes inclusives.
 *
 * Règle « entiers d'abord » : les primes sont des montants entiers en FCFA, donc
 * [0 – 10 000] puis [10 001 – …] est continu. Il y a un trou quand
 * `next.min - couvertureMax > 1` ; la zone non couverte va alors de
 * `couvertureMax + 1` à `next.min - 1`. `couvertureMax` est le plus grand max
 * vu jusque-là (robuste aux tranches imbriquées / chevauchantes).
 */
export function findGaps(ranges: readonly Range[]): Gap[] {
  const sorted = sortByMin(ranges)
  const gaps: Gap[] = []
  if (sorted.length === 0) return gaps
  let covered = sorted[0].maxPremium
  for (const next of sorted.slice(1)) {
    if (next.minPremium - covered > 1) {
      gaps.push({ from: covered + 1, to: next.minPremium - 1 })
    }
    covered = Math.max(covered, next.maxPremium)
  }
  return gaps
}

/** Montant sans l'unité (« 10 001 »), l'unité étant portée par la borne haute. */
function plain(value: number): string {
  return formatFcfa(value).replace(/[\s\u00a0\u202f]FCFA$/, '')
}

/** « 1 tranche importée » / « 3 tranches importées ». */
export function formatImportedCount(n: number): string {
  return `${n} tranche${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}`
}

/** « les primes de 10 001 à 14 999 FCFA » (une seule prime si from === to). */
export function describeGap(gap: Gap): string {
  if (gap.from === gap.to) return `la prime de ${formatFcfa(gap.from)}`
  return `les primes de ${plain(gap.from)} à ${formatFcfa(gap.to)}`
}

export function describeRange(range: Range): string {
  return `${plain(range.minPremium)} – ${formatFcfa(range.maxPremium)}`
}

// --- Pré-contrôle du CSV ---------------------------------------------------

export interface CsvBadLine {
  /** Numéro de ligne, en-tête = 1. */
  line: number
  /** productCode trouvé (vide si absent). */
  found: string
}

export interface CsvPrecheck {
  /** Erreur bloquante sur l'en-tête (fichier vide, colonne manquante…). */
  headerError: string | null
  /** Nombre de lignes de données non vides. */
  rowCount: number
  /** Lignes dont le productCode diffère de celui attendu. */
  badLines: CsvBadLine[]
}

export const CSV_HEADER = 'productCode,minPremium,maxPremium,amount'

function unquote(cell: string): string {
  const t = cell.trim()
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"')
    ? t.slice(1, -1).trim()
    : t
}

function normalizeHeaderCell(cell: string): string {
  return unquote(cell).replace(/\s+/g, '').toLowerCase()
}

/**
 * Vérifie côté navigateur que chaque ligne cible bien le produit de l'écran. Seul le
 * `productCode` est contrôlé ici, le reste est validé par le serveur.
 * Séparateur (`,` ou `;`) détecté sur l'en-tête ; lignes vides ignorées ;
 * numérotation physique (en-tête = 1).
 */
export function precheckAccessoriesCsv(
  text: string,
  expectedProductCode: number | string,
): CsvPrecheck {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const lines = withoutBom.split(/\r\n|\n|\r/)
  const headerIndex = lines.findIndex((l) => l.trim() !== '')
  if (headerIndex === -1) {
    return { headerError: 'Le fichier est vide.', rowCount: 0, badLines: [] }
  }
  const headerLine = lines[headerIndex]
  const separator =
    headerLine.split(';').length > headerLine.split(',').length ? ';' : ','
  const columns = headerLine.split(separator).map(normalizeHeaderCell)
  const codeColumn = columns.indexOf('productcode')
  if (codeColumn === -1) {
    return {
      headerError: `En-tête manquant ou invalide : la première ligne doit être « ${CSV_HEADER} ».`,
      rowCount: 0,
      badLines: [],
    }
  }

  const expected = String(expectedProductCode)
  const badLines: CsvBadLine[] = []
  let rowCount = 0
  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    rowCount++
    const cells = lines[i].split(separator)
    const found = codeColumn < cells.length ? unquote(cells[codeColumn]) : ''
    if (found !== expected) badLines.push({ line: i + 1, found })
  }
  if (rowCount === 0) {
    return {
      headerError: 'Le fichier ne contient aucune tranche.',
      rowCount,
      badLines,
    }
  }
  return { headerError: null, rowCount, badLines }
}

export function buildCsvTemplate(productCode: number | string): string {
  return `${CSV_HEADER}\n${productCode},0,10000,500\n${productCode},10001,50000,1000\n`
}
