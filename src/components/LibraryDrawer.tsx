import { useRef, useState } from 'react'
import type { Catalog as CatalogData, CatalogEntry } from '../types'
import { LibraryTree } from './LibraryTree'

interface Props {
  catalog: CatalogData | null
  open: boolean
  onClose: () => void
  onSelect: (entry: CatalogEntry) => void
  /** Importa .md/.txt do aparelho para o IndexedDB. */
  onAddFiles: (files: File[]) => void
  onRemoveLocal: (entry: CatalogEntry) => void
  /** Abre o editor para digitar/colar um texto novo. */
  onNewText: () => void
  /** Baixa tema, fontes, memória de leitura e textos próprios num .json. */
  onExportData: () => void
  /** Restaura um .json exportado anteriormente (deste ou de outro aparelho). */
  onImportData: (file: File) => void
  /** Força checar se há versão nova do app agora, sem esperar a checagem automática. */
  onCheckUpdate: () => void
}

export function LibraryDrawer({
  catalog,
  open,
  onClose,
  onSelect,
  onAddFiles,
  onRemoveLocal,
  onNewText,
  onExportData,
  onImportData,
  onCheckUpdate,
}: Props) {
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <nav
        className={`library-drawer${open ? ' library-drawer-open' : ''}`}
        aria-label="Biblioteca"
        aria-hidden={!open}
      >
        <div className="sidebar-header">
          <h2>Biblioteca</h2>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar biblioteca">
            ✕
          </button>
        </div>
        <div className="lib-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar livro, autor, pasta…"
            aria-label="Pesquisar na biblioteca"
          />
        </div>
        <div className="lib-import">
          <button className="toc-action" onClick={() => fileInputRef.current?.click()}>
            + Adicionar arquivos
          </button>
          <button className="toc-action" onClick={onNewText}>
            ✏ Novo texto
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            multiple
            hidden
            onChange={(e) => {
              // FileList é "viva": copia ANTES de limpar o campo,
              // senão a leitura assíncrona encontra a lista vazia
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) onAddFiles(files)
            }}
          />
        </div>
        <div className="lib-import">
          <button className="toc-action" onClick={onExportData}>
            ⇩ Exportar meus dados
          </button>
          <button className="toc-action" onClick={() => backupInputRef.current?.click()}>
            ⇧ Importar dados
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onImportData(file)
            }}
          />
        </div>
        <div className="lib-import">
          <button className="toc-action" onClick={onCheckUpdate}>
            ⟳ Verificar atualização
          </button>
        </div>
        {!catalog && <p className="lib-empty">Carregando catálogo…</p>}
        {catalog && (
          <LibraryTree
            entries={catalog.livros}
            onSelect={onSelect}
            onRemove={onRemoveLocal}
            query={query}
          />
        )}
      </nav>
    </>
  )
}
