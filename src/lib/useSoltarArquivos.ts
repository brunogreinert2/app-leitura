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

/**
 * Arquivos entregues pelo sistema operacional: "Abrir com > Pedra Angular",
 * ou arrastar o arquivo para cima do ÍCONE do app.
 *
 * Chega pela launchQueue, que só existe em Chromium de mesa. Onde não existe,
 * a função não faz nada e ninguém percebe — o botão e o arrastar-para-dentro
 * continuam sendo o caminho.
 *
 * O consumidor é registrado UMA vez e o mais cedo possível: se o app demorar a
 * assiná-lo, o sistema já entregou os arquivos e a entrega se perde.
 */
export function useArquivosDoSistema(aoReceber: (arquivos: File[]) => void): void {
  const receber = useRef(aoReceber)
  receber.current = aoReceber

  useEffect(() => {
    const fila = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue
    if (!fila) return
    fila.setConsumer((params) => {
      if (!params.files?.length) return
      Promise.all(params.files.map((h) => h.getFile()))
        .then((arquivos) => arquivos.filter((f) => ACEITAS.test(f.name)))
        .then((bons) => {
          if (bons.length) receber.current(bons)
        })
        .catch(() => {})
    })
  }, [])
}

/** Tipos da File Handling API, que ainda não estão no lib.dom padrão. */
interface LaunchParams {
  files?: FileSystemFileHandle[]
}
interface LaunchQueue {
  setConsumer(consumidor: (params: LaunchParams) => void): void
}
