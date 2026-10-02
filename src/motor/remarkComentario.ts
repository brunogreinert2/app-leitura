// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkComentario.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 1399fe83a29809a19e9f8dff17f584e6536e8a64790d52de223112dfab767293
import type { Root, Parent, Text, RootContent } from 'mdast'
import { visit, SKIP } from 'unist-util-visit'

/**
 * Comentário do Obsidian: %%isto não aparece na leitura%%.
 *
 * Dois jeitos, como lá:
 *   - na linha: "Antes %%nota do autor%% depois." → "Antes  depois.";
 *   - em bloco: um parágrafo que ABRE com %% e outro, adiante, que FECHA
 *     com %% — tudo entre eles some, inclusive os parágrafos do meio.
 *
 * A REGRA DE OURO VALE AQUI DO AVESSO: esconder é o único recurso do motor
 * que tira texto da tela, então só esconde o que está FECHADO. Um %% sem par
 * fica visível — um sinal perdido nunca pode engolir o resto do livro.
 * Código (`%%` dentro de crase ou de bloco ```) não é texto: não é tocado.
 *
 * Roda antes dos outros visitantes de texto: o que está comentado não deve
 * pôr nome no índice nem âncora no texto.
 */
const NA_LINHA = /%%[\s\S]*?%%/g

/** Texto todo de um bloco (para saber se abre ou fecha com %%). */
function textoDe(no: RootContent): string {
  if (no.type === 'text') return no.value
  if ('children' in no) return (no.children as RootContent[]).map(textoDe).join('')
  return ''
}

function tirarBlocos(pai: Parent) {
  const filhos = pai.children as RootContent[]
  for (let i = 0; i < filhos.length; i++) {
    const abre = filhos[i]
    if (abre.type !== 'paragraph') continue
    const t = textoDe(abre).trim()
    // abre com %% e não fecha no mesmo parágrafo
    if (!t.startsWith('%%') || (t.length > 2 && t.endsWith('%%')) || (t.match(/%%/g) ?? []).length !== 1) continue
    const fim = filhos.findIndex((f, j) => j > i && f.type === 'paragraph' && textoDe(f).trim().endsWith('%%'))
    if (fim < 0) continue // sem par: fica visível
    filhos.splice(i, fim - i + 1)
    i--
  }
}

export function remarkComentario() {
  return (tree: Root) => {
    tirarBlocos(tree)
    visit(tree, (no) => {
      if ('children' in no && no.type !== 'root') tirarBlocos(no as Parent)
    })
    // Só os parágrafos que o COMENTÁRIO esvaziou saem. Um parágrafo que já
    // chegou vazio fica como está: o motor não esconde o que não escondeu —
    // achado da comparação dos 1110 livros (três ```verso vazios no acervo).
    const esvaziados = new Set<unknown>()
    visit(tree, 'text', (no: Text, indice, pai) => {
      if (!pai || indice === undefined || !no.value.includes('%%')) return
      const limpo = no.value.replace(NA_LINHA, '')
      if (limpo === no.value) return
      no.value = limpo
      if (pai.type === 'paragraph' && pai.children.every((c) => c.type === 'text' && c.value.trim() === ''))
        esvaziados.add(pai)
      return SKIP
    })
    if (esvaziados.size)
      visit(tree, 'paragraph', (p, indice, pai) => {
        if (!pai || indice === undefined || !esvaziados.has(p)) return
        pai.children.splice(indice, 1)
        return [SKIP, indice]
      })
  }
}
