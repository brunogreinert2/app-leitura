import { useEffect, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

const STORAGE_KEY = 'reading-font-px'
const DEFAULT_PX = 18
const MIN_PX = 12
// Sem teto tímido: baixa visão pode querer pouquíssimas palavras por tela
const MAX_PX = 256
const STEP = 1.125

const clamp = (v: number) => Math.min(MAX_PX, Math.max(MIN_PX, Math.round(v)))

/**
 * Mudar a fonte refui o texto e deslocaria o ponto de leitura.
 * Ancora o elemento visível no alto da tela e o devolve à mesma
 * posição depois do reflow: o leitor continua exatamente onde estava.
 */
function withReadingAnchor(update: () => void) {
  const probeY = Math.min(160, window.innerHeight / 3)
  let anchor: Element | null = null
  for (const el of document.elementsFromPoint(window.innerWidth / 2, probeY)) {
    if (el !== document.body && el.closest('.reader-body')) {
      anchor = el
      break
    }
  }
  if (!anchor) {
    update()
    return
  }
  const before = anchor.getBoundingClientRect().top
  flushSync(update)
  const after = anchor.getBoundingClientRect().top
  window.scrollBy({ top: after - before })
}

export function useFontSize() {
  const [px, setPx] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    return saved >= MIN_PX && saved <= MAX_PX ? saved : DEFAULT_PX
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(px))
  }, [px])

  return {
    px,
    setPx: (v: number) => withReadingAnchor(() => setPx(clamp(v))),
    decrease: () => withReadingAnchor(() => setPx((v) => clamp(v / STEP))),
    increase: () => withReadingAnchor(() => setPx((v) => clamp(v * STEP))),
  }
}

/**
 * Pinch sobre o texto = mesmo efeito de A−/A+: muda o tamanho da fonte
 * e o texto REFLUI para caber na largura da tela (nada de zoom visual
 * com rolagem lateral).
 */
export function usePinchFontSize(
  ref: RefObject<HTMLElement | null>,
  px: number,
  setPx: (v: number) => void,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startDist = 0
    let startPx = 0

    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = distance(e.touches)
        startPx = px
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault() // bloqueia o zoom visual do navegador no texto
        setPx(startPx * (distance(e.touches) / startDist))
      }
    }

    const onTouchEnd = () => {
      startDist = 0
    }

    // Desktop: ctrl+roda / pinch de trackpad vira ajuste de fonte com
    // reflow. No window inteiro da tela de leitura, para o navegador
    // não capturar o gesto como zoom global (Chrome é insistente).
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setPx(px * (e.deltaY < 0 ? 1.06 : 1 / 1.06))
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('wheel', onWheel)
    }
  }, [ref, px, setPx])
}

interface Props {
  decrease: () => void
  increase: () => void
}

export function FontControls({ decrease, increase }: Props) {
  return (
    <div className="font-controls">
      <button className="font-button" onClick={decrease} aria-label="Diminuir letra">
        −
      </button>
      <button className="font-button font-button-big" onClick={increase} aria-label="Aumentar letra">
        +
      </button>
    </div>
  )
}
