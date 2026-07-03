import { Children, useContext, useRef, type ReactNode } from 'react'
import { CollapseContext } from './collapseContext'

/**
 * Seção (##/###) recolhível no corpo do texto: tap no título alterna.
 * Recebe do pipeline exatamente dois filhos: o heading e o conteúdo.
 */
export function CollapsibleSection(props: Record<string, unknown>) {
  const { collapsed, toggle } = useContext(CollapseContext)
  const sectionRef = useRef<HTMLElement>(null)
  const id = String(props['data-collapsible'])
  const depth = Number(props['data-depth'] ?? 2)
  const isCollapsed = collapsed.has(id)
  const [heading, ...content] = Children.toArray(props.children as ReactNode)

  // Flecha no fim da seção (estilo backref de nota): fecha o que acabou
  // de ser lido e devolve a vista ao título — o próximo capítulo fica
  // logo abaixo
  const closeSection = () => {
    toggle(id)
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ block: 'start' }))
  }

  // Efeito escada: # é a âncora base; cada nível soma margem à direita
  const classes = `text-section section-depth-${depth}${
    isCollapsed ? ' text-section-collapsed' : ''
  }`

  return (
    <section className={classes} ref={sectionRef}>
      <div
        className="section-heading"
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onClick={() => toggle(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle(id)
          }
        }}
      >
        <span className="section-arrow" aria-hidden="true">
          {isCollapsed ? '▸' : '▾'}
        </span>
        {heading}
      </div>
      {!isCollapsed && content}
      {!isCollapsed && (
        <button className="section-close" onClick={closeSection}>
          <span className="section-close-arrow" aria-hidden="true">
            ↩
          </span>{' '}
          Recolher
        </button>
      )}
    </section>
  )
}
