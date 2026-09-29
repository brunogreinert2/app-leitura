import type { Code, Paragraph, Root } from 'mdast'

/**
 * Citação em verso (```verso, decisão D3 do Saneamento, 2026-09-29): o bloco
 * vira UM parágrafo com a quebra de cada linha preservada (o `white-space:
 * pre-line` de .reader-body p já a desenha) e a classe `verso`, que o recua
 * como a página impressa. Irmão do remarkInterlinear, e pelo mesmo motivo
 * roda antes dos visitantes de texto: o parágrafo criado aqui é texto puro,
 * e marcador, âncora e idioma o processam depois como qualquer outro.
 *
 * O rolo faz o mesmo em scripts/rolo/gerador_rolo.py (RX_VERSO_BLOCO): mesma
 * entrada, mesma saída nas duas camadas.
 */
export function remarkVerso() {
  return (tree: Root) => {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i]
      if (node.type !== 'code' || (node as Code).lang !== 'verso') continue
      const linhas = (node as Code).value.split('\n').filter((l) => l.trim() !== '')
      const paragrafo: Paragraph = {
        type: 'paragraph',
        data: { hProperties: { className: ['verso'] } },
        children: [{ type: 'text', value: linhas.join('\n') }],
      }
      tree.children.splice(i, 1, paragrafo)
    }
  }
}
