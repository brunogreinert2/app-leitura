import { createContext } from 'react'

export interface CollapseState {
  /** Ids (dos headings) das seções recolhidas no corpo do texto. */
  collapsed: Set<string>
  toggle: (id: string) => void
}

export const CollapseContext = createContext<CollapseState>({
  collapsed: new Set(),
  toggle: () => {},
})
