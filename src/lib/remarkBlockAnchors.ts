import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'

/**
 * Âncoras de bloco do corpus (^v1, ^gn-1-1) no fim de parágrafos:
 * saem do texto visível e viram id do bloco — endereços canônicos
 * de versículo, navegáveis e alvo futuro da busca canônica.
 */
const ANCHOR_RE = /\s*\^([A-Za-z0-9][A-Za-z0-9-]*)\s*$/

export function remarkBlockAnchors() {
  return (tree: Root) => {
    visit(tree, ['paragraph', 'blockquote'], (node) => {
      const block = node as { children?: unknown[]; data?: Record<string, unknown> }
      if (!block.children?.length) return
      // A âncora fica no último text node do bloco (no blockquote,
      // dentro do último parágrafo)
      let holder = block
      const lastChild = block.children[block.children.length - 1] as {
        type?: string
        children?: unknown[]
      }
      if (node.type === 'blockquote' && lastChild?.type === 'paragraph') {
        holder = lastChild as typeof block
      }
      if (!holder.children?.length) return
      const last = holder.children[holder.children.length - 1] as Text
      if (last.type !== 'text') return
      const m = ANCHOR_RE.exec(last.value)
      if (!m) return

      last.value = last.value.slice(0, m.index).replace(/\s+$/, '')
      if (last.value === '') holder.children.pop()

      const data = (block.data ??= {})
      const hProperties = ((data.hProperties as Record<string, unknown>) ??= {})
      hProperties.id = `anchor-${m[1]}`
      data.hProperties = hProperties
    })
  }
}
