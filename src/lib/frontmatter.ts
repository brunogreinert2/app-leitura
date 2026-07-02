import { parse } from 'yaml'

export type BookMeta = Record<string, unknown>

/**
 * Separa o front matter YAML (delimitado por ---) do corpo do markdown.
 * O front matter nunca é renderizado; o corpo segue intacto.
 */
export function splitFrontmatter(raw: string): { meta: BookMeta | null; content: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw)
  if (!match) return { meta: null, content: raw }
  let meta: BookMeta | null = null
  try {
    meta = parse(match[1]) as BookMeta
  } catch {
    meta = null
  }
  return { meta, content: raw.slice(match[0].length) }
}
