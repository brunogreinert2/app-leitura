import { useContext, useRef } from 'react'
import { FootnoteContext } from './footnoteContext'

const LONG_PRESS_MS = 500

/**
 * Chamada de nota de rodapé ([^1], [^intro1]...).
 * Tap → caixa inline; long press → lista completa de notas.
 */
export function FootnoteRef(props: Record<string, unknown>) {
  const { open, openList } = useContext(FootnoteContext)
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const firedLongPress = useRef(false)

  const label = decodeURIComponent(String(props.href ?? '').replace(/^#user-content-fn-/, ''))

  const cancelTimer = () => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  // Exibe o label original do corpus ([^1] → 1, [^intro1] → intro1),
  // não o índice sequencial do renderizador — fiel à edição impressa.
  // A nota inline (^[…]) não tem label escrito: markdown.tsx põe em
  // data-rotulo o número que ela tem na lista do fim. O `label` continua
  // sendo o id, que é por onde a caixa da nota a encontra.
  const { children: _ignored, ...rest } = props
  const exibido = typeof props['data-rotulo'] === 'string' ? props['data-rotulo'] : label

  return (
    <a
      {...rest}
      ref={anchorRef}
      onClick={(e) => {
        e.preventDefault()
        if (firedLongPress.current) {
          firedLongPress.current = false
          return
        }
        if (anchorRef.current) open(label, anchorRef.current)
      }}
      onPointerDown={() => {
        firedLongPress.current = false
        timerRef.current = window.setTimeout(() => {
          firedLongPress.current = true
          openList(label)
        }, LONG_PRESS_MS)
      }}
      onPointerUp={cancelTimer}
      onPointerLeave={cancelTimer}
      onPointerCancel={cancelTimer}
      onContextMenu={(e) => e.preventDefault()}
    >
      {exibido}
    </a>
  )
}
