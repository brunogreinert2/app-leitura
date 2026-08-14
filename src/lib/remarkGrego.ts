import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Runs de texto grego viram `<span lang="grc">`.
 *
 * Irmão de `remarkHebrew`, e existe pelo mesmo motivo: sem `lang`, um leitor
 * de tela lê Ἐν ἀρχῇ com fonética portuguesa, e a leitura em voz alta do app
 * mandava o Novo Testamento inteiro para uma voz de português — que não
 * produzia som nenhum, deixando só os números dos versículos audíveis.
 *
 * `grc` e não `el`: grego ANTIGO. O moderno tem outra fonética, e o motor de
 * voz escolhe pela etiqueta (NORMAS.md N38).
 *
 * Sem `dir`: o grego corre da esquerda para a direita como o português, então
 * marcar direção seria ruído. O hebraico precisa dos dois.
 */
// Grego e copta (U+0370–U+03FF) + grego estendido/politônico (U+1F00–U+1FFF).
// Espaços e pontuação são permitidos DENTRO de um run, para não picar uma
// frase inteira em dezenas de spans — mas o run precisa começar e terminar em
// letra grega.
const GREGO = '\\u0370-\\u03FF\\u1F00-\\u1FFF'
const GREEK_RUN_RE = new RegExp(
  `[${GREGO}](?:[${GREGO}]|[\\s.,··;:!?()'’’·;-]+(?=[${GREGO}]))*`,
  'g',
)

export function remarkGrego() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      GREEK_RUN_RE.lastIndex = 0
      if (!GREEK_RUN_RE.test(node.value)) return

      const parts: PhrasingContent[] = []
      let last = 0
      GREEK_RUN_RE.lastIndex = 0
      for (const m of node.value.matchAll(GREEK_RUN_RE)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        parts.push({
          type: 'greekRun',
          data: {
            hName: 'span',
            hProperties: { className: ['grego'], lang: 'grc' },
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
