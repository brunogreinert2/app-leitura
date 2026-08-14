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
 * Fatia mínima de letras numa escrita para ela mandar na linha inteira.
 *
 * Sem isto, UM caractere basta. E o ecossistema escreve Φ e Ξ em português o
 * tempo todo — são os nomes dos próprios botões da barra. O resultado era a
 * página de boas-vindas, escrita inteiramente em português, ser lida com voz
 * grega por causa de "o botão Φ (phi grega)". Trinta por cento separa uma
 * linha que É grega de uma linha que apenas CITA uma letra grega.
 */
const LIMIAR_ESCRITA = 0.3
/* Faixas com \u, nunca com o caractere literal — ver a nota longa em
   remarkHebrew.ts: um U+FB1D decomposto no arquivo transformou a classe do
   hebraico numa faixa de 25 mil pontos que engolia o grego politônico. */
const RX_LETRA = /\p{L}/gu
const RX_HEBRAICO = new RegExp('[\\u0590-\\u05FF\\uFB1D-\\uFB4F]', 'g')
const RX_GREGO = new RegExp('[\\u0370-\\u03FF\\u1F00-\\u1FFF]', 'g')
const RX_CIRILICO = new RegExp('[\\u0400-\\u04FF]', 'g')

/** Escrita própria que domina o trecho, ou `null` se nenhuma alcança o limiar. */
function dominante(texto: string): Escrita | null {
  const letras = contar(texto, RX_LETRA)
  if (!letras) return null
  const pares: [RegExp, Escrita][] = [
    [RX_HEBRAICO, 'he'],
    [RX_GREGO, 'grc'],
    [RX_CIRILICO, 'ru'],
  ]
  for (const [rx, escrita] of pares) {
    if (contar(texto, rx) / letras >= LIMIAR_ESCRITA) return escrita
  }
  return null
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
  const escritaDominante = dominante(texto)
  if (escritaDominante) return escritaDominante

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
const CODIGOS: Record<string, Escrita> = {
  por: 'pt-BR', pt: 'pt-BR', 'pt-br': 'pt-BR',
  eng: 'en', en: 'en',
  lat: 'la', la: 'la',
  grc: 'grc', ell: 'grc', el: 'grc',
  heb: 'he', he: 'he',
  rus: 'ru', ru: 'ru',
}

export function escritaDoCabecalho(bruto: unknown): Escrita {
  if (typeof bruto !== 'string' || !bruto.trim()) return 'pt-BR'
  return CODIGOS[bruto.trim().split('/')[0].trim().toLowerCase()] ?? 'pt-BR'
}

/**
 * Um `^por` no fim de uma linha é ETIQUETA DE IDIOMA, não endereço.
 *
 * A lista é FECHADA de propósito: só estes códigos viram idioma, e qualquer
 * outra âncora continua sendo endereço de passagem, como sempre foi. Sem lista
 * fechada, o dia em que alguém marcasse um versículo com `^ab` o app trocaria
 * a voz sem motivo — e não há aviso para um erro desses, só uma frase saindo
 * com sotaque errado.
 *
 * Verificado em 2026-08-16: o corpus não tem nenhuma âncora de 2 a 4 letras,
 * então a convenção nasce sem colisão.
 */
export function escritaDaAncora(codigo: string): Escrita | null {
  return CODIGOS[codigo.trim().toLowerCase()] ?? null
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
