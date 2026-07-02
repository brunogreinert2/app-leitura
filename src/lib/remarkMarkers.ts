import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Marcadores canônicos capítulo-seção. Formatos reais do corpus:
 * [1.1], [3] (capítulo de seção única), [5.a], [48.b2] (subdivisões
 * Boter) e [5a] (variante sem ponto). Exigem dígito inicial, o que
 * exclui colchetes editoriais como [...] e [diz].
 * São endereços, não texto: viram <span id="marker-..."> preservando o
 * literal exato — nunca reformatados (regra inegociável do corpus).
 */
const MARKER_RE = /\[(\d+(?:[a-z]\d*)?(?:\.[0-9a-z]+)?)\]/g

interface MarkerNode {
  type: 'canonicalMarker'
  data: {
    hName: 'span'
    hProperties: { id: string; className: string[] }
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
      hProperties: { id, className: ['marker'] },
      hChildren: [{ type: 'text', value: literal }],
    },
  }
}

export function remarkMarkers() {
  return (tree: Root) => {
    const seen = new Map<string, number>()
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      MARKER_RE.lastIndex = 0
      if (!MARKER_RE.test(node.value)) return

      const parts: PhrasingContent[] = []
      let last = 0
      MARKER_RE.lastIndex = 0
      for (const m of node.value.matchAll(MARKER_RE)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        parts.push(markerNode(m[0], m[1], seen) as unknown as PhrasingContent)
        last = m.index + m[0].length
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) })

      parent.children.splice(index, 1, ...parts)
      return index + parts.length
    })
  }
}
