import type { PersonEntry } from '../types'
import { normalizeText } from './searchIndex'

/**
 * Mini ecossistema "Personagens": resolve alvos de wikilink para os
 * verbetes de public/livros/PERSONAGENS/. Indexa nome do arquivo
 * (convenção Obsidian), aliases do YAML e o título sem o prefixo
 * "Arquivo Mestre:".
 */
export type PersonRegistry = Map<string, PersonEntry>

const norm = (s: string) => normalizeText(s).replace(/\s+/g, ' ').trim()

export function buildPersonRegistry(personagens: PersonEntry[]): PersonRegistry {
  const registry: PersonRegistry = new Map()
  const add = (key: string, entry: PersonEntry) => {
    const k = norm(key)
    if (k && !registry.has(k)) registry.set(k, entry)
  }
  for (const p of personagens) {
    add(p.nome, p)
    for (const alias of p.aliases) add(alias, p)
    add(p.titulo.replace(/^arquivo mestre:\s*/i, ''), p)
  }
  return registry
}

/** Resolve um alvo de wikilink ([[Nome]], [[Nome#^ancora]]). */
export function resolvePerson(registry: PersonRegistry, target: string): PersonEntry | null {
  const base = target.split('#')[0]
  return registry.get(norm(base)) ?? null
}
