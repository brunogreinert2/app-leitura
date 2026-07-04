import { useState } from 'react'
import type { CatalogEntry } from '../types'
import type { ParsedBook } from '../lib/markdown'

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

interface Props {
  open: boolean
  onClose: () => void
  entry: CatalogEntry
  parsed: ParsedBook | null
}

/** Ficha do arquivo: os campos do YAML (que nunca aparecem no texto). */
export function DetailsDialog({ open, onClose, entry, parsed }: Props) {
  const [copied, setCopied] = useState(false)
  if (!open) return null

  const permalink = `${window.location.origin}${window.location.pathname}#/livro/${encodeURIComponent(entry.id)}`
  const copyLink = () => {
    navigator.clipboard.writeText(permalink).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

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
          <button className="wikilink-box-open" onClick={copyLink}>
            {copied ? 'Copiado ✓' : 'Copiar link desta obra'}
          </button>
        )}
        <button className="copy-dialog-cancel" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  )
}
