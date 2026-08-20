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

  if (!aberto) return null

  const irPara = (i: number) => {
    if (!ocorrencias.length) return
    const alvo = (i + ocorrencias.length) % ocorrencias.length
    setAtual(alvo)
    const area = areaRef.current
    if (!area) return
    const o = ocorrencias[alvo]
    area.focus()
    area.setSelectionRange(o.inicio, o.fim)
    // Sem isto a ocorrência pode ficar fora da área visível: o textarea move o
    // cursor mas não rola sozinho quando o foco já era dele.
    const antes = area.value.slice(0, o.inicio).split('\n').length
    const linhas = area.value.split('\n').length
    area.scrollTop = (area.scrollHeight * (antes - 1)) / linhas - area.clientHeight / 2
  }

  const substituirUma = () => {
    const area = areaRef.current
    if (!area || !ocorrencias.length) return
    const o = ocorrencias[atual]
    escreverPreservandoDesfazer(area, o.inicio, o.fim, substituto, onConteudo)
    onConteudo(area.value)
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
      irPara(e.shiftKey ? atual - 1 : atual + 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onFechar()
    }
  }

  const contagem = ocorrencias.length
    ? t('editor.ocorrenciaDe', { i: atual + 1, n: contagemSegura(ocorrencias.length) })
    : termo
      ? t('editor.semOcorrencia')
      : ''

  return (
    <div className="editor-localizar" role="search">
      <div className="editor-localizar-linha">
        <input
          ref={campoRef}
          className="editor-localizar-campo"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={noCampo}
          placeholder={t('editor.localizar')}
          aria-label={t('editor.localizar')}
        />
        <span className="editor-localizar-contagem" role="status">
          {contagem}
        </span>
        <button
          className="toc-action editor-localizar-seta"
          onClick={() => irPara(atual - 1)}
          disabled={!ocorrencias.length}
          aria-label={t('busca.anterior')}
        >
          ↑
        </button>
        <button
          className="toc-action editor-localizar-seta"
          onClick={() => irPara(atual + 1)}
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
