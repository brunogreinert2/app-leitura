/**
 * "Como citar" uma obra — o MESMO texto e o MESMO BibTeX que o rolo escreve no
 * topo de cada página (`como_citar` em scripts/rolo/gerador_rolo.py). Mexeu num,
 * mexa no outro: uma obra citada de dois jeitos é pior que citada de um só.
 *
 * A versão do acervo vem do CITATION.cff da raiz, lido no build — o mesmo
 * arquivo que o gerador do rolo, o GitHub e o Zenodo leem.
 *
 * O app é bilíngue: em português a citação é idêntica à do rolo; em inglês,
 * as mesmas partes na mesma ordem, com as palavras em inglês. Os dados (autor,
 * título, URN, endereço) não se traduzem — são os do arquivo.
 */
import cff from '../../CITATION.cff?raw'
import { roloUrl } from './rolo'
import type { Idioma } from './i18n'

const PALAVRAS = {
  pt: { traducao: 'Tradução de', edicao: 'Edição de', org: 'org.', versao: 'versão',
        disponivel: 'Disponível em', acesso: 'Acesso em: [data do acesso]' },
  en: { traducao: 'Translated by', edicao: 'Edited by', org: 'ed.', versao: 'version',
        disponivel: 'Available at', acesso: 'Accessed: [access date]' },
} as const

export const VERSAO_ACERVO = (cff.match(/^version:\s*"?([\w.-]+)/m) ?? [])[1] ?? ''

function nomes(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join('; ')
  return v == null ? '' : String(v)
}

export function comoCitar(
  meta: Record<string, unknown>,
  id: string,
  idioma: Idioma = 'pt',
): { texto: string; bibtex: string } {
  const w = PALAVRAS[idioma]
  const autor = nomes(meta.author)
  const titulo = String(meta.title ?? id)
  const url = roloUrl(id)
  const urn = meta.urn ? String(meta.urn) : ''
  const resp: string[] = []
  if (meta.translator) resp.push(`${w.traducao} ${nomes(meta.translator)}`)
  if (meta.editor) resp.push(`${w.edicao} ${nomes(meta.editor)}`)
  const versao = VERSAO_ACERVO ? `, ${w.versao} ${VERSAO_ACERVO}` : ''
  const texto =
    (autor ? `${autor.toUpperCase()}. ` : '') +
    `${titulo}. ` +
    resp.map((r) => `${r}. `).join('') +
    `Pedra Angular (${w.org} Διαφορεύς)${versao}. ` +
    (urn ? `URN: ${urn}. ` : '') +
    `${w.disponivel}: ${url}. ${w.acesso}.`
  const campos: [string, string][] = [
    ['author', autor],
    ['title', titulo],
    ['note', [...resp, ...(urn ? [`URN ${urn}`] : [])].join('; ')],
    ['howpublished', `Pedra Angular (${w.org} Διαφορεύς)${versao}`],
    ['url', url],
    ['urldate', ''],
  ]
  const bibtex =
    `@misc{pa-${id},\n` +
    campos.filter(([k, v]) => v || k === 'urldate').map(([k, v]) => `  ${k} = {${v}}`).join(',\n') +
    '\n}'
  return { texto, bibtex }
}
