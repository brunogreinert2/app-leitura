import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { liftDeepHeadingMarkers, remarkDeepHeadingDepth } from './remarkDeepHeadings'
import { remarkInterlinear } from './remarkInterlinear'
import { remarkBlockAnchors } from './remarkBlockAnchors'
import { remarkWikilinks } from './remarkWikilinks'
import { remarkMarkers } from './remarkMarkers'
import { remarkHighlight } from './remarkHighlight'
import { remarkHebrew } from './remarkHebrew'

/**
 * Pipeline separado do processor interativo de markdown.tsx: aqui não
 * há seção recolhível nem componente React algum — só markdown virando
 * HTML estático numa aba nova, pronta pra Ctrl+P. Reaproveita os mesmos
 * plugins (marcadores, wikilinks como texto, hebraico) pra fidelidade
 * com o que aparece na tela.
 */
const printProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDeepHeadingDepth)
  .use(remarkInterlinear)
  .use(remarkBlockAnchors)
  .use(remarkWikilinks)
  .use(remarkMarkers)
  .use(remarkHighlight)
  .use(remarkHebrew)
  .use(remarkRehype, {
    footnoteLabel: 'Notas',
    footnoteLabelTagName: 'h2',
    footnoteBackLabel: 'Voltar ao texto',
  })
  .use(rehypeStringify)

const PRINT_STYLE = `
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 42rem;
         margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a1a; }
  h1, h2, h3, h4, h5, h6 { font-weight: bold; line-height: 1.3; margin: 1.4em 0 0.5em; }
  h1 { font-size: 1.6em; } h2 { font-size: 1.35em; } h3 { font-size: 1.15em; }
  .marker { font-weight: bold; color: #444; }
  .wikilink { text-decoration: underline; }
  blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #ccc; color: #333; }
  sup { font-size: 0.75em; }
  .footnotes { font-size: 0.9em; border-top: 1px solid #ccc; margin-top: 2em; padding-top: 1em; }
  @media print { body { margin: 0; max-width: none; } }
`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Abre uma aba nova com o trecho já formatado e dispara o diálogo de impressão. */
export function printMarkdownText(title: string, markdown: string): void {
  const printWin = window.open('', '_blank')
  if (!printWin) return // pop-up bloqueado: nada a fazer sem permissão do usuário
  const html = printProcessor.processSync(liftDeepHeadingMarkers(markdown)).toString()
  printWin.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
      `<title>${escapeHtml(title)}</title><style>${PRINT_STYLE}</style></head>` +
      `<body>${html}</body></html>`,
  )
  printWin.document.close()
  printWin.focus()
  // document.write não garante onload confiável em about:blank; um
  // pequeno atraso deixa o layout assentar antes do diálogo de impressão
  window.setTimeout(() => {
    try {
      printWin.print()
    } catch {
      /* usuário fechou a aba antes do print — nada a fazer */
    }
  }, 250)
}
