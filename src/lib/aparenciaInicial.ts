import { useEffect, useRef } from 'react'

export const CHAVE_APARENCIA = 'app-aparencia'

/**
 * Guarda o que o app JA CALCULOU de aparência, para o próximo arranque pintar
 * a tela certa antes do React montar.
 *
 * O problema: cor, fonte, corpo da letra, peso do traço e espaçamento são
 * aplicados em efeitos — ou seja, DEPOIS da primeira pintura. Até lá a página
 * usa o :root, e o leitor via um lampejo do tema padrão a cada abertura. Pelo
 * "Abrir com" do Explorador isso ficava evidente, porque ali a partida é mais
 * longa: janela nova, service worker, arquivo a ler.
 *
 * GRAVA O RESULTADO, E NÃO OS AJUSTES. A alternativa seria o script de
 * arranque reconstruir tudo a partir de `app-font-family`, `app-peso-traco` e
 * companhia — mas para isso ele precisaria das mesmas tabelas que o app tem
 * (qual pilha de fontes é "atkinson", quantos pixels é "médio"), copiadas num
 * `<script>` solto no HTML. Duas cópias da mesma tabela divergem; esta é a
 * terceira vez neste projeto que essa lição aparece. Aqui o script é burro de
 * propósito: ele repete um texto que o app escreveu, sem saber o que significa.
 */
export function useGuardarAparencia(): void {
  const ultimo = useRef<string>('')

  useEffect(() => {
    const raiz = document.documentElement
    const estado = JSON.stringify({
      css: raiz.style.cssText,
      tema: raiz.dataset.theme ?? '',
      cor:
        document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? '',
    })
    // Só escreve quando muda: este efeito roda a cada render, e render aqui
    // acontece até ao rolar o texto (a barra do capítulo corrente).
    if (estado === ultimo.current) return
    ultimo.current = estado
    try {
      localStorage.setItem(CHAVE_APARENCIA, estado)
    } catch {
      // Sem armazenamento (janela anônima), o app funciona igual — só volta
      // a piscar no arranque seguinte, que é o comportamento de antes.
    }
  })
}
