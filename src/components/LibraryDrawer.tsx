import { useMemo, useState } from 'react'
import type { Catalog as CatalogData, CatalogEntry } from '../types'
import { buildLibraryTree, filterTree, type FolderNode } from '../lib/libraryTree'

interface Props {
  catalog: CatalogData | null
  open: boolean
  onClose: () => void
  onSelect: (entry: CatalogEntry) => void
}

interface FolderProps {
  node: FolderNode
  collapsed: Set<string>
  onToggle: (path: string) => void
  onSelect: (entry: CatalogEntry) => void
  forceOpen: boolean
}

function Folder({ node, collapsed, onToggle, onSelect, forceOpen }: FolderProps) {
  const isOpen = forceOpen || !collapsed.has(node.path)
  return (
    <li>
      <button
        className="lib-folder"
        onClick={() => onToggle(node.path)}
        aria-expanded={isOpen}
      >
        <span className="lib-folder-arrow">{isOpen ? '▾' : '▸'}</span>
        {node.name}
      </button>
      {isOpen && (
        <ul className="lib-children">
          {node.folders.map((f) => (
            <Folder
              key={f.path}
              node={f}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
              forceOpen={forceOpen}
            />
          ))}
          {node.books.map((b) => (
            <li key={b.id}>
              <button className="lib-book" onClick={() => onSelect(b)}>
                <span className="lib-book-title">{b.titulo}</span>
                <span className="lib-book-author">{b.autor}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function LibraryDrawer({ catalog, open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const tree = useMemo(() => {
    if (!catalog) return null
    const full = buildLibraryTree(catalog.livros)
    return query.trim() ? filterTree(full, query.trim()) : full
  }, [catalog, query])

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  // Com busca ativa, tudo fica aberto para mostrar os resultados
  const forceOpen = query.trim().length > 0

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
        {!tree && catalog && <p className="lib-empty">Nada encontrado para “{query}”.</p>}
        {!catalog && <p className="lib-empty">Carregando catálogo…</p>}
        {tree && (
          <ul className="lib-tree">
            {tree.folders.map((f) => (
              <Folder
                key={f.path}
                node={f}
                collapsed={collapsed}
                onToggle={toggle}
                onSelect={onSelect}
                forceOpen={forceOpen}
              />
            ))}
            {tree.books.map((b) => (
              <li key={b.id}>
                <button className="lib-book" onClick={() => onSelect(b)}>
                  <span className="lib-book-title">{b.titulo}</span>
                  <span className="lib-book-author">{b.autor}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </>
  )
}
