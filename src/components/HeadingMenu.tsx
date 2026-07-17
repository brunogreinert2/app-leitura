import { useContext, useEffect, useRef, useState } from 'react'
import { HeadingActionsContext } from './headingActionsContext'

interface Props {
  id: string
  /** Lido só na hora do clique (não a cada render): texto do próprio título. */
  getTitle: () => string
}

/**
 * Botão "⋯" de CADA heading (não um único lugar fixo): copiar ou
 * imprimir, tudo ou só o visível. Irmão do título clicável, nunca
 * aninhado nele — um <button> dentro de outro elemento interativo
 * quebra foco/acessibilidade de forma imprevisível.
 */
export function HeadingMenu({ id, getTitle }: Props) {
  const [open, setOpen] = useState(false)
  const { copySection, printSection } = useContext(HeadingActionsContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="heading-menu" ref={ref}>
      <button
        className="heading-menu-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais ações deste título"
      >
        ⋯
      </button>
      {open && (
        <ul className="heading-menu-list" role="menu">
          <li role="none">
            <button role="menuitem" onClick={() => { setOpen(false); copySection(id, false) }}>
              Copiar — tudo
            </button>
          </li>
          <li role="none">
            <button role="menuitem" onClick={() => { setOpen(false); copySection(id, true) }}>
              Copiar — só visível
            </button>
          </li>
          <li role="none">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); printSection(id, false, getTitle()) }}
            >
              Imprimir — tudo
            </button>
          </li>
          <li role="none">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); printSection(id, true, getTitle()) }}
            >
              Imprimir — só visível
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
