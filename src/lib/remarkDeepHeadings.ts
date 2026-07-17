import { visit } from 'unist-util-visit'
import type { Root, Heading, Text } from 'mdast'

/**
 * CommonMark trava headings ATX em 6 `#` (é a gramática, não um limite
 * arbitrário do app) — o corpus real (árvores de era/escola/autor/obra,
 * textos interlineares) pode passar disso. Como remark-parse não
 * tokeniza `#######+` como heading, capamos em 6 `#` PARA O
 * TOKENIZADOR mas embutimos a profundidade real no início do texto do
 * título com um caractere invisível (U+2063, impossível de aparecer
 * num corpus real). remarkDeepHeadingDepth lê essa marca depois do
 * parse e corrige node.depth para o valor de verdade — sem teto.
 */
const DEEP_HEADING_LINE_RE = /^(#{7,})(\s+)(\S.*)$/gm
const MARKER_RE = /^⁣(\d+)⁣/

export function liftDeepHeadingMarkers(content: string): string {
  return content.replace(DEEP_HEADING_LINE_RE, (_match, hashes: string, _sp: string, rest: string) => {
    return `###### ⁣${hashes.length}⁣${rest}`
  })
}

export function remarkDeepHeadingDepth() {
  return (tree: Root) => {
    visit(tree, 'heading', (node: Heading) => {
      const first = node.children[0] as Text | undefined
      if (!first || first.type !== 'text') return
      const m = MARKER_RE.exec(first.value)
      if (!m) return
      // mdast tipa depth como 1-6, mas em runtime aceita qualquer inteiro:
      // é exatamente isso que destrava a profundidade real do corpus.
      node.depth = Number(m[1]) as Heading['depth']
      first.value = first.value.slice(m[0].length)
      if (first.value === '') node.children.shift()
    })
  }
}
