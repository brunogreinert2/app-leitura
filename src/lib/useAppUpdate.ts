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
  const updateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
  }, [])

  return {
    needRefresh,
    applyUpdate: () => {
      void updateRef.current?.(true)
    },
  }
}
