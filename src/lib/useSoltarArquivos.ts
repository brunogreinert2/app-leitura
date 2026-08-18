import { useEffect, useRef, useState } from 'react'

/** As mesmas extensões que o botão "+ Adicionar arquivos" aceita. */
const ACEITAS = /\.(md|txt)$/i

export interface Soltura {
  /** Há arquivo pairando sobre a janela: hora de mostrar o alvo. */
  pairando: boolean
}

/**
 * Arrastar e soltar arquivo em qualquer lugar da janela.
 *
 * ISTO TAMBÉM É UM CONSERTO, não só um atalho. Sem um `preventDefault` no
 * drop, arrastar um arquivo para cima de uma página faz o NAVEGADOR abri-lo:
 * a aba sai do app e vira o texto cru do arquivo. Num PWA instalado isso é
 * pior ainda, porque a janela do app inteira é substituída e o leitor perde
 * onde estava. O ouvinte global fecha essa porta mesmo quando o arquivo é de
 * um tipo que não serve.
 *
 * O contador de profundidade existe porque `dragenter`/`dragleave` disparam
 * também ao cruzar CADA elemento filho: sem ele o alvo pisca sem parar
 * enquanto o arquivo passeia por cima do texto.
 */
export function useSoltarArquivos(
  aoSoltar: (arquivos: File[]) => void,
  aoRecusar?: (quantidade: number) => void,
): Soltura {
  const [pairando, setPairando] = useState(false)
  const profundidade = useRef(0)
  // Guarda os callbacks para o efeito não se reinscrever a cada render
  const soltar = useRef(aoSoltar)
  const recusar = useRef(aoRecusar)
  soltar.current = aoSoltar
  recusar.current = aoRecusar

  useEffect(() => {
    // Arrastar texto selecionado DENTRO do app também dispara estes eventos;
    // só interessa quando o que vem de fora é arquivo.
    const temArquivo = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files')

    const entrou = (e: DragEvent) => {
      if (!temArquivo(e)) return
      profundidade.current += 1
      setPairando(true)
    }

    const sobre = (e: DragEvent) => {
      if (!temArquivo(e)) return
      // Sem isto o navegador recusa o drop e abre o arquivo por conta própria
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const saiu = (e: DragEvent) => {
      if (!temArquivo(e)) return
      profundidade.current = Math.max(0, profundidade.current - 1)
      if (profundidade.current === 0) setPairando(false)
    }

    const soltou = (e: DragEvent) => {
      // preventDefault SEMPRE, mesmo sem arquivo aproveitável: é o que impede
      // o navegador de trocar o app pelo conteúdo do arquivo
      e.preventDefault()
      profundidade.current = 0
      setPairando(false)
      const todos = Array.from(e.dataTransfer?.files ?? [])
      if (!todos.length) return
      const bons = todos.filter((f) => ACEITAS.test(f.name))
      if (bons.length) soltar.current(bons)
      const recusados = todos.length - bons.length
      if (recusados > 0) recusar.current?.(recusados)
    }

    window.addEventListener('dragenter', entrou)
    window.addEventListener('dragover', sobre)
    window.addEventListener('dragleave', saiu)
    window.addEventListener('drop', soltou)
    return () => {
      window.removeEventListener('dragenter', entrou)
      window.removeEventListener('dragover', sobre)
      window.removeEventListener('dragleave', saiu)
      window.removeEventListener('drop', soltou)
    }
  }, [])

  return { pairando }
}
