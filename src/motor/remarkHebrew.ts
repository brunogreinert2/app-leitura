// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkHebrew.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 37e149896f17bcaebf5593d6a13fa50f386625e05a2be145a1a413e8bd228ebe
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

/* NUM BLOCO DE LETRA QUADRADA, O RUN É UM SÓ. Um versículo hebraico ou aramaico
   pode trazer pontuação que não está na faixa hebraica: o Targum Jônatas das
   Mikraot Gedolot fecha todo versículo com `:` em vez de sof pasuq, e marca
   acréscimos com `[ת"א]` e parênteses. Com o run cortado em cada um desses
   sinais, os pedaços se enfileiravam da esquerda para a direita, na ordem do
   parágrafo: o `:` final ia parar no COMEÇO da última linha, e um versículo
   com colchetes saía com as frases fora de ordem. Então, quando mais da metade
   das letras do bloco é hebraica, o run vai da primeira à última letra
   hebraica do trecho e leva junto a pontuação que as cerca.

   Num bloco que só CITA uma palavra hebraica ("a palavra דָּבָר, que…") nada
   muda: a vírgula é da frase em português e fica fora do run. */
const ABRE = `(\\[\\u00AB\\u201C"'`
const FECHA = `:.,;!?)\\]\\u00BB\\u201D"'`
const RUN_DE_BLOCO_RE = new RegExp(
  `[${ABRE}]*[${HEBRAICO}](?:[\\s\\S]*[${HEBRAICO}])?[${FECHA}]*`,
  'g',
)
const RX_LETRA = /\p{L}/gu
const RX_LETRA_QUADRADA = new RegExp('[\\u05D0-\\u05EA\\uFB1D-\\uFB4F]', 'g')

function textoDe(no: Parent): string {
  let t = ''
  for (const filho of no.children) {
    if (filho.type === 'text') t += (filho as Text).value
    else if ('children' in filho) t += textoDe(filho as Parent)
  }
  return t
}

function ehBlocoQuadrado(no: Parent): boolean {
  const t = textoDe(no)
  const letras = (t.match(RX_LETRA) || []).length
  return letras > 0 && (t.match(RX_LETRA_QUADRADA) || []).length / letras > 0.5
}

type LinguaQuadrada = 'he' | 'arc'

function linguaDoBloco(no: Parent, herdada: LinguaQuadrada): LinguaQuadrada {
  const lang = (no.data as { hProperties?: { lang?: unknown } } | undefined)?.hProperties?.lang
  return lang === 'arc' || lang === 'he' ? lang : herdada
}

function marcar(no: Parent, herdada: LinguaQuadrada, quadrado = false) {
  const lingua = linguaDoBloco(no, herdada)
  const tipo = (no as { type?: string }).type
  if (tipo === 'paragraph' || tipo === 'heading') quadrado = ehBlocoQuadrado(no)
  const RUN_RE = quadrado ? RUN_DE_BLOCO_RE : HEBREW_RUN_RE
  for (let i = 0; i < no.children.length; i++) {
    const filho = no.children[i]
    if (filho.type !== 'text') {
      if ('children' in filho) marcar(filho as Parent, lingua, quadrado)
      continue
    }
    const node = filho as Text
    HEBREW_RUN_RE.lastIndex = 0
    if (!HEBREW_RUN_RE.test(node.value)) continue

    const parts: PhrasingContent[] = []
    let last = 0
    RUN_RE.lastIndex = 0
    for (const m of node.value.matchAll(RUN_RE)) {
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
