import type { HeadingInfo } from './markdown'
import { ANCHOR_RE } from './remarkBlockAnchors'

/**
 * As âncoras de bloco (^gn-1-1) são endereço, não texto — na tela elas
 * já saem (remarkBlockAnchors vira id, some do texto visível). Copiar
 * lê o MARKDOWN FONTE bruto, então precisa do mesmo filtro por linha,
 * senão vaza literalmente "^gn-1-1" pro texto copiado.
 */
function stripAnchors(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(ANCHOR_RE, ''))
    .join('\n')
}

/**
 * Monta o texto a copiar a partir do MARKDOWN FONTE (copiar limpo, F8):
 * sem artefatos de renderização, marcadores e notas como no arquivo.
 *
 * Com `onlyVisible`, as seções recolhidas entram só com a linha do
 * título — recolher tudo + copiar = esqueleto do livro numa ação.
 */
export function buildCopyText(
  source: string,
  headings: HeadingInfo[],
  collapsedIds: Set<string>,
  onlyVisible: boolean,
): string {
  if (!onlyVisible || collapsedIds.size === 0) return stripAnchors(source)

  const lines = source.split('\n')
  const keep = new Array<boolean>(lines.length).fill(true)

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    if (!collapsedIds.has(h.id) || h.line === undefined) continue
    // Fim da seção: linha do próximo heading de nível igual ou superior
    let endLine = lines.length + 1
    for (let j = i + 1; j < headings.length; j++) {
      const nextLine = headings[j].line
      if (headings[j].depth <= h.depth && nextLine !== undefined) {
        endLine = nextLine
        break
      }
    }
    // Mantém a linha do título (índice h.line - 1); remove o conteúdo
    for (let k = h.line; k < endLine - 1; k++) keep[k] = false
  }

  return stripAnchors(
    lines
      .filter((_, i) => keep[i])
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
  )
}

/**
 * Igual a buildCopyText, mas escopado a UM heading (menu "⋯" de cada
 * título, não só o "Copiar livro" global do sumário): "tudo" lê da
 * árvore de headings (pega mesmo o que está recolhido na tela); "só
 * visível" lê do que está de fato aberto agora — se o próprio heading
 * estiver recolhido, sobra só a linha do título.
 */
export function buildSectionCopyText(
  source: string,
  headings: HeadingInfo[],
  collapsedIds: Set<string>,
  onlyVisible: boolean,
  rootId: string,
): string {
  const lines = source.split('\n')
  const rootIdx = headings.findIndex((h) => h.id === rootId)
  const root = rootIdx === -1 ? undefined : headings[rootIdx]
  if (!root || root.line === undefined) return ''
  const rootLine = root.line

  let endLine = lines.length + 1
  for (let j = rootIdx + 1; j < headings.length; j++) {
    const next = headings[j]
    if (next.depth <= root.depth && next.line !== undefined) {
      endLine = next.line
      break
    }
  }
  const sectionLines = lines.slice(rootLine - 1, endLine - 1)

  if (!onlyVisible) return stripAnchors(sectionLines.join('\n'))

  // Mesmo algoritmo de buildCopyText, mas em coordenadas absolutas do
  // livro inteiro (evita reindexar `line` na hora de recortar) — só no
  // fim é que a fatia relativa à seção é extraída.
  const keep = new Array<boolean>(lines.length).fill(true)
  if (collapsedIds.has(rootId)) {
    for (let k = rootLine; k < endLine - 1; k++) keep[k] = false
  } else {
    for (let i = rootIdx + 1; i < headings.length; i++) {
      const h = headings[i]
      if (h.line === undefined || h.line >= endLine) break
      if (!collapsedIds.has(h.id)) continue
      let innerEnd = endLine
      for (let j = i + 1; j < headings.length; j++) {
        const next = headings[j]
        if (next.depth <= h.depth && next.line !== undefined) {
          innerEnd = next.line
          break
        }
      }
      for (let k = h.line; k < innerEnd - 1; k++) keep[k] = false
    }
  }

  return stripAnchors(
    sectionLines
      .filter((_, i) => keep[rootLine - 1 + i])
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
  )
}
