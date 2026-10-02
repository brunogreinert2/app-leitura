// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\processador.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 745bbcbc9aa58138c0aa4141c75b9129efdc4361281a90bf0b340811a9a563c7
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import { remarkDeepHeadingDepth } from './remarkDeepHeadings'
import { remarkInterlinear } from './remarkInterlinear'
import { remarkVerso } from './remarkVerso'
import { remarkComentario } from './remarkComentario'
import { remarkImagemPorId } from './remarkImagemPorId'
import { remarkCallout } from './remarkCallout'
import { remarkNotaInline } from './remarkNotaInline'
import { remarkIdiomaAncora } from './remarkIdiomaAncora'
import { remarkBlockAnchors } from './remarkBlockAnchors'
import { remarkWikilinks } from './remarkWikilinks'
import { remarkMarkers } from './remarkMarkers'
import { remarkHighlight } from './remarkHighlight'
import { remarkHebrew } from './remarkHebrew'
import { remarkGrego } from './remarkGrego'
import { remarkTagDesconhecidaComoTexto, rehypeHtmlCru } from './htmlCru'
import { remarkMatematicaPandoc, rehypeMatematica } from './matematica'

/**
 * O formato do ecossistema, inteiro, numa lista só (C:\Claude\parser\proposta.md).
 *
 * Antes cada caminho do app montava a sua: a tela em markdown.tsx, a
 * impressão em printSection.ts — e a da impressão tinha esquecido o
 * remarkVerso, então um bloco ```verso saía impresso como caixa de código.
 * Agora quem desenha (tela, papel, e depois o Historinhas) pede o processador
 * aqui e só acrescenta o próprio fim (React, HTML em texto…).
 *
 * A ORDEM IMPORTA:
 *   1. a regra do cifrão, primeiro: o $ … $ que não é fórmula volta a ser
 *      texto, e daí em diante é tratado como qualquer texto;
 *   2. cabeçalhos fundos (reescrevem a profundidade);
 *   3. interlinear e verso, que CRIAM parágrafos de texto puro…
 *   4. …e só então o que mexe na estrutura: comentário %% (sai antes de pôr
 *      nome no índice), {{img:id}}, callout, nota inline ^[ ];
 *   5. os visitantes de texto (idioma, âncora, wikilink, marcador, realce,
 *      hebraico, grego); o idioma antes da âncora, que precisa ver o `^id`;
 *   6. tag desconhecida vira texto, no mdast, antes do remark-rehype;
 *   7. HTML cru lido e filtrado, já em hast;
 *   8. a matemática desenhada por último, depois do filtro do HTML: o MathML
 *      é do motor, não do arquivo, e não precisa passar pela lista branca.
 *
 * Quem chama pode pôr o front matter em `file.data.meta` (para o {{img:id}})
 * e o texto em `file.value` (para a regra do cifrão olhar o arquivo exato).
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
    .use(remarkMath)
    .use(remarkMatematicaPandoc)
    .use(remarkDeepHeadingDepth)
    .use(remarkInterlinear)
    .use(remarkVerso)
    .use(remarkComentario)
    .use(remarkImagemPorId)
    .use(remarkCallout)
    .use(remarkNotaInline)
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
    .use(rehypeMatematica)
}

export { liftDeepHeadingMarkers } from './remarkDeepHeadings'
export { TITULO_PADRAO_DO_CALLOUT } from './remarkCallout'
export { PREFIXO_NOTA_INLINE } from './remarkNotaInline'
