import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import type { ReactNode } from 'react'
import type { Root as HastRoot } from 'hast'
import type { Element as HastElement, ElementContent } from 'hast'
import { splitFrontmatter, type BookMeta } from './frontmatter'
import { escritaDoCabecalho, type Escrita } from '../motor/idioma'
import { criarProcessador, liftDeepHeadingMarkers, PREFIXO_NOTA_INLINE } from '../motor/processador'
import { VFile } from 'vfile'
import { FootnoteRef } from '../components/FootnoteRef'
import { BackrefLink } from '../components/BackrefLink'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { WikilinkRef } from '../components/WikilinkRef'
import { CalloutTitulo } from '../components/CalloutTitulo'

export interface ParsedBook {
  meta: BookMeta | null
  body: ReactNode
  headings: HeadingInfo[]
  /** Markdown fonte sem o front matter (base do copiar limpo). */
  source: string
  /**
   * O arquivo COMO ESTÁ no disco: com front matter e com as âncoras `^id`.
   * Separado de `source` de propósito — `source` perde o YAML e o copiar
   * ainda tira as âncoras, o que é certo para colar em outro lugar e
   * DESTRUIDOR para gravar por cima do original. Quem salva arquivo usa
   * este campo; quem copia texto usa o outro.
   */
  raw: string
  /** Índice de nomes: alvos de wikilinks e nº de ocorrências. */
  names: NameEntry[]
  /** Tamanho do arquivo original em bytes (para os Detalhes). */
  bytes: number
  /**
   * Idioma declarado em `language:`. É o PADRÃO de cada trecho: português,
   * inglês e latim usam o mesmo alfabeto e não se distinguem por código de
   * caractere, então quando a contagem de palavras não decide, quem manda é
   * o que o arquivo declara. Ver motor/idioma.ts.
   */
  escritaPadrao: Escrita
}

export interface NameEntry {
  name: string
  count: number
}

export interface HeadingInfo {
  depth: number
  text: string
  id: string
  /** Linha (1-based) do heading no markdown fonte. */
  line?: number
}

// O formato inteiro vem do motor do ecossistema (src/motor, fonte em
// C:\Claude\parser\motor). Aqui só o que é da tela: React, sumário, seções.
const processor = criarProcessador()

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
      .replace(/[̀-ͯ]/g, '')
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
function collectHeadings(tree: HastRoot): HeadingInfo[] {
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

/**
 * Agrupa o conteúdo em <section data-collapsible> aninhadas por heading
 * (h1–h6), cada uma com exatamente dois filhos: o heading e um div com
 * o conteúdo até o próximo heading de nível igual ou superior.
 * Só a lista de notas do GFM fica fora.
 */
function nestSections(tree: HastRoot) {
  const rootOut: ElementContent[] = []
  const stack: { depth: number; content: ElementContent[] }[] = []
  const push = (node: ElementContent) =>
    (stack.length ? stack[stack.length - 1].content : rootOut).push(node)

  for (const node of tree.children as ElementContent[]) {
    const isFootnotes =
      node.type === 'element' && node.properties?.dataFootnotes !== undefined
    if (isFootnotes) {
      stack.length = 0
      rootOut.push(node)
      continue
    }
    const isHeading =
      node.type === 'element' &&
      /^h[1-9]\d*$/.test(node.tagName) &&
      typeof node.properties?.id === 'string' &&
      node.properties.id !== 'footnote-label'
    if (!isHeading) {
      push(node)
      continue
    }
    // collectHeadings já rodou e pode ter capado a tag em h6 (com
    // aria-level guardando a profundidade real) — prioriza aria-level
    // pra não perder o nível de verdade no aninhamento.
    const el = node as HastElement
    const ariaLevel = el.properties?.ariaLevel
    const depth = typeof ariaLevel === 'number' ? ariaLevel : Number(el.tagName.slice(1))
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    const contentDiv: HastElement = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['section-content'] },
      children: [],
    }
    const section: HastElement = {
      type: 'element',
      tagName: 'section',
      properties: {
        dataCollapsible: String((node as HastElement).properties.id),
        dataDepth: depth,
      },
      children: [node, contentDiv],
    }
    push(section)
    stack.push({ depth, content: contentDiv.children })
  }
  tree.children = rootOut
}

/**
 * Na lista de notas do fim, mostra o label original do corpus
 * ([^1], [^intro1]...) em vez da numeração sequencial da <ol>.
 */
function labelFootnoteList(tree: HastRoot) {
  const rotuloInline = new Map<string, string>()
  for (const node of tree.children) {
    if (node.type !== 'element' || node.properties?.dataFootnotes === undefined) continue
    for (const ol of node.children) {
      if (ol.type !== 'element' || ol.tagName !== 'ol') continue
      ol.properties = { ...ol.properties, className: ['footnote-list'] }
      const idDe = (li: ElementContent) =>
        li.type === 'element'
          ? decodeURIComponent(String(li.properties?.id ?? '').replace(/^user-content-fn-/, ''))
          : ''
      // A nota inline (^[…]) não tem rótulo escrito: o motor a chama de
      // nota-inline-N. Ela ganha o primeiro número que nenhuma nota ESCRITA
      // usa — com [^1] no texto, a inline é 2, nunca um segundo "1".
      const escritos = new Set(ol.children.map(idDe).filter((id) => id && !id.startsWith(PREFIXO_NOTA_INLINE)))
      let proximo = 1
      for (const li of ol.children) {
        if (li.type !== 'element' || li.tagName !== 'li') continue
        const bruto = idDe(li)
        let label = bruto
        if (bruto.startsWith(PREFIXO_NOTA_INLINE)) {
          while (escritos.has(String(proximo))) proximo++
          label = String(proximo++)
          rotuloInline.set(bruto, label)
        }
        const target = li.children.find((c) => c.type === 'element' && c.tagName === 'p') ?? li
        if (target.type === 'element') {
          target.children.unshift({
            type: 'element',
            tagName: 'span',
            properties: { className: ['fn-label'] },
            children: [{ type: 'text', value: `${label}. ` }],
          })
        }
      }
    }
  }
  if (!rotuloInline.size) return
  // a chamada no meio do texto mostra o mesmo número (FootnoteRef lê data-rotulo)
  const marcar = (no: { type?: string; properties?: Record<string, unknown>; children?: unknown[] }) => {
    if (no.type === 'element' && no.properties?.dataFootnoteRef !== undefined) {
      const id = decodeURIComponent(String(no.properties.href ?? '').replace(/^#user-content-fn-/, ''))
      const rotulo = rotuloInline.get(id)
      if (rotulo) no.properties.dataRotulo = rotulo
    }
    for (const filho of no.children ?? []) marcar(filho as typeof no)
  }
  marcar(tree as unknown as Parameters<typeof marcar>[0])
}

/** Varre os wikilinks do texto e monta o índice de nomes (F4). */
function collectNames(tree: HastRoot): NameEntry[] {
  const counts = new Map<string, number>()
  const walk = (node: { children?: unknown[]; properties?: Record<string, unknown> }) => {
    const target = node.properties?.dataTarget
    if (typeof target === 'string') counts.set(target, (counts.get(target) ?? 0) + 1)
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child as typeof node)
    }
  }
  walk(tree as unknown as { children?: unknown[] })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
}

export function parseBook(raw: string): ParsedBook {
  const { meta, content } = splitFrontmatter(raw)
  // O motor recebe o texto exato (a regra do cifrão olha o arquivo) e o
  // front matter (o {{img:id}} procura a imagem no `assets:`).
  const arquivo = new VFile({ value: liftDeepHeadingMarkers(content), data: { meta } })
  const mdast = processor.parse(arquivo)
  const hast = processor.runSync(mdast, arquivo) as HastRoot
  const headings = collectHeadings(hast)
  const names = collectNames(hast)
  labelFootnoteList(hast)
  nestSections(hast)

  const body = toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    components: {
      a: (props: Record<string, unknown>) =>
        props['data-footnote-ref'] != null ? (
          <FootnoteRef {...props} />
        ) : props['data-footnote-backref'] != null ? (
          <BackrefLink {...props} />
        ) : (
          <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />
        ),
      section: (props: Record<string, unknown>) =>
        props['data-collapsible'] != null ? (
          <CollapsibleSection {...props} />
        ) : (
          <section {...(props as React.HTMLAttributes<HTMLElement>)} />
        ),
      // Título padrão da caixa de nota (callout): o motor escreve em
      // português e marca o tipo; aqui sai na língua da interface.
      div: (props: Record<string, unknown>) =>
        props['data-callout-padrao'] != null ? (
          <CalloutTitulo {...props} />
        ) : (
          <div {...(props as React.HTMLAttributes<HTMLDivElement>)} />
        ),
      summary: (props: Record<string, unknown>) =>
        props['data-callout-padrao'] != null ? (
          <CalloutTitulo {...props} como="summary" />
        ) : (
          <summary {...(props as React.HTMLAttributes<HTMLElement>)} />
        ),
      span: (props: Record<string, unknown>) =>
        props['data-target'] != null ? (
          <WikilinkRef {...props} />
        ) : (
          <span {...(props as React.HTMLAttributes<HTMLSpanElement>)} />
        ),
    },
  })

  return { meta, body, headings, source: content, raw, names, bytes: new Blob([raw]).size,
    escritaPadrao: escritaDoCabecalho(meta?.language) }
}

/**
 * Fallback degradado para .txt (SPEC): sem YAML, sem notas, sem
 * capítulos — mostra o que der, sem forçar estrutura. Quebras de
 * linha do arquivo são preservadas.
 */
export function parseTxt(raw: string): ParsedBook {
  const paragraphs = raw.split(/\r?\n\s*\r?\n/).filter((p) => p.trim())
  const body = (
    <div className="txt-body">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
  return { meta: null, body, headings: [], source: raw, raw, names: [], bytes: new Blob([raw]).size,
    escritaPadrao: 'pt-BR' }
}
