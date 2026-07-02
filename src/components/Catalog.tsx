import { useEffect, useState } from 'react'
import type { Catalog as CatalogData, CatalogEntry } from '../types'

interface Props {
  onSelect: (entry: CatalogEntry) => void
}

export function Catalog({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}livros/catalogo.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setCatalog)
      .catch((e: unknown) => setError(String(e)))
  }, [])

  return (
    <div className="catalog">
      <header className="catalog-header">
        <h1>Biblioteca</h1>
        <p className="catalog-subtitle">Pedra Angular</p>
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
