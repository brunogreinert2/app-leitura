import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogEntry } from '../types'
import { parseBook, type ParsedBook } from '../lib/markdown'
import { FootnoteContext, type FootnoteActions } from './footnoteContext'
import { Sidebar } from './Sidebar'
import { FontControls, useFontSize, usePinchFontSize } from './FontControls'
import { TextSearch } from './TextSearch'
import { CollapseContext } from './collapseContext'
import { WikilinkContext, type WikilinkActions } from './wikilinkContext'
import { buildCopyText } from '../lib/copyBook'

/** Acima deste tamanho o livro abre com as seções recolhidas (performance). */
const LARGE_BOOK_CHARS = 400_000

/** Parse de livro grande é caro: reabrir na mesma sessão sai do cache. */
const parseCache = new Map<string, ParsedBook>()

interface Props {
  entry: CatalogEntry
  onBack: () => void
  onOpenLibrary: () => void
}

interface OpenNote {
  label: string
  /** Posição vertical da caixa, relativa ao container do texto. */
  top: number
  html: string
}

interface OpenWikilink {
  target: string
  top: number
}

/** Conteúdo renderizado da nota, sem o backref (a caixa tem o próprio fechar). */
function noteHtml(label: string): string {
  const li = document.getElementById(`user-content-fn-${label}`)
  if (!li) return '<p>Nota não encontrada.</p>'
  const clone = li.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-footnote-backref]').forEach((el) => el.remove())
  return clone.innerHTML
}

export function Reader({ entry, onBack, onOpenLibrary }: Props) {
  const [parsed, setParsed] = useState<ParsedBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<OpenNote | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [wikilink, setWikilink] = useState<OpenWikilink | null>(null)
  const [searchSeed, setSearchSeed] = useState<{ query: string; nonce: number }>({
    query: '',
    nonce: 0,
  })
  const { px, setPx, decrease, increase } = useFontSize()
  const bodyRef = useRef<HTMLElement>(null)
  usePinchFontSize(bodyRef, px, setPx)

  // Ctrl+F abre a busca interna em vez da do navegador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let cancelled = false
    // Estado do livro anterior não vaza para o novo
    setParsed(null)
    setError(null)
    setNote(null)
    setWikilink(null)
    setCollapsed(new Set())
    fetch(`${import.meta.env.BASE_URL}livros/${entry.arquivo}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (cancelled) return
        let book = parseCache.get(entry.id)
        if (!book) {
          book = parseBook(text)
          parseCache.set(entry.id, book)
        }
        // Livro grande (ex.: Bíblia completa) precisa nascer com as
        // seções de topo recolhidas, ANTES do primeiro render do corpo:
        // só os títulos montam no DOM — abrir e rolar ficam leves
        if (book.source.length > LARGE_BOOK_CHARS) {
          setCollapsed(new Set(book.headings.filter((h) => h.depth === 2).map((h) => h.id)))
        }
        setParsed(book)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [entry])

  const wikilinkActions = useMemo<WikilinkActions>(
    () => ({
      preview: (target, anchor) => {
        const container = bodyRef.current
        if (!container) return
        const top =
          anchor.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 8
        setWikilink({ target, top })
      },
      navigate: (target) => {
        // Navegação real chega com a importação de verbetes (Fase 3)
        setToast(`“${target}” ainda não está disponível no app`)
        window.setTimeout(() => setToast(null), 2000)
      },
    }),
    [],
  )

  const collapseState = useMemo(
    () => ({
      collapsed,
      toggle: (id: string) =>
        setCollapsed((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        }),
    }),
    [collapsed],
  )

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2000)
  }

  const doCopy = (onlyVisible: boolean) => {
    if (!parsed) return
    const text = buildCopyText(parsed.source, parsed.headings, collapsed, onlyVisible)
    navigator.clipboard
      .writeText(text)
      .then(() => showToast('Copiado!'))
      .catch(() => showToast('Não foi possível copiar'))
    setCopyDialogOpen(false)
  }

  const requestCopy = () => {
    setTocOpen(false)
    // Sem seção recolhida não há o que perguntar: copia tudo
    if (collapsed.size === 0) doCopy(false)
    else setCopyDialogOpen(true)
  }

  const footnoteActions = useMemo<FootnoteActions>(
    () => ({
      open: (label, anchor) => {
        const container = bodyRef.current
        if (!container) return
        const top =
          anchor.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 8
        setNote({ label, top, html: noteHtml(label) })
      },
      openList: () => {
        setNote(null)
        document.getElementById('footnote-label')?.scrollIntoView()
      },
    }),
    [],
  )

  useEffect(() => {
    if (!note) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNote(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [note])

  return (
    <div className="reader">
      <header className="reader-header">
        <button
          className="library-button"
          onClick={onOpenLibrary}
          aria-label="Abrir biblioteca (pastas e pesquisa)"
        >
          📚
        </button>
        <button className="back-button" onClick={onBack} aria-label="Voltar ao catálogo">
          ←
        </button>
        <span className="reader-title">{entry.titulo}</span>
        <button
          className="search-button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="Buscar no texto"
        >
          🔍
        </button>
        <FontControls decrease={decrease} increase={increase} />
        <button
          className="toc-button"
          onClick={() => setTocOpen(true)}
          aria-label="Abrir sumário"
        >
          ☰
        </button>
      </header>

      <TextSearch
        bodyRef={bodyRef}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        contentVersion={`${entry.id}:${px}:${parsed !== null}:${[...collapsed].sort().join(',')}`}
        seed={searchSeed}
      />

      <Sidebar
        headings={parsed?.headings ?? []}
        names={parsed?.names ?? []}
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        onNavigate={(id) => {
          setTocOpen(false)
          // Navegar para uma seção recolhida (ou dentro de uma) reabre
          // o alvo e todos os seus ancestrais
          const headings = parsed?.headings ?? []
          const toExpand = new Set<string>([id])
          const stack: { depth: number; id: string }[] = []
          for (const h of headings) {
            while (stack.length && stack[stack.length - 1].depth >= h.depth) stack.pop()
            if (h.id === id) {
              for (const a of stack) toExpand.add(a.id)
              break
            }
            stack.push({ depth: h.depth, id: h.id })
          }
          setCollapsed((prev) => {
            const next = new Set(prev)
            for (const e of toExpand) next.delete(e)
            return next
          })
          requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
        }}
        onCollapseAll={() =>
          setCollapsed(new Set((parsed?.headings ?? []).filter((h) => h.depth >= 2).map((h) => h.id)))
        }
        onExpandAll={() => setCollapsed(new Set())}
        onCopy={requestCopy}
        onSelectName={(name) => {
          // Tap num nome do índice: joga o nome na busca — todas as
          // ocorrências destacadas e navegáveis
          setTocOpen(false)
          setSearchOpen(true)
          setSearchSeed((s) => ({ query: name, nonce: s.nonce + 1 }))
        }}
      />

      <FootnoteContext.Provider value={footnoteActions}>
        <WikilinkContext.Provider value={wikilinkActions}>
        <CollapseContext.Provider value={collapseState}>
        <article
          className="reader-body"
          ref={bodyRef}
          style={{ '--reading-font-size': `${px}px` } as React.CSSProperties}
        >
          {error && <p className="reader-error">Não foi possível carregar o livro: {error}</p>}
          {!parsed && !error && <p className="reader-loading">Carregando…</p>}
          {parsed?.body}

          {note && (
            <aside
              className="footnote-box"
              style={{ top: note.top }}
              role="dialog"
              aria-label={`Nota ${note.label}`}
            >
              <div
                className="footnote-box-content"
                dangerouslySetInnerHTML={{ __html: note.html }}
              />
              <button
                className="footnote-box-close"
                onClick={() => setNote(null)}
                aria-label="Voltar ao texto"
              >
                ✕ Voltar ao texto
              </button>
            </aside>
          )}

          {wikilink && (
            <aside
              className="footnote-box wikilink-box"
              style={{ top: wikilink.top }}
              role="dialog"
              aria-label={`Verbete ${wikilink.target}`}
            >
              <p className="wikilink-box-title">{wikilink.target}</p>
              <p className="wikilink-box-note">
                Verbete do vault — ainda não incluído no app. A importação de verbetes chega
                numa próxima fase.
              </p>
              <button
                className="footnote-box-close"
                onClick={() => setWikilink(null)}
                aria-label="Voltar ao texto"
              >
                ✕ Voltar ao texto
              </button>
            </aside>
          )}
        </article>
        </CollapseContext.Provider>
        </WikilinkContext.Provider>
      </FootnoteContext.Provider>

      {copyDialogOpen && (
        <>
          <div
            className="sidebar-backdrop"
            onClick={() => setCopyDialogOpen(false)}
            aria-hidden="true"
          />
          <div className="copy-dialog" role="dialog" aria-label="O que copiar?">
            <h2>Copiar livro</h2>
            <p>Há seções recolhidas. O que copiar?</p>
            <button className="copy-dialog-option" onClick={() => doCopy(true)}>
              Só o visível
              <span className="copy-dialog-hint">seções recolhidas entram só com o título</span>
            </button>
            <button className="copy-dialog-option" onClick={() => doCopy(false)}>
              Todo o conteúdo
              <span className="copy-dialog-hint">ignora o recolhimento</span>
            </button>
            <button className="copy-dialog-cancel" onClick={() => setCopyDialogOpen(false)}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
