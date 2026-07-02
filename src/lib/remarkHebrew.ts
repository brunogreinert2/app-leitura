import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Runs de texto hebraico viram <span class="hebrew" dir="rtl">, isolados
 * pelo algoritmo bidi: o hebraico corre corretamente da direita para a
 * esquerda DENTRO do run, mas o parágrafo (número do versículo, layout)
 * permanece da esquerda para a direita — requisito do interlinear.
 */
// Bloco hebraico + formas de apresentação; espaços permitidos entre
// caracteres hebraicos dentro do mesmo run
const HEBREW_RUN_RE =
  /[֐-׿יִ-ﭏ](?:[֐-׿יִ-ﭏ]|\s+(?=[֐-׿יִ-ﭏ]))*/g

export function remarkHebrew() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      HEBREW_RUN_RE.lastIndex = 0
      if (!HEBREW_RUN_RE.test(node.value)) return

      const parts: PhrasingContent[] = []
      let last = 0
      HEBREW_RUN_RE.lastIndex = 0
      for (const m of node.value.matchAll(HEBREW_RUN_RE)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        parts.push({
          type: 'hebrewRun',
          data: {
            hName: 'span',
            hProperties: { className: ['hebrew'], dir: 'rtl' },
            hChildren: [{ type: 'text', value: m[0] }],
          },
        } as unknown as PhrasingContent)
        last = m.index + m[0].length
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) })

      parent.children.splice(index, 1, ...parts)
      return index + parts.length
    })
  }
}
