// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkBlockAnchors.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 1a99af1d96cd22e20c49dfefdd9df7cb919a5a72731ea9635eaf0a231def918a
import { visit } from 'unist-util-visit'
import type { Root, Text } from 'mdast'

/**
 * Âncoras de bloco do corpus (^v1, ^gn-1-1, ^art5_cpt_inc2) no fim de
 * parágrafos: saem do texto visível e viram id do bloco — endereços canônicos
 * de versículo e de dispositivo de lei, navegáveis e alvo da busca canônica.
 *
 * O `_` entrou em 2026-11-13 para os endereços do LexML Brasil (Parte 3,
 * tabela 3), que separam os níveis com ele: `art5_cpt`, `art8_cpt_inc3`,
 * `art3_par1_inc9_ali1`, `art8-1_par1` (o 8º-A). Nada que valia deixou de
 * valer: só se acrescentou um sinal (LEI 6). O `_` nunca é idioma — a
 * etiqueta (remarkIdiomaAncora) só aceita letras e hífen — e o primeiro sinal
 * continua sendo letra ou número. Mesmo padrão que RX_ANCORA no
 * gerador_rolo.py (N3): mexeu num, mexa no outro.
 */
/** Exportado: copyBook.ts reaproveita para não vazar a âncora ao copiar
 * (o copiar lê o markdown fonte bruto, não a árvore já processada), e
 * searchIndex.ts, para achar a linha de cada endereço. */
export const ANCHOR_RE = /\s*\^([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/

/**
 * O rótulo do dispositivo de lei em negrito, no começo do parágrafo — o
 * `**5**` do versículo, na forma do texto jurídico. Com a âncora LexML no fim,
 * ele vira o lugar de tocar para copiar o link, como o número do versículo:
 *
 *     **Art. 5º** Todos são iguais perante a lei… ^art5_cpt
 *     **§ 1º** As normas definidoras…             ^art5_par1
 *     **Parágrafo único.** …                       ^art8-1_par1
 *     **II –** ninguém será obrigado…              ^art5_cpt_inc2
 *     **a)** …                                     ^art3_par1_inc9_ali1
 *     **1.** Todo ser humano tem capacidade…       ^art2_par1
 *
 * Aceita: `Art.`/`Artigo` + número, com ordinal (º ° o) e a letra do artigo
 * acrescido (`12-B`, `8º-A`); `§` + número, idem; `Parágrafo único`; romano
 * com meia-risca, travessão ou hífen (`II –`, `II -`); letra com parêntese
 * (`a)`); número com ponto (`1.`). Ponto final opcional; `ART.`, `ARTIGO` e
 * `PARÁGRAFO ÚNICO` em caixa alta também. O romano com traço é só maiúsculo,
 * para que uma palavra como «mix» não passe por número.
 * Os tratados (Marraqueche, a CDPD, a Convenção sobre os Direitos da Criança)
 * numeram de outro jeito, e o rótulo deles também é endereço: letra entre
 * parênteses (`(a)`), romano minúsculo entre parênteses (`(ii)`) ou só com o
 * de fechar (`iii)`), romano maiúsculo com parêntese (`VII)`, art. 40 da
 * Convenção sobre os Direitos da Criança) e número entre parênteses (`(12)`).
 * O romano com parêntese é só de i, v e x, até cinco letras: palavra comum
 * não passa.
 * O número puro (`**5**`) NÃO está aqui: é o versículo, testado à parte, e a
 * Bíblia fica exatamente como era. Mesmo padrão que RX_ROTULO_DISPOSITIVO no
 * gerador_rolo.py. Sinais fora do ASCII escritos com \u (N79).
 */
export const ROTULO_DISPOSITIVO_RE = new RegExp(
  '^(?:' +
    [
      '(?:Art\\.|ART\\.|Artigo|ARTIGO)\\s?\\d+(?:\\.?[\\u00ba\\u00b0o])?(?:-[A-Z])?\\.?', // Art. 5º · Art. 12-B · Artigo 1
      '\\u00a7\\s?\\d+(?:\\.?[\\u00ba\\u00b0o])?(?:-[A-Z])?\\.?', // § 1º · § 2º-A
      '(?:Par\\u00e1grafo \\u00fanico|PAR\\u00c1GRAFO \\u00daNICO)\\.?', // Parágrafo único
      '[IVXLCDM]+(?:-[A-Z])?\\s?[\\u2013\\u2014-]', // II – · II - · IV-A —
      '[a-z]\\)', // a)
      '\\d+\\.', // 1.
      '\\((?:[a-z]|[ivx]{2,5})\\)', // (a) · (ii) · (iv)
      '[ivx]{2,5}\\)', // ii) · iii) · iv)
      '[IVX]{1,5}\\)', // I) · II) · VII)
      '\\(\\d+\\)', // (1) · (12)
    ].join('|') +
    ')$',
  'u',
)

/** O negrito que abre o bloco é um endereço: número de versículo ou rótulo de dispositivo. */
function ehRotuloDeEndereco(texto: string): boolean {
  const t = texto.trim()
  return /^\d+[a-z]?$/.test(t) || ROTULO_DISPOSITIVO_RE.test(t)
}

export function remarkBlockAnchors() {
  return (tree: Root) => {
    visit(tree, ['paragraph', 'blockquote'], (node) => {
      const block = node as { children?: unknown[]; data?: Record<string, unknown> }
      if (!block.children?.length) return
      // A âncora fica no último text node do bloco (no blockquote,
      // dentro do último parágrafo)
      let holder = block
      const lastChild = block.children[block.children.length - 1] as {
        type?: string
        children?: unknown[]
      }
      if (node.type === 'blockquote' && lastChild?.type === 'paragraph') {
        holder = lastChild as typeof block
      }
      if (!holder.children?.length) return
      const last = holder.children[holder.children.length - 1] as Text
      if (last.type !== 'text') return
      const m = ANCHOR_RE.exec(last.value)
      if (!m) return

      last.value = last.value.slice(0, m.index).replace(/\s+$/, '')
      if (last.value === '') holder.children.pop()

      const data = (block.data ??= {})
      const hProperties = ((data.hProperties as Record<string, unknown>) ??= {})
      const id = `anchor-${m[1]}`
      hProperties.id = id
      data.hProperties = hProperties

      // O «1» que abre o versículo já É o endereço dele — só não era clicável.
      // Marcá-lo não altera o texto nem o que o copiar devolve (o copiar lê o
      // markdown fonte, não esta árvore): apenas dá ao Reader onde pendurar o
      // gesto de copiar o link da passagem. Só no parágrafo direto: no
      // blockquote o número mora na linha de cima, não neste bloco.
      // O rótulo do dispositivo de lei (`**Art. 5º**`, `**§ 1º**`, `**II –**`)
      // ganha o mesmo gesto e a mesma classe (2026-11-13): para o Reader, os
      // dois são «o endereço escrito no começo da passagem».
      if (node.type === 'paragraph') {
        const primeiro = block.children[0] as {
          type?: string
          children?: unknown[]
          data?: Record<string, unknown>
        }
        const unico = primeiro?.children?.length === 1 ? (primeiro.children[0] as Text) : null
        if (primeiro?.type === 'strong' && unico?.type === 'text' && ehRotuloDeEndereco(unico.value)) {
          const d = (primeiro.data ??= {})
          const hp = ((d.hProperties as Record<string, unknown>) ??= {})
          hp.className = ['verse-number']
          hp['data-anchor'] = id
          hp.title = 'Tocar para copiar o link desta passagem'
          d.hProperties = hp
        }
      }
    })
  }
}
