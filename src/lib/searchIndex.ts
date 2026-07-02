import type { HeadingInfo } from './markdown'

/**
 * Índice de busca por livro, construído sobre o MARKDOWN FONTE — a busca
 * enxerga o livro inteiro, incluindo seções recolhidas, tudo local e
 * offline. Indexação por linha: no corpus os versículos/parágrafos são
 * linhas, então buscas não cruzam linhas (frases não cruzam versículos).
 */

export interface BookIndex {
  lines: string[]
  /** Linhas normalizadas (minúsculas, sem acentos) para busca. */
  normLines: string[]
  headings: HeadingInfo[]
  /** Nome da âncora de bloco (^v1, ^gn-1-1) → linha 1-based. */
  anchorLines: Map<string, number>
  /** Endereço de marcador canônico ([5.4] → "5.4") → linha 1-based. */
  markerLines: Map<string, number>
  /** Prefixo de âncora de versículo (gn, 1co) → presente no livro. */
  versePrefixes: Set<string>
  /** Heading h2 normalizado sem espaços ("genesis") → prefixo ("gn"). */
  bookPrefixByName: Map<string, string>
}

export interface SourceMatch {
  /** Linha 1-based no fonte. */
  line: number
  /** Coluna normalizada dentro da linha (para ordinal estável). */
  normCol: number
}

const MARKS_RE = /[̀-ͯ]/g
const ANCHOR_LINE_RE = /\^([A-Za-z0-9][A-Za-z0-9-]*)\s*$/
const MARKER_RE = /\[(\d+(?:[a-z]\d*)?(?:\.[0-9a-z]+)?)\]/g
const VERSE_ANCHOR_RE = /^([a-z0-9]+?)-(\d+)-(\d+)$/

export function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(MARKS_RE, '')
}

/** Normalização com mapa de índices norm → original (para destacar). */
export function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const n = text[i].toLowerCase().normalize('NFD').replace(MARKS_RE, '')
    for (let j = 0; j < n.length; j++) map.push(i)
    norm += n
  }
  return { norm, map }
}

const indexCache = new Map<string, BookIndex>()

export function getBookIndex(bookId: string, source: string, headings: HeadingInfo[]): BookIndex {
  const cached = indexCache.get(bookId)
  if (cached) return cached

  const lines = source.split('\n')
  const normLines = lines.map(normalizeText)
  const anchorLines = new Map<string, number>()
  const markerLines = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const anchor = ANCHOR_LINE_RE.exec(lines[i])
    if (anchor && !anchorLines.has(anchor[1])) anchorLines.set(anchor[1], i + 1)
    MARKER_RE.lastIndex = 0
    for (const m of lines[i].matchAll(MARKER_RE)) {
      if (!markerLines.has(m[1])) markerLines.set(m[1], i + 1)
    }
  }

  // Prefixos de versículo e associação heading h2 → prefixo (posicional:
  // a primeira âncora prefixo-c-v depois do heading pertence a ele)
  const versePrefixes = new Set<string>()
  const anchorsInOrder: { name: string; line: number }[] = []
  for (const [name, line] of anchorLines) anchorsInOrder.push({ name, line })
  anchorsInOrder.sort((a, b) => a.line - b.line)
  for (const { name } of anchorsInOrder) {
    const vm = VERSE_ANCHOR_RE.exec(name)
    if (vm) versePrefixes.add(vm[1])
  }

  const bookPrefixByName = new Map<string, string>()
  const h2s = headings.filter((h) => h.depth === 2 && h.line !== undefined)
  for (let i = 0; i < h2s.length; i++) {
    const start = h2s[i].line ?? 0
    const end = h2s[i + 1]?.line ?? Infinity
    const first = anchorsInOrder.find((a) => a.line > start && a.line < end)
    const vm = first ? VERSE_ANCHOR_RE.exec(first.name) : null
    if (vm) bookPrefixByName.set(normalizeText(h2s[i].text).replace(/\s+/g, ''), vm[1])
  }

  const index: BookIndex = {
    lines,
    normLines,
    headings,
    anchorLines,
    markerLines,
    versePrefixes,
    bookPrefixByName,
  }
  indexCache.set(bookId, index)
  return index
}

export const SEARCH_CAP = 5000

/** Busca livre no fonte inteiro (guias fechadas incluídas). */
export function searchSource(index: BookIndex, query: string): SourceMatch[] {
  const q = normalizeText(query)
  if (q.length < 2) return []
  const matches: SourceMatch[] = []
  for (let i = 0; i < index.normLines.length; i++) {
    const line = index.normLines[i]
    let col = 0
    while ((col = line.indexOf(q, col)) !== -1) {
      matches.push({ line: i + 1, normCol: col })
      col += q.length
      if (matches.length >= SEARCH_CAP) return matches
    }
  }
  return matches
}

/** Ids das seções (headings) que contêm a linha — para expandir a cadeia. */
export function chainForLine(headings: HeadingInfo[], line: number): string[] {
  const stack: { depth: number; id: string }[] = []
  for (const h of headings) {
    if (h.line === undefined) continue
    if (h.line > line) break
    while (stack.length && stack[stack.length - 1].depth >= h.depth) stack.pop()
    stack.push({ depth: h.depth, id: h.id })
  }
  return stack.map((s) => s.id)
}

export interface ResolvedRef {
  /** Id do elemento alvo no DOM. */
  elementId: string
  /** Linha 1-based no fonte (para expandir a cadeia). */
  line: number
}

/**
 * Busca canônica: resolve "Gn 1:1", "1Co 13:4", "Gênesis 1:1", "1:1"
 * (âncoras de versículo) e "5.4" (marcadores capítulo-seção).
 */
export function resolveReference(index: BookIndex, input: string): ResolvedRef | null {
  const s = normalizeText(input.trim())

  // Capítulo-seção: "5.4" → [5.4] (id marker-5.4)
  const cs = /^(\d+[a-z]?)\.(\d+[a-z]?|[a-z]\d*)$/.exec(s)
  if (cs) {
    const address = `${cs[1]}.${cs[2]}`
    const line = index.markerLines.get(address)
    if (line !== undefined) return { elementId: `marker-${address}`, line }
  }

  // Versículo: "[livro] c:v" (também aceita "c.v" e "c,v")
  const vs = /^(.*?)\s*(\d+)\s*[:.,]\s*(\d+)$/.exec(s)
  if (!vs) return null
  const bookToken = vs[1].replace(/\s+/g, '')
  const chapter = vs[2]
  const verse = vs[3]

  if (bookToken) {
    let prefix: string | undefined
    if (index.versePrefixes.has(bookToken)) {
      prefix = bookToken
    } else {
      for (const [name, p] of index.bookPrefixByName) {
        if (name.startsWith(bookToken)) {
          prefix = p
          break
        }
      }
    }
    if (prefix) {
      const name = `${prefix}-${chapter}-${verse}`
      const line = index.anchorLines.get(name)
      if (line !== undefined) return { elementId: `anchor-${name}`, line }
    }
    return null
  }

  // Sem livro: âncora simples ^vN (interlinear de capítulo único)
  const line = index.anchorLines.get(`v${verse}`)
  if (line !== undefined) return { elementId: `anchor-v${verse}`, line }
  return null
}
