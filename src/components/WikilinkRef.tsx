import { useContext, useRef } from 'react'
import { WikilinkContext } from './wikilinkContext'

const LONG_PRESS_MS = 500

/**
 * Wikilink [[...]]: tap → preview inline flutuante;
 * long press → navegação real.
 */
export function WikilinkRef(props: Record<string, unknown>) {
  const { preview, navigate } = useContext(WikilinkContext)
  const ref = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const firedLongPress = useRef(false)

  const target = String(props['data-target'] ?? '')

  const cancelTimer = () => {
    window.clearTimeout(timerRef.current)
    timerRef.current = undefined
  }

  return (
    <span
      {...props}
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (firedLongPress.current) {
          firedLongPress.current = false
          return
        }
        if (ref.current) preview(target, ref.current)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && ref.current) {
          e.preventDefault()
          preview(target, ref.current)
        }
      }}
      onPointerDown={() => {
        firedLongPress.current = false
        timerRef.current = window.setTimeout(() => {
          firedLongPress.current = true
          navigate(target)
        }, LONG_PRESS_MS)
      }}
      onPointerUp={cancelTimer}
      onPointerLeave={cancelTimer}
      onPointerCancel={cancelTimer}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
