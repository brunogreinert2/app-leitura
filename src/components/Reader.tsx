import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CatalogEntry, PersonEntry } from '../types'
import { parseBook, parseTxt, type ParsedBook } from '../lib/markdown'
import { getLocalFile } from '../lib/localFiles'
import { resolvePerson, type PersonRegistry } from '../lib/persons'
import { loadBookState, saveBookState, saveLastBook } from '../lib/bookState'
import { useWakeLock } from '../lib/useWakeLock'
import { FootnoteContext, type FootnoteActions } from './footnoteContext'
import { Sidebar } from './Sidebar'
import { FontControls, useFontSize, usePinchFontSize } from './FontControls'
import { TextSearch } from './TextSearch'
import { DetailsDialog } from './DetailsDialog'
import { TtsControl } from './TtsControl'
import { CollapseContext } from './collapseContext'
import { WikilinkContext, type WikilinkActions } from './wikilinkContext'
import { buildCopyText } from '../lib/copyBook'
import { getBookIndex, chainForLine, resolveReference } from '../lib/searchIndex'

/** Destaque temporário no bloco alvo de um salto. */
function flash(el: Element) {
  el.classList.add('ref-flash')
  window.setTimeout(() => el.classList.remove('ref-flash'), 1600)
}

/** Parse de livro grande é caro: reabrir na mesma sessão sai do cache. */
const parseCache = new Map<string, ParsedBook>()

/** Texto local editado: o próximo open re-parseia. */
export function invalidateBookCache(id: string) {
  parseCache.delete(id)
}

interface Props {
  entry: CatalogEntry
  /** Referência canônica vinda de um link permanente (#/livro/id/ref). */
  initialRef?: string
  /**
   * false para o guia de boas-vindas: ele é só a tela inicial transitória,
   * nunca deve contar como "o último livro lido" (senão apaga a memória
   * do livro de cabeceira real a cada abertura do app).
   */
  trackAsLastBook?: boolean
  /** Presente quando o texto é do usuário: habilita a ação Editar. */
  onEditLocal?: () => void
  personRegistry: PersonRegistry
  onBack: () => void
  onOpenPerson: (entry: CatalogEntry) => void
  onOpenLibrary: () => void
  onOpenAppearance: () => void
}

function personToEntry(p: PersonEntry): CatalogEntry {
  return { id: p.id, titulo: p.nome, autor: 'Personagem', arquivo: p.arquivo }
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
  /** Verbete resolvido (null = alvo fora do app). */
  person: PersonEntry | null
  /** Conteúdo renderizado do verbete (null = carregando). */
  body: ReactNode | null
}

/** Conteúdo renderizado da nota, sem o backref (a caixa tem o próprio fechar). */
function noteHtml(label: string): string {
  const li = document.getElementById(`user-content-fn-${label}`)
  if (!li) return '<p>Nota não encontrada.</p>'
  const clone = li.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-footnote-backref]').forEach((el) => el.remove())
  return clone.innerHTML
}

export function Reader({
  entry,
  initialRef,
  trackAsLastBook = true,
  onEditLocal,
  personRegistry,
  onBack,
  onOpenPerson,
  onOpenLibrary,
  onOpenAppearance,
}: Props) {
  const [parsed, setParsed] = useState<ParsedBook | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<OpenNote | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [wikilink, setWikilink] = useState<OpenWikilink | null>(null)
  const [searchSeed, setSearchSeed] = useState<{ query: string; nonce: number }>({
    query: '',
    nonce: 0,
  })
  const { px, setPx, decrease, increase } = useFontSize()
  const bodyRef = useRef<HTMLElement>(null)
  usePinchFontSize(bodyRef, px, setPx)
  // Livro aberto na tela: tela não escurece nem bloqueia sozinha
  useWakeLock()
  // Estado mais recente para callbacks estáveis (backToRef)
  const parsedRef = useRef<ParsedBook | null>(null)

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
    // Memória de livro de cabeceira: este é agora o último livro aberto
    if (trackAsLastBook) saveLastBook(entry.id)
    // Arquivos importados vêm do IndexedDB; embarcados, da rede/cache
    const load: Promise<{ text: string; tipo: 'md' | 'txt' }> = entry.local
      ? getLocalFile(entry.id).then((f) => {
          if (!f) throw new Error('Arquivo removido do aparelho')
          return { text: f.conteudo, tipo: f.tipo }
        })
      : fetch(`${import.meta.env.BASE_URL}livros/${entry.arquivo}`)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.text()
          })
          .then((text) => ({
            text,
            tipo: /\.txt$/i.test(entry.arquivo) ? ('txt' as const) : ('md' as const),
          }))

    load
      .then(({ text, tipo }) => {
        if (cancelled) return
        let book = parseCache.get(entry.id)
        if (!book) {
          book = tipo === 'txt' ? parseTxt(text) : parseBook(text)
          parseCache.set(entry.id, book)
        }
        // Heading inicia recolhido por padrão (conteúdo só aparece com
        // toque explícito — de quebra, a Bíblia inteira abre leve), MAS
        // se o usuário já leu este livro antes, reabre exatamente as
        // seções que ele deixou abertas.
        const allIds = book.headings.map((h) => h.id)
        const saved = loadBookState(entry.id)
        if (saved) {
          const expanded = new Set(saved.expanded)
          setCollapsed(new Set(allIds.filter((id) => !expanded.has(id))))
        } else {
          setCollapsed(new Set(allIds))
        }
        setParsed(book)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [entry, trackAsLastBook])

  const wikilinkActions = useMemo<WikilinkActions>(
    () => ({
      preview: (target, anchor) => {
        const container = bodyRef.current
        if (!container) return
        const top =
          anchor.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 8
        const person = resolvePerson(personRegistry, target)
        setWikilink({ target, top, person, body: null })
        if (!person) return
        // Carrega o verbete e injeta o conteúdo renderizado no preview
        const cached = parseCache.get(person.id)
        const load = cached
          ? Promise.resolve(cached)
          : fetch(`${import.meta.env.BASE_URL}livros/${person.arquivo}`)
              .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.text()
              })
              .then((text) => {
                const parsed = parseBook(text)
                parseCache.set(person.id, parsed)
                return parsed
              })
        load
          .then((parsed) => {
            setWikilink((w) =>
              w && w.target === target ? { ...w, body: parsed.body } : w,
            )
          })
          .catch(() => {
            setWikilink((w) => (w && w.target === target ? { ...w, person: null } : w))
          })
      },
      navigate: (target) => {
        const person = resolvePerson(personRegistry, target)
        if (person) {
          setWikilink(null)
          onOpenPerson(personToEntry(person))
        } else {
          setToast(`“${target}” ainda não está disponível no app`)
          window.setTimeout(() => setToast(null), 2000)
        }
      },
    }),
    [personRegistry, onOpenPerson],
  )

  parsedRef.current = parsed

  // Link permanente com passagem (#/livro/id/Sl 23:1): salta ao alvo
  const initialRefDone = useRef(false)
  useEffect(() => {
    if (!parsed || !initialRef || initialRefDone.current) return
    initialRefDone.current = true
    const index = getBookIndex(entry.id, parsed.source, parsed.headings)
    const target = resolveReference(index, initialRef)
    if (!target) return
    setCollapsed((prev) => {
      const next = new Set(prev)
      for (const id of chainForLine(parsed.headings, target.line)) next.delete(id)
      return next
    })
    let tries = 0
    const attempt = () => {
      const el = document.getElementById(target.elementId)
      if (el) {
        el.scrollIntoView({ block: 'center' })
        flash(el)
      } else if (tries++ < 15) {
        window.setTimeout(attempt, 80)
      }
    }
    attempt()
  }, [parsed, initialRef, entry.id])

  // Sem link permanente: volta exatamente à rolagem de onde parou
  useEffect(() => {
    if (!parsed || initialRef) return
    const saved = loadBookState(entry.id)
    if (!saved?.scroll) return
    // Duplo rAF: espera o layout assentar (seções restauradas) antes de rolar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: saved.scroll }))
    })
  }, [parsed, initialRef, entry.id])

  // Salva rolagem + seções abertas continuamente (livro de cabeceira)
  const collapsedRef = useRef(collapsed)
  collapsedRef.current = collapsed
  useEffect(() => {
    if (!parsed) return
    const headingIds = parsed.headings.map((h) => h.id)
    const persist = () => {
      const expanded = headingIds.filter((id) => !collapsedRef.current.has(id))
      saveBookState(entry.id, { scroll: window.scrollY, expanded })
    }
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        persist()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', persist)
    window.addEventListener('pagehide', persist)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', persist)
      window.removeEventListener('pagehide', persist)
      if (raf) window.cancelAnimationFrame(raf)
      persist()
    }
  }, [parsed, entry.id])

  // Recolher/expandir seção conta como progresso: salva na hora, sem esperar rolar
  useEffect(() => {
    if (!parsed) return
    const headingIds = parsed.headings.map((h) => h.id)
    const expanded = headingIds.filter((id) => !collapsed.has(id))
    saveBookState(entry.id, { scroll: window.scrollY, expanded })
  }, [collapsed, parsed, entry.id])

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
      openList: (label) => {
        // Long press: direto NESTA nota na lista (não no topo da lista)
        setNote(null)
        const el = document.getElementById(`user-content-fn-${label}`)
        if (el) {
          el.scrollIntoView({ block: 'center' })
          flash(el)
        }
      },
      backToRef: (refElementId) => {
        setNote(null)
        const book = parsedRef.current
        if (!book) return
        // A chamada pode estar em seção recolhida: acha a linha da
        // 1ª ocorrência de [^label] no fonte e expande a cadeia
        const el = document.getElementById(refElementId)
        if (!el) {
          let label = refElementId.replace(/^user-content-fnref-/, '')
          const index = getBookIndex(entry.id, book.source, book.headings)
          const findLine = (lab: string) =>
            index.lines.findIndex(
              (l) => l.includes(`[^${lab}]`) && !l.trimStart().startsWith(`[^${lab}]:`),
            )
          let lineIdx = findLine(label)
          if (lineIdx === -1 && /-\d+$/.test(label)) {
            // chamadas repetidas ganham sufixo -2, -3... do renderizador
            label = label.replace(/-\d+$/, '')
            lineIdx = findLine(label)
          }
          if (lineIdx !== -1) {
            const chain = chainForLine(book.headings, lineIdx + 1)
            setCollapsed((prev) => {
              const next = new Set(prev)
              for (const id of chain) next.delete(id)
              return next
            })
          }
        }
        // Aguarda a seção montar e rola até a chamada
        let tries = 0
        const attempt = () => {
          const target = document.getElementById(refElementId)
          if (target) {
            target.scrollIntoView({ block: 'center' })
            flash(target.closest('p') ?? target)
          } else if (tries++ < 15) {
            window.setTimeout(attempt, 80)
          }
        }
        attempt()
      },
    }),
    [entry.id],
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
          className="library-button phi-button"
          onClick={onOpenLibrary}
          aria-label="Abrir biblioteca (pastas e pesquisa)"
        >
          Φ
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
          className="toc-button phi-button"
          onClick={() => setTocOpen(true)}
          aria-label="Abrir sumário"
        >
          Ξ
        </button>
      </header>

      <TextSearch
        bodyRef={bodyRef}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        contentVersion={`${entry.id}:${px}:${parsed !== null}:${[...collapsed].sort().join(',')}`}
        seed={searchSeed}
        bookId={entry.id}
        source={parsed?.source ?? ''}
        headings={parsed?.headings ?? []}
        collapsed={collapsed}
        expandChain={(ids) =>
          setCollapsed((prev) => {
            const next = new Set(prev)
            for (const id of ids) next.delete(id)
            return next
          })
        }
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
          setCollapsed(new Set((parsed?.headings ?? []).map((h) => h.id)))
        }
        onExpandAll={() => setCollapsed(new Set())}
        onCopy={requestCopy}
        onAppearance={() => {
          setTocOpen(false)
          onOpenAppearance()
        }}
        onDetails={() => {
          setTocOpen(false)
          setDetailsOpen(true)
        }}
        onEdit={
          onEditLocal
            ? () => {
                setTocOpen(false)
                onEditLocal()
              }
            : undefined
        }
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
        <article className="reader-body" ref={bodyRef}>
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
                className="wikilink-box-open"
                onClick={() => {
                  const label = note.label
                  setNote(null)
                  const el = document.getElementById(`user-content-fn-${label}`)
                  if (el) {
                    el.scrollIntoView({ block: 'center' })
                    flash(el)
                  }
                }}
              >
                Abrir completo
              </button>
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
              {wikilink.person ? (
                <>
                  <div className="wikilink-box-content">
                    {wikilink.body ?? <p className="wikilink-box-note">Carregando verbete…</p>}
                  </div>
                  <button
                    className="wikilink-box-open"
                    onClick={() => {
                      const person = wikilink.person!
                      setWikilink(null)
                      onOpenPerson(personToEntry(person))
                    }}
                  >
                    Abrir completo
                  </button>
                </>
              ) : (
                <>
                  <p className="wikilink-box-title">{wikilink.target}</p>
                  <p className="wikilink-box-note">
                    Verbete ainda não incluído no app.
                  </p>
                </>
              )}
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

      <DetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        entry={entry}
        parsed={parsed}
      />

      <TtsControl bodyRef={bodyRef} />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
