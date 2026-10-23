// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkMarkers.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: d4e2fd4e0fef4ca0252af56a31a1aa9743c5f1b4017aa9235a67c22228ef3702
import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'
import type { VFile } from 'vfile'

/**
 * Marcadores canônicos capítulo-seção. Formatos reais do corpus:
 * [1.1], [3] (capítulo de seção única), [5.a], [48.b2] (subdivisões
 * Boter) e [5a] (variante sem ponto). Exigem dígito inicial, o que
 * exclui colchetes editoriais como [...] e [diz].
 * São endereços, não texto: viram <span id="marker-..."> preservando o
 * literal exato — nunca reformatados (regra inegociável do corpus).
 *
 * Quantos níveis a tradição tiver: [1.1.1] (livro.capítulo.seção, Plutarco)
 * desde 2026-09-29. Idêntica ao RX_MARCADOR de scripts/rolo/gerador_rolo.py —
 * mexeu numa, mexa na outra, ou o link do app e o do rolo divergem (N3).
 * Esta é a única cópia no app: o searchIndex importa daqui.
 */
// D26 (2026-09-29): o primeiro nível pode ser um nome seguido de nível numérico
// ([Agis.1.1], [frag_1.1]); colchete editorial ([sic]) continua fora.
export const MARKER_RE = /\[((?:\d+(?:[a-z]\d*)?|[A-Za-z][A-Za-z0-9_]*(?=\.\d))(?:\.[0-9a-z]+)*)\]/g

interface MarkerNode {
  type: 'canonicalMarker'
  data: {
    hName: 'span'
    hProperties: { id: string; className: string[]; title: string }
    hChildren: [{ type: 'text'; value: string }]
  }
}

function markerNode(literal: string, address: string, seen: Map<string, number>): MarkerNode {
  // Edições bilíngues repetem o mesmo endereço (original + tradução):
  // a 1ª ocorrência fica com o id canônico, as demais ganham sufixo.
  const count = seen.get(address) ?? 0
  seen.set(address, count + 1)
  const id = count === 0 ? `marker-${address}` : `marker-${address}-${count + 1}`
  return {
    type: 'canonicalMarker',
    data: {
      hName: 'span',
      hProperties: {
        id,
        className: ['marker'],
        // O marcador é endereço: tocá-lo copia o link do rolo até este ponto.
        title: 'Tocar para copiar o link desta passagem',
      },
      hChildren: [{ type: 'text', value: literal }],
    },
  }
}

/**
 * O COLCHETE QUE NÃO É ENDEREÇO (2026-10-23). `\[582]` no .md é «[582]» como
 * texto comum: a data do Diels, a numeração de editor antigo. Sem o escape,
 * todo `[número]` vira marcador, e o id falso fica publicado para sempre (LEI 6).
 *
 * O remark já resolve `\[` para «[» no nó de texto, e a contrabarra some antes
 * de o marcador ser procurado. Por isso este passo roda LOGO DEPOIS DA LEITURA,
 * quando cada nó de texto ainda tem a posição exata no arquivo: ele relê o
 * trecho do arquivo, casa cada «[» do texto com o «[» do arquivo que o
 * produziu, e põe ESCAPE_DE_COLCHETE antes de quem veio de `\[`. O
 * remarkMarkers pula o colchete com essa marca e a tira de tudo.
 * Se a conta não fechar (nó sem posição, texto sem file.value), não marca nada:
 * fica como era antes.
 *
 * O rolo (gerador_rolo.py, inline) e o Gerador fazem a mesma coisa à maneira
 * deles; a busca (searchIndex) usa colcheteEscapado(), aqui embaixo.
 */
export const ESCAPE_DE_COLCHETE = '\uE000'

/** O «[» na posição `i` da linha crua vem depois de um número ímpar de `\`? */
export function colcheteEscapado(linha: string, i: number): boolean {
  let n = 0
  for (let j = i - 1; j >= 0 && linha[j] === '\\'; j--) n++
  return n % 2 === 1
}

// No arquivo, o que pode virar «[» no texto: `\[` (escapado), o próprio `[`,
// e a entidade que o escreve. `\\` e `\x` são consumidos inteiros, para que
// `\\[2]` seja contrabarra + marcador, como no CommonMark.
const RX_ORIGEM_DO_COLCHETE = /\\([\s\S])|&(?:#0*91|#[xX]0*5[bB]|lsqb|lbrack);|\[/g

export function remarkColcheteEscapado() {
  return (tree: Root, file: VFile) => {
    const fonte = typeof file?.value === 'string' ? file.value : String(file?.value ?? '')
    if (!fonte.includes('\\[')) return
    visit(tree, 'text', (node: Text) => {
      const ini = node.position?.start.offset
      const fim = node.position?.end.offset
      if (ini === undefined || fim === undefined || !node.value.includes('[')) return
      const escapados: boolean[] = []
      for (const m of fonte.slice(ini, fim).matchAll(RX_ORIGEM_DO_COLCHETE)) {
        if (m[1] === undefined) escapados.push(false)
        else if (m[1] === '[') escapados.push(true)
      }
      if (!escapados.includes(true)) return
      const noTexto = [...node.value].filter((c) => c === '[').length
      if (noTexto !== escapados.length) return
      let k = 0
      node.value = node.value.replace(/\[/g, () => (escapados[k++] ? ESCAPE_DE_COLCHETE + '[' : '['))
    })
  }
}

const RX_ESCAPE = new RegExp(ESCAPE_DE_COLCHETE, 'g')

export function remarkMarkers() {
  return (tree: Root) => {
    const seen = new Map<string, number>()
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      MARKER_RE.lastIndex = 0
      if (!MARKER_RE.test(node.value)) {
        node.value = node.value.replace(RX_ESCAPE, '')
        return
      }

      const parts: PhrasingContent[] = []
      let last = 0
      MARKER_RE.lastIndex = 0
      for (const m of node.value.matchAll(MARKER_RE)) {
        if (node.value[m.index - 1] === ESCAPE_DE_COLCHETE) continue
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        parts.push(markerNode(m[0], m[1], seen) as unknown as PhrasingContent)
        last = m.index + m[0].length
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) })
      for (const p of parts) if (p.type === 'text') p.value = p.value.replace(RX_ESCAPE, '')

      parent.children.splice(index, 1, ...parts)
      return index + parts.length
    })
    // A marca pode ter ido parar fora de um nó de texto (o rótulo de um
    // wikilink, o título de um callout): sai de lá também.
    visit(tree, (node) => {
      const n = node as unknown as Record<string, unknown>
      for (const campo of ['value', 'url', 'title', 'alt']) {
        const v = n[campo]
        if (typeof v === 'string' && v.includes(ESCAPE_DE_COLCHETE)) n[campo] = v.replace(RX_ESCAPE, '')
      }
    })
  }
}
