import { useEffect, useRef, type RefObject } from 'react'

/**
 * O contrato de teclado de um diálogo — as três coisas que faltavam.
 *
 * Auditado no app rodando: ao abrir Aparência, o foco continuava no `body`,
 * atrás do painel. Quem navega por teclado abria o diálogo e continuava
 * tabulando pelo texto ESCONDIDO atrás dele, sem alcançar nenhum dos botões
 * que acabara de abrir — e sem um jeito óbvio de sair. Esc também não fechava.
 *
 * As três regras, na ordem em que importam:
 *
 * 1. AO ABRIR, O FOCO ENTRA. Sem isso o diálogo existe para o mouse e não
 *    existe para o teclado.
 * 2. TAB NÃO ESCAPA. Enquanto o diálogo está aberto, Tab circula dentro dele.
 *    Não é prisão: Esc sai sempre — o que a norma proíbe é ficar preso SEM
 *    saída, não conter o foco onde a atenção está.
 * 3. AO FECHAR, O FOCO VOLTA. Volta para o botão que abriu, senão a pessoa é
 *    devolvida ao começo da página e perde o lugar onde estava.
 *
 * WCAG 2.1.2 (sem armadilha de teclado), 2.4.3 (ordem do foco) e 2.4.7 (foco
 * visível, que o CSS já garante com :focus-visible).
 */
const FOCAVEIS =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialogoAcessivel(
  aberto: boolean,
  aoFechar: () => void,
  ref: RefObject<HTMLElement | null>,
): void {
  /* A função de fechar chega recriada a cada render (é um arrow inline no
     chamador). Se ela entrasse na lista de dependências, o efeito reiniciaria
     a cada render: a limpeza devolveria o foco no meio do uso, e a captura do
     "de onde viemos" seria refeita apontando para dentro do próprio diálogo —
     que é justamente o elemento que vai deixar de existir. Medido: o foco
     terminava no `body` em vez de voltar ao botão que abriu.

     Guardada numa referência, o efeito roda uma vez por abertura, que é o
     ciclo de vida real de um diálogo. */
  const fecharRef = useRef(aoFechar)
  fecharRef.current = aoFechar

  useEffect(() => {
    if (!aberto) return
    const caixa = ref.current
    if (!caixa) return

    // De onde viemos, para poder devolver o foco no fim.
    const anterior = document.activeElement as HTMLElement | null

    const focaveis = () => [...caixa.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
      (e) => e.offsetParent !== null,
    )

    // O primeiro item, não a caixa: quem chega quer agir, não ouvir o rótulo.
    focaveis()[0]?.focus()

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        fecharRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const lista = focaveis()
      if (lista.length === 0) return
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      const atual = document.activeElement
      // Circula: do último volta ao primeiro, e do primeiro (com Shift) ao último.
      if (!e.shiftKey && atual === ultimo) {
        e.preventDefault()
        primeiro.focus()
      } else if (e.shiftKey && atual === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!caixa.contains(atual)) {
        // Foco escapou por outro caminho (clique no fundo, por exemplo)
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      // Só devolve se o foco ainda estiver no diálogo que está saindo: se o
      // usuário já clicou noutro lugar, roubar o foco de volta seria pior.
      if (!anterior) return
      if (document.activeElement === document.body || caixa.contains(document.activeElement)) {
        anterior.focus?.()
      }
    }
  }, [aberto, ref])
}
