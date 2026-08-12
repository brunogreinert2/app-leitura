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
 * Escopado a UM heading (menu "⋯" de cada título). Duas intenções, e a
 * diferença entre elas é a diferença entre citar e devolver ao arquivo:
 *
 *   só visível  o que está de fato aberto na tela, texto limpo, SEM âncoras
 *               — é para citar; se o heading estiver recolhido, sobra o título
 *   tudo        a seção como está no arquivo, COM as âncoras `^id` — TUDO
 *               significa tudo, inclusive o que é endereço e não texto
 *
 * O front matter NÃO entra nem numa nem noutra: ele pertence ao arquivo, não
 * a um capítulo. Um capítulo com YAML na frente não é arquivo válido nem
 * trecho limpo — seria meio arquivo, e meio arquivo colado por cima do
 * original apaga o resto. Para levar o arquivo inteiro existe o "Copiar
 * livro" do Ξ, que é fiel byte a byte.
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

  // "tudo" é tudo: a seção como está no arquivo, com as âncoras `^id`.
  // Só o "só visível", abaixo, tira — porque aquele é para citar.
  if (!onlyVisible) return sectionLines.join('\n')

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
