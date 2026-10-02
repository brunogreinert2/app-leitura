import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from './idiomaContext'

/** Um termo digitado é texto, não expressão regular: `1.` procura `1.`. */
function escaparRegex(termo: string): string {
  return termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface Ocorrencia {
  inicio: number
  fim: number
}

/**
 * Acha as ocorrências no texto ORIGINAL, com os índices exatos.
 *
 * Por que regex e não `toLowerCase().indexOf()`: baixar a caixa pode MUDAR O
 * COMPRIMENTO da cadeia em alguns alfabetos, e aí todo índice calculado sobre
 * a versão baixada aponta para o lugar errado no original — a substituição
 * comeria o caractere vizinho. Buscando com a bandeira `i` sobre o texto
 * original, os índices são sempre os verdadeiros.
 */
export function acharOcorrencias(texto: string, termo: string): Ocorrencia[] {
  if (!termo) return []
  const re = new RegExp(escaparRegex(termo), 'gi')
  const fora: Ocorrencia[] = []
  for (const m of texto.matchAll(re)) {
    if (m.index === undefined) continue
    fora.push({ inicio: m.index, fim: m.index + m[0].length })
    // termo vazio nunca acontece (barrado acima), mas zero-width travaria
    if (m[0].length === 0) break
  }
  return fora
}

/**
 * Escreve no textarea PRESERVANDO O DESFAZER do navegador.
 *
 * Trocar o valor pelo estado do React apaga a pilha de desfazer nativa — e um
 * "substituir tudo" que não se desfaz é uma armadilha, não um recurso.
 * `insertText` entra na pilha como uma edição normal, então Ctrl+Z volta.
 * Onde o comando não existir, cai no caminho comum: melhor perder o desfazer
 * do que perder a substituição.
 */
function escreverPreservandoDesfazer(
  area: HTMLTextAreaElement,
  inicio: number,
  fim: number,
  texto: string,
  aoFalhar: (novo: string) => void,
): void {
  area.focus()
  area.setSelectionRange(inicio, fim)
  let ok = false
  try {
    ok = document.execCommand('insertText', false, texto)
  } catch {
    ok = false
  }
  if (!ok) {
    const novo = area.value.slice(0, inicio) + texto + area.value.slice(fim)
    aoFalhar(novo)
  }
}

/** Propriedades que decidem onde uma linha quebra. O espelho copia todas. */
const MOLDE = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'font-stretch', 'font-kerning', 'font-feature-settings', 'font-variation-settings',
  'line-height', 'letter-spacing', 'word-spacing', 'text-transform', 'text-indent',
  'tab-size', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
]

interface Moldura {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Onde um trecho do textarea fica DE VERDADE, em pixels do conteúdo.
 *
 * Por que medir: com quebra automática, um parágrafo longo é UMA linha do
 * arquivo e vinte na tela. A conta antiga (proporção de linhas do arquivo)
 * caía centenas de pixels antes do alvo — medido: palavra no pixel 18034,
 * janela mostrando de 17094 a 17666. O espelho é um div invisível com a
 * mesma letra, a mesma largura e a mesma quebra; o navegador diagrama o
 * texto ali do mesmo jeito, e a posição do trecho é lida, não estimada.
 * Um retângulo por linha: a palavra pode quebrar no meio.
 */
function medirTrecho(area: HTMLTextAreaElement, inicio: number, fim: number): Moldura[] {
  const estilo = getComputedStyle(area)
  const espelho = document.createElement('div')
  for (const p of MOLDE) espelho.style.setProperty(p, estilo.getPropertyValue(p))
  const largura =
    area.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
  Object.assign(espelho.style, {
    position: 'absolute',
    visibility: 'hidden',
    top: '0',
    left: '-99999px',
    boxSizing: 'content-box',
    width: `${largura}px`,
    whiteSpace: area.wrap === 'off' ? 'pre' : 'pre-wrap',
    overflowWrap: 'break-word',
  })
  espelho.textContent = area.value.slice(0, inicio)
  const trecho = document.createElement('span')
  trecho.textContent = area.value.slice(inicio, fim)
  espelho.appendChild(trecho)
  document.body.appendChild(espelho)
  const base = espelho.getBoundingClientRect()
  const molduras = [...trecho.getClientRects()].map((r) => ({
    top: r.top - base.top,
    left: r.left - base.left,
    width: r.width,
    height: r.height,
  }))
  espelho.remove()
  return molduras
}

interface Props {
  aberto: boolean
  /** true = veio do Ctrl+H: o campo de substituição aparece. */
  comSubstituir: boolean
  conteudo: string
  areaRef: React.RefObject<HTMLTextAreaElement | null>
  onFechar: () => void
  onConteudo: (novo: string) => void
}

export function EditorLocalizar({
  aberto,
  comSubstituir,
  conteudo,
  areaRef,
  onFechar,
  onConteudo,
}: Props) {
  const t = useT()
  const [termo, setTermo] = useState('')
  const [substituto, setSubstituto] = useState('')
  const [atual, setAtual] = useState(0)
  /** A ocorrência `atual` já está na tela? Se não, o Enter mostra ela antes de avançar. */
  const [mostrada, setMostrada] = useState(false)
  const [molduras, setMolduras] = useState<Moldura[]>([])
  const [, redesenhar] = useState(0)
  const campoRef = useRef<HTMLInputElement>(null)

  const ocorrencias = useMemo(() => acharOcorrencias(conteudo, termo), [conteudo, termo])

  useEffect(() => {
    if (aberto) window.setTimeout(() => campoRef.current?.select(), 60)
  }, [aberto, comSubstituir])

  // Editar o texto muda quantas ocorrências existem; o ponteiro não pode
  // sobrar apontando para uma que já não está lá.
  useEffect(() => {
    if (atual >= ocorrencias.length) setAtual(0)
  }, [ocorrencias.length, atual])

  // Texto mudou ou a busca fechou: a moldura apontaria para o lugar errado.
  useEffect(() => {
    setMolduras([])
    setMostrada(false)
  }, [conteudo, aberto])

  // A moldura acompanha a rolagem. Se a tela muda de tamanho, a quebra das
  // linhas muda junto e a palavra é medida de novo — no celular isso não é
  // raro, é a REGRA: o teclado virtual abrir já é um resize. Clicar no texto
  // tira a moldura: dali em diante quem aparece é a seleção do navegador.
  useEffect(() => {
    const area = areaRef.current
    if (!area || !molduras.length) return
    const rolou = () => redesenhar((n) => n + 1)
    const remedir = () => {
      const m = medirTrecho(area, area.selectionStart, area.selectionEnd)
      if (m.length) area.scrollTop = m[0].top + m[0].height / 2 - area.clientHeight / 2
      setMolduras(m)
    }
    const sumir = () => setMolduras([])
    area.addEventListener('scroll', rolou)
    area.addEventListener('focus', sumir)
    window.addEventListener('resize', remedir)
    return () => {
      area.removeEventListener('scroll', rolou)
      area.removeEventListener('focus', sumir)
      window.removeEventListener('resize', remedir)
    }
  }, [areaRef, molduras.length])

  if (!aberto) return null

  /**
   * Leva até a ocorrência `i` SEM tirar o foco do campo de busca.
   *
   * Antes o foco ia para o textarea (só ali a seleção aparece), e o Enter
   * seguinte — o de "próxima" — caía no texto e trocava a palavra achada por
   * uma quebra de linha, em silêncio. Agora o foco fica no campo, como no
   * VS Code, e a palavra ganha uma moldura desenhada por cima.
   */
  const mostrar = (i: number, lista: Ocorrencia[] = ocorrencias) => {
    if (!lista.length) return
    const alvo = (i + lista.length) % lista.length
    setAtual(alvo)
    setMostrada(true)
    const area = areaRef.current
    if (!area) return
    const o = lista[alvo]
    // Seleção feita, mas sem foco: ao fechar a busca o textarea recebe o
    // foco e o cursor já está na palavra.
    area.setSelectionRange(o.inicio, o.fim)
    const m = medirTrecho(area, o.inicio, o.fim)
    if (m.length) area.scrollTop = m[0].top + m[0].height / 2 - area.clientHeight / 2
    setMolduras(m)
  }

  /** Próxima (+1) ou anterior (-1); a primeira vez só mostra a atual, sem pular. */
  const avancar = (passo: 1 | -1) => (mostrada ? mostrar(atual + passo) : mostrar(atual))

  const aoDigitar = (novo: string) => {
    setTermo(novo)
    // Como o Ctrl+F do navegador: a primeira ocorrência aparece enquanto se digita.
    const lista = acharOcorrencias(conteudo, novo)
    if (lista.length) mostrar(0, lista)
    else {
      setMolduras([])
      setMostrada(false)
    }
  }

  const substituirUma = () => {
    const area = areaRef.current
    if (!area || !ocorrencias.length) return
    const o = ocorrencias[atual]
    escreverPreservandoDesfazer(area, o.inicio, o.fim, substituto, onConteudo)
    onConteudo(area.value)
    // A trocada sai da lista: `atual` passa a apontar para a seguinte, que o
    // próximo Enter mostra sem pular nenhuma.
    window.setTimeout(() => campoRef.current?.focus(), 0)
  }

  const substituirTudo = () => {
    const area = areaRef.current
    if (!area || !ocorrencias.length) return
    const quantas = ocorrencias.length
    // Uma função como substituto, e não a cadeia crua: em String.replace o
    // cifrão tem significado ($&, $1...), e quem digita "R$ 10" no campo não
    // está escrevendo um padrão.
    const novo = conteudo.replace(new RegExp(escaparRegex(termo), 'gi'), () => substituto)
    // Seleciona tudo e escreve de uma vez: entra na pilha de desfazer como UMA
    // edição, então um Ctrl+Z volta as `quantas` substituições juntas.
    escreverPreservandoDesfazer(area, 0, conteudo.length, novo, onConteudo)
    onConteudo(area.value)
    setAtual(0)
    window.setTimeout(() => campoRef.current?.focus(), 0)
    return quantas
  }

  const noCampo = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      avancar(e.shiftKey ? -1 : 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // Sem isto o Esc sobe até o ouvinte do diálogo (useDialogoAcessivel,
      // no document) e fecha o EDITOR inteiro, não só a busca.
      e.stopPropagation()
      onFechar()
    }
  }

  const contagem = ocorrencias.length
    ? t('editor.ocorrenciaDe', { i: atual + 1, n: contagemSegura(ocorrencias.length) })
    : termo
      ? t('editor.semOcorrencia')
      : ''

  const area = areaRef.current
  const caixa = area?.getBoundingClientRect()

  return (
    <div className="editor-localizar" role="search">
      {area &&
        caixa &&
        molduras.map((m, k) => (
          <div
            key={k}
            className="editor-localizar-moldura"
            aria-hidden="true"
            style={{
              top: caixa.top + area.clientTop + m.top - area.scrollTop,
              left: caixa.left + area.clientLeft + m.left - area.scrollLeft,
              width: m.width,
              height: m.height,
            }}
          />
        ))}
      <div className="editor-localizar-linha">
        <input
          ref={campoRef}
          className="editor-localizar-campo"
          value={termo}
          onChange={(e) => aoDigitar(e.target.value)}
          onKeyDown={noCampo}
          placeholder={t('editor.localizar')}
          aria-label={t('editor.localizar')}
        />
        <span className="editor-localizar-contagem" role="status">
          {contagem}
        </span>
        <button
          className="toc-action editor-localizar-seta"
          onClick={() => avancar(-1)}
          disabled={!ocorrencias.length}
          aria-label={t('busca.anterior')}
        >
          ↑
        </button>
        <button
          className="toc-action editor-localizar-seta"
          onClick={() => avancar(1)}
          disabled={!ocorrencias.length}
          aria-label={t('busca.proxima')}
        >
          ↓
        </button>
        <button
          className="toc-action editor-localizar-seta"
          onClick={onFechar}
          aria-label={t('busca.fechar')}
        >
          ✕
        </button>
      </div>
      {comSubstituir && (
        <div className="editor-localizar-linha">
          <input
            className="editor-localizar-campo"
            value={substituto}
            onChange={(e) => setSubstituto(e.target.value)}
            onKeyDown={noCampo}
            placeholder={t('editor.substituirPor')}
            aria-label={t('editor.substituirPor')}
          />
          <button
            className="toc-action"
            onClick={substituirUma}
            disabled={!ocorrencias.length}
          >
            {t('editor.substituir')}
          </button>
          <button
            className="toc-action"
            onClick={substituirTudo}
            disabled={!ocorrencias.length}
          >
            {t('editor.substituirTudo')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Teto só para o rótulo não virar uma parede de dígitos num texto enorme. */
function contagemSegura(n: number): string {
  return n > 999 ? '999+' : String(n)
}
