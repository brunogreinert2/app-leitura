import { createContext } from 'react'

export interface HeadingActions {
  /** Copia o markdown fonte deste heading pra baixo — tudo ou só o visível. */
  copySection: (id: string, onlyVisible: boolean) => void
  /** Abre uma aba de impressão com este trecho — tudo ou só o visível. */
  printSection: (id: string, onlyVisible: boolean, title: string) => void
}

export const HeadingActionsContext = createContext<HeadingActions>({
  copySection: () => {},
  printSection: () => {},
})
