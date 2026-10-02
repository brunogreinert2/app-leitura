// MOTOR DO ECOSSISTEMA — cópia gerada, NÃO EDITE AQUI.
// Fonte: C:\Claude\parser\motor\remarkImagemPorId.ts
// Para mudar: edite a fonte e rode `npm run espalhar` em C:\Claude\parser.
// sha256: 36a8d98bf9fd6d10b2504150291fbca9347aa4ff560eea6b18e4862987296540
import type { Root, Paragraph, Image } from 'mdast'
import type { VFile } from 'vfile'
import { visit } from 'unist-util-visit'

/**
 * {{img:id}} sozinho na linha — a imagem do N9: o arquivo, a descrição e a
 * licença ficam declarados no front matter; no texto, só o id. Nasceu no
 * Historinhas e vale no ecossistema inteiro (N7).
 *
 *     assets:
 *       - id: fig1
 *         arquivo: imagens/fig1.png          (ou file:, src:)
 *         descricao: Mapa do Pireu           (ou description:, alt:)
 *
 * O front matter chega por `file.data.meta` (quem chama o processador o põe
 * lá: no Pedra Angular, o parseBook). Os nomes dos campos são aceitos em
 * português e em inglês: o Historinhas escreve em português, o esquema do
 * acervo pede inglês, e o formato é um só.
 *
 * Id que não está declarado NÃO some: o {{img:id}} continua escrito na tela
 * (anel da Rede), e quem lê vê que falta uma imagem ali.
 */
const RX_LINHA = /^\{\{img:([\w-]+)\}\}$/

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

export function remarkImagemPorId() {
  return (tree: Root, file: VFile) => {
    const meta = (file?.data as { meta?: { assets?: unknown } } | undefined)?.meta
    const lista = Array.isArray(meta?.assets) ? (meta.assets as Asset[]) : []
    const porId = new Map(lista.filter((a) => texto(a?.id)).map((a) => [texto(a.id)!, a]))

    visit(tree, 'paragraph', (p: Paragraph) => {
      if (p.children.length !== 1 || p.children[0].type !== 'text') return
      const m = RX_LINHA.exec(p.children[0].value.trim())
      if (!m) return
      const asset = porId.get(m[1])
      const src = asset && (texto(asset.arquivo) ?? texto(asset.file) ?? texto(asset.src) ?? texto(asset.arquivo_interativo))
      if (!src) return // não declarado: fica escrito
      const imagem: Image = {
        type: 'image',
        url: src,
        alt: texto(asset.descricao) ?? texto(asset.description) ?? texto(asset.alt) ?? '',
      }
      p.children = [imagem]
    })
  }
}
