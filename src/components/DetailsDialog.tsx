import { useState } from 'react'
import type { Catalog as CatalogData, CatalogEntry } from '../types'
import type { ParsedBook } from '../lib/markdown'
import { roloUrl } from '../lib/rolo'

/** Rótulos em português para os campos conhecidos do YAML do corpus. */
const META_LABELS: [key: string, label: string][] = [
  ['title', 'Título'],
  ['subtitle', 'Subtítulo'],
  ['original_title', 'Título original'],
  ['author', 'Autor'],
  ['translation', 'Tradução'],
  ['year_original', 'Ano original'],
  ['publisher', 'Editora'],
  ['publication_year', 'Ano da edição'],
  ['language', 'Idioma'],
  ['area', 'Área'],
  ['era', 'Época'],
  ['born', 'Nascimento'],
  ['died', 'Morte'],
  ['nationality', 'Nacionalidade'],
  ['source', 'Fonte'],
  ['tags', 'Tags'],
  ['coautoria', 'Coautoria'],
  ['status', 'Status'],
  ['type', 'Tipo'],
  ['project', 'Projeto'],
]

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    const items = value.map((v) => formatValue(v)).filter(Boolean)
    return items.length ? items.join(', ') : null
  }
  // [[Platão]] no YAML vira só o nome
  return String(value).replace(/\[\[([^\][|]+)(?:\|[^\][]*)?\]\]/g, '$1').trim() || null
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Ficha do acervo: o mesmo gesto que abre o YAML de uma obra, um nível acima.
 * Tudo contado do catálogo já carregado — nenhum número escrito à mão, para
 * não envelhecer em silêncio quando o acervo crescer.
 */
function linhasDoAcervo(catalog: CatalogData | null | undefined): [string, string][] {
  if (!catalog) return [['Catálogo', 'ainda carregando…']]
  const livros = catalog.livros
  const proprios = livros.filter((l) => l.local)
  const personagens = livros.filter((l) => l.autor === 'Personagem')
  const doCorpus = livros.filter((l) => !l.local && l.autor !== 'Personagem')

  const porAcervo = new Map<string, number>()
  for (const l of doCorpus) {
    const raiz = l.arquivo.split('/')[0]
    // obra solta na raiz de livros/ não forma um acervo
    porAcervo.set(
      raiz.endsWith('.md') ? 'Geral' : raiz,
      (porAcervo.get(raiz.endsWith('.md') ? 'Geral' : raiz) ?? 0) + 1,
    )
  }

  const linhas: [string, string][] = [
    ['Obras no acervo', String(doCorpus.length + personagens.length)],
  ]
  for (const [nome, n] of [...porAcervo].sort((a, b) => b[1] - a[1])) {
    linhas.push([nome, `${n} ${n === 1 ? 'obra' : 'obras'}`])
  }
  if (personagens.length) linhas.push(['Personagens', String(personagens.length)])
  linhas.push(['Seus textos', proprios.length ? String(proprios.length) : 'nenhum ainda'])
  linhas.push(['Leitura', 'offline depois da primeira visita'])
  linhas.push(['Texto-fonte', 'Markdown, em domínio público'])
  return linhas
}

interface Props {
  open: boolean
  onClose: () => void
  /** null na tela da biblioteca: a ficha passa a ser a do acervo inteiro. */
  entry: CatalogEntry | null
  parsed: ParsedBook | null
  /** Usado só no modo acervo, para contar o que existe. */
  catalog?: CatalogData | null
}

/** Ficha do arquivo: os campos do YAML (que nunca aparecem no texto). */
export function DetailsDialog({ open, onClose, entry, parsed, catalog }: Props) {
  const [copied, setCopied] = useState<'app' | 'rolo' | null>(null)
  if (!open) return null

  const copiar = (texto: string, qual: 'app' | 'rolo') => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(qual)
      window.setTimeout(() => setCopied(null), 2000)
    })
  }

  // ---- modo acervo: sem obra aberta, a ficha é a do site ----
  if (!entry) {
    const rolo = `${window.location.origin}/rolo/`
    return (
      <>
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
        <div className="copy-dialog details-dialog" role="dialog" aria-label="Detalhes do acervo">
          <h2>Detalhes do acervo</h2>
          <dl className="details-list">
            {linhasDoAcervo(catalog).map(([label, value]) => (
              <div key={label} className="details-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {/* O mesmo par de links da ficha de uma obra, um nível acima: o de
              cima abre o app; o de baixo é a via estática que uma IA consegue
              ler ao buscar a URL. */}
          <button className="wikilink-box-open" onClick={() => copiar(window.location.origin, 'app')}>
            {copied === 'app' ? 'Copiado ✓' : 'Copiar link do app'}
          </button>
          <button className="wikilink-box-open" onClick={() => copiar(rolo, 'rolo')}>
            {copied === 'rolo' ? 'Copiado ✓' : 'Copiar link do acervo para IA'}
          </button>
          <button className="copy-dialog-cancel" onClick={onClose}>
            Fechar
          </button>
        </div>
      </>
    )
  }

  const permalink = `${window.location.origin}${window.location.pathname}#/livro/${encodeURIComponent(entry.id)}`

  const meta = parsed?.meta ?? {}
  const rows: [string, string][] = []
  const used = new Set<string>()
  for (const [key, label] of META_LABELS) {
    const v = formatValue(meta[key])
    used.add(key)
    if (v) rows.push([label, v])
  }
  for (const [key, value] of Object.entries(meta)) {
    if (used.has(key) || key === 'id' || key === 'related') continue
    const v = formatValue(value)
    if (v) rows.push([key, v])
  }
  if (rows.length === 0) rows.push(['Título', entry.titulo], ['Autor', entry.autor])
  if (parsed) rows.push(['Tamanho do arquivo', formatBytes(parsed.bytes)])
  if (parsed?.headings.length) rows.push(['Seções', String(parsed.headings.length)])
  rows.push(['Arquivo', entry.arquivo])

  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="copy-dialog details-dialog" role="dialog" aria-label="Detalhes do arquivo">
        <h2>Detalhes</h2>
        <dl className="details-list">
          {rows.map(([label, value]) => (
            <div key={label} className="details-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {!entry.local && (
          <>
            <button className="wikilink-box-open" onClick={() => copiar(permalink, 'app')}>
              {copied === 'app' ? 'Copiado ✓' : 'Copiar link desta obra'}
            </button>
            {/* Dois links para a mesma obra, porque são dois leitores diferentes.
                O de cima abre no app, com tudo que o app tem. O de baixo é o rolo
                estático: texto escrito no HTML, que uma IA consegue ler ao buscar
                a URL — coisa que a rota #/livro/… não permite, por ser SPA. */}
            <button className="wikilink-box-open" onClick={() => copiar(roloUrl(entry.id), 'rolo')}>
              {copied === 'rolo' ? 'Copiado ✓' : 'Copiar link para IA'}
            </button>
          </>
        )}
        <button className="copy-dialog-cancel" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  )
}
