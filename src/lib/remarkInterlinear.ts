import type { Code, Paragraph, Root, Text } from 'mdast'

/**
 * Bloco interlinear opt-in (```interlinear): cada linha do arquivo
 * fonte vira seu próprio parágrafo, sem fundir mesmo sem linha em
 * branco entre elas — pensado pra hebraico/transliteração/grego/latim/
 * português empilhados por versículo, colados direto de um chat de IA
 * sem precisar editar (CommonMark comum funde linhas soltas num só
 * parágrafo; aqui isso é desligado só dentro da cerca).
 *
 * Aditivo, não substitui nada: fora do bloco, o resto do arquivo
 * continua CommonMark estrito — parágrafos fundem normalmente.
 *
 * Precisa rodar ANTES de remarkBlockAnchors/remarkWikilinks/
 * remarkMarkers/remarkHebrew: os parágrafos criados aqui têm texto
 * puro, e são essas outras passagens (visitantes genéricos de nó
 * 'text') que os processam depois — exatamente como fariam com
 * qualquer parágrafo escrito à mão.
 */
export function remarkInterlinear() {
  return (tree: Root) => {
    let i = 0
    while (i < tree.children.length) {
      const node = tree.children[i]
      if (node.type !== 'code' || (node as Code).lang !== 'interlinear') {
        i++
        continue
      }
      const lines = (node as Code).value.split('\n').filter((l) => l.trim() !== '')
      const paragraphs: Paragraph[] = lines.map((line) => ({
        type: 'paragraph',
        children: [{ type: 'text', value: line } satisfies Text],
      }))
      tree.children.splice(i, 1, ...paragraphs)
      i += paragraphs.length
    }
  }
}
