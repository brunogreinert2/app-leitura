// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkCallout.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: e5901f61cf6d316944e2a57828cd8e12af622d1e729ba6054f1dc6edc105a737
import type { Root, Blockquote, Paragraph, PhrasingContent, BlockContent } from 'mdast'
import { visit } from 'unist-util-visit'

/**
 * Callout do Obsidian — a caixa de nota:
 *
 *     > [!note] Título opcional
 *     > O corpo da caixa.
 *
 * vira <div class="callout" data-callout="note"> com um título e o corpo.
 * `[!tipo]-` é uma caixa que começa FECHADA e `[!tipo]+` uma que começa
 * aberta: as duas viram <details>/<summary>, que abrem e fecham sem script.
 *
 * O TÍTULO PADRÃO (caixa sem título escrito) é texto de interface, e o motor
 * não sabe a língua da tela. Ele escreve o nome em português e marca o tipo
 * em data-callout-padrao; o app troca pela língua escolhida na hora de
 * desenhar (no Pedra Angular, o CalloutTitulo de markdown.tsx). Assim trocar
 * de idioma não obriga a reler o livro.
 *
 * Tipo desconhecido ([!qualquercoisa]) também vira caixa, com o próprio nome
 * como título: o Obsidian faz assim, e a palavra escrita não some.
 */
const RX_MARCA = /^\[!([A-Za-z][\w-]*)\]([+-]?)[ \t]*/

/** Apelidos do Obsidian → o tipo de que são sinônimo. */
const APELIDOS: Record<string, string> = {
  summary: 'abstract', tldr: 'abstract',
  hint: 'tip', important: 'tip',
  check: 'success', done: 'success',
  help: 'question', faq: 'question',
  caution: 'warning', attention: 'warning',
  fail: 'failure', missing: 'failure',
  error: 'danger',
  cite: 'quote',
}

export const TITULO_PADRAO_DO_CALLOUT: Record<string, string> = {
  note: 'Nota', abstract: 'Resumo', info: 'Informação', todo: 'A fazer',
  tip: 'Dica', success: 'Feito', question: 'Pergunta', warning: 'Atenção',
  failure: 'Falha', danger: 'Perigo', bug: 'Defeito', example: 'Exemplo',
  quote: 'Citação',
}

/** Separa a primeira linha (o título) do resto do primeiro parágrafo. */
function partirPrimeiraLinha(p: Paragraph): [PhrasingContent[], PhrasingContent[]] {
  const titulo: PhrasingContent[] = []
  const resto: PhrasingContent[] = []
  let achou = false
  for (const filho of p.children) {
    if (achou) {
      resto.push(filho)
    } else if (filho.type === 'text' && filho.value.includes('\n')) {
      const i = filho.value.indexOf('\n')
      if (i > 0) titulo.push({ type: 'text', value: filho.value.slice(0, i) })
      const depois = filho.value.slice(i + 1)
      if (depois) resto.push({ type: 'text', value: depois })
      achou = true
    } else if (filho.type === 'break') {
      achou = true
    } else {
      titulo.push(filho)
    }
  }
  return [titulo, resto]
}

export function remarkCallout() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (bq: Blockquote) => {
      const primeiro = bq.children[0]
      if (primeiro?.type !== 'paragraph') return
      const inicio = primeiro.children[0]
      if (inicio?.type !== 'text') return
      const m = RX_MARCA.exec(inicio.value)
      if (!m) return

      const escrito = m[1].toLowerCase()
      const tipo = APELIDOS[escrito] ?? escrito
      const dobra = m[2] // '' fixa, '-' começa fechada, '+' começa aberta
      inicio.value = inicio.value.slice(m[0].length)

      const [tituloEscrito, resto] = partirPrimeiraLinha(primeiro)
      const temTitulo = tituloEscrito.some((n) => n.type !== 'text' || n.value.trim() !== '')
      const padrao = TITULO_PADRAO_DO_CALLOUT[tipo] ?? escrito.charAt(0).toUpperCase() + escrito.slice(1)

      const corpo: BlockContent[] = []
      if (resto.length) corpo.push({ type: 'paragraph', children: resto })
      corpo.push(...(bq.children.slice(1) as BlockContent[]))

      const titulo = {
        type: 'calloutTitulo',
        children: temTitulo ? tituloEscrito : [{ type: 'text', value: padrao }],
        data: {
          hName: dobra ? 'summary' : 'div',
          hProperties: {
            className: ['callout-titulo'],
            ...(temTitulo ? {} : { dataCalloutPadrao: tipo }),
          },
        },
      }
      const conteudo = {
        type: 'calloutConteudo',
        children: corpo,
        data: { hName: 'div', hProperties: { className: ['callout-conteudo'] } },
      }

      bq.children = [titulo, conteudo] as unknown as Blockquote['children']
      bq.data = {
        ...bq.data,
        hName: dobra ? 'details' : 'div',
        hProperties: {
          className: ['callout', `callout-${tipo}`],
          dataCallout: tipo,
          ...(dobra === '+' ? { open: true } : {}),
        },
      }
    })
  }
}
