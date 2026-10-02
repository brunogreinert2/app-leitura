// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkImagemPorId.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 68f85f59d43fa8cdf77d890209fe85bbb543cae701a86a0e6fd1505f926080b4
import type { Root, Paragraph, PhrasingContent, Image, RootContent } from 'mdast'
import type { VFile } from 'vfile'

/**
 * {{img:id}} sozinho na LINHA — a imagem do N9: o arquivo, a descrição e a
 * licença ficam declarados no front matter; no texto, só o id. Nasceu no
 * Historinhas e vale no ecossistema inteiro (N7).
 *
 *     assets:
 *       - id: fig1
 *         arquivo: imagens/fig1.png          (ou file:, src:, arquivo_interativo:)
 *         descricao: Mapa do Pireu           (ou description:, alt:)
 *
 * NA LINHA, NÃO NO PARÁGRAFO. "antes\n{{img:x}}\ndepois", sem linha em
 * branco, é um parágrafo só para o CommonMark — e a imagem sumiria dentro
 * dele. O parser de três regras do Historinhas sempre separou a linha da
 * imagem, e os livrinhos contam com isso: aqui o parágrafo é partido em
 * três (antes, imagem, depois).
 *
 * O parágrafo da imagem leva data-img="id", declarada ou não: é por ele que
 * o Historinhas monta o cartão de pintar/quebra-cabeça (ele precisa do id,
 * não do arquivo). Declarada, vira <img>; não declarada, NÃO some — o
 * {{img:id}} continua escrito na tela (anel da Rede).
 *
 * O front matter chega por `file.data.meta` (quem chama o processador o põe
 * lá). Os nomes dos campos são aceitos em português e em inglês: o
 * Historinhas escreve em português, o esquema do acervo pede inglês, e o
 * formato é um só.
 */
const RX_LINHA = /^[ \t]*\{\{img:([\w-]+)\}\}[ \t]*$/

interface Asset {
  id?: unknown
  arquivo?: unknown
  file?: unknown
  src?: unknown
  arquivo_interativo?: unknown
  descricao?: unknown
  description?: unknown
  alt?: unknown
}

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** Parte os filhos de um parágrafo nas linhas que são só {{img:id}}. */
function partir(p: Paragraph): (PhrasingContent[] | string)[] {
  const pedacos: (PhrasingContent[] | string)[] = []
  let atual: PhrasingContent[] = []
  const fechar = () => {
    // aparas das quebras de linha que sobram nas pontas
    const primeiro = atual[0]
    if (primeiro?.type === 'text') primeiro.value = primeiro.value.replace(/^\n+/, '')
    const ultimo = atual[atual.length - 1]
    if (ultimo?.type === 'text') ultimo.value = ultimo.value.replace(/\n+$/, '')
    const util = atual.filter((n) => n.type !== 'text' || n.value !== '')
    if (util.length) pedacos.push(util)
    atual = []
  }
  for (const filho of p.children) {
    if (filho.type !== 'text' || !filho.value.includes('{{img:')) {
      atual.push(filho)
      continue
    }
    const linhas = filho.value.split('\n')
    let resto: string[] = []
    linhas.forEach((linha, i) => {
      const m = RX_LINHA.exec(linha)
      // só vale se a linha começa no começo do parágrafo ou depois de uma
      // quebra, e termina numa quebra ou no fim: senão é texto no meio da frase
      const inicioDeLinha = i > 0 || atual.length === 0
      const fimDeLinha = i < linhas.length - 1 || filho === p.children[p.children.length - 1]
      if (m && inicioDeLinha && fimDeLinha) {
        if (resto.length) atual.push({ type: 'text', value: resto.join('\n') })
        resto = []
        fechar()
        pedacos.push(m[1])
      } else {
        resto.push(linha)
      }
    })
    if (resto.length) atual.push({ type: 'text', value: resto.join('\n') })
  }
  fechar()
  return pedacos
}

export function remarkImagemPorId() {
  return (tree: Root, file: VFile) => {
    const meta = (file?.data as { meta?: { assets?: unknown } } | undefined)?.meta
    const lista = Array.isArray(meta?.assets) ? (meta.assets as Asset[]) : []
    const porId = new Map(lista.filter((a) => texto(a?.id)).map((a) => [texto(a.id)!, a]))

    const paragrafoDaImagem = (id: string): Paragraph => {
      const asset = porId.get(id)
      const src =
        asset && (texto(asset.arquivo) ?? texto(asset.file) ?? texto(asset.src) ?? texto(asset.arquivo_interativo))
      const conteudo: PhrasingContent = src
        ? ({
            type: 'image',
            url: src,
            alt: texto(asset.descricao) ?? texto(asset.description) ?? texto(asset.alt) ?? '',
          } satisfies Image)
        : { type: 'text', value: `{{img:${id}}}` } // não declarada: fica escrita
      return { type: 'paragraph', children: [conteudo], data: { hProperties: { dataImg: id } } }
    }

    const visitar = (pai: { children: RootContent[] }) => {
      for (let i = 0; i < pai.children.length; i++) {
        const no = pai.children[i]
        if (no.type === 'paragraph') {
          if (!no.children.some((c) => c.type === 'text' && c.value.includes('{{img:'))) continue
          const pedacos = partir(no)
          if (!pedacos.some((x) => typeof x === 'string')) continue
          const novos: Paragraph[] = pedacos.map((x) =>
            typeof x === 'string' ? paragrafoDaImagem(x) : { type: 'paragraph', children: x },
          )
          pai.children.splice(i, 1, ...novos)
          i += novos.length - 1
        } else if ('children' in no) {
          visitar(no as { children: RootContent[] })
        }
      }
    }
    visitar(tree)
  }
}
