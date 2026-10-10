// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkHebrew.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 9e4e2fbcfd51e0003b3755efb324a61e24d643f9d2a2d4ca90d68b6f288ecba8
import type { Root, Text, Parent, PhrasingContent } from 'mdast'
import { escritaDoCabecalho } from './idioma'

/**
 * Runs de texto hebraico viram <span class="hebrew" dir="rtl">, isolados
 * pelo algoritmo bidi: o hebraico corre corretamente da direita para a
 * esquerda DENTRO do run, mas o parágrafo (número do versículo, layout)
 * permanece da esquerda para a direita — requisito do interlinear.
 *
 * A ESCRITA É UMA, AS LÍNGUAS SÃO DUAS. O alfabeto quadrado escreve hebraico e
 * aramaico, e a faixa Unicode não os separa. O `lang` do run vem, nesta ordem:
 *   1. da etiqueta do bloco (`^arc`, `^heb` — remarkIdiomaAncora, que roda antes);
 *   2. do cabeçalho do arquivo (`language: arc`, em `file.data.meta`);
 *   3. na falta dos dois, `he`.
 * Sem isto um Targum inteiro, ou Daniel 2–7 dentro da Bíblia Hebraica, saía
 * dizendo ao leitor de tela que era hebraico.
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

type LinguaQuadrada = 'he' | 'arc'

function linguaDoBloco(no: Parent, herdada: LinguaQuadrada): LinguaQuadrada {
  const lang = (no.data as { hProperties?: { lang?: unknown } } | undefined)?.hProperties?.lang
  return lang === 'arc' || lang === 'he' ? lang : herdada
}

function marcar(no: Parent, herdada: LinguaQuadrada) {
  const lingua = linguaDoBloco(no, herdada)
  for (let i = 0; i < no.children.length; i++) {
    const filho = no.children[i]
    if (filho.type !== 'text') {
      if ('children' in filho) marcar(filho as Parent, lingua)
      continue
    }
    const node = filho as Text
    HEBREW_RUN_RE.lastIndex = 0
    if (!HEBREW_RUN_RE.test(node.value)) continue

    const parts: PhrasingContent[] = []
    let last = 0
    HEBREW_RUN_RE.lastIndex = 0
    for (const m of node.value.matchAll(HEBREW_RUN_RE)) {
      if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
      parts.push({
        type: 'hebrewRun',
        data: {
          hName: 'span',
          hProperties: { className: ['hebrew'], lang: lingua, dir: 'rtl' },
          hChildren: [{ type: 'text', value: m[0] }],
        },
      } as unknown as PhrasingContent)
      last = m.index + m[0].length
    }
    if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) })

    no.children.splice(i, 1, ...parts)
    i += parts.length - 1
  }
}

export function remarkHebrew() {
  return (tree: Root, file?: { data?: unknown }) => {
    const meta = (file?.data as { meta?: { language?: unknown } } | undefined)?.meta
    const doArquivo = escritaDoCabecalho(meta?.language) === 'arc' ? 'arc' : 'he'
    marcar(tree as unknown as Parent, doArquivo)
  }
}
