// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkWikilinks.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 8b0d5fad4d57f7aa7725f948691cd24353cc3d49cc7c815427958bcdba793b14
import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * Wikilinks: [[Alvo]], [[Alvo|texto exibido]], [[Alvo#Seção]], [[#Seção]]
 * e o embed do Obsidian, ![[arquivo]].
 *
 * [[Alvo]] vira <span class="wikilink" data-target="Alvo"> — recurso opcional
 * por arquivo: presença habilita preview/índice de nomes, ausência não quebra
 * nada. O índice de nomes (markdown.tsx) é feito de data-target; por isso:
 *
 * - SEÇÃO. Em [[República#Livro I]] o alvo é "República", e a seção vai à
 *   parte (data-secao). Antes o alvo inteiro, "República#Livro I", entrava no
 *   índice como se fosse um personagem — achado pela tortura (caso 06).
 *   Sem apelido, mostra "República › Livro I", como o Obsidian.
 *   [[#Seção]] é link para dentro do próprio texto: mostra "Seção" e não
 *   entra no índice (não há alvo).
 * - EMBED. ![[mapa.png]] é "ponha aqui o arquivo", não "fale desta pessoa".
 *   Antes virava "!" + wikilink e o arquivo entrava no índice de nomes
 *   (caso 29). Agora é <span class="embed embed-imagem|embed-nota"> com o
 *   nome — o leitor ainda não tem o arquivo para pôr no lugar, e o certo,
 *   pelo anel da Rede, é mostrar o que era em vez de sumir.
 */
const WIKILINK_RE = /(!?)\[\[([^\][|]+)(?:\|([^\][]+))?\]\]/g
const EXTENSAO_DE_IMAGEM = /\.(png|jpe?g|gif|svg|webp|avif|bmp)$/i

function no(className: string[], propriedades: Record<string, string>, texto: string): PhrasingContent {
  return {
    type: 'wikilink',
    data: {
      hName: 'span',
      hProperties: { className, ...propriedades },
      hChildren: [{ type: 'text', value: texto }],
    },
  } as unknown as PhrasingContent
}

export function remarkWikilinks() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return
      WIKILINK_RE.lastIndex = 0
      if (!WIKILINK_RE.test(node.value)) return

      const parts: PhrasingContent[] = []
      let last = 0
      WIKILINK_RE.lastIndex = 0
      for (const m of node.value.matchAll(WIKILINK_RE)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) })
        const [, exclamacao, bruto, apelido] = m
        const cheio = bruto.trim()

        if (exclamacao) {
          const tipo = EXTENSAO_DE_IMAGEM.test(cheio) ? 'embed-imagem' : 'embed-nota'
          parts.push(no(['embed', tipo], { dataEmbed: cheio }, (apelido ?? cheio).trim()))
        } else {
          const cerquilha = cheio.indexOf('#')
          const alvo = (cerquilha < 0 ? cheio : cheio.slice(0, cerquilha)).trim()
          const secao = cerquilha < 0 ? '' : cheio.slice(cerquilha + 1).trim()
          const rotulo = apelido?.trim() ?? (alvo && secao ? `${alvo} › ${secao}` : alvo || secao)
          if (alvo) {
            parts.push(no(['wikilink'], secao ? { dataTarget: alvo, dataSecao: secao } : { dataTarget: alvo }, rotulo))
          } else {
            // [[#Seção]]: dentro do próprio texto, sem alvo para o índice
            parts.push(no(['wikilink', 'wikilink-interno'], { dataSecao: secao }, rotulo))
          }
        }
        last = m.index + m[0].length
      }
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) })

      parent.children.splice(index, 1, ...parts)
      return index + parts.length
    })
  }
}
