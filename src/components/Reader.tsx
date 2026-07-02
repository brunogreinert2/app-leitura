import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogEntry } from '../types'
import { parseBook } from '../lib/markdown'
import { FootnoteContext, type FootnoteActions } from './footnoteContext'
import { Sidebar } from './Sidebar'
import { FontControls, useFontSize, usePinchFontSize } from './FontControls'

interface Props {
  entry: CatalogEntry
  onBack: () => void
}

interface OpenNote {
  label: string
  /** Posição vertical da caixa, relativa ao container do texto. */
  top: number
  html: string
}

/** Conteúdo renderizado da nota, sem o backref (a caixa tem o próprio fechar). */
function noteHtml(label: string): string {
  const li = document.getElementById(`user-content-fn-${label}`)
  if (!li) return '<p>Nota não encontrada.</p>'
  const clone = li.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-footnote-backref]').forEach((el) => el.remove())
  return clone.innerHTML
}

export function Reader({ entry, onBack }: Props) {
  const [raw, setRaw] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<OpenNote | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const { px, setPx, decrease, increase } = useFontSize()
  const bodyRef = useRef<HTMLElement>(null)
  usePinchFontSize(bodyRef, px, setPx)

  useEffect(() => {
    let cancelled = false
    fetch(`${import.meta.env.BASE_URL}livros/${entry.arquivo}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((text) => {
        if (!cancelled) setRaw(text)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [entry])

  const parsed = useMemo(() => (raw !== null ? parseBook(raw) : null), [raw])

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
        <button className="back-button" onClick={onBack} aria-label="Voltar ao catálogo">
          ← Catálogo
        </button>
        <span className="reader-title">{entry.titulo}</span>
        <FontControls decrease={decrease} increase={increase} />
        <button
          className="toc-button"
          onClick={() => setTocOpen(true)}
          aria-label="Abrir sumário"
        >
          ☰
        </button>
      </header>

      <Sidebar
        headings={parsed?.headings ?? []}
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        onNavigate={(id) => {
          setTocOpen(false)
          document.getElementById(id)?.scrollIntoView()
        }}
      />

      <FootnoteContext.Provider value={footnoteActions}>
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
        </article>
      </FootnoteContext.Provider>
    </div>
  )
}
