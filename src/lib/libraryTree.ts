import type { CatalogEntry } from '../types'

export interface FolderNode {
  name: string
  /** Caminho completo da pasta (chave estável p/ estado de expansão) */
  path: string
  folders: FolderNode[]
  books: CatalogEntry[]
}

/** Monta a árvore de pastas a partir dos caminhos em `arquivo`. */
export function buildLibraryTree(entries: CatalogEntry[]): FolderNode {
  const root: FolderNode = { name: '', path: '', folders: [], books: [] }
  for (const entry of entries) {
    const segments = entry.arquivo.split('/').slice(0, -1)
    let node = root
    let path = ''
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment
      let child = node.folders.find((f) => f.name === segment)
      if (!child) {
        child = { name: segment, path, folders: [], books: [] }
        node.folders.push(child)
      }
      node = child
    }
    node.books.push(entry)
  }
  return root
}

/** Busca sem acentos e sem caixa (título, autor e caminho). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function entryMatches(entry: CatalogEntry, query: string): boolean {
  const q = normalize(query)
  return (
    normalize(entry.titulo).includes(q) ||
    normalize(entry.autor).includes(q) ||
    normalize(entry.arquivo).includes(q)
  )
}

/** Poda a árvore mantendo só livros que casam com a busca (e suas pastas). */
export function filterTree(node: FolderNode, query: string): FolderNode | null {
  const books = node.books.filter((b) => entryMatches(b, query))
  const folders = node.folders
    .map((f) => filterTree(f, query))
    .filter((f): f is FolderNode => f !== null)
  if (books.length === 0 && folders.length === 0) return null
  return { ...node, books, folders }
}
