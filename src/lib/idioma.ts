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

export type Escrita = 'he' | 'grc' | 'ru' | 'pt-BR' | 'en' | 'la'

const RX_HEBRAICO = /[֐-׿יִ-ﭏ]/
const RX_GREGO = /[Ͱ-Ͽἀ-῿]/
const RX_CIRILICO = /[Ѐ-ӿ]/

/**
 * Português, inglês e latim escrevem com o MESMO alfabeto — o código dos
 * caracteres não os separa, ao contrário do grego e do hebraico, que têm
 * letras próprias e são reconhecidos com certeza.
 *
 * Para esses três resta contar palavras de função: as mais frequentes de cada
 * língua, que aparecem em qualquer texto e quase nunca nas outras duas. É
 * palpite, não certeza — e por isso só decide quando a margem é folgada.
 * Empate ou trecho curto herdam o idioma declarado no cabeçalho do arquivo.
 */
const PALAVRAS: Record<'pt-BR' | 'en' | 'la', RegExp> = {
  'pt-BR':
    /\b(de|que|n[ãa]o|uma?|para|com|dos?|das?|em|por|mais|como|mas|ele|seu|sua|s[ãa]o|tamb[ée]m|ser|est[áa]|isso|quando|muito)\b/gi,
  en: /\b(the|and|of|to|is|that|it|for|with|was|as|but|are|this|from|by|not|be|have|which|his|they|there|would|been)\b/gi,
  la: /\b(et|est|non|qui|quae|quod|cum|ad|ut|sed|per|ex|atque|autem|enim|esse|sunt|hoc|quam|nec|ipse|etiam|tamen|inter)\b/gi,
}

/* Diacríticos que, entre as três, praticamente só o português usa. */
const RX_ACENTO_PT = /[ãõçáéíóúâêôàü]/i

function contar(texto: string, re: RegExp): number {
  re.lastIndex = 0
  return (texto.match(re) || []).length
}

/**
 * Escrita de um trecho.
 *
 * `padrao` é o idioma declarado no cabeçalho do arquivo (`language:`), não um
 * chute fixo: num Leviathan declarado `la`, um trecho curto herda latim em vez
 * de português. Era isto que fazia a introdução em inglês do Hobbes sair com
 * sotaque brasileiro.
 */
export function idiomaDoTexto(texto: string, padrao: Escrita = 'pt-BR'): Escrita {
  if (RX_HEBRAICO.test(texto)) return 'he'
  if (RX_GREGO.test(texto)) return 'grc'
  if (RX_CIRILICO.test(texto)) return 'ru'

  // Trecho curto não dá amostra: número de versículo, título de uma palavra.
  if (texto.trim().split(/\s+/).length < 6) return padrao

  const pontos: Record<'pt-BR' | 'en' | 'la', number> = {
    'pt-BR': contar(texto, PALAVRAS['pt-BR']) + (RX_ACENTO_PT.test(texto) ? 2 : 0),
    en: contar(texto, PALAVRAS.en),
    la: contar(texto, PALAVRAS.la),
  }
  const ordenado = (Object.entries(pontos) as [Escrita, number][]).sort((a, b) => b[1] - a[1])
  const [vencedor, melhor] = ordenado[0]

  // Precisa de sinal claro E de folga sobre o segundo; senão decide o
  // cabeçalho, que é informação declarada e não inferida.
  if (melhor >= 2 && melhor - ordenado[1][1] >= 2) return vencedor
  return padrao
}

/**
 * `language:` do front matter (o corpus tem ISO 639-2/B e BCP 47 misturados)
 * para a escrita usada aqui. Mesma tabela do `gerador_rolo.py`.
 */
export function escritaDoCabecalho(bruto: unknown): Escrita {
  if (typeof bruto !== 'string' || !bruto.trim()) return 'pt-BR'
  const chave = bruto.trim().split('/')[0].trim().toLowerCase()
  const mapa: Record<string, Escrita> = {
    por: 'pt-BR', pt: 'pt-BR', 'pt-br': 'pt-BR',
    eng: 'en', en: 'en',
    lat: 'la', la: 'la',
    grc: 'grc', ell: 'grc', el: 'grc',
    heb: 'he', he: 'he',
    rus: 'ru', ru: 'ru',
  }
  return mapa[chave] ?? 'pt-BR'
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
  en: ['en-us', 'en-gb', 'en'],
  // Latim não tem voz em sistema nenhum. O italiano é a aproximação viva mais
  // próxima da pronúncia eclesiástica, e o espanhol da restaurada; o português
  // fecha a lista porque é melhor que ler com fonética inglesa.
  la: ['it-it', 'it', 'es-es', 'es', 'pt-br', 'pt'],
}

/**
 * Melhor voz instalada para a escrita, ou `null` se o aparelho não tiver
 * nenhuma. `null` é resposta legítima: é melhor pular um trecho do que lê-lo
 * com a fonética errada — e o app avisa em vez de fingir.
 */
export function vozPara(
  escrita: Escrita,
  vozes: SpeechSynthesisVoice[],
): { voz: SpeechSynthesisVoice; aproximada: boolean } | null {
  const lista = VOZES[escrita]
  for (let i = 0; i < lista.length; i++) {
    const prefixo = lista[i]
    // A partir do segundo item da lista já não é a língua pedida: é a
    // aproximação viva mais próxima. O latim, por exemplo, não tem voz em
    // sistema nenhum e acaba lido por italiano, espanhol ou português. Quem
    // ouve merece saber que é aproximação, e não achar que é pronúncia certa.
    const aproximada = i > 0 && !prefixo.startsWith(escrita.slice(0, 2).toLowerCase())
    const local = vozes.find(
      (v) => v.localService && v.lang.toLowerCase().replace('_', '-').startsWith(prefixo),
    )
    if (local) return { voz: local, aproximada }
    const qualquer = vozes.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(prefixo),
    )
    if (qualquer) return { voz: qualquer, aproximada }
  }
  return null
}

/** Rótulo em português, para avisar o leitor quando falta uma voz. */
export const NOME_DA_ESCRITA: Record<Escrita, string> = {
  he: 'hebraico',
  grc: 'grego',
  ru: 'russo',
  'pt-BR': 'português',
  en: 'inglês',
  la: 'latim',
}
