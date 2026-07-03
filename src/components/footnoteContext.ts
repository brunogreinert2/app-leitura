import { createContext } from 'react'

export interface FootnoteActions {
  /** Tap: abre a caixa inline da nota logo abaixo da chamada. */
  open: (label: string, anchor: HTMLElement) => void
  /** Long press: vai para ESTA nota na lista completa. */
  openList: (label: string) => void
  /** Backref ↩: volta à chamada no texto, expandindo a seção que a contém. */
  backToRef: (refElementId: string) => void
}

export const FootnoteContext = createContext<FootnoteActions>({
  open: () => {},
  openList: () => {},
  backToRef: () => {},
})
