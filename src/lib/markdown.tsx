import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import type { ReactNode } from 'react'
import type { Root as HastRoot } from 'hast'
import type { Element as HastElement, ElementContent } from 'hast'
import { splitFrontmatter, type BookMeta } from './frontmatter'
import { remarkMarkers } from './remarkMarkers'
import { remarkWikilinks } from './remarkWikilinks'
import { remarkBlockAnchors } from './remarkBlockAnchors'
import { remarkHebrew } from './remarkHebrew'
import { FootnoteRef } from '../components/FootnoteRef'
import { BackrefLink } from '../components/BackrefLink'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { WikilinkRef } from '../components/WikilinkRef'

export interface ParsedBook {
  meta: BookMeta | null
  body: ReactNode
  headings: HeadingInfo[]
  /** Markdown fonte sem o front matter (base do copiar limpo). */
  source: string
  /** Índice de nomes: alvos de wikilinks e nº de ocorrências. */
  names: NameEntry[]
  /** Tamanho do arquivo original em bytes (para os Detalhes). */
  bytes: number
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

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBlockAnchors)
  .use(remarkWikilinks)
  .use(remarkMarkers)
  .use(remarkHebrew)
  .use(remarkRehype, {
    footnoteLabel: 'Notas',
    footnoteLabelTagName: 'h2',
    footnoteBackLabel: 'Voltar ao texto',
  })

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
    if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) continue
    if (node.properties?.id === 'footnote-label') continue
    const text = hastText(node)
    const id = slugify(text, seen)
    node.properties = { ...node.properties, id }
    headings.push({ depth: Number(node.tagName[1]), text, id, line: node.position?.start.line })
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
      /^h[1-6]$/.test(node.tagName) &&
      typeof node.properties?.id === 'string' &&
      node.properties.id !== 'footnote-label'
    if (!isHeading) {
      push(node)
      continue
    }
    const depth = Number((node as HastElement).tagName[1])
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
  for (const node of tree.children) {
    if (node.type !== 'element' || node.properties?.dataFootnotes === undefined) continue
    for (const ol of node.children) {
      if (ol.type !== 'element' || ol.tagName !== 'ol') continue
      ol.properties = { ...ol.properties, className: ['footnote-list'] }
      for (const li of ol.children) {
        if (li.type !== 'element' || li.tagName !== 'li') continue
        const label = String(li.properties?.id ?? '').replace(/^user-content-fn-/, '')
        const target = li.children.find((c) => c.type === 'element' && c.tagName === 'p') ?? li
        if (target.type === 'element') {
          target.children.unshift({
            type: 'element',
            tagName: 'span',
            properties: { className: ['fn-label'] },
            children: [{ type: 'text', value: `${decodeURIComponent(label)}. ` }],
          })
        }
      }
    }
  }
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
  const mdast = processor.parse(content)
  const hast = processor.runSync(mdast) as HastRoot
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
      span: (props: Record<string, unknown>) =>
        props['data-target'] != null ? (
          <WikilinkRef {...props} />
        ) : (
          <span {...(props as React.HTMLAttributes<HTMLSpanElement>)} />
        ),
    },
  })

  return { meta, body, headings, source: content, names, bytes: new Blob([raw]).size }
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
  return { meta: null, body, headings: [], source: raw, names: [], bytes: new Blob([raw]).size }
}
