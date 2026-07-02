import { createContext } from 'react'

export interface WikilinkActions {
  /** Tap: preview inline flutuante do alvo. */
  preview: (target: string, anchor: HTMLElement) => void
  /** Long press: navegação real (quando o alvo existir no app). */
  navigate: (target: string) => void
}

export const WikilinkContext = createContext<WikilinkActions>({
  preview: () => {},
  navigate: () => {},
})
