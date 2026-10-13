import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import type { ReactNode } from 'react'
import type { Root as HastRoot } from 'hast'
import type { Element as HastElement, ElementContent } from 'hast'
import { splitFrontmatter, type BookMeta } from './frontmatter'
import { collectHeadings, linhasAntesDoCorpo, type HeadingInfo } from './titulos'
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
  /**
   * Quantas linhas o front matter ocupa no arquivo. `HeadingInfo.line` conta
   * a partir do CORPO (é o que o motor enxerga); somando isto, vira a linha
   * do arquivo — que é a que o editor mostra. Zero quando não há YAML.
   */
  linhaBase: number
}

export interface NameEntry {
  name: string
  count: number
}

// A lista de títulos mora em ./titulos (sem React, para rodar também fora
// da linha principal). Reexportada aqui porque meio app importa deste arquivo.
export type { HeadingInfo } from './titulos'

// O formato inteiro vem do motor do ecossistema (src/motor, fonte em
// C:\Claude\parser\motor). Aqui só o que é da tela: React, sumário, seções.
const processor = criarProcessador()

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

/**
 * Cada bloco do texto sabe em que linha do ARQUIVO nasceu (`data-linha`).
 *
 * É a ponte entre a leitura e a edição: a tela mostra parágrafos, o editor
 * mostra linhas, e sem isto não havia como dizer ao editor "abra aqui, onde
 * eu estava lendo" — ele abria no começo ou no fim, ao sabor do navegador.
 * Só os blocos de primeiro nível: um parágrafo é precisão de sobra, e marcar
 * cada palavra pesaria no DOM dos livros grandes sem ganho nenhum.
 *
 * Roda ANTES de nestSections, enquanto todo bloco ainda é filho da raiz.
 */
function marcarLinhas(tree: HastRoot, base: number): void {
  for (const node of tree.children) {
    if (node.type !== 'element') continue
    const linha = node.position?.start.line
    if (linha === undefined) continue
    node.properties = { ...node.properties, dataLinha: linha + base }
  }
}

export function parseBook(raw: string): ParsedBook {
  const { meta, content } = splitFrontmatter(raw)
  const linhaBase = linhasAntesDoCorpo(raw, content)
  // O motor recebe o texto exato (a regra do cifrão olha o arquivo) e o
  // front matter (o {{img:id}} procura a imagem no `assets:`).
  const arquivo = new VFile({ value: liftDeepHeadingMarkers(content), data: { meta } })
  const mdast = processor.parse(arquivo)
  const hast = processor.runSync(mdast, arquivo) as HastRoot
  const headings = collectHeadings(hast)
  const names = collectNames(hast)
  labelFootnoteList(hast)
  marcarLinhas(hast, linhaBase)
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
    escritaPadrao: escritaDoCabecalho(meta?.language), linhaBase }
}

/**
 * Fallback degradado para .txt (SPEC): sem YAML, sem notas, sem
 * capítulos — mostra o que der, sem forçar estrutura. Quebras de
 * linha do arquivo são preservadas.
 */
export function parseTxt(raw: string): ParsedBook {
  const paragraphs = raw.split(/\r?\n\s*\r?\n/).filter((p) => p.trim())
  // A linha de cada parágrafo, para o Editar abrir onde se lia (ver
  // marcarLinhas). Os parágrafos são pedaços do próprio arquivo, em ordem:
  // basta achar cada um a partir de onde o anterior terminou.
  let cursor = 0
  let linha = 1
  const linhas = paragraphs.map((p) => {
    const onde = raw.indexOf(p, cursor)
    for (let i = raw.indexOf('\n', cursor); i !== -1 && i < onde; i = raw.indexOf('\n', i + 1)) linha++
    cursor = onde
    return linha
  })
  const body = (
    <div className="txt-body">
      {paragraphs.map((p, i) => (
        <p key={i} data-linha={linhas[i]}>{p}</p>
      ))}
    </div>
  )
  return { meta: null, body, headings: [], source: raw, raw, names: [], bytes: new Blob([raw]).size,
    escritaPadrao: 'pt-BR', linhaBase: 0 }
}
