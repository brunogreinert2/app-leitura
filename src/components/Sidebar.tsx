import { useEffect, useMemo, useRef, useState } from 'react'
import { useDialogoAcessivel } from '../lib/useDialogoAcessivel'
import type { HeadingInfo, NameEntry } from '../lib/markdown'
import { useT } from './idiomaContext'
import { IconeAlfinete } from './IconeAlfinete'
import { GregaMeandro } from './GregaMeandro'

interface Props {
  headings: HeadingInfo[]
  /** Índice de nomes auto-gerado dos wikilinks (vazio = sem seção). */
  names: NameEntry[]
  open: boolean
  onClose: () => void
  onAppearance: () => void
  onDetails: () => void
  /** Fixar na bancada: só oferecido onde há espaço (ver useTelaLarga). */
  fixo?: boolean
  onAlternarFixo?: () => void
  /**
   * Ações que só existem com um livro aberto. Ausentes na tela da
   * biblioteca, onde este mesmo Ξ abriga só aparência e detalhes do acervo —
   * a barra do topo é a mesma nos dois lugares, o que ela oferece é que muda.
   */
  onNavigate?: (id: string) => void
  onCollapseAll?: () => void
  onExpandAll?: () => void
  onCopy?: () => void
  /** Baixa o .md fiel ao original (com YAML e âncoras) — ver Reader.baixarMd. */
  onDownload?: () => void
  /** Presente só para textos do usuário (o corpus é intocável). */
  onEdit?: () => void
  onSelectName?: (name: string) => void
  /** Seção sendo lida agora: ganha a barra à esquerda, como o livro aberto
      na biblioteca. Vem do Reader, por IntersectionObserver. */
  secaoAtual?: string
}

interface NoDoSumario {
  heading: HeadingInfo
  filhos: NoDoSumario[]
}

/**
 * Arvore do sumario, na hierarquia REAL do texto e sem teto de profundidade.
 *
 * O modelo antigo tinha dois andares: h1 e h2 eram irmaos no topo, e so h3 em
 * diante virava filho. Isso nao era criterio, era heranca de quando o app
 * assumia livros simples — e produzia coisas visivelmente erradas: no Genesis,
 * "# Genesis" e os 50 "## Capitulo" apareciam lado a lado, como se o livro
 * fosse irmao dos proprios capitulos, e nenhum tinha seta.
 *
 * O corpo do texto ja respeita a hierarquia inteira desde o trabalho dos 17
 * niveis (remarkDeepHeadings). O sumario era a peca fora do lugar.
 *
 * A pilha e o algoritmo todo: desempilha enquanto o topo for igual ou mais
 * fundo, e o que sobrar no topo e o pai. Vale para 3 niveis e para 17.
 */
function construirArvore(headings: HeadingInfo[]): NoDoSumario[] {
  const raiz: NoDoSumario[] = []
  const pilha: NoDoSumario[] = []
  for (const heading of headings) {
    const no: NoDoSumario = { heading, filhos: [] }
    while (pilha.length && pilha[pilha.length - 1].heading.depth >= heading.depth) pilha.pop()
    if (pilha.length) pilha[pilha.length - 1].filhos.push(no)
    else raiz.push(no)
    pilha.push(no)
  }
  return raiz
}

/** Ids de todo no que TEM filhos — os unicos que ganham seta. */
function idsComFilhos(nos: NoDoSumario[], fora: string[] = []): string[] {
  for (const n of nos) {
    if (n.filhos.length) {
      fora.push(n.heading.id)
      idsComFilhos(n.filhos, fora)
    }
  }
  return fora
}

export function Sidebar({
  headings,
  names,
  open,
  onClose,
  onNavigate,
  onCollapseAll,
  onExpandAll,
  onCopy,
  onDownload,
  onAppearance,
  onDetails,
  fixo,
  onAlternarFixo,
  onEdit,
  onSelectName,
  secaoAtual,
}: Props) {
  /* Painel SOBREPOSTO se comporta como dialogo: o foco entra ao abrir, Esc
     fecha e o foco volta ao botao. Painel FIXADO nao: ali ele faz parte do
     layout, e prender o foco dentro impediria de sair para o texto. */
  const caixaRef = useRef<HTMLElement>(null)
  useDialogoAcessivel(open && !fixo, onClose, caixaRef)
  const t = useT()
  const [namesOpen, setNamesOpen] = useState(false)
  const arvore = useMemo(() => construirArvore(headings), [headings])

  /* ABRE EXPANDIDO. Aninhar de verdade encolhe muito a lista — o Genesis
     inteiro vira uma linha —, mas cobraria um clique a mais justamente para
     chegar num capitulo, que e o gesto mais frequente de quem le a Biblia.
     Nascendo aberto, ganha-se a estrutura correta sem perder o caminho curto,
     e quem quiser o sumario limpo recolhe. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  useEffect(() => {
    setExpanded(new Set(idsComFilhos(arvore)))
  }, [arvore])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderNo = (no: NoDoSumario) => {
    const { heading, filhos } = no
    const aberto = expanded.has(heading.id)
    return (
      <li key={heading.id}>
        <div className="toc-row">
          <button
            /* A ESCALA VISUAL tem tres degraus (peso e cor), e isso NAO e um
               teto: a estrutura e o recuo seguem a profundidade real, sem
               limite. Mais de tres pesos numa lista vira ruido — o que diz
               "estou fundo" e o recuo, nao mais uma variacao de cinza. */
            className={`toc-item toc-nivel-${Math.min(heading.depth, 3)}${
              secaoAtual === heading.id ? ' toc-item-ativo' : ''
            }`}
            /* O RECUO VEM DA PROFUNDIDADE REAL, sem teto: era
               `Math.min(depth, 6)`, o mesmo teto de 6 que ja derrubamos no
               corpo do texto. As listas aninhadas nao somam recuo proprio,
               senao ele dobraria a cada nivel do DOM. */
            style={{ '--nivel': heading.depth } as React.CSSProperties}
            onClick={() => onNavigate?.(heading.id)}
            aria-current={secaoAtual === heading.id ? 'location' : undefined}
          >
            {heading.text}
          </button>
          {filhos.length > 0 && (
            <button
              className="toc-toggle"
              onClick={() => toggle(heading.id)}
              aria-expanded={aberto}
              aria-label={t(aberto ? 'sumario.recolherItem' : 'sumario.expandirItem', {
                nome: heading.text,
              })}
            >
              {aberto ? '▾' : '▸'}
            </button>
          )}
        </div>
        {filhos.length > 0 && aberto && (
          <ul className="toc-children">{filhos.map(renderNo)}</ul>
        )}
      </li>
    )
  }

  return (
    <>
      {/* Fixo não tem véu — mas quem o esconde é o CSS, dentro da media query
          de tela larga. Se a janela encolher e o painel deixar de caber ao
          lado, o véu reaparece sozinho e ele volta a ser uma sobreposição
          comum, com toque fora para fechar. Decidir isso aqui em JS deixaria
          o estado do React podendo discordar do CSS — e a discordância seria
          um painel cobrindo o texto sem como fechá-lo. */}
      {open && (
        <div
          className={`sidebar-backdrop${fixo ? ' veu-de-painel-fixo' : ''}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {/* `inert` quando fechado: o painel continua no DOM (a animacao de
          deslizar depende disso), mas sai do caminho do Tab e do leitor de
          tela. Sem isto, medido, 33 botoes de paineis FECHADOS ficavam
          tabulaveis — quem navega por teclado atravessava dezenas de controles
          invisiveis antes de chegar ao texto. `aria-hidden` sozinho nao tira do
          Tab; `inert` tira as duas coisas de uma vez. */}
      {/* FILETE DUPLO como elemento proprio, e nao pseudo do painel: o
          painel tem `overflow: auto`, e um pseudo-elemento posicionado
          fora da area de rolagem e RECORTADO — foi por isso que, fixado,
          o painel ficou sem separacao nenhuma. Fixo na tela, ele nao
          depende de quem rola. */}
      {fixo && <div className="filete-duplo filete-duplo-esq" aria-hidden="true" />}
      <nav
        className={`sidebar${open ? ' sidebar-open' : ''}${fixo ? ' painel-fixo' : ''}`}
        aria-label={t('sumario')}
        aria-hidden={!open}
        inert={!open}
        ref={caixaRef}
      >
        <GregaMeandro className="painel-grega" />
        {/* ESPELHADO em relacao a biblioteca: este painel encosta na borda
            direita, entao o alfinete vai para a borda INTERNA, junto ao Ξ que
            o abre. O gesto fica do mesmo lado do botao que o chamou. */}
        <div className="sidebar-header sidebar-header-direito">
          <h2>{t('sumario')}</h2>
          {onAlternarFixo && (
            <button
              className="painel-alfinete"
              onClick={onAlternarFixo}
              aria-pressed={!!fixo}
              aria-label={t(fixo ? 'painel.soltarSumario' : 'painel.fixarSumario')}
              title={t(fixo ? 'painel.soltarSumario' : 'painel.fixar')}
            >
              <IconeAlfinete />
            </button>
          )}
          <button className="sidebar-close" onClick={onClose} aria-label={t('sumario.fechar')}>
            ✕
          </button>
        </div>

        <button className="appearance-button" onClick={onAppearance}>
          <span aria-hidden="true">◐</span> {t('acao.aparencia')}
        </button>

        {/* UMA FAIXA POR PAR, e nao uma faixa com tudo dentro. Com os cinco
            botoes na mesma linha e `nowrap`, o sumario precisava de 547px num
            painel de 304px: a faixa rolava de lado e "COPIAR" saia cortado. */}
        <div className="toc-actions">
          {onCollapseAll && (
            <button className="toc-action" onClick={onCollapseAll} aria-label={t('sumario.recolherTudo')}>
              {t('acao.recolher')}
            </button>
          )}
          {onExpandAll && (
            <button className="toc-action" onClick={onExpandAll} aria-label={t('sumario.expandirTudo')}>
              {t('acao.expandir')}
            </button>
          )}
        </div>

        {(onCopy || onDownload) && (
          <div className="toc-actions">
            {onCopy && (
              <button className="toc-action" onClick={onCopy} aria-label={t('sumario.copiarLivro')}>
                {t('acao.copiar')}
              </button>
            )}
            {onDownload && (
              <button className="toc-action" onClick={onDownload} aria-label={t('sumario.baixar')}>
                {t('acao.baixar')}
              </button>
            )}
          </div>
        )}

        <div className="toc-actions">
          <button
            className="toc-action toc-action-larga toc-action-destaque"
            onClick={onDetails}
            aria-label={t('sumario.detalhes')}
          >
            {t('acao.detalhes')}
          </button>
        </div>

        {/* A faixa so existe quando ha o que editar. Vazia, ela continuava
            desenhando a propria borda de baixo, que somava com a da faixa do
            DETALHES — e a linha sob DETALHES saia com o dobro da espessura. */}
        {onEdit && (
          <div className="toc-actions">
            <button className="toc-action toc-action-larga" onClick={onEdit}>
              {t('acao.editar')}
            </button>
          </div>
        )}

        {/* O TITULO DO LIVRO DESCE para junto dos outros titulos. Ele ficava
            acima das acoes, logo abaixo de APARENCIA — no meio do menu, longe
            do sumario a que pertence. Titulo e titulo: mora com os seus. */}
        <ul className="toc">
          {arvore.map(renderNo)}

          {names.length > 0 && (
            <li>
              <div className="toc-row">
                <button className="toc-item toc-depth-2" onClick={() => setNamesOpen((v) => !v)}>
                  {t('sumario.indiceDeNomes')}
                </button>
                <button
                  className="toc-toggle"
                  onClick={() => setNamesOpen((v) => !v)}
                  aria-expanded={namesOpen}
                  aria-label={t(namesOpen ? 'sumario.recolherNomes' : 'sumario.expandirNomes')}
                >
                  {namesOpen ? '▾' : '▸'}
                </button>
              </div>
              {namesOpen && (
                <ul className="toc-children">
                  {names.map(({ name, count }) => (
                    <li key={name}>
                      <button className="toc-item toc-depth-3" onClick={() => onSelectName?.(name)}>
                        {name} <span className="toc-name-count">({count})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
