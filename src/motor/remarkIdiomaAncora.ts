// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkIdiomaAncora.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 1c027b839a0b42ba57fa32196f486493db77f61a5d543aa3b26f183f129fd09c
import { visit } from 'unist-util-visit'
import type { Root, Text, Parent } from 'mdast'
import { escritaDaAncora, ehRtl, type Escrita } from './idioma'

/**
 * Etiqueta de idioma no fim da linha, com a MESMA sintaxe da âncora de
 * passagem que o corpus já usa:
 *
 *     No princípio era o Verbo. ^por
 *     In the beginning was the Word. ^eng
 *     Ἐν ἀρχῇ ἦν ὁ λόγος. ^grc
 *
 * Por que reaproveitar o `^` em vez de inventar `<eng>`: o marcador já existe,
 * o parser já o retira do texto visível, e ele fica no FIM da linha, onde não
 * atrapalha quem abre o `.md` cru. Uma sintaxe nova no começo apareceria como
 * lixo em qualquer editor e quebraria a regra do parser burro (só três formas
 * de linha).
 *
 * QUANDO USAR. A detecção automática já acerta parágrafo normal — isto existe
 * para o que ela não resolve: linha curta, verso solto, palavra isolada, e
 * principalmente o interlinear, onde as linhas são curtas e alternam de língua
 * a cada uma. Marcar é sempre opcional.
 *
 * PRECEDÊNCIA. O que está escrito vence o que foi inferido: havendo etiqueta,
 * a detecção nem é consultada.
 *
 * CONVIVE COM O ENDEREÇO. A etiqueta é retirada primeiro, então uma linha pode
 * ter as duas: `texto ^gn-1-1 ^por`. Este plugin roda ANTES do
 * remarkBlockAnchors, que continua vendo a âncora de passagem intacta.
 */
const ETIQUETA_RE = /\s*\^([A-Za-z-]{2,6})\s*$/

/**
 * A linha sem a etiqueta de idioma do fim: `texto ^dn-2-5 ^arc` → `texto ^dn-2-5`.
 *
 * Para quem lê o MARKDOWN CRU, linha a linha, em vez da árvore (o índice de
 * busca e o copiar do app): a etiqueta vem DEPOIS do endereço, então quem
 * procura a âncora no fim da linha sem tirar a etiqueta antes acha `arc` no
 * lugar de `dn-2-5` — e o versículo perde o endereço sem que nada avise.
 */
export function semEtiquetaDeIdioma(linha: string): string {
  const m = ETIQUETA_RE.exec(linha)
  return m && escritaDaAncora(m[1]) ? linha.slice(0, m.index) : linha
}

/** O bloco abre por `**5**`: o número do versículo (o mesmo teste de remarkBlockAnchors). */
function abreComNumero(bloco: Parent): boolean {
  const primeiro = bloco.children[0] as { type?: string; children?: { type?: string; value?: string }[] }
  const unico = primeiro?.children?.length === 1 ? primeiro.children[0] : null
  return primeiro?.type === 'strong' && unico?.type === 'text' && /^\d+[a-z]?$/.test((unico.value ?? '').trim())
}

export function remarkIdiomaAncora() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== 'paragraph' && node.type !== 'heading') return
      const pai = node as Parent
      const ultimo = pai.children[pai.children.length - 1]
      if (!ultimo || ultimo.type !== 'text') return

      const texto = ultimo as Text
      const m = ETIQUETA_RE.exec(texto.value)
      if (!m) return

      const escrita: Escrita | null = escritaDaAncora(m[1])
      if (!escrita) return // âncora comum: é endereço, não idioma — deixa passar

      texto.value = texto.value.slice(0, m.index)
      if (!texto.value) pai.children.pop()

      const dados = (node.data ??= {})
      const props = ((dados as { hProperties?: Record<string, unknown> }).hProperties ??= {})
      /* O valor gravado é o próprio código da escrita: `escritaDaAncora` o
         reconhece de volta na hora de escolher a voz, e ele é BCP 47 válido,
         então navegador e leitor de tela também o entendem. */
      props.lang = escrita
      /* VERSÍCULO NUMERADO NÃO VIRA DE LADO (decisão do Διαφορεύς, 2026-10-10).
         Em `**5** texto ^dn-2-5 ^arc` o número fica à esquerda, como em todo o
         resto da Bíblia Hebraica do acervo, que não leva etiqueta: quem corre
         da direita para a esquerda é o run (remarkHebrew), não o parágrafo.
         Sem isto os capítulos aramaicos de Daniel saíam com o número do outro
         lado da página, no meio de um livro em que ele fica à esquerda. A
         linha solta (interlinear, verso, palavra isolada) continua virando. */
      if (ehRtl(escrita) && !abreComNumero(pai)) props.dir = 'rtl'
    })
  }
}
