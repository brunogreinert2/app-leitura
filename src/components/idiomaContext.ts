import { createContext, useContext } from 'react'
import { idiomaInicial, traduzir, type Chave, type Idioma, type Tradutor } from '../lib/i18n'

interface Contexto {
  idioma: Idioma
  setIdioma: (id: Idioma) => void
  t: Tradutor
}

/**
 * O tradutor chega a qualquer componente sem passar de mão em mão — mesmo
 * padrão dos contextos de nota, wikilink e colapso. São treze arquivos com
 * texto de interface; prop drilling aqui só criaria ruído.
 *
 * O valor padrão traduz de verdade em vez de devolver a chave: um componente
 * renderizado fora do provedor (num teste, por exemplo) mostra texto legível,
 * não `sumario.abrir`.
 */
const PADRAO = idiomaInicial()

export const IdiomaContext = createContext<Contexto>({
  idioma: PADRAO,
  setIdioma: () => {},
  t: (chave: Chave, params?: Record<string, string | number>) =>
    traduzir(PADRAO, chave, params),
})

export function useT(): Tradutor {
  return useContext(IdiomaContext).t
}

export function useIdiomaAtual() {
  const { idioma, setIdioma } = useContext(IdiomaContext)
  return { idioma, setIdioma }
}
