// Gera public/livros/personagens.json a partir dos .md em
// public/livros/PERSONAGENS/. Rodar após adicionar/renomear verbetes:
//   npm run gera:personagens
//
// O nome do arquivo é o alvo canônico do wikilink (convenção Obsidian:
// [[Platão]] -> Platão.md). O YAML pode acrescentar `aliases:` para
// nomes alternativos ([[David - O rei]] etc.).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'livros')
const dir = join(root, 'PERSONAGENS')

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  return m ? m[1] : ''
}

function yamlString(block, key) {
  const m = new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm').exec(block)
  return m ? m[1].trim() : null
}

function yamlList(block, key) {
  // forma inline: key: [a, b]  |  forma lista: key:\n  - a\n  - b
  const inline = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, 'm').exec(block)
  if (inline) {
    return inline[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
  }
  const listStart = new RegExp(`^${key}:\\s*$`, 'm').exec(block)
  if (!listStart) return []
  const rest = block.slice(listStart.index + listStart[0].length)
  const items = []
  for (const line of rest.split('\n')) {
    const item = /^\s+-\s+["']?(.+?)["']?\s*$/.exec(line)
    if (!item) break
    items.push(item[1].trim())
  }
  return items
}

const personagens = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const nome = file.replace(/\.md$/, '')
    const fm = frontmatter(readFileSync(join(dir, file), 'utf8'))
    return {
      id: yamlString(fm, 'id') ?? `personagem-${nome.toLowerCase().replace(/\W+/g, '-')}`,
      nome,
      titulo: yamlString(fm, 'title') ?? nome,
      arquivo: `PERSONAGENS/${file}`,
      aliases: yamlList(fm, 'aliases'),
    }
  })
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

writeFileSync(
  join(root, 'personagens.json'),
  JSON.stringify({ personagens }, null, 2) + '\n',
  'utf8',
)
console.log(`personagens.json: ${personagens.length} verbetes`)
