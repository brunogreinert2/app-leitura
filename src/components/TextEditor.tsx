import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useDialogoAcessivel } from '../lib/useDialogoAcessivel'
import type { HeadingInfo } from '../lib/titulos'
import { pedirTitulos, dispensarTitulos } from '../lib/pedirTitulos'
import { useT } from './idiomaContext'
import { EditorLocalizar, topoDoPonto } from './EditorLocalizar'
import { Sidebar } from './Sidebar'

interface Props {
  open: boolean
  /** null = texto novo; id do arquivo quando é edição — separa o rascunho de cada alvo. */
  fileId: string | null
  /** Título inicial (edição) ou vazio (texto novo). */
  initialTitle: string
  initialContent: string
  /**
   * Linha do arquivo (1-based) em que o editor abre: o parágrafo que estava
   * na tela ao tocar em Editar. Sem ela (texto novo), abre no começo.
   */
  linhaInicial?: number
  /**
   * Os títulos que a leitura já tinha deste mesmo texto, com a linha do
   * arquivo. Enquanto nada for digitado, o sumário do editor é este — sem
   * passar o texto pelo motor de novo.
   */
  titulosIniciais?: HeadingInfo[]
  /** `linha` = onde estava o cursor, para a leitura voltar ao mesmo ponto. */
  onSave: (titulo: string, conteudo: string, linha: number) => void
  /** O mesmo alfinete do sumário da leitura: fixado lá, fixado aqui. */
  sumarioFixo?: boolean
  onAlternarSumarioFixo?: () => void
  /** Título derivado do que foi colado (front matter). Ver App.sugerirTitulo. */
  sugerirTitulo?: (conteudo: string) => string | null
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

/** Onde começa a linha `linha` (1-based). Passou do fim do texto: o fim. */
function inicioDaLinha(texto: string, linha: number): number {
  let pos = 0
  for (let n = 1; n < linha; n++) {
    const quebra = texto.indexOf('\n', pos)
    if (quebra === -1) return texto.length
    pos = quebra + 1
  }
  return pos
}

/** Em que linha (1-based) cai o ponto `pos`. */
function linhaDoPonto(texto: string, pos: number): number {
  let n = 1
  for (let i = texto.indexOf('\n'); i !== -1 && i < pos; i = texto.indexOf('\n', i + 1)) n++
  return n
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
 *
 * E o Ξ, que a leitura tem e o editor não tinha: num texto longo, sem
 * sumário só se chegava ao capítulo certo rolando. É o mesmo painel da
 * leitura, com os títulos do texto COMO ESTÁ SENDO ESCRITO — um capítulo
 * recém-digitado aparece nele antes de salvar.
 */
export function TextEditor({
  open,
  fileId,
  initialTitle,
  initialContent,
  linhaInicial,
  titulosIniciais,
  onSave,
  onCancel,
  sugerirTitulo,
  sumarioFixo,
  onAlternarSumarioFixo,
}: Props) {
  const t = useT()
  const caixaRef = useRef<HTMLDivElement>(null)
  useDialogoAcessivel(open, onCancel, caixaRef)
  const [titulo, setTitulo] = useState(initialTitle)
  const [conteudo, setConteudo] = useState(initialContent)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const draftTargetRef = useRef<string>('novo')
  const draftTimer = useRef<number | undefined>(undefined)
  // null = fechada; false = só localizar (Ctrl+F); true = com substituir (Ctrl+H)
  const [localizar, setLocalizar] = useState<boolean | null>(null)
  const [sumarioAberto, setSumarioAberto] = useState(false)
  const sumarioVisivel = sumarioAberto || !!sumarioFixo
  const [titulos, setTitulos] = useState<HeadingInfo[]>([])
  // O texto de que `titulos` saiu: evita refazer a conta para o mesmo texto.
  // null = ainda não há lista nenhuma (o painel diz "carregando", não "vazio").
  const titulosDe = useRef<string | null>(null)
  const sumarioJaVisivel = useRef(false)
  // Uma conta por vez: num livro grande ela leva segundos, e empilhar um
  // pedido a cada pausa faria o sumário chegar atrasado várias contas.
  const calculando = useRef(false)
  // Cada abertura do editor é uma sessão: resposta de sessão antiga é lixo.
  const sessao = useRef(0)
  const [rodada, setRodada] = useState(0)
  const [linhaDoCursor, setLinhaDoCursor] = useState(1)

  /**
   * Cursor no começo da linha, e a linha no alto da caixa.
   *
   * As duas coisas, sempre juntas e sempre ditas: um textarea não rola
   * sozinho até o cursor, e onde o navegador deixa o cursor depende de COMO
   * o texto chegou à caixa — foi o que fazia o editor abrir no fim do
   * arquivo na primeira vez e no começo nas seguintes.
   */
  const irParaLinha = (linha: number) => {
    const area = areaRef.current
    if (!area) return
    const pos = inicioDaLinha(area.value, linha)
    area.focus({ preventScroll: true })
    area.setSelectionRange(pos, pos)
    area.scrollTop = topoDoPonto(area, pos)
    setLinhaDoCursor(linhaDoPonto(area.value, pos))
  }

  useEffect(() => {
    if (!open) return
    setSumarioAberto(false)
    setTitulos([])
    titulosDe.current = null
    calculando.current = false
    sessao.current++
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
      // Texto igual ao que a leitura mostrava: os títulos dela servem.
      if (titulosIniciais?.length) {
        setTitulos(titulosIniciais)
        titulosDe.current = initialContent
      }
    }
    window.setTimeout(() => irParaLinha(linhaInicial ?? 1), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTitle, initialContent, fileId])

  /**
   * Os títulos do sumário, tirados do texto em edição.
   *
   * Só com o painel à vista — fechado, não há para quem calcular. Ao abrir, na
   * hora; depois, meio segundo após a última tecla. A conta em si corre num
   * worker (pedirTitulos): medido, são 3,6 s num livro de 1 MB, e na linha
   * principal a caixa de texto congelaria esse tempo a cada pausa.
   */
  useEffect(() => {
    if (!open || !sumarioVisivel) {
      sumarioJaVisivel.current = false
      return
    }
    const espera = sumarioJaVisivel.current ? 500 : 0
    sumarioJaVisivel.current = true
    const area = areaRef.current
    if (area) setLinhaDoCursor(linhaDoPonto(area.value, area.selectionStart))
    if (titulosDe.current === conteudo || calculando.current) return
    const id = window.setTimeout(() => {
      const estaSessao = sessao.current
      calculando.current = true
      void pedirTitulos(conteudo).then((lista) => {
        if (sessao.current !== estaSessao) return
        calculando.current = false
        titulosDe.current = conteudo
        setTitulos(lista)
        // O texto pode ter mudado enquanto a conta corria: confere de novo.
        setRodada((n) => n + 1)
      })
    }, espera)
    return () => window.clearTimeout(id)
  }, [open, sumarioVisivel, conteudo, rodada])

  // Editor fechado, worker dispensado — e a conta em curso morre com ele.
  useEffect(() => {
    if (!open) return
    return () => {
      sessao.current++
      dispensarTitulos()
    }
  }, [open])

  // A seção onde o CURSOR está: o último título antes dele.
  const secaoDoCursor = useMemo(() => {
    let atual: string | undefined
    for (const h of titulos) {
      if (h.line === undefined) continue
      if (h.line > linhaDoCursor) break
      atual = h.id
    }
    return atual
  }, [titulos, linhaDoCursor])

  /**
   * Ctrl+F e Ctrl+H enquanto o editor está aberto.
   *
   * O ouvinte é de CAPTURA e na janela de propósito: a tela de leitura tem o
   * próprio Ctrl+F num ouvinte de borbulha, e sem capturar primeiro os dois
   * disparavam juntos — abria a busca do texto por baixo do editor.
   */
  useEffect(() => {
    if (!open) return
    // globalThis: o arquivo importa `type KeyboardEvent` do React no topo,
    // que sombreia o do DOM — e addEventListener quer o do DOM.
    const atalho = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const k = e.key.toLowerCase()
      if (k !== 'f' && k !== 'h') return
      e.preventDefault()
      // stopImmediatePropagation, e não só stopPropagation: o ouvinte da
      // leitura também está NA JANELA, e parar a propagação não impede os
      // outros ouvintes do mesmo nó de rodarem. Sem isto, Ctrl+F abria as
      // duas buscas — a do editor e a do texto por baixo dele.
      e.stopImmediatePropagation()
      setLocalizar(k === 'h')
    }
    window.addEventListener('keydown', atalho, true)
    return () => window.removeEventListener('keydown', atalho, true)
  }, [open])

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
    if (dirty && !window.confirm(t('editor.descartar'))) return
    clearDraft()
    onCancel()
  }

  const save = () => {
    const nome =
      titulo.trim() ||
      sugerirTitulo?.(conteudo) ||
      t('editor.textoDe', { data: new Date().toLocaleDateString() })
    clearDraft()
    const area = areaRef.current
    onSave(nome, conteudo, area ? linhaDoPonto(area.value, area.selectionStart) : 1)
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
      window.alert(t('editor.colarBloqueado'))
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
    <div
      className={`editor-overlay${sumarioFixo ? ' editor-sumario-fixo' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('editor')}
      ref={caixaRef}
    >
      <header className="editor-header">
        <button className="editor-cancel" onClick={cancel} aria-label={t('editor.cancelar')}>
          ✕
        </button>
        <input
          className="editor-title"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={t('editor.titulo')}
          aria-label={t('editor.titulo')}
        />
        <button className="editor-save" onClick={save} disabled={!conteudo.trim()}>
          {t('editor.salvar')}
        </button>
        {/* O mesmo Ξ, no mesmo canto da barra de leitura: última coisa à direita. */}
        <button
          className="toc-button phi-button"
          onClick={() => setSumarioAberto(true)}
          aria-label={t('sumario.abrir')}
        >
          Ξ
        </button>
      </header>
      <EditorLocalizar
        aberto={localizar !== null}
        comSubstituir={localizar === true}
        conteudo={conteudo}
        areaRef={areaRef}
        onFechar={() => {
          setLocalizar(null)
          areaRef.current?.focus()
        }}
        onConteudo={setConteudo}
      />
      <div className="editor-toolbar">
        <button className="toc-action" onClick={pasteFromClipboard}>
          {t('editor.colar')}
        </button>
      </div>
      <textarea
        ref={areaRef}
        className="editor-area"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        onKeyDown={onKeyDown}
        // Só com o sumário à vista: é para ele que a linha do cursor importa.
        onSelect={(e) => {
          if (!sumarioVisivel) return
          const area = e.currentTarget
          setLinhaDoCursor(linhaDoPonto(area.value, area.selectionStart))
        }}
        placeholder={t('editor.dica')}
      />
      {/* Esc com o sumário aberto fecha O SUMÁRIO. Sem parar o evento aqui ele
          chegaria também ao ouvinte do editor, que leria como "cancelar a
          edição" — e perguntaria se é para descartar o texto. */}
      <div
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !sumarioAberto || sumarioFixo) return
          e.preventDefault()
          e.stopPropagation()
          setSumarioAberto(false)
        }}
      >
        <Sidebar
          headings={titulos}
          names={[]}
          vazio={t(titulosDe.current === null ? 'detalhes.carregando' : 'editor.semTitulos')}
          open={sumarioVisivel}
          fixo={sumarioFixo}
          onAlternarFixo={onAlternarSumarioFixo}
          onClose={() => {
            if (sumarioFixo) onAlternarSumarioFixo?.()
            setSumarioAberto(false)
          }}
          secaoAtual={secaoDoCursor}
          onNavigate={(id) => {
            const linha = titulos.find((h) => h.id === id)?.line
            if (linha === undefined) return
            // O foco vai para o texto ANTES de o painel fechar: senão o painel,
            // ao sair, devolveria o foco ao Ξ e o cursor não estaria onde se pediu.
            irParaLinha(linha)
            if (!sumarioFixo) setSumarioAberto(false)
          }}
        />
      </div>
    </div>
  )
}
