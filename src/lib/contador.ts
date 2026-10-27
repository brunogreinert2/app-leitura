/**
 * Contador de visitas anônimo (GoatCounter), escrito aqui dentro em vez do
 * script deles: o app não carrega código de fora e só sai um aviso pequeno
 * ("alguém abriu esta obra"), mais nada.
 *
 * O que vai no aviso: o caminho (`/` ou `/livro/<id>`), o título da obra e,
 * só na abertura, o SITE de onde a pessoa veio (o domínio, nunca o endereço
 * inteiro). Não vai: cookie, tamanho de tela, idioma, nada guardado no
 * aparelho. O GoatCounter não grava o IP; usa-o só na hora para separar
 * visitantes, com uma marca que ele descarta.
 *
 * Quando NÃO conta:
 * - fora do site publicado (dev, localhost, prévia, cópia do repositório);
 * - sem internet (o aviso se perde; o app segue offline normalmente);
 * - navegador que pede "não rastrear" (Do Not Track ou Global Privacy Control);
 * - aparelho que abriu uma vez `?contar=nao` (desfaz com `?contar=sim`);
 * - arquivos do próprio leitor ("Meus arquivos"): esses nunca saem do aparelho.
 *
 * O painel é público: https://pedraangular.goatcounter.com
 */

const ENDERECO = 'https://pedraangular.goatcounter.com/count'
const SITE = 'pedraangular.app.br'
const CHAVE_NAO_CONTAR = 'pa-nao-contar'

let ultimoCaminho: string | null = null
let primeiraVez = true

function lerPedidoDaUrl(): void {
  const params = new URLSearchParams(window.location.search)
  const pedido = params.get('contar')
  if (pedido === null) return
  try {
    if (pedido === 'nao') localStorage.setItem(CHAVE_NAO_CONTAR, '1')
    if (pedido === 'sim') localStorage.removeItem(CHAVE_NAO_CONTAR)
  } catch {
    /* sem armazenamento: vale só para esta visita */
  }
  params.delete('contar')
  const resto = params.toString()
  window.history.replaceState(
    null,
    '',
    window.location.pathname + (resto ? '?' + resto : '') + window.location.hash,
  )
}

lerPedidoDaUrl()

function podeContar(): boolean {
  if (import.meta.env.DEV) return false
  const host = window.location.hostname
  if (host !== SITE && host !== `www.${SITE}`) return false
  if (!navigator.onLine) return false
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl === true) return false
  try {
    if (localStorage.getItem(CHAVE_NAO_CONTAR)) return false
  } catch {
    /* sem armazenamento: conta */
  }
  return true
}

function enviar(params: Record<string, string>): void {
  const busca = new URLSearchParams({ ...params, rnd: String(Math.random()).slice(2, 10) })
  // Robô de teste (Selenium, Playwright…) se declara; o GoatCounter o separa.
  if (navigator.webdriver) busca.set('b', '153')
  // Uma imagem é o pedido mais simples que existe: atravessa domínios sem
  // pedir permissão e, se falhar, falha calada.
  const img = new Image()
  img.src = `${ENDERECO}?${busca}`
}

function origemDaVisita(): string {
  try {
    if (!document.referrer) return ''
    const de = new URL(document.referrer)
    return de.hostname === window.location.hostname ? '' : de.origin
  } catch {
    return ''
  }
}

/**
 * Conta a obra aberta. Chamado a cada troca de texto; repetir a mesma obra
 * não conta de novo. `null` = biblioteca ou guia de boas-vindas (conta `/`).
 */
export function contarVisita(obra: { id: string; titulo: string } | null): void {
  const caminho = obra ? `/livro/${obra.id}` : '/'
  if (caminho === ultimoCaminho) return
  ultimoCaminho = caminho
  if (!podeContar()) return

  const params: Record<string, string> = { p: caminho, t: obra ? obra.titulo : 'Pedra Angular' }
  if (primeiraVez) {
    const r = origemDaVisita()
    if (r) params.r = r
  }
  enviar(params)

  // Uma vez por abertura: separa quem usa o app instalado de quem usa a aba.
  if (primeiraVez) {
    const instalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    enviar({ p: instalado ? 'aberto-no-app-instalado' : 'aberto-no-navegador', e: 'true' })
  }
  primeiraVez = false
}
