import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import { splitFrontmatter } from './frontmatter'

/**
 * Arquivos importados pelo usuário (file picker → IndexedDB).
 * Ficam SÓ no aparelho, funcionam offline e passam pelo mesmo
 * pipeline de leitura dos livros embarcados. O app nunca altera
 * o conteúdo importado.
 */
export interface LocalFile {
  /** Derivado do nome do arquivo: reimportar o mesmo nome substitui. */
  id: string
  nome: string
  titulo: string
  autor: string
  tipo: 'md' | 'txt'
  conteudo: string
  criadoEm: number
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

export async function addLocalFiles(files: Iterable<File>): Promise<number> {
  const d = await db()
  let count = 0
  for (const file of files) {
    const nome = file.name
    if (!/\.(md|txt)$/i.test(nome)) continue
    const conteudo = await file.text()
    const tipo = /\.txt$/i.test(nome) ? 'txt' : 'md'
    const base = nome.replace(/\.(md|txt)$/i, '')
    const { meta } = tipo === 'md' ? splitFrontmatter(conteudo) : { meta: null }
    await d.put('arquivos', {
      id: `local-${base.toLowerCase().replace(/\W+/g, '-')}`,
      nome,
      titulo: cleanMetaValue(meta?.title) ?? base,
      autor: cleanMetaValue(meta?.author) ?? 'Arquivo próprio',
      tipo,
      conteudo,
      criadoEm: Date.now(),
    })
    count++
  }
  return count
}

export async function removeLocalFile(id: string): Promise<void> {
  await (await db()).delete('arquivos', id)
}

/** Restaura um arquivo exatamente como veio de um backup (mesmo id: reimportar substitui). */
export async function restoreLocalFile(file: LocalFile): Promise<void> {
  await (await db()).put('arquivos', file)
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
