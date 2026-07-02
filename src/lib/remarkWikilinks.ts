import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Wikilinks das cópias de leitura: [[Alvo]] ou [[Alvo|texto exibido]].
 * Viram <span class="wikilink" data-target="Alvo"> — recurso opcional
 * por arquivo: presença habilita preview/índice de nomes, ausência não
 * quebra nada.
 */
const WIKILINK_RE = /\[\[([^\][|]+)(?:\|([^\][]+))?\]\]/g

export function remarkWikilinks() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      WIKILINK_RE.lastIndex = 0
      if (!WIKILINK_RE.test(node.value)) return

      const parts: PhrasingContent[] = []
      let last = 0
      WIKILINK_RE.lastIndex = 0
      for (const m of node.value.matchAll(WIKILINK_RE)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        const target = m[1].trim()
        const label = (m[2] ?? m[1]).trim()
        parts.push({
          type: 'wikilink',
          data: {
            hName: 'span',
            hProperties: { className: ['wikilink'], dataTarget: target },
            hChildren: [{ type: 'text', value: label }],
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
