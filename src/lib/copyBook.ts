import type { HeadingInfo } from './markdown'

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
  if (!onlyVisible || collapsedIds.size === 0) return source

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

  return lines
    .filter((_, i) => keep[i])
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}
