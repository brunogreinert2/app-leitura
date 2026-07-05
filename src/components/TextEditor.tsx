import { useEffect, useRef, useState } from 'react'

interface Props {
  open: boolean
  /** Título inicial (edição) ou vazio (texto novo). */
  initialTitle: string
  initialContent: string
  onSave: (titulo: string, conteudo: string) => void
  onCancel: () => void
}

/**
 * Editor deliberadamente simples — digitar, apagar, colar, salvar,
 * como numa conversa. Nada de plugins: o texto salvo vira um .md em
 * "Meus arquivos" e ganha as condições de leitura do app inteiro
 * (zoom, temas, colapso, busca).
 */
export function TextEditor({ open, initialTitle, initialContent, onSave, onCancel }: Props) {
  const [titulo, setTitulo] = useState(initialTitle)
  const [conteudo, setConteudo] = useState(initialContent)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTitulo(initialTitle)
      setConteudo(initialContent)
      window.setTimeout(() => areaRef.current?.focus(), 100)
    }
  }, [open, initialTitle, initialContent])

  if (!open) return null

  const dirty = conteudo !== initialContent || titulo !== initialTitle

  const cancel = () => {
    if (dirty && !window.confirm('Descartar o que foi digitado?')) return
    onCancel()
  }

  const save = () => {
    const t = titulo.trim() || `Texto de ${new Date().toLocaleDateString('pt-BR')}`
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
        placeholder="Digite ou cole seu texto aqui. Pode ser texto simples ou markdown — títulos com #, negrito com **, tudo vira leitura bonita."
      />
    </div>
  )
}
