import type { Catalog as CatalogData, CatalogEntry } from '../types'
import { LibraryTree } from './LibraryTree'
import { FontControls } from './FontControls'
import { useT } from './idiomaContext'

interface Props {
  catalog: CatalogData | null
  error: string | null
  onSelect: (entry: CatalogEntry) => void
  onOpenLibrary: () => void
  onOpenMenu: () => void
  decreaseFont: () => void
  increaseFont: () => void
}

/**
 * Página da biblioteca: a mesma árvore de pastas recolhida do drawer —
 * coleções grandes ficam numa linha, nada de lista quilométrica.
 *
 * A barra do topo é a MESMA da leitura, na mesma ordem: Φ à esquerda, Ξ à
 * direita, letra no meio. Antes esta tela trocava o layout — sumiam o Ξ e o
 * ajuste de letra, e a aparência aparecia num botão ◐ que só existia aqui.
 * Quem aumentou a letra para ler tinha que aumentar de novo ao voltar, e quem
 * procurava o Ξ não o achava. Barra constante: o mesmo gesto no mesmo lugar,
 * com livro aberto ou sem.
 */
export function Catalog({
  catalog,
  error,
  onSelect,
  onOpenLibrary,
  onOpenMenu,
  decreaseFont,
  increaseFont,
}: Props) {
  const t = useT()
  return (
    <div className="catalog">
      <header className="catalog-header">
        <button
          className="library-button phi-button"
          onClick={onOpenLibrary}
          aria-label={t('biblioteca.abrir')}
        >
          Φ
        </button>
        <div className="catalog-header-title">
          <h1>{t('biblioteca')}</h1>
          <p className="catalog-subtitle">{t('catalogo.subtitulo')}</p>
        </div>
        <FontControls decrease={decreaseFont} increase={increaseFont} />
        <button
          className="toc-button phi-button"
          onClick={onOpenMenu}
          aria-label={t('sumario.abrirMenu')}
        >
          Ξ
        </button>
      </header>

      <main aria-label={t('biblioteca')}>
        {error && <p className="catalog-error">{t('biblioteca.erro', { erro: error })}</p>}
        {!catalog && !error && <p className="catalog-loading">{t('biblioteca.carregando')}</p>}

        {catalog && (
          <div className="catalog-tree">
            <LibraryTree entries={catalog.livros} onSelect={onSelect} />
          </div>
        )}
      </main>
    </div>
  )
}
