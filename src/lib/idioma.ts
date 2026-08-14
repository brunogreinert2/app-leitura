/**
 * Detecção de escrita por faixa Unicode — a MESMA de `idioma_da_linha` em
 * `scripts/rolo/gerador_rolo.py`. Estava escrita três vezes no projeto (duas
 * em Python, uma no motor do rolo) e em lugar nenhum dentro do app; é por isso
 * que o rolo lia grego com voz grega e o app lia o Novo Testamento inteiro com
 * voz portuguesa — o que na prática produzia silêncio, e só os números dos
 * versículos saíam falados.
 *
 * `grc` e não `el`: grego ANTIGO e grego moderno têm fonética diferente, e a
 * escolha da voz depende disso (NORMAS.md N38).
 */

export type Escrita = 'he' | 'grc' | 'ru' | 'pt-BR'

const RX_HEBRAICO = /[֐-׿יִ-ﭏ]/
const RX_GREGO = /[Ͱ-Ͽἀ-῿]/
const RX_CIRILICO = /[Ѐ-ӿ]/

/** Escrita predominante de um trecho. Herda o padrão quando não há sinal. */
export function idiomaDoTexto(texto: string, padrao: Escrita = 'pt-BR'): Escrita {
  if (RX_HEBRAICO.test(texto)) return 'he'
  if (RX_GREGO.test(texto)) return 'grc'
  if (RX_CIRILICO.test(texto)) return 'ru'
  return padrao
}

export function ehRtl(escrita: Escrita): boolean {
  return escrita === 'he'
}

/**
 * Códigos de voz aceitos para cada escrita, do mais específico ao mais
 * genérico. O motor de voz do sistema raramente traz grego antigo; `el-GR` é
 * a aproximação viva mais próxima, e é o que o motor do rolo já usa.
 */
const VOZES: Record<Escrita, string[]> = {
  he: ['he-il', 'he'],
  grc: ['el-gr', 'el', 'grc'],
  ru: ['ru-ru', 'ru'],
  'pt-BR': ['pt-br', 'pt'],
}

/**
 * Melhor voz instalada para a escrita, ou `null` se o aparelho não tiver
 * nenhuma. `null` é resposta legítima: é melhor pular um trecho do que lê-lo
 * com a fonética errada — e o app avisa em vez de fingir.
 */
export function vozPara(
  escrita: Escrita,
  vozes: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  for (const prefixo of VOZES[escrita]) {
    const local = vozes.find(
      (v) => v.localService && v.lang.toLowerCase().replace('_', '-').startsWith(prefixo),
    )
    if (local) return local
    const qualquer = vozes.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(prefixo),
    )
    if (qualquer) return qualquer
  }
  return null
}

/** Rótulo em português, para avisar o leitor quando falta uma voz. */
export const NOME_DA_ESCRITA: Record<Escrita, string> = {
  he: 'hebraico',
  grc: 'grego',
  ru: 'russo',
  'pt-BR': 'português',
}
