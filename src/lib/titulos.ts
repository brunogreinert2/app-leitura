/**
 * Os títulos de um texto — a matéria do sumário.
 *
 * Mora fora de markdown.tsx por um motivo só: NÃO PODE IMPORTAR REACT. Tirar
 * os títulos de um livro de 1 MB leva 3,6 s (medido), e no editor essa conta
 * roda a cada pausa na digitação; na linha principal, a caixa de texto
 * congelaria esse tempo todo. Sem React no caminho, o mesmo código roda num
 * worker (titulos.worker.ts) e o editor continua respondendo.
 *
 * O leitor (markdown.tsx) usa estas mesmas funções: um sumário, uma regra.
 */
import type { Root as HastRoot } from 'hast'
import { VFile } from 'vfile'
import { splitFrontmatter } from './frontmatter'
import { criarProcessador, liftDeepHeadingMarkers } from '../motor/processador'

export interface HeadingInfo {
  depth: number
  text: string
  id: string
  /** Linha (1-based) do heading no markdown fonte. */
  line?: number
}

/** Texto plano de um nó hast (para títulos do sumário). */
function hastText(node: unknown): string {
  const n = node as { type?: string; value?: string; children?: unknown[] }
  if (n.type === 'text') return n.value ?? ''
  if (Array.isArray(n.children)) return n.children.map(hastText).join('')
  return ''
}

function slugify(text: string, seen: Map<string, number>): string {
  const base =
    'h-' +
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

/**
 * Atribui ids aos headings (âncoras do sumário) e coleta a estrutura.
 * Ignora a seção de notas gerada pelo remark-rehype (id footnote-label).
 */
export function collectHeadings(tree: HastRoot): HeadingInfo[] {
  const headings: HeadingInfo[] = []
  const seen = new Map<string, number>()
  for (const node of tree.children) {
    // Sem teto de 6: CommonMark só permite até "######" na ATIX, mas
    // remarkDeepHeadingDepth já reescreveu node.depth pra profundidade
    // real antes daqui — "h7", "h12", "h48" chegam intactos.
    if (node.type !== 'element' || !/^h[1-9]\d*$/.test(node.tagName)) continue
    if (node.properties?.id === 'footnote-label') continue
    const text = hastText(node)
    const id = slugify(text, seen)
    // .slice(1), não [1]: tagName[1] só pega 1 caractere e trunca
    // profundidades de 2 dígitos ("h10" virava depth 1).
    const depth = Number(node.tagName.slice(1))
    const properties: Record<string, unknown> = {
      ...node.properties,
      id,
      className: [...((node.properties?.className as string[]) ?? []), 'reading-heading'],
    }
    // HTML só tem h1-h6 de verdade; h7+ não existe e leitor de tela não
    // reconhece como heading nenhum (CSS não depende do nome da tag,
    // mas a árvore de acessibilidade depende). aria-level é o mecanismo
    // ARIA pra sobrescrever o nível implícito — nestSections lê dali
    // (não do tagName) pra manter a profundidade real no aninhamento.
    if (depth > 6) {
      node.tagName = 'h6'
      properties.ariaLevel = depth
    }
    node.properties = properties as typeof node.properties
    headings.push({ depth, text, id, line: node.position?.start.line })
  }
  return headings
}

/** Linhas que o front matter ocupa: o que há no arquivo antes do corpo. */
export function linhasAntesDoCorpo(raw: string, content: string): number {
  let n = 0
  const fim = raw.length - content.length
  for (let i = raw.indexOf('\n'); i !== -1 && i < fim; i = raw.indexOf('\n', i + 1)) n++
  return n
}

// Criado só quando alguém pede: no leitor quem processa é markdown.tsx, com o
// processador dele, e este aqui nunca chega a existir na linha principal.
let proc: ReturnType<typeof criarProcessador> | undefined
function processador() {
  return (proc ??= criarProcessador())
}

/**
 * Só os títulos de um texto, com a linha de cada um NO ARQUIVO.
 *
 * Para o sumário do editor, que precisa da mesma lista que o leitor mostra
 * sem montar o livro inteiro. É o MESMO motor de parseBook, de propósito:
 * uma expressão regular catando linhas com `#` discordaria dele em bloco de
 * código, em título sublinhado com `===` e nos níveis além do sexto — e o
 * sumário do editor mostraria capítulos que o leitor não mostra.
 */
export function titulosDoTexto(raw: string): HeadingInfo[] {
  const { meta, content } = splitFrontmatter(raw)
  const arquivo = new VFile({ value: liftDeepHeadingMarkers(content), data: { meta } })
  const hast = processador().runSync(processador().parse(arquivo), arquivo) as HastRoot
  const base = linhasAntesDoCorpo(raw, content)
  return collectHeadings(hast).map((h) =>
    h.line === undefined ? h : { ...h, line: h.line + base },
  )
}
