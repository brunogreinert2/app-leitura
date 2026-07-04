import type { Catalog as CatalogData, CatalogEntry } from '../types'
import { LibraryTree } from './LibraryTree'

interface Props {
  catalog: CatalogData | null
  error: string | null
  onSelect: (entry: CatalogEntry) => void
  onOpenLibrary: () => void
  onOpenAppearance: () => void
}

/**
 * Página da biblioteca: a mesma árvore de pastas recolhida do drawer —
 * coleções grandes ficam numa linha, nada de lista quilométrica.
 */
export function Catalog({ catalog, error, onSelect, onOpenLibrary, onOpenAppearance }: Props) {
  return (
    <div className="catalog">
      <header className="catalog-header">
        <button
          className="library-button phi-button"
          onClick={onOpenLibrary}
          aria-label="Abrir biblioteca (pastas e pesquisa)"
        >
          Φ
        </button>
        <div className="catalog-header-title">
          <h1>Biblioteca</h1>
          <p className="catalog-subtitle">Pedra Angular</p>
        </div>
        <button
          className="library-button"
          onClick={onOpenAppearance}
          aria-label="Aparência (esquemas de cor)"
        >
          ◐
        </button>
      </header>

      {error && <p className="catalog-error">Não foi possível carregar o catálogo: {error}</p>}
      {!catalog && !error && <p className="catalog-loading">Carregando catálogo…</p>}

      {catalog && (
        <div className="catalog-tree">
          <LibraryTree entries={catalog.livros} onSelect={onSelect} />
        </div>
      )}
    </div>
  )
}
