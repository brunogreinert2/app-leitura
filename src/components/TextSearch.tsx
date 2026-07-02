import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { HeadingInfo } from '../lib/markdown'
import {
  getBookIndex,
  searchSource,
  chainForLine,
  resolveReference,
  normalizeWithMap,
  normalizeText,
  SEARCH_CAP,
  type SourceMatch,
  type ResolvedRef,
} from '../lib/searchIndex'

interface Props {
  bodyRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  /** Muda quando o corpo re-renderiza (fonte/colapso), para refazer destaques. */
  contentVersion: unknown
  /** Busca disparada de fora (ex.: índice de nomes); nonce força reaplicar. */
  seed?: { query: string; nonce: number }
  bookId: string
  source: string
  headings: HeadingInfo[]
  collapsed: Set<string>
  /** Reabre as seções da cadeia (ids) para navegar até um resultado. */
  expandChain: (ids: string[]) => void
}

/** Ocorrências no DOM visível (para destacar), acento-insensível. */
function findRanges(root: HTMLElement, query: string): Range[] {
  const q = normalizeText(query)
  if (!q) return []
  const ranges: Range[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.nodeValue ?? ''
    const { norm, map } = normalizeWithMap(text)
    let i = 0
    while ((i = norm.indexOf(q, i)) !== -1) {
      const range = new Range()
      range.setStart(node, map[i])
      range.setEnd(node, map[i + q.length - 1] + 1)
      ranges.push(range)
      i += q.length
    }
  }
  return ranges
}

/** Cadeia de seções de cada match, num único passe (ambos em ordem). */
function chainsForMatches(headings: HeadingInfo[], matches: SourceMatch[]): string[][] {
  const chains: string[][] = []
  const stack: { depth: number; id: string }[] = []
  let h = 0
  for (const m of matches) {
    while (h < headings.length) {
      const heading = headings[h]
      if (heading.line === undefined) {
        h++
        continue
      }
      if (heading.line > m.line) break
      while (stack.length && stack[stack.length - 1].depth >= heading.depth) stack.pop()
      stack.push({ depth: heading.depth, id: heading.id })
      h++
    }
    chains.push(stack.map((s) => s.id))
  }
  return chains
}

const supportsHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function TextSearch({
  bodyRef,
  open,
  onClose,
  contentVersion,
  seed,
  bookId,
  source,
  headings,
  collapsed,
  expandChain,
}: Props) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<SourceMatch[]>([])
  const [chains, setChains] = useState<string[][]>([])
  const [refTarget, setRefTarget] = useState<ResolvedRef | null>(null)
  const [current, setCurrent] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  // Cancela navegações assíncronas obsoletas
  const navToken = useRef(0)
  // Estado mais recente para os loops assíncronos
  const collapsedRef = useRef(collapsed)
  collapsedRef.current = collapsed

  const index = useMemo(
    () => (source ? getBookIndex(bookId, source, headings) : null),
    [bookId, source, headings],
  )

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (seed && seed.nonce > 0) setQuery(seed.query)
  }, [seed])

  // Busca no FONTE (livro inteiro, guias fechadas incluídas) + referência
  useEffect(() => {
    if (!open || !query.trim() || !index) {
      setMatches([])
      setChains([])
      setRefTarget(null)
      setCurrent(-1)
      return
    }
    const timer = window.setTimeout(() => {
      const q = query.trim()
      setRefTarget(resolveReference(index, q))
      const found = searchSource(index, q)
      setMatches(found)
      setChains(chainsForMatches(headings, found))
      setCurrent(-1)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [open, query, index, headings])

  // Destaque de tudo que está visível no DOM
  useEffect(() => {
    if (!supportsHighlight) return
    if (!open || !query.trim() || !bodyRef.current) {
      CSS.highlights.delete('busca')
      return
    }
    const ranges = findRanges(bodyRef.current, query.trim())
    CSS.highlights.set('busca', new Highlight(...ranges))
  }, [open, query, bodyRef, contentVersion])

  useEffect(() => {
    return () => {
      if (supportsHighlight) {
        CSS.highlights.delete('busca')
        CSS.highlights.delete('busca-atual')
      }
    }
  }, [])

  if (!open) return null

  /** Navega até o match i: expande a cadeia e destaca a ocorrência exata. */
  const navigateTo = async (i: number) => {
    const match = matches[i]
    const chain = chains[i]
    if (!match || !chain) return
    setCurrent(i)
    const token = ++navToken.current

    const toExpand = chain.filter((id) => collapsedRef.current.has(id))
    if (toExpand.length) expandChain(chain)

    // Ordinal do match entre os que ficarão visíveis (ordem do fonte =
    // ordem do DOM), para achar o Range certo depois do re-render
    const expandedSet = new Set(toExpand)
    const visibleBefore = (idx: number) => {
      let k = 0
      for (let j = 0; j < idx; j++) {
        if (chains[j].every((id) => !collapsedRef.current.has(id) || expandedSet.has(id))) k++
      }
      return k
    }
    const k = visibleBefore(i)

    for (let attempt = 0; attempt < 15; attempt++) {
      if (navToken.current !== token) return
      const body = bodyRef.current
      if (body) {
        const ranges = findRanges(body, query.trim())
        const range = ranges[k]
        if (range) {
          if (supportsHighlight) CSS.highlights.set('busca-atual', new Highlight(range))
          const rect = range.getBoundingClientRect()
          window.scrollBy({ top: rect.top - window.innerHeight / 2 })
          return
        }
      }
      await sleep(80)
    }
  }

  /** Salto canônico: expande a cadeia do alvo e rola até a âncora. */
  const jumpToRef = async (target: ResolvedRef) => {
    const token = ++navToken.current
    expandChain(chainForLine(headings, target.line))
    for (let attempt = 0; attempt < 15; attempt++) {
      if (navToken.current !== token) return
      const el = document.getElementById(target.elementId)
      if (el) {
        el.scrollIntoView({ block: 'center' })
        el.classList.add('ref-flash')
        window.setTimeout(() => el.classList.remove('ref-flash'), 1600)
        return
      }
      await sleep(80)
    }
  }

  const next = () => {
    if (refTarget) return void jumpToRef(refTarget)
    if (!matches.length) return
    void navigateTo(current + 1 >= matches.length ? 0 : current + 1)
  }
  const prev = () => {
    if (refTarget) return void jumpToRef(refTarget)
    if (!matches.length) return
    void navigateTo(current - 1 < 0 ? matches.length - 1 : current - 1)
  }

  const countLabel = !query.trim()
    ? ''
    : refTarget
      ? '→ ref'
      : matches.length === 0
        ? '0'
        : `${current + 1 > 0 ? current + 1 : '–'}/${matches.length}${
            matches.length >= SEARCH_CAP ? '+' : ''
          }`

  return (
    <div className="text-search" role="search">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) prev()
            else next()
          }
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Buscar no texto ou referência (Gn 1:1)…"
        aria-label="Buscar no texto ou por referência canônica"
      />
      <span className="text-search-count" aria-live="polite">
        {countLabel}
      </span>
      <button className="text-search-button" onClick={prev} aria-label="Ocorrência anterior">
        ▲
      </button>
      <button className="text-search-button" onClick={next} aria-label="Próxima ocorrência">
        ▼
      </button>
      <button className="text-search-button" onClick={onClose} aria-label="Fechar busca">
        ✕
      </button>
    </div>
  )
}
