// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\processador.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: d3d49ba3a0400762f9ff3d5bb8fe62e89ebd10a6ff3d24d1c49080c3358b99ae
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import { remarkDeepHeadingDepth } from './remarkDeepHeadings'
import { remarkInterlinear } from './remarkInterlinear'
import { remarkVerso } from './remarkVerso'
import { remarkIdiomaAncora } from './remarkIdiomaAncora'
import { remarkBlockAnchors } from './remarkBlockAnchors'
import { remarkWikilinks } from './remarkWikilinks'
import { remarkMarkers } from './remarkMarkers'
import { remarkHighlight } from './remarkHighlight'
import { remarkHebrew } from './remarkHebrew'
import { remarkGrego } from './remarkGrego'
import { remarkTagDesconhecidaComoTexto, rehypeHtmlCru } from './htmlCru'

/**
 * O formato do ecossistema, inteiro, numa lista só (C:\Claude\parser\proposta.md).
 *
 * Antes cada caminho do app montava a sua: a tela em markdown.tsx, a
 * impressão em printSection.ts — e a da impressão tinha esquecido o
 * remarkVerso, então um bloco ```verso saía impresso como caixa de código.
 * Agora quem desenha (tela, papel, e depois o Historinhas) pede o processador
 * aqui e só acrescenta o próprio fim (React, HTML em texto…).
 *
 * A ORDEM IMPORTA, e é a que já estava provada em produção:
 *   1. cabeçalhos fundos, antes de tudo (reescrevem a profundidade);
 *   2. interlinear e verso, que CRIAM parágrafos de texto puro…
 *   3. …para os visitantes de texto (idioma, âncora, wikilink, marcador,
 *      realce, hebraico, grego) os processarem como qualquer outro;
 *      o idioma antes da âncora, que precisa ver o `^id` intacto;
 *   4. tag desconhecida vira texto, no mdast, antes do remark-rehype;
 *   5. HTML cru lido e filtrado, já em hast.
 */
export interface OpcoesDoProcessador {
  /** Título da lista de notas no fim do texto. */
  rotuloDasNotas?: string
  /** O que o leitor de tela ouve no ↩ de cada nota. */
  voltarAoTexto?: string
}

export function criarProcessador({
  rotuloDasNotas = 'Notas',
  voltarAoTexto = 'Voltar ao texto',
}: OpcoesDoProcessador = {}) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDeepHeadingDepth)
    .use(remarkInterlinear)
    .use(remarkVerso)
    .use(remarkIdiomaAncora)
    .use(remarkBlockAnchors)
    .use(remarkWikilinks)
    .use(remarkMarkers)
    .use(remarkHighlight)
    .use(remarkHebrew)
    .use(remarkGrego)
    .use(remarkTagDesconhecidaComoTexto)
    .use(remarkRehype, {
      // sem isto o HTML já chega apagado ao rehypeHtmlCru (htmlCru.ts)
      allowDangerousHtml: true,
      footnoteLabel: rotuloDasNotas,
      footnoteLabelTagName: 'h2',
      footnoteBackLabel: voltarAoTexto,
    })
    .use(rehypeHtmlCru)
}

export { liftDeepHeadingMarkers } from './remarkDeepHeadings'
