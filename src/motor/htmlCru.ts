// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\htmlCru.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 3038853ace6e9a416e40043dd5be484b81d8c1e73fd63759d7ebc586508d5d4b
import type { Root as MdastRoot, Html } from 'mdast'
import type { Root as HastRoot, Element as HastElement } from 'hast'
import type { VFile } from 'vfile'
import { visit } from 'unist-util-visit'
import { raw } from 'hast-util-raw'
import { sanitize, defaultSchema, type Schema } from 'hast-util-sanitize'

/**
 * HTML dentro do .md — anel de Leitura da proposta do parser
 * (C:\Claude\parser\proposta.md, §2 e §4.1).
 *
 * ANTES: o remark-rehype descartava todo HTML cru, em silêncio. Um
 * `<table><tr>…` colado de outro lugar simplesmente sumia da tela, contra
 * o N7 ("o que não sabe, mostra como texto, e nunca quebra").
 *
 * AGORA, em três passos:
 *   1. remarkTagDesconhecidaComoTexto — `<nome>` que não é tag de HTML
 *      (anel da Rede) vira texto literal, não some;
 *   2. rehypeHtmlCru — o HTML de verdade é lido de verdade (parse5, o
 *      mesmo algoritmo do navegador);
 *   3. e passa pelo filtro: lista branca de tags e atributos. Entra arquivo
 *      de fora pelo Novo, então nada de <script>, onclick ou javascript:.
 *
 * O acervo não paga nada disso: sem HTML no texto, os passos 2 e 3 nem
 * rodam, e a árvore sai idêntica à de antes.
 */

/** Toda tag que o HTML conhece. O que estiver fora daqui é texto. */
const TAGS_DO_HTML = new Set(
  (
    'a abbr address area article aside audio b base bdi bdo big blockquote body br button ' +
    'canvas caption center cite code col colgroup data datalist dd del details dfn dialog ' +
    'div dl dt em embed fieldset figcaption figure font footer form frame frameset h1 h2 h3 ' +
    'h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link ' +
    'main map mark marquee math menu meta meter nav nobr noscript object ol optgroup option ' +
    'output p param picture pre progress q rp rt ruby s samp script search section select ' +
    'slot small source span strike strong style sub summary sup svg table tbody td template ' +
    'textarea tfoot th thead time title tr track tt u ul var video wbr'
  ).split(' '),
)

const RE_TAG = /<(\/?)([A-Za-z][A-Za-z0-9-]*)(?=[\s/>])/g

/** `<nome>` → `&lt;nome>`: o parser de HTML lê isso como o texto `<nome>`. */
function escaparDesconhecidas(html: string): string {
  return html.replace(RE_TAG, (tag, _barra: string, nome: string) =>
    TAGS_DO_HTML.has(nome.toLowerCase()) || /^h[1-9]\d*$/i.test(nome) ? tag : '&lt;' + tag.slice(1),
  )
}

/**
 * Tag que o HTML não conhece é conteúdo, não marcação: "a variável <nome>"
 * mostra `<nome>`. Roda no mdast, antes do remark-rehype.
 */
export function remarkTagDesconhecidaComoTexto() {
  return (tree: MdastRoot) => {
    visit(tree, 'html', (node: Html) => {
      node.value = escaparDesconhecidas(node.value)
    })
  }
}

/**
 * A lista branca. Parte da do GitHub (defaultSchema) e alarga para o que
 * o leitor desenha e o que texto antigo usa — nunca para o que executa.
 */
const ESQUEMA_BASE: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'mark', 'u', 'abbr', 'small', 'big', 'cite', 'dfn', 'figure', 'figcaption',
    'caption', 'col', 'colgroup', 'bdi', 'bdo', 'wbr', 'time', 'address', 'center',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      // o que os plugins do leitor põem: classe (grego, verso, marker…),
      // data-* (wikilink, âncora, nota), aria-level (cabeçalho h7+)
      'className', 'role', 'ariaLevel', 'ariaHidden', 'ariaLabel', 'data*',
    ],
  },
  // Sem prefixo "user-content-" nos ids: as âncoras ^id (N12), os
  // cabeçalhos do sumário e as notas do remark-rehype dependem deles como são.
  clobber: [],
  // Some com o conteúdo junto: código e estilo não são texto para ler.
  strip: ['script', 'style', 'template'],
}

/** Os h7, h17, h48 que o texto tiver (N10: profundidade sem teto). */
function cabecalhosFundos(tree: HastRoot): string[] {
  const fundos = new Set<string>()
  visit(tree, 'element', (el: HastElement) => {
    if (/^h([7-9]|[1-9]\d+)$/.test(el.tagName)) fundos.add(el.tagName)
  })
  return [...fundos]
}

function temHtmlCru(tree: HastRoot): boolean {
  let tem = false
  visit(tree, 'raw', () => {
    tem = true
    return false // achou um, basta
  })
  return tem
}

/**
 * Lê o HTML cru e passa tudo pelo filtro. Precisa do remark-rehype com
 * `allowDangerousHtml: true` — sem isso o HTML já chega aqui apagado.
 */
export function rehypeHtmlCru() {
  return (tree: HastRoot, file: VFile): HastRoot => {
    if (!temHtmlCru(tree)) return tree
    // Com o `file`, a árvore relida guarda a posição de cada nó no .md —
    // sem ele os cabeçalhos perdem a linha, e o "copiar seção" e a busca
    // (que abre a seção certa) deixam de achar onde estão.
    const lido = raw(tree, { file }) as HastRoot
    const esquema: Schema = {
      ...ESQUEMA_BASE,
      tagNames: [...(ESQUEMA_BASE.tagNames ?? []), ...cabecalhosFundos(lido)],
    }
    return sanitize(lido, esquema) as HastRoot
  }
}
