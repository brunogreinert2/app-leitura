import { useEffect, useState } from 'react'

/**
 * Qual seção está sendo lida agora — para o sumário marcá-la.
 *
 * INTERSECTIONOBSERVER, e não ouvinte de rolagem, e a diferença aqui não é de
 * estilo. Um `scroll` dispara dezenas de vezes por segundo na linha principal,
 * e responder a ele obriga a medir posição de cada título — `getBoundingClientRect`
 * força o navegador a recalcular o layout, no meio da rolagem, num app que
 * precisa rolar liso em celular fraco. O observador faz a conta fora disso e
 * só avisa quando um título entra ou sai da faixa.
 *
 * A FAIXA é o topo da tela: `rootMargin` de -12% em cima e -80% embaixo deixa
 * ativa uma tira fina logo abaixo da barra. É onde o olho está quando se lê
 * rolando, e evita que a seção mude ao passar por um título no rodapé.
 *
 * O estado só muda quando a seção MUDA — um `setState` com o mesmo valor
 * ainda assim custa um render, e aqui isso aconteceria a cada gesto.
 */
/**
 * Entre os títulos visíveis, o que vale é o PRIMEIRO do documento — é o que a
 * pessoa acabou de passar. Função pura e exportada porque é a única parte
 * disto que dá para testar sem um navegador de verdade: `IntersectionObserver`
 * só dispara em página que está sendo composta na tela.
 */
export function escolherSecao(
  visiveis: Iterable<string>,
  posicao: Map<string, number>,
): string | undefined {
  let melhor: string | undefined
  for (const id of visiveis) {
    if (melhor === undefined || (posicao.get(id) ?? 0) < (posicao.get(melhor) ?? 0)) {
      melhor = id
    }
  }
  return melhor
}

export function useSecaoVisivel(
  ids: string[],
  ativo: boolean,
  /**
   * Qualquer coisa que MUDE DE IDENTIDADE quando titulos entram ou saem do
   * DOM — na pratica, o estado de recolhimento.
   *
   * Isto nao e um detalhe de implementacao: secao recolhida REMOVE o conteudo
   * do documento (`{!isCollapsed && content}` em CollapsibleSection), entao os
   * capitulos de dentro nao existem quando o observador e criado. Sem
   * reconstruir, expandir um capitulo fazia nascer titulos que ninguem estava
   * observando: a barra ficava parada no titulo do livro e nunca descia.
   */
  revisaoDoDom?: unknown,
): string | undefined {
  const [secao, setSecao] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!ativo || !ids.length || typeof IntersectionObserver === 'undefined') {
      setSecao(undefined)
      return
    }
    // Ordem do documento: quando mais de um título está na faixa, vale o
    // primeiro — é o que a pessoa acabou de passar.
    const posicao = new Map(ids.map((id, i) => [id, i]))
    const visiveis = new Set<string>()

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visiveis.add(e.target.id)
          else visiveis.delete(e.target.id)
        }
        // Faixa vazia MANTEM a secao anterior: rolar para dentro de um
        // capitulo longo tira o titulo dele da faixa, e apagar a marca ali
        // deixaria o sumario em branco justamente durante a leitura.
        if (!visiveis.size) return
        const melhor = escolherSecao(visiveis, posicao)
        setSecao((antes) => (antes === melhor ? antes : melhor))
      },
      { rootMargin: '-12% 0px -80% 0px', threshold: 0 },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observador.observe(el)
    }
    return () => observador.disconnect()
  }, [ids, ativo, revisaoDoDom])

  return secao
}
