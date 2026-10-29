import { useEffect, useRef } from 'react'

/**
 * Uma preferência mudada numa janela vale nas outras janelas abertas.
 *
 * No app instalado, cada "Abrir com" do Explorador abre uma JANELA NOVA. Cada
 * uma guardava a aparência na própria memória: escolher a letra Fina numa
 * deixava as outras em Média, e quem voltava a uma janela antiga achava que a
 * escolha não tinha pegado.
 *
 * O evento `storage` é o aviso que o navegador dá às OUTRAS janelas do mesmo
 * site quando uma delas grava algo — nunca à própria. E gravar o mesmo valor
 * de novo não dispara aviso nenhum, então a janela que recebe e regrava não
 * devolve um eco para quem mandou.
 */
export function useOutrasJanelas(chave: string, aoMudar: (valor: string) => void): void {
  // A função chega recriada a cada render; guardada aqui, o ouvinte é um só.
  const aoMudarRef = useRef(aoMudar)
  aoMudarRef.current = aoMudar

  useEffect(() => {
    const ouvir = (e: StorageEvent) => {
      if (e.key === chave && e.newValue !== null) aoMudarRef.current(e.newValue)
    }
    window.addEventListener('storage', ouvir)
    return () => window.removeEventListener('storage', ouvir)
  }, [chave])
}
