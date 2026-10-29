import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import { splitFrontmatter } from './frontmatter'

/**
 * Arquivos importados pelo usuário (file picker → IndexedDB).
 * Ficam SÓ no aparelho, funcionam offline e passam pelo mesmo
 * pipeline de leitura dos livros embarcados. O app nunca altera
 * o conteúdo importado.
 */
export interface LocalFile {
  /**
   * Identidade própria, que NÃO sai do nome do arquivo. Até 2026-10-28 saía
   * (`local-<nome>`), e reabrir um arquivo de mesmo nome gravava por cima da
   * cópia — inclusive das edições feitas no app. Os ids antigos continuam
   * valendo (são endereço publicado: `#/livro/<id>`); só os novos mudaram.
   */
  id: string
  nome: string
  titulo: string
  autor: string
  tipo: 'md' | 'txt'
  conteudo: string
  criadoEm: number
  /** Nome do arquivo como chegou do sistema. Editar no app não o muda. */
  origem?: string
  /**
   * Assinatura do texto como ele estava NA PASTA da última vez que veio de
   * lá. Se o conteúdo atual difere dela, a cópia foi editada no app — e
   * então nunca é substituída. Ausente (cópias anteriores a 2026-10-28) quer
   * dizer "não se sabe", e "não se sabe" é tratado como editada.
   */
  assinatura?: string
  /**
   * A alça do arquivo no disco, quando o sistema a entrega (dois cliques no
   * Explorador, Chromium de mesa). Serve só para uma pergunta: "é o MESMO
   * arquivo?" (`isSameEntry`) — o nome sozinho não responde, porque duas
   * pastas podem ter um `notas.md` cada. Nunca é usada para gravar.
   */
  alca?: FileSystemFileHandle
}

interface LeituraDB extends DBSchema {
  arquivos: { key: string; value: LocalFile }
}

let dbPromise: Promise<IDBPDatabase<LeituraDB>> | null = null

function db() {
  dbPromise ??= openDB<LeituraDB>('leitura-app', 1, {
    upgrade(d) {
      d.createObjectStore('arquivos', { keyPath: 'id' })
    },
  })
  return dbPromise
}

function cleanMetaValue(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  return (
    String(value)
      .replace(/\[\[([^\][|]+)(?:\|[^\][]*)?\]\]/g, '$1')
      .trim() || null
  )
}

export async function listLocalFiles(): Promise<LocalFile[]> {
  const files = await (await db()).getAll('arquivos')
  return files.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt'))
}

export async function getLocalFile(id: string): Promise<LocalFile | undefined> {
  return (await db()).get('arquivos', id)
}

/* ---------- NUNCA APAGAR CALADO ----------

   Reabrir um arquivo que já está no app tem três desfechos, e nenhum deles
   perde o que foi digitado:

   1. O texto é igual ao de uma cópia que já existe: só abre essa cópia.
   2. É comprovadamente o MESMO arquivo (mesma alça no disco) e a cópia nunca
      foi editada no app: a cópia é atualizada com o que veio da pasta.
      Nada se perde — não havia nada digitado nela.
   3. Qualquer outro caso: as DUAS ficam. A que chegou entra como
      "título (2)", e quem chamou recebe o aviso para mostrar.

   O caso 3 é o padrão de propósito. Duas versões, uma mais nova que a outra,
   é bagunça que a pessoa arruma; uma versão perdida em silêncio não tem
   conserto. Antes daqui, reabrir no Explorador um texto editado no app
   gravava a versão da pasta por cima das edições, sem aviso. */

/** Assinatura curta de um texto (cyrb53). Quebra de linha CRLF ou LF dá igual. */
function assinaturaDe(texto: string): string {
  const s = texto.replace(/\r\n?/g, '\n')
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

const mesmoTexto = (a: string, b: string) => assinaturaDe(a) === assinaturaDe(b)

/** A cópia foi editada no app depois de chegar da pasta? Sem registro, sim. */
function editadaNoApp(f: LocalFile): boolean {
  return f.assinatura === undefined || assinaturaDe(f.conteudo) !== f.assinatura
}

/** O id que as cópias anteriores a 2026-10-28 recebiam do nome do arquivo. */
function idAntigo(nome: string): string {
  return `local-${nome.replace(/\.(md|txt)$/i, '').toLowerCase().replace(/\W+/g, '-')}`
}

/** A cópia veio de um arquivo com este nome? As antigas só se reconhecem pelo id. */
function veioDe(f: LocalFile, nome: string): boolean {
  return f.origem !== undefined ? f.origem === nome : f.id === idAntigo(nome)
}

function idNovo(nome: string): string {
  const aleatorio = Math.random().toString(36).slice(2, 6)
  return `${idAntigo(nome)}-${Date.now().toString(36)}${aleatorio}`
}

/** É o mesmo arquivo do disco? Só a alça responde; sem as duas, "não se sabe". */
async function mesmaAlca(a?: FileSystemFileHandle, b?: FileSystemFileHandle): Promise<boolean> {
  if (!a || !b || typeof a.isSameEntry !== 'function') return false
  try {
    return await a.isSameEntry(b)
  } catch {
    return false
  }
}

/**
 * Alças entregues pelo sistema junto com o arquivo (ver useArquivosDoSistema).
 * Num mapa à parte, e não num parâmetro, porque todas as portas de entrada
 * (botão, arrastar, compartilhar, dois cliques) chegam aqui como `File` — só
 * uma delas sabe a alça.
 */
const alcas = new WeakMap<File, FileSystemFileHandle>()
export function lembrarAlca(arquivo: File, alca: FileSystemFileHandle): void {
  alcas.set(arquivo, alca)
}

/** Uma versão que chegou e ficou AO LADO de outra, em vez de por cima. */
export interface GuardadaAoLado {
  existente: string
  nova: string
}

/**
 * Grava os arquivos e devolve os IDS a abrir — e as versões que ficaram ao
 * lado de outra, para quem chamou avisar.
 */
export async function addLocalFiles(
  files: Iterable<File>,
): Promise<{ ids: string[]; aoLado: GuardadaAoLado[] }> {
  const d = await db()
  const ids: string[] = []
  const aoLado: GuardadaAoLado[] = []
  for (const file of files) {
    const nome = file.name
    if (!/\.(md|txt)$/i.test(nome)) continue
    const conteudo = await file.text()
    const alca = alcas.get(file)
    const tipo = /\.txt$/i.test(nome) ? 'txt' : 'md'
    const base = nome.replace(/\.(md|txt)$/i, '')
    const { meta } = tipo === 'md' ? splitFrontmatter(conteudo) : { meta: null }
    const assinatura = assinaturaDe(conteudo)
    const irmas = (await d.getAll('arquivos')).filter((f) => veioDe(f, nome))

    // 1. Já existe uma cópia com este mesmo texto: abre ela.
    const igual = irmas.find((f) => mesmoTexto(f.conteudo, conteudo))
    if (igual) {
      // Aproveita para registrar origem e alça numa cópia antiga — igual à
      // pasta, ela está comprovadamente intocada.
      await d.put('arquivos', { ...igual, origem: nome, assinatura, alca: alca ?? igual.alca })
      ids.push(igual.id)
      continue
    }

    // 2. O mesmo arquivo do disco, e a cópia nunca foi editada no app.
    let mesmo: LocalFile | undefined
    for (const f of irmas) {
      if (await mesmaAlca(f.alca, alca)) {
        mesmo = f
        break
      }
    }
    if (mesmo && !editadaNoApp(mesmo)) {
      await d.put('arquivos', { ...mesmo, conteudo, assinatura, alca, tipo })
      ids.push(mesmo.id)
      continue
    }

    // 3. Chega como cópia nova. Se já havia outra(s), ao lado delas — com o
    // nome da que já existe e um número, como o Explorador faz: "Teste" e
    // "Teste (2)", e não "Teste" e "teste", que só se distinguem forçando a vista.
    const irma = mesmo ?? irmas[0]
    const titulo = irma
      ? irma.titulo.replace(/ \((?:\d+|backup(?: \d+)?)\)$/, '')
      : (cleanMetaValue(meta?.title) ?? base)
    const usados = new Set((await d.getAll('arquivos')).map((f) => f.titulo.toLowerCase()))
    let tituloNovo = titulo
    for (let n = 2; usados.has(tituloNovo.toLowerCase()); n++) tituloNovo = `${titulo} (${n})`
    const id = idNovo(nome)
    await d.put('arquivos', {
      id,
      nome,
      titulo: tituloNovo,
      autor: cleanMetaValue(meta?.author) ?? 'Arquivo próprio',
      tipo,
      conteudo,
      criadoEm: Date.now(),
      origem: nome,
      assinatura,
      alca,
    })
    if (irma) aoLado.push({ existente: irma.titulo, nova: tituloNovo })
    ids.push(id)
  }
  return { ids, aoLado }
}

export async function removeLocalFile(id: string): Promise<void> {
  await (await db()).delete('arquivos', id)
}

/**
 * Restaura um arquivo de um backup — sem apagar o que já está no app.
 *
 * Antes, o mesmo id SUBSTITUÍA: restaurar um backup da semana passada
 * gravava por cima das edições feitas depois dele. Agora, se o app já tem
 * aquele texto com outro conteúdo, os dois ficam: o do backup entra como
 * "título (backup)".
 */
export async function restoreLocalFile(file: LocalFile): Promise<void> {
  const d = await db()
  // A alça não atravessa o .json (vira `{}`): sai antes de gravar.
  const { alca: _alca, ...semAlca } = file
  void _alca
  const atual = await d.get('arquivos', file.id)
  if (!atual) {
    await d.put('arquivos', semAlca)
    return
  }
  if (mesmoTexto(atual.conteudo, file.conteudo)) return
  const usados = new Set((await d.getAll('arquivos')).map((f) => f.titulo))
  let titulo = `${file.titulo} (backup)`
  for (let n = 2; usados.has(titulo); n++) titulo = `${file.titulo} (backup ${n})`
  await d.put('arquivos', { ...semAlca, id: `${file.id}-backup-${Date.now().toString(36)}`, titulo })
}

/**
 * Texto digitado/colado pelo usuário no próprio app (a "área de
 * transferência" vira documento legível). Salvo como .md: o que vier
 * do chat do Claude ou de qualquer lugar rende títulos/negrito de
 * graça, e texto puro continua texto puro. Só textos do usuário são
 * editáveis — o corpus permanece intocável.
 */
export async function saveLocalText(
  titulo: string,
  conteudo: string,
  existingId?: string,
): Promise<LocalFile> {
  const d = await db()
  const nome = `${titulo.replace(/[\\/:*?"<>|]/g, '')}.md`
  const existing = existingId ? await d.get('arquivos', existingId) : undefined
  const file: LocalFile = {
    // Origem, assinatura e alça ficam: é por elas que reabrir o arquivo da
    // pasta reconhece que esta cópia foi EDITADA e não a substitui.
    ...existing,
    id: existing?.id ?? `texto-${Date.now().toString(36)}`,
    nome,
    titulo,
    autor: existing?.autor ?? 'Texto próprio',
    tipo: 'md',
    conteudo,
    criadoEm: existing?.criadoEm ?? Date.now(),
  }
  await d.put('arquivos', file)
  return file
}
