import { useState } from 'react'
import type { HeadingInfo, NameEntry } from '../lib/markdown'

interface Props {
  headings: HeadingInfo[]
  /** Índice de nomes auto-gerado dos wikilinks (vazio = sem seção). */
  names: NameEntry[]
  open: boolean
  onClose: () => void
  onNavigate: (id: string) => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onCopy: () => void
  onAppearance: () => void
  onDetails: () => void
  /** Presente só para textos do usuário (o corpus é intocável). */
  onEdit?: () => void
  onSelectName: (name: string) => void
}

interface TocGroup {
  heading: HeadingInfo
  children: HeadingInfo[]
}

/** Agrupa: h1/h2 são entradas de topo; h3+ aninham sob o h2 anterior. */
function buildGroups(headings: HeadingInfo[]): TocGroup[] {
  const groups: TocGroup[] = []
  for (const h of headings) {
    if (h.depth <= 2 || groups.length === 0) {
      groups.push({ heading: h, children: [] })
    } else {
      groups[groups.length - 1].children.push(h)
    }
  }
  return groups
}

export function Sidebar({
  headings,
  names,
  open,
  onClose,
  onNavigate,
  onCollapseAll,
  onExpandAll,
  onCopy,
  onAppearance,
  onDetails,
  onEdit,
  onSelectName,
}: Props) {
  const [namesOpen, setNamesOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const groups = buildGroups(headings)

  // Título do livro (h1) fica acima das ações; seções/capítulos abaixo
  const titleGroup = groups.length && groups[0].heading.depth === 1 ? groups[0] : null
  const sectionGroups = titleGroup ? groups.slice(1) : groups

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderGroup = ({ heading, children }: TocGroup) => (
    <li key={heading.id}>
      <div className="toc-row">
        <button
          className={`toc-item toc-depth-${Math.min(heading.depth, 6)}`}
          onClick={() => onNavigate(heading.id)}
        >
          {heading.text}
        </button>
        {children.length > 0 && (
          <button
            className="toc-toggle"
            onClick={() => toggle(heading.id)}
            aria-expanded={expanded.has(heading.id)}
            aria-label={
              expanded.has(heading.id) ? `Recolher ${heading.text}` : `Expandir ${heading.text}`
            }
          >
            {expanded.has(heading.id) ? '▾' : '▸'}
          </button>
        )}
      </div>
      {children.length > 0 && expanded.has(heading.id) && (
        <ul className="toc-children">
          {children.map((child) => (
            <li key={child.id}>
              <button
                className={`toc-item toc-depth-${Math.min(child.depth, 6)}`}
                onClick={() => onNavigate(child.id)}
              >
                {child.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <nav
        className={`sidebar${open ? ' sidebar-open' : ''}`}
        aria-label="Sumário"
        aria-hidden={!open}
      >
        <div className="sidebar-header">
          <button className="appearance-button" onClick={onAppearance}>
            <span aria-hidden="true">◐</span> Aparência
          </button>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar sumário">
            ✕
          </button>
        </div>

        {titleGroup && <ul className="toc toc-title">{renderGroup(titleGroup)}</ul>}

        <div className="toc-actions">
          <button className="toc-action" onClick={onCollapseAll}>
            Recolher tudo
          </button>
          <button className="toc-action" onClick={onExpandAll}>
            Expandir tudo
          </button>
          <button className="toc-action" onClick={onCopy}>
            Copiar livro
          </button>
          <button className="toc-action" onClick={onDetails}>
            Detalhes
          </button>
          {onEdit && (
            <button className="toc-action" onClick={onEdit}>
              ✏ Editar
            </button>
          )}
        </div>

        <ul className="toc">
          {sectionGroups.map(renderGroup)}

          {names.length > 0 && (
            <li>
              <div className="toc-row">
                <button className="toc-item toc-depth-2" onClick={() => setNamesOpen((v) => !v)}>
                  Índice de nomes
                </button>
                <button
                  className="toc-toggle"
                  onClick={() => setNamesOpen((v) => !v)}
                  aria-expanded={namesOpen}
                  aria-label={namesOpen ? 'Recolher índice de nomes' : 'Expandir índice de nomes'}
                >
                  {namesOpen ? '▾' : '▸'}
                </button>
              </div>
              {namesOpen && (
                <ul className="toc-children">
                  {names.map(({ name, count }) => (
                    <li key={name}>
                      <button className="toc-item toc-depth-3" onClick={() => onSelectName(name)}>
                        {name} <span className="toc-name-count">({count})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
