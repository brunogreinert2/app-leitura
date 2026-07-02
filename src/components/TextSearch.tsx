import { useEffect, useRef, useState, type RefObject } from 'react'

interface Props {
  bodyRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  /** Muda quando o corpo re-renderiza (livro/fonte), para refazer os destaques. */
  contentVersion: unknown
}

const MARKS_RE = /[̀-ͯ]/g

/**
 * Texto normalizado (minúsculas, sem acentos) + mapa de cada posição
 * normalizada para a posição no texto original do nó.
 */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const n = text[i].toLowerCase().normalize('NFD').replace(MARKS_RE, '')
    for (let j = 0; j < n.length; j++) map.push(i)
    norm += n
  }
  return { norm, map }
}

function findRanges(root: HTMLElement, query: string): Range[] {
  const { norm: q } = normalizeWithMap(query)
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

const supportsHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS

export function TextSearch({ bodyRef, open, onClose, contentVersion }: Props) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Range[]>([])
  const [current, setCurrent] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Busca (com debounce) e destaque de todas as ocorrências
  useEffect(() => {
    if (!open || !query.trim() || !bodyRef.current) {
      setMatches([])
      if (supportsHighlight) {
        CSS.highlights.delete('busca')
        CSS.highlights.delete('busca-atual')
      }
      return
    }
    const timer = window.setTimeout(() => {
      const found = findRanges(bodyRef.current!, query.trim())
      setMatches(found)
      setCurrent(0)
      if (supportsHighlight) CSS.highlights.set('busca', new Highlight(...found))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [open, query, bodyRef, contentVersion])

  // Destaque e rolagem da ocorrência atual
  useEffect(() => {
    const range = matches[current]
    if (!range) {
      if (supportsHighlight) CSS.highlights.delete('busca-atual')
      return
    }
    if (supportsHighlight) CSS.highlights.set('busca-atual', new Highlight(range))
    // Rola até a ocorrência em si (não o parágrafo inteiro)
    const rect = range.getBoundingClientRect()
    window.scrollBy({ top: rect.top - window.innerHeight / 2 })
  }, [matches, current])

  useEffect(() => {
    return () => {
      if (supportsHighlight) {
        CSS.highlights.delete('busca')
        CSS.highlights.delete('busca-atual')
      }
    }
  }, [])

  if (!open) return null

  const next = () => setCurrent((c) => (matches.length ? (c + 1) % matches.length : 0))
  const prev = () =>
    setCurrent((c) => (matches.length ? (c - 1 + matches.length) % matches.length : 0))

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
        placeholder="Buscar no texto…"
        aria-label="Buscar no texto"
      />
      <span className="text-search-count" aria-live="polite">
        {query.trim() ? (matches.length ? `${current + 1}/${matches.length}` : '0') : ''}
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
