import { useMemo, useState } from 'react'
import type { CatalogEntry } from '../types'
import { buildLibraryTree, filterTree, type FolderNode } from '../lib/libraryTree'

interface Props {
  entries: CatalogEntry[]
  onSelect: (entry: CatalogEntry) => void
  /** Presente = arquivos locais ganham botão de remover. */
  onRemove?: (entry: CatalogEntry) => void
  /** Busca ativa: filtra e abre tudo para mostrar os resultados. */
  query?: string
}

interface FolderProps extends Omit<Props, 'entries' | 'query'> {
  node: FolderNode
  expanded: Set<string>
  onToggle: (path: string) => void
  forceOpen: boolean
}

function BookButton({
  book,
  onSelect,
  onRemove,
}: {
  book: CatalogEntry
  onSelect: (e: CatalogEntry) => void
  onRemove?: (e: CatalogEntry) => void
}) {
  return (
    <div className="lib-book-row">
      <button className="lib-book" onClick={() => onSelect(book)}>
        <span className="lib-book-title">{book.titulo}</span>
        <span className="lib-book-author">{book.autor}</span>
      </button>
      {book.local && onRemove && (
        <button
          className="lib-book-remove"
          onClick={() => onRemove(book)}
          aria-label={`Remover ${book.titulo}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

function Folder({ node, expanded, onToggle, onSelect, onRemove, forceOpen }: FolderProps) {
  // Pastas começam recolhidas: uma coleção de centenas de obras é UMA
  // linha fechada — abre só com toque (ou busca ativa)
  const isOpen = forceOpen || expanded.has(node.path)
  return (
    <li>
      <button className="lib-folder" onClick={() => onToggle(node.path)} aria-expanded={isOpen}>
        <span className="lib-folder-arrow">{isOpen ? '▾' : '▸'}</span>
        {node.name}
        <span className="lib-folder-count">({countBooks(node)})</span>
      </button>
      {isOpen && (
        <ul className="lib-children">
          {node.folders.map((f) => (
            <Folder
              key={f.path}
              node={f}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onRemove={onRemove}
              forceOpen={forceOpen}
            />
          ))}
          {node.books.map((b) => (
            <li key={b.id}>
              <BookButton book={b} onSelect={onSelect} onRemove={onRemove} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function countBooks(node: FolderNode): number {
  return node.books.length + node.folders.reduce((sum, f) => sum + countBooks(f), 0)
}

export function LibraryTree({ entries, onSelect, onRemove, query }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const tree = useMemo(() => {
    const full = buildLibraryTree(entries)
    return query?.trim() ? filterTree(full, query.trim()) : full
  }, [entries, query])

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const forceOpen = Boolean(query?.trim())

  if (!tree) return <p className="lib-empty">Nada encontrado para “{query}”.</p>

  return (
    <ul className="lib-tree">
      {tree.folders.map((f) => (
        <Folder
          key={f.path}
          node={f}
          expanded={expanded}
          onToggle={toggle}
          onSelect={onSelect}
          onRemove={onRemove}
          forceOpen={forceOpen}
        />
      ))}
      {tree.books.map((b) => (
        <li key={b.id}>
          <BookButton book={b} onSelect={onSelect} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  )
}
