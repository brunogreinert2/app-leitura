import { useEffect, useState } from 'react'

export type Persistencia = 'verificando' | 'protegido' | 'melhor-esforco' | 'indisponivel'

/**
 * Pede ao navegador que o armazenamento desta origem seja DURÁVEL.
 *
 * Sem este pedido a origem fica em "melhor esforço": o navegador pode
 * descartar o BALDE INTEIRO dela quando julgar que precisa de espaço — e
 * descarta tudo junto, localStorage, IndexedDB e cache. O sintoma é o app
 * reabrir do zero, sem os textos do usuário e sem o tema escolhido, como se
 * nunca tivesse sido usado. Aconteceu duas vezes com 59 textos dentro.
 *
 * Isto NÃO é o mesmo que espaço cheio: aqui a cota estava em 0,6% de uso. A
 * questão não é quanto cabe, é se o navegador tem permissão de jogar fora.
 *
 * No Chromium um app instalado costuma ser atendido sem perguntar nada; no
 * Firefox aparece um pedido. Recusa não quebra coisa alguma — só devolve o
 * app ao comportamento de antes, e é por isso que o estado é MOSTRADO na
 * ficha do acervo em vez de morrer num console que ninguém abre.
 */
export function usePersistencia(): Persistencia {
  const [estado, setEstado] = useState<Persistencia>('verificando')

  useEffect(() => {
    const s = navigator.storage
    if (!s?.persist || !s?.persisted) {
      setEstado('indisponivel')
      return
    }
    let cancelado = false
    s.persisted()
      .then((ja) => (ja ? true : s.persist()))
      .then((ok) => {
        if (!cancelado) setEstado(ok ? 'protegido' : 'melhor-esforco')
      })
      .catch(() => {
        if (!cancelado) setEstado('indisponivel')
      })
    return () => {
      cancelado = true
    }
  }, [])

  return estado
}
