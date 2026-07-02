import type { Catalog as CatalogData, CatalogEntry } from '../types'

interface Props {
  catalog: CatalogData | null
  error: string | null
  onSelect: (entry: CatalogEntry) => void
  onOpenLibrary: () => void
  onOpenAppearance: () => void
}

export function Catalog({ catalog, error, onSelect, onOpenLibrary, onOpenAppearance }: Props) {
  return (
    <div className="catalog">
      <header className="catalog-header">
        <button
          className="library-button"
          onClick={onOpenLibrary}
          aria-label="Abrir biblioteca (pastas e pesquisa)"
        >
          ☰
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
        <ul className="catalog-list">
          {catalog.livros.map((livro) => (
            <li key={livro.id}>
              <button className="catalog-item" onClick={() => onSelect(livro)}>
                <span className="catalog-item-title">{livro.titulo}</span>
                <span className="catalog-item-author">{livro.autor}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
