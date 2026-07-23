import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

interface Props {
  open: boolean
  /** null = texto novo; id do arquivo quando é edição — separa o rascunho de cada alvo. */
  fileId: string | null
  /** Título inicial (edição) ou vazio (texto novo). */
  initialTitle: string
  initialContent: string
  onSave: (titulo: string, conteudo: string) => void
  onCancel: () => void
}

const DRAFT_KEY = 'editor-draft'

interface Draft {
  target: string // 'novo' ou o fileId
  titulo: string
  conteudo: string
  t: number
}

function loadDraft(target: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    return draft.target === target ? draft : null
  } catch {
    return null
  }
}

function saveDraft(target: string, titulo: string, conteudo: string) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ target, titulo, conteudo, t: Date.now() }))
  } catch {
    /* armazenamento cheio/indisponível: autosave é conveniência, não requisito */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* idem */
  }
}

/** `- `, `* `, `+ ` ou `3. `, com checklist opcional (`[ ]`/`[x]`) logo depois. */
const LIST_RE = /^(\s*)([-*+]|\d+\.)(\s+)(\[[ xX]\]\s+)?(.*)$/

/**
 * Editor deliberadamente simples — digitar, apagar, colar, salvar,
 * como numa conversa. Nada de plugins: o texto salvo vira um .md em
 * "Meus arquivos" e ganha as condições de leitura do app inteiro
 * (zoom, temas, colapso, busca).
 *
 * Três conveniências de quem já digita Markdown na mão: rascunho
 * sobrevive a fechar sem salvar (autosave local); Enter numa lista
 * continua o marcador (vazio sai da lista); Ctrl+B/I/K envolvem a
 * seleção sem tirar a mão do teclado.
 */
export function TextEditor({ open, fileId, initialTitle, initialContent, onSave, onCancel }: Props) {
  const [titulo, setTitulo] = useState(initialTitle)
  const [conteudo, setConteudo] = useState(initialContent)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const draftTargetRef = useRef<string>('novo')
  const draftTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    const target = fileId ?? 'novo'
    draftTargetRef.current = target
    // Rascunho sobrevive a fechar sem salvar (crash, aba fechada por engano) —
    // só recupera se for do MESMO alvo (não vaza rascunho de um texto pro outro)
    const draft = loadDraft(target)
    if (draft) {
      setTitulo(draft.titulo)
      setConteudo(draft.conteudo)
    } else {
      setTitulo(initialTitle)
      setConteudo(initialContent)
    }
    window.setTimeout(() => areaRef.current?.focus(), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTitle, initialContent, fileId])

  useEffect(() => {
    if (!open) return
    window.clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => {
      saveDraft(draftTargetRef.current, titulo, conteudo)
    }, 800)
    return () => window.clearTimeout(draftTimer.current)
  }, [open, titulo, conteudo])

  if (!open) return null

  const dirty = conteudo !== initialContent || titulo !== initialTitle

  const cancel = () => {
    if (dirty && !window.confirm('Descartar o que foi digitado?')) return
    clearDraft()
    onCancel()
  }

  const save = () => {
    const t = titulo.trim() || `Texto de ${new Date().toLocaleDateString('pt-BR')}`
    clearDraft()
    onSave(t, conteudo)
  }

  /** Cola a área de transferência na posição do cursor. */
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const area = areaRef.current
      if (!area || !text) return
      const start = area.selectionStart
      const end = area.selectionEnd
      setConteudo(conteudo.slice(0, start) + text + conteudo.slice(end))
      window.setTimeout(() => {
        area.focus()
        area.selectionStart = area.selectionEnd = start + text.length
      }, 0)
    } catch {
      window.alert('O navegador bloqueou a leitura da área de transferência. Toque na caixa de texto e cole (Ctrl+V ou segurar → Colar).')
    }
  }

  /** Envolve a seleção com `marcador` (negrito/itálico) — sem seleção, só posiciona o cursor no meio. */
  const wrapSelection = (marcador: string) => {
    const area = areaRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const selecionado = conteudo.slice(start, end)
    const next = conteudo.slice(0, start) + marcador + selecionado + marcador + conteudo.slice(end)
    setConteudo(next)
    window.setTimeout(() => {
      area.focus()
      if (selecionado) {
        area.selectionStart = start + marcador.length
        area.selectionEnd = start + marcador.length + selecionado.length
      } else {
        area.selectionStart = area.selectionEnd = start + marcador.length
      }
    }, 0)
  }

  /** `[seleção]()` com o cursor já dentro dos parênteses, pronto pra colar a URL. */
  const insertLink = () => {
    const area = areaRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const selecionado = conteudo.slice(start, end) || 'texto'
    const insercao = `[${selecionado}]()`
    const next = conteudo.slice(0, start) + insercao + conteudo.slice(end)
    setConteudo(next)
    window.setTimeout(() => {
      area.focus()
      const posParenteses = start + insercao.length - 1
      area.selectionStart = area.selectionEnd = posParenteses
    }, 0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        wrapSelection('**')
        return
      }
      if (key === 'i') {
        e.preventDefault()
        wrapSelection('*')
        return
      }
      if (key === 'k') {
        e.preventDefault()
        insertLink()
        return
      }
    }

    if (e.key !== 'Enter') return
    const area = areaRef.current
    if (!area || area.selectionStart !== area.selectionEnd) return // seleção não-vazia: Enter normal substitui
    const pos = area.selectionStart
    const lineStart = conteudo.lastIndexOf('\n', pos - 1) + 1
    const linha = conteudo.slice(lineStart, pos)
    const m = LIST_RE.exec(linha)
    if (!m) return
    e.preventDefault()
    const [, indent, marcador, , checklist, resto] = m

    if (resto.trim() === '') {
      // Item vazio: sai da lista em vez de continuar com marcador em branco
      const next = conteudo.slice(0, lineStart) + conteudo.slice(pos)
      setConteudo(next)
      window.setTimeout(() => {
        area.focus()
        area.selectionStart = area.selectionEnd = lineStart
      }, 0)
      return
    }

    const proximoMarcador = /^\d+\.$/.test(marcador) ? `${Number(marcador.slice(0, -1)) + 1}.` : marcador
    const insercao = `\n${indent}${proximoMarcador} ${checklist ? '[ ] ' : ''}`
    const next = conteudo.slice(0, pos) + insercao + conteudo.slice(pos)
    setConteudo(next)
    window.setTimeout(() => {
      area.focus()
      area.selectionStart = area.selectionEnd = pos + insercao.length
    }, 0)
  }

  return (
    <div className="editor-overlay" role="dialog" aria-label="Editor de texto">
      <header className="editor-header">
        <button className="editor-cancel" onClick={cancel} aria-label="Cancelar">
          ✕
        </button>
        <input
          className="editor-title"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do texto"
          aria-label="Título do texto"
        />
        <button className="editor-save" onClick={save} disabled={!conteudo.trim()}>
          Salvar
        </button>
      </header>
      <div className="editor-toolbar">
        <button className="toc-action" onClick={pasteFromClipboard}>
          📋 Colar da área de transferência
        </button>
      </div>
      <textarea
        ref={areaRef}
        className="editor-area"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Digite ou cole seu texto aqui. Pode ser texto simples ou markdown — títulos com #, negrito com **, tudo vira leitura bonita."
      />
    </div>
  )
}
