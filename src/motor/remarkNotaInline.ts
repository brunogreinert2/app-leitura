// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkNotaInline.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: a8855d2a5db43d57a19f26d0059fd6f50df926c9d7a64f66f6b61d3bca11ba82
import type { Root, Text, PhrasingContent, FootnoteDefinition } from 'mdast'
import { visit } from 'unist-util-visit'

/**
 * Nota inline do Pandoc e do Obsidian: "uma frase^[o texto da nota] segue".
 *
 * Vira uma nota de rodapé de verdade — a mesma chamada, a mesma lista no fim
 * — com o identificador `nota-inline-N`. O remark-rehype numera todas as
 * notas pela ordem em que aparecem, então a inline ganha o número certo no
 * meio das [^n] escritas à mão.
 *
 * Só o caso simples: o texto da nota dentro de UM nó de texto, sem colchete
 * dentro. Nota com *ênfase* ou [link] dentro fica como está, visível (anel
 * da Rede) — melhor um ^[…] na tela do que uma nota cortada ao meio.
 *
 * Não confunde com a âncora `^id` (remarkBlockAnchors): ali o ^ vem seguido
 * de letra, aqui de colchete.
 */
const RX_NOTA = /\^\[([^\][]+)\]/g

export const PREFIXO_NOTA_INLINE = 'nota-inline-'

export function remarkNotaInline() {
  return (tree: Root) => {
    const definicoes: FootnoteDefinition[] = []
    visit(tree, 'text', (no: Text, indice, pai) => {
      if (!pai || indice === undefined || !no.value.includes('^[')) return
      if (pai.type === 'link' || pai.type === 'linkReference') return
      RX_NOTA.lastIndex = 0
      if (!RX_NOTA.test(no.value)) return

      const partes: PhrasingContent[] = []
      let ultimo = 0
      RX_NOTA.lastIndex = 0
      for (const m of no.value.matchAll(RX_NOTA)) {
        if (m.index > ultimo) partes.push({ type: 'text', value: no.value.slice(ultimo, m.index) })
        const id = `${PREFIXO_NOTA_INLINE}${definicoes.length + 1}`
        partes.push({ type: 'footnoteReference', identifier: id, label: id })
        definicoes.push({
          type: 'footnoteDefinition',
          identifier: id,
          label: id,
          children: [{ type: 'paragraph', children: [{ type: 'text', value: m[1].trim() }] }],
        })
        ultimo = m.index + m[0].length
      }
      if (ultimo < no.value.length) partes.push({ type: 'text', value: no.value.slice(ultimo) })
      pai.children.splice(indice, 1, ...partes)
      return indice + partes.length
    })
    tree.children.push(...definicoes)
  }
}
