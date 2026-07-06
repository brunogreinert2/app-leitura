import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * "registerType: prompt" no vite.config: o service worker novo fica
 * esperando em vez de assumir sozinho. Avisamos o usuário e só trocamos
 * de versão quando ele topar — sem isso, quem já estava com o app
 * aberto ficava lendo JS velho em cache, achando que um bug já
 * corrigido ainda existia.
 */
export function useAppUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [checkResult, setCheckResult] = useState<'idle' | 'checking' | 'up-to-date'>('idle')
  const updateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  // Lido dentro de um setTimeout: precisa do valor mais recente, não o
  // capturado no momento em que checkNow foi chamado
  const needRefreshRef = useRef(false)
  needRefreshRef.current = needRefresh

  useEffect(() => {
    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
  }, [])

  /** Botão manual: sem isso, só dá pra saber que existe versão nova esperando a próxima. */
  const checkNow = () => {
    if (!('serviceWorker' in navigator)) return
    setCheckResult('checking')
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {})
      .then(() => {
        window.setTimeout(() => {
          if (needRefreshRef.current) {
            setCheckResult('idle') // o banner de "nova versão" já assume o aviso
            return
          }
          setCheckResult('up-to-date')
          window.setTimeout(() => setCheckResult('idle'), 2500)
        }, 1200)
      })
  }

  return {
    needRefresh,
    applyUpdate: () => {
      void updateRef.current?.(true)
    },
    checkResult,
    checkNow,
  }
}
