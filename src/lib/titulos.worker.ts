/**
 * Tira os títulos de um texto FORA da linha principal.
 *
 * Existe por causa de um número: 3,6 s para um livro de 1 MB. O editor pede
 * os títulos a cada pausa na digitação (é o sumário dele); feita na linha
 * principal, essa conta congelaria a caixa de texto no meio da frase. Aqui
 * ela pode demorar o que for — quem digita não percebe.
 *
 * O trabalho é o de ./titulos, sem uma linha a mais: o mesmo motor do leitor.
 */
import { titulosDoTexto, type HeadingInfo } from './titulos'

self.onmessage = (e: MessageEvent<{ pedido: number; texto: string }>) => {
  let titulos: HeadingInfo[] = []
  try {
    titulos = titulosDoTexto(e.data.texto)
  } catch {
    // texto pela metade que o motor não leu: sumário vazio, editor de pé
  }
  self.postMessage({ pedido: e.data.pedido, titulos })
}
