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

export interface PersonEntry {
  id: string
  /** Nome do arquivo sem .md — alvo canônico do wikilink (Obsidian). */
  nome: string
  titulo: string
  arquivo: string
  aliases: string[]
}

export interface PersonManifest {
  personagens: PersonEntry[]
}
