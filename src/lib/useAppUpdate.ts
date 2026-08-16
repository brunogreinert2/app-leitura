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
  const [checkResult, setCheckResult] = useState<'idle' | 'checking' | 'up-to-date' | 'demorando'>(
    'idle',
  )
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

    /* `registration.update()` pode NUNCA se resolver — não é erro, é uma
       promessa que fica pendurada, e por isso o `.catch` não a alcança.
       Acontece enquanto o service worker novo ainda está guardando o acervo:
       são 1097 arquivos e ~115 MB, de propósito, porque este app é offline
       primeiro e cada leitor carrega o corpus inteiro. Numa instalação do zero
       isso leva o tempo que levar.

       Sem o prazo abaixo o aviso "Procurando atualização…" ficava na tela para
       sempre e o app parecia travado. Uma tela de espera precisa de um fim
       garantido, mesmo que a resposta seja "ainda não sei" — e é isso que ela
       diz, porque afirmar "você já está atualizado" quando a consulta não
       respondeu seria mentira. */
    let respondeu = false
    const prazo = new Promise<void>((resolve) => window.setTimeout(resolve, 10_000))
    const consulta = navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .then(() => {
        respondeu = true
      })
      .catch(() => {
        respondeu = true
      })

    void Promise.race([consulta, prazo]).then(() => {
      window.setTimeout(() => {
        if (needRefreshRef.current) {
          setCheckResult('idle') // o banner de "nova versão" já assume o aviso
          return
        }
        setCheckResult(respondeu ? 'up-to-date' : 'demorando')
        window.setTimeout(() => setCheckResult('idle'), respondeu ? 2500 : 6000)
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
