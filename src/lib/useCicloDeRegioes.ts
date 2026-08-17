import { useEffect } from 'react'

/**
 * F6 pula de uma REGIÃO da tela para outra. Shift+F6 volta.
 *
 * O PROBLEMA. O Tab é uma fila: ele percorre um controle atrás do outro, na
 * ordem em que estão escritos. Num app de três painéis isso significa que, para
 * ir do texto até Aparência, a pessoa atravessa a barra do topo inteira, a
 * biblioteca inteira e o sumário inteiro — dezenas de paradas para chegar num
 * botão que o mouse alcança num movimento. Relatado assim: "parece que eu tenho
 * que folhear tudo até embaixo pra ele trocar de tela".
 *
 * Não é falha do usuário nem do Tab. É que faltava o outro movimento: o Tab
 * anda DENTRO de uma região, e F6 troca DE região. Os dois juntos é que fazem
 * uma tela navegável.
 *
 * POR QUE F6, e não uma letra. Windows, navegadores e leitores de tela já usam
 * F6 exatamente para isso há décadas — é a tecla de "próximo painel". Quem já
 * navega por teclado tenta F6 antes de perguntar. E, sendo tecla de função, ela
 * não briga com a digitação: um atalho de letra única pararia de funcionar (ou,
 * pior, dispararia sozinho) dentro da busca e do editor de textos. A norma
 * inclusive desaconselha atalhos de caractere único que não possam ser
 * desligados (WCAG 2.1.4).
 *
 * A ordem segue a da tela, da esquerda para a direita: barra do topo, texto,
 * biblioteca, sumário. Painel fechado não entra na roda — pular para um painel
 * invisível deixaria a pessoa sem saber onde caiu.
 */
const REGIOES = [
  { seletor: '.reader-header', nome: 'barra' },
  { seletor: '#texto-da-leitura', nome: 'texto' },
  { seletor: '.library-drawer', nome: 'biblioteca' },
  { seletor: '.sidebar', nome: 'sumário' },
]

const FOCAVEIS =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useCicloDeRegioes(): void {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return

      // Só as que existem e estão alcançáveis agora. `inert` marca painel
      // fechado (ver LibraryDrawer/Sidebar).
      /* `getClientRects` e nao `offsetParent`: em elemento com `position:
         fixed` o offsetParent e SEMPRE nulo, e os dois paineis sao fixos.
         Medido: com o sumario aberto na tela, o F6 pulava por cima dele. */
      const naTela = (el: HTMLElement) => el.getClientRects().length > 0
      const vivas = REGIOES.map((r) => document.querySelector<HTMLElement>(r.seletor)).filter(
        (el): el is HTMLElement => !!el && !el.hasAttribute('inert') && naTela(el),
      )
      if (vivas.length < 2) return

      e.preventDefault()

      const atual = vivas.findIndex((el) => el.contains(document.activeElement))
      const passo = e.shiftKey ? -1 : 1
      // De fora de tudo (foco no body), F6 entra na primeira região.
      const proxima =
        atual === -1 ? vivas[0] : vivas[(atual + passo + vivas.length) % vivas.length]

      // O corpo do texto recebe foco ele mesmo (tem tabIndex -1): é um destino,
      // não um controle. Os outros entregam o foco ao primeiro controle deles.
      if (proxima.id === 'texto-da-leitura') {
        proxima.focus({ preventScroll: true })
        return
      }
      const primeiro = [...proxima.querySelectorAll<HTMLElement>(FOCAVEIS)].find(
        (el) => el.getClientRects().length > 0,
      )
      primeiro?.focus()
    }

    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])
}
