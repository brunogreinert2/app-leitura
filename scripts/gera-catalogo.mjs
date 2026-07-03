// Acrescenta ao public/livros/catalogo.json todo .md/.txt que ainda não
// esteja listado — para despejar uma coleção inteira numa pasta e rodar:
//   npm run gera:catalogo
//
// Preserva as entradas existentes (título/ordem/sistema_referencia que
// você já ajustou não são tocados). Título e autor dos novos vêm do
// YAML (title/author); sistema_referencia do YAML se presente.
// PERSONAGENS/ fica de fora (tem manifesto próprio).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'livros')
const catalogPath = join(root, 'catalogo.json')

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'PERSONAGENS') continue
      yield* walk(full)
    } else if (/\.(md|txt)$/i.test(name)) {
      yield full
    }
  }
}

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  return m ? m[1] : ''
}

function yamlString(block, key) {
  const m = new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm').exec(block)
  if (!m) return null
  return m[1].replace(/\[\[([^\][|]+)(?:\|[^\][]*)?\]\]/g, '$1').trim() || null
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
const known = new Set(catalog.livros.map((l) => l.arquivo))
const ids = new Set(catalog.livros.map((l) => l.id))

const added = []
for (const full of walk(root)) {
  const arquivo = relative(root, full).replaceAll('\\', '/')
  if (known.has(arquivo)) continue
  const nome = arquivo.split('/').pop().replace(/\.(md|txt)$/i, '')
  const fm = /\.md$/i.test(arquivo) ? frontmatter(readFileSync(full, 'utf8')) : ''
  let id = (yamlString(fm, 'id') ?? nome.toLowerCase().replace(/\W+/g, '-')).replace(/^-+|-+$/g, '')
  while (ids.has(id)) id += '-2'
  ids.add(id)
  const entry = {
    id,
    titulo: yamlString(fm, 'title') ?? nome.replaceAll('_', ' '),
    autor: yamlString(fm, 'author') ?? '—',
    arquivo,
  }
  const ref = yamlString(fm, 'sistema_referencia')
  if (ref) entry.sistema_referencia = ref
  added.push(entry)
}

added.sort((a, b) => a.arquivo.localeCompare(b.arquivo, 'pt'))
catalog.livros.push(...added)
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
console.log(
  added.length
    ? `catalogo.json: +${added.length} livro(s) novo(s), ${catalog.livros.length} no total`
    : `catalogo.json: nada novo (${catalog.livros.length} livros)`,
)
