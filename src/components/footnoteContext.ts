import { createContext } from 'react'

export interface FootnoteActions {
  /** Tap: abre a caixa inline da nota logo abaixo da chamada. */
  open: (label: string, anchor: HTMLElement) => void
  /** Long press: vai para a lista completa de notas. */
  openList: () => void
}

export const FootnoteContext = createContext<FootnoteActions>({
  open: () => {},
  openList: () => {},
})
