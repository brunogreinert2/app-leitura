import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'

/**
 * Âncoras de bloco do corpus (^v1, ^gn-1-1) no fim de parágrafos:
 * saem do texto visível e viram id do bloco — endereços canônicos
 * de versículo, navegáveis e alvo futuro da busca canônica.
 */
/** Exportado: copyBook.ts reaproveita para não vazar a âncora ao copiar
 * (o copiar lê o markdown fonte bruto, não a árvore já processada). */
export const ANCHOR_RE = /\s*\^([A-Za-z0-9][A-Za-z0-9-]*)\s*$/

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
      const id = `anchor-${m[1]}`
      hProperties.id = id
      data.hProperties = hProperties

      // O «1» que abre o versículo já É o endereço dele — só não era clicável.
      // Marcá-lo não altera o texto nem o que o copiar devolve (o copiar lê o
      // markdown fonte, não esta árvore): apenas dá ao Reader onde pendurar o
      // gesto de copiar o link da passagem. Só no parágrafo direto: no
      // blockquote o número mora na linha de cima, não neste bloco.
      if (node.type === 'paragraph') {
        const primeiro = block.children[0] as {
          type?: string
          children?: unknown[]
          data?: Record<string, unknown>
        }
        const unico = primeiro?.children?.length === 1 ? (primeiro.children[0] as Text) : null
        if (primeiro?.type === 'strong' && unico?.type === 'text' && /^\d+[a-z]?$/.test(unico.value.trim())) {
          const d = (primeiro.data ??= {})
          const hp = ((d.hProperties as Record<string, unknown>) ??= {})
          hp.className = ['verse-number']
          hp['data-anchor'] = id
          hp.title = 'Tocar para copiar o link desta passagem'
          d.hProperties = hp
        }
      }
    })
  }
}
