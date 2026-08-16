import { useState } from 'react'
import type { Catalog as CatalogData, CatalogEntry } from '../types'
import type { ParsedBook } from '../lib/markdown'
import { roloUrl } from '../lib/rolo'
import { useT, useIdiomaAtual } from './idiomaContext'
import { rotuloDaPasta, type Tradutor, type Idioma } from '../lib/i18n'

/**
 * Campos conhecidos do YAML do corpus, na ordem em que aparecem na ficha.
 * A chave do YAML é a mesma em qualquer idioma (é o formato do arquivo); só
 * o rótulo mostrado ao leitor é traduzido. Campo fora desta lista aparece
 * com o próprio nome cru do YAML — de propósito, para nada sumir da ficha.
 */
const META_LABELS = [
  'title', 'subtitle', 'original_title', 'author', 'translation',
  'year_original', 'publisher', 'publication_year', 'language', 'area',
  'era', 'born', 'died', 'nationality', 'source', 'tags', 'coautoria',
  'status', 'type', 'project',
] as const

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
function linhasDoAcervo(
  catalog: CatalogData | null | undefined,
  t: Tradutor,
  idioma: Idioma,
): [string, string][] {
  if (!catalog) return [[t('biblioteca'), t('detalhes.carregando')]]
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
    [t('detalhes.obrasNoAcervo'), String(doCorpus.length + personagens.length)],
  ]
  for (const [nome, n] of [...porAcervo].sort((a, b) => b[1] - a[1])) {
    linhas.push([rotuloDaPasta(idioma, nome), String(n)])
  }
  if (personagens.length) linhas.push([t('detalhes.personagens'), String(personagens.length)])
  linhas.push([t('detalhes.seusTextos'), proprios.length ? String(proprios.length) : t('detalhes.nenhumAinda')])
  linhas.push([t('detalhes.leitura'), t('detalhes.offline')])
  linhas.push([t('detalhes.textoFonte'), t('detalhes.dominioPublico')])
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
  const t = useT()
  const { idioma } = useIdiomaAtual()
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
        <div className="copy-dialog details-dialog" role="dialog" aria-label={t('detalhes.acervo')}>
          <h2>{t('detalhes.acervo')}</h2>
          <dl className="details-list">
            {linhasDoAcervo(catalog, t, idioma).map(([label, value]) => (
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
            {t(copied === 'app' ? 'detalhes.copiado' : 'detalhes.copiarLinkApp')}
          </button>
          <button className="wikilink-box-open" onClick={() => copiar(rolo, 'rolo')}>
            {t(copied === 'rolo' ? 'detalhes.copiado' : 'detalhes.copiarLinkAcervoIA')}
          </button>
          <button className="copy-dialog-cancel" onClick={onClose}>
            {t('aparencia.fechar')}
          </button>
        </div>
      </>
    )
  }

  const permalink = `${window.location.origin}${window.location.pathname}#/livro/${encodeURIComponent(entry.id)}`

  const meta = parsed?.meta ?? {}
  const rows: [string, string][] = []
  const used = new Set<string>()
  for (const key of META_LABELS) {
    const v = formatValue(meta[key])
    used.add(key)
    if (v) rows.push([t(`campo.${key}`), v])
  }
  for (const [key, value] of Object.entries(meta)) {
    if (used.has(key) || key === 'id' || key === 'related') continue
    const v = formatValue(value)
    if (v) rows.push([key, v])
  }
  if (rows.length === 0) rows.push([t('campo.title'), entry.titulo], [t('campo.author'), entry.autor])
  if (parsed) rows.push([t('detalhes.tamanho'), formatBytes(parsed.bytes)])
  if (parsed?.headings.length) rows.push([t('detalhes.secoes'), String(parsed.headings.length)])
  rows.push([t('detalhes.caminho'), entry.arquivo])

  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="copy-dialog details-dialog" role="dialog" aria-label={t('detalhes.arquivo')}>
        <h2>{t('detalhes')}</h2>
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
              {t(copied === 'app' ? 'detalhes.copiado' : 'detalhes.copiarLink')}
            </button>
            {/* Dois links para a mesma obra, porque são dois leitores diferentes.
                O de cima abre no app, com tudo que o app tem. O de baixo é o rolo
                estático: texto escrito no HTML, que uma IA consegue ler ao buscar
                a URL — coisa que a rota #/livro/… não permite, por ser SPA. */}
            <button className="wikilink-box-open" onClick={() => copiar(roloUrl(entry.id), 'rolo')}>
              {t(copied === 'rolo' ? 'detalhes.copiado' : 'detalhes.copiarLinkIA')}
            </button>
          </>
        )}
        <button className="copy-dialog-cancel" onClick={onClose}>
          {t('aparencia.fechar')}
        </button>
      </div>
    </>
  )
}
