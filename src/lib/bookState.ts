/**
 * Memória de livro de cabeceira (localStorage puro): o app reabre
 * exatamente como ficou — última obra, posição de rolagem e seções
 * abertas, por livro. Guarda as últimas 30 obras lidas.
 */

const LAST_KEY = 'last-book'
const PREFIX = 'book-state:'
const MAX_STATES = 30

export interface BookState {
  scroll: number
  /** Ids das seções ABERTAS (a lista fechada seria enorme na Bíblia). */
  expanded: string[]
  t: number
}

export function saveLastBook(id: string) {
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    /* armazenamento cheio/indisponível: leitura segue sem memória */
  }
}

export function loadLastBook(): string | null {
  return localStorage.getItem(LAST_KEY)
}

export function saveBookState(id: string, state: Omit<BookState, 't'>) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify({ ...state, t: Date.now() }))
    prune()
  } catch {
    /* idem */
  }
}

export function loadBookState(id: string): BookState | null {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BookState
    return typeof parsed.scroll === 'number' && Array.isArray(parsed.expanded) ? parsed : null
  } catch {
    return null
  }
}

function prune() {
  const entries: { key: string; t: number }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    try {
      entries.push({ key, t: (JSON.parse(localStorage.getItem(key) ?? '{}') as BookState).t ?? 0 })
    } catch {
      entries.push({ key, t: 0 })
    }
  }
  if (entries.length <= MAX_STATES) return
  entries
    .sort((a, b) => a.t - b.t)
    .slice(0, entries.length - MAX_STATES)
    .forEach((e) => localStorage.removeItem(e.key))
}
