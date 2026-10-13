import { titulosDoTexto, type HeadingInfo } from './titulos'

/**
 * O balcão do worker de títulos: pede, espera a resposta, dispensa.
 *
 * Um operário só, criado no primeiro pedido e dispensado quando o editor
 * fecha — manter o motor inteiro carregado numa segunda linha o tempo todo,
 * para um painel que quase sempre está fechado, seria memória à toa.
 */

interface Pedido {
  texto: string
  resolver: (titulos: HeadingInfo[]) => void
}

// undefined = ainda não tentou criar; null = tentou e não deu
let operario: Worker | null | undefined
let numero = 0
const pendentes = new Map<number, Pedido>()

/** O caminho de reserva, na linha principal. Motor que tropeça = sumário vazio. */
function aquiMesmo(texto: string): HeadingInfo[] {
  try {
    return titulosDoTexto(texto)
  } catch {
    return []
  }
}

/**
 * O operário não subiu (navegador sem worker de módulo, arquivo que não
 * chegou): quem esperava é atendido aqui mesmo, e os próximos também. Mais
 * lento num texto grande, mas o sumário não fica mudo.
 */
function desistirDoOperario(): void {
  operario?.terminate()
  operario = null
  for (const p of pendentes.values()) p.resolver(aquiMesmo(p.texto))
  pendentes.clear()
}

export function pedirTitulos(texto: string): Promise<HeadingInfo[]> {
  if (operario === undefined) {
    try {
      operario = new Worker(new URL('./titulos.worker.ts', import.meta.url), { type: 'module' })
      operario.onmessage = (e: MessageEvent<{ pedido: number; titulos: HeadingInfo[] }>) => {
        pendentes.get(e.data.pedido)?.resolver(e.data.titulos)
        pendentes.delete(e.data.pedido)
      }
      operario.onerror = desistirDoOperario
    } catch {
      operario = null
    }
  }
  if (!operario) return Promise.resolve(aquiMesmo(texto))
  const destino = operario
  return new Promise((resolver) => {
    const pedido = ++numero
    pendentes.set(pedido, { texto, resolver })
    destino.postMessage({ pedido, texto })
  })
}

/**
 * O editor fechou: o operário sai, e com ele a conta que estiver em curso.
 * Quem ainda esperava resposta fica sem — de propósito, já não há sumário
 * para receber.
 */
export function dispensarTitulos(): void {
  operario?.terminate()
  operario = undefined
  pendentes.clear()
}
