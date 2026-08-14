import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Runs de texto hebraico viram <span class="hebrew" dir="rtl">, isolados
 * pelo algoritmo bidi: o hebraico corre corretamente da direita para a
 * esquerda DENTRO do run, mas o parágrafo (número do versículo, layout)
 * permanece da esquerda para a direita — requisito do interlinear.
 */
/* Bloco hebraico + formas de apresentação; espaços permitidos entre
   caracteres hebraicos dentro do mesmo run.

   AS FAIXAS SÃO ESCRITAS COM \u, NUNCA COM O CARACTERE LITERAL. Esta classe já
   esteve escrita com os caracteres crus, e o U+FB1D se decompôs no arquivo em
   U+05D9 + U+05B4. A classe então virou, para o motor de regex, "U+0590–U+05FF,
   U+05D9 solto, e a faixa U+05B4–U+FB4F" — vinte e cinco mil pontos de código
   que não são hebraico, incluindo TODO o grego politônico. O grego antigo, que
   é a maior parte do grego do acervo, era marcado `lang="he" dir="rtl"` e saía
   na tela correndo da direita para a esquerda. Um caractere invisível de
   diferença, e nada no código parece errado. */
const HEBRAICO = '\\u0590-\\u05FF\\uFB1D-\\uFB4F'
const HEBREW_RUN_RE = new RegExp(
  `[${HEBRAICO}](?:[${HEBRAICO}]|\\s+(?=[${HEBRAICO}]))*`,
  'g',
)

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
            hProperties: { className: ['hebrew'], lang: 'he', dir: 'rtl' },
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
