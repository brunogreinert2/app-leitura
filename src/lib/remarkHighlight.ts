import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Realce de texto (`==marca-texto==`): não é CommonMark nem GFM, é
 * convenção do Obsidian/MultiMarkdown — mas não atrapalha leitura crua
 * (nem no Notepad) e é útil o bastante pra valer a pena. Vira <mark>,
 * reaproveitando as cores de destaque já calibradas por tema (--hl-bg/
 * --hl-fg, as mesmas da busca em tela).
 */
const HIGHLIGHT_RE = /==(?!\s)([^=]+?)(?<!\s)==/g

export function remarkHighlight() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      HIGHLIGHT_RE.lastIndex = 0
      if (!HIGHLIGHT_RE.test(node.value)) return

      const parts: PhrasingContent[] = []
      let last = 0
      HIGHLIGHT_RE.lastIndex = 0
      for (const m of node.value.matchAll(HIGHLIGHT_RE)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        parts.push({
          type: 'highlight',
          data: {
            hName: 'mark',
            hChildren: [{ type: 'text', value: m[1] }],
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
