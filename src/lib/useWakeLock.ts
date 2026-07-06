import { useEffect } from 'react'

/**
 * Com um livro aberto (leitura visual ou TTS), a tela não escurece nem
 * bloqueia sozinha — Screen Wake Lock API, nativa e 100% local. O
 * sistema solta o lock quando o app sai de cena; ao voltar, repedimos.
 * Navegador sem suporte: silêncio, nada quebra.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: { release: () => Promise<void> } | null = null
    let active = true

    const request = async () => {
      try {
        lock = await (
          navigator as Navigator & {
            wakeLock: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
          }
        ).wakeLock.request('screen')
      } catch {
        lock = null // ex.: economia de bateria ativa — respeitar o sistema
      }
    }

    const onVisibility = () => {
      if (active && document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      lock?.release().catch(() => {})
    }
  }, [])
}
