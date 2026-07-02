export interface CatalogEntry {
  id: string
  titulo: string
  autor: string
  /** Caminho do .md relativo a public/livros/ */
  arquivo: string
  sistema_referencia?: string
}

export interface Catalog {
  livros: CatalogEntry[]
}
