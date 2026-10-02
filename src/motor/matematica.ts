// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\matematica.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: b9ccb6b8444ca3cbf5c4c8e8e6c55fc1a151044f6222009cf95a5372e88a8560
import type { Root as MdastRoot, Text } from 'mdast'
import type { InlineMath } from 'mdast-util-math'
import type { Root as HastRoot, Element, ElementContent } from 'hast'
import type { VFile } from 'vfile'
import { visit, SKIP } from 'unist-util-visit'
import { fromHtml } from 'hast-util-from-html'
import temml from 'temml'

/**
 * Matemática: $x^2$ na linha e $$ … $$ em bloco, como no Obsidian.
 *
 * O remark-math reconhece; aqui ficam as duas coisas que ele não faz.
 *
 * 1. A REGRA DO CIFRÃO (a do Pandoc). O remark-math aceita qualquer coisa
 *    entre dois $, e o acervo tem dinheiro: "R$ 10 e R$ 20", "($9), £40,960
 *    ($172,800)" — viraria fórmula. Pandoc: o $ que abre tem de estar colado
 *    no que vem depois, o que fecha colado no que vem antes, e o que fecha
 *    não pode ser seguido de algarismo. O que não passa volta a ser o texto
 *    exato do arquivo. $$ … $$ não tem essa dúvida e vale sempre.
 *
 * 2. O DESENHO. A fórmula vira MathML (temml), que o navegador desenha
 *    sozinho — sem fonte para baixar, funciona offline, e o leitor de tela lê.
 *    A fonte TeX vai junto como anotação: copiar e buscar acham "x^2".
 *    TeX com erro não some: aparece como texto, marcado.
 */

/** remarkMatematicaPandoc: devolve ao texto o $ … $ que não é fórmula. */
export function remarkMatematicaPandoc() {
  return (tree: MdastRoot, file: VFile) => {
    const fonte = typeof file?.value === 'string' ? file.value : null
    visit(tree, 'inlineMath', (no: InlineMath, indice, pai) => {
      if (!pai || indice === undefined) return
      const ini = no.position?.start.offset
      const fim = no.position?.end.offset
      let cru: string
      let ehFormula: boolean
      if (fonte !== null && ini !== undefined && fim !== undefined) {
        cru = fonte.slice(ini, fim)
        if (cru.startsWith('$$')) return // $$ … $$ na linha: sempre fórmula
        const depoisDoAbre = cru.charAt(1)
        const antesDoFecha = cru.charAt(cru.length - 2)
        const depoisDoFecha = fonte.charAt(fim)
        ehFormula = !/\s/.test(depoisDoAbre) && !/\s/.test(antesDoFecha) && !/[0-9]/.test(depoisDoFecha)
      } else {
        // sem o arquivo à mão, só dá para julgar pelo conteúdo
        cru = `$${no.value}$`
        ehFormula = no.value.length > 0 && !/^\s|\s$/.test(no.value)
      }
      if (ehFormula) return
      const texto: Text = { type: 'text', value: cru, position: no.position }
      pai.children.splice(indice, 1, texto)
      return [SKIP, indice + 1]
    })
  }
}

function desenhar(tex: string, bloco: boolean): ElementContent[] {
  const mathml = temml.renderToString(tex, { displayMode: bloco, annotate: true, throwOnError: false })
  return fromHtml(mathml, { fragment: true }).children as ElementContent[]
}

const temClasse = (el: Element, c: string) =>
  Array.isArray(el.properties?.className) && (el.properties.className as string[]).includes(c)

const textoDe = (el: Element) =>
  el.children.map((c) => (c.type === 'text' ? c.value : '')).join('')

/**
 * rehypeMatematica: o <code class="language-math"> do remark-math vira MathML.
 *
 * Pela marca `language-math`, e não pela `math-inline`/`math-display`: a
 * lista branca do HTML (htmlCru.ts, a do GitHub) só deixa no <code> classe
 * que começa com "language-", e num texto que também tem HTML as outras duas
 * sumiam — a fórmula saía como código (achado na vitrine). Bloco ou linha se
 * decide pelo lugar: dentro de <pre> é bloco. De brinde, ```math também vira
 * fórmula, como no GitHub e no Obsidian.
 */
export function rehypeMatematica() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (el: Element, indice, pai) => {
      if (!pai || indice === undefined) return
      // bloco: <pre><code class="language-math">
      if (el.tagName === 'pre') {
        const code = el.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code')
        if (!code || !temClasse(code, 'language-math')) return
        pai.children.splice(indice, 1, ...desenhar(textoDe(code), true))
        return [SKIP, indice + 1]
      }
      if (el.tagName === 'code' && temClasse(el, 'language-math')) {
        pai.children.splice(indice, 1, ...desenhar(textoDe(el), false))
        return [SKIP, indice + 1]
      }
    })
  }
}
