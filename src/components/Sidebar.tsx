import { useRef, useState } from 'react'
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
}

interface TocGroup {
  heading: HeadingInfo
  children: HeadingInfo[]
}

/** Agrupa: h1/h2 são entradas de topo; h3+ aninham sob o h2 anterior. */
function buildGroups(headings: HeadingInfo[]): TocGroup[] {
  const groups: TocGroup[] = []
  for (const h of headings) {
    if (h.depth <= 2 || groups.length === 0) {
      groups.push({ heading: h, children: [] })
    } else {
      groups[groups.length - 1].children.push(h)
    }
  }
  return groups
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
}: Props) {
  /* Painel SOBREPOSTO se comporta como dialogo: o foco entra ao abrir, Esc
     fecha e o foco volta ao botao. Painel FIXADO nao: ali ele faz parte do
     layout, e prender o foco dentro impediria de sair para o texto. */
  const caixaRef = useRef<HTMLElement>(null)
  useDialogoAcessivel(open && !fixo, onClose, caixaRef)
  const t = useT()
  const [namesOpen, setNamesOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const groups = buildGroups(headings)

  // Título do livro (h1) fica acima das ações; seções/capítulos abaixo
  const titleGroup = groups.length && groups[0].heading.depth === 1 ? groups[0] : null
  const sectionGroups = titleGroup ? groups.slice(1) : groups

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const renderGroup = ({ heading, children }: TocGroup) => (
    <li key={heading.id}>
      <div className="toc-row">
        <button
          className={`toc-item toc-depth-${Math.min(heading.depth, 6)}`}
          onClick={() => onNavigate?.(heading.id)}
        >
          {heading.text}
        </button>
        {children.length > 0 && (
          <button
            className="toc-toggle"
            onClick={() => toggle(heading.id)}
            aria-expanded={expanded.has(heading.id)}
            aria-label={
              t(expanded.has(heading.id) ? 'sumario.recolherItem' : 'sumario.expandirItem', {
                nome: heading.text,
              })
            }
          >
            {expanded.has(heading.id) ? '▾' : '▸'}
          </button>
        )}
      </div>
      {children.length > 0 && expanded.has(heading.id) && (
        <ul className="toc-children">
          {children.map((child) => (
            <li key={child.id}>
              <button
                className={`toc-item toc-depth-${Math.min(child.depth, 6)}`}
                onClick={() => onNavigate?.(child.id)}
              >
                {child.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )

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

        <div className="toc-actions">
          {onEdit && (
            <button className="toc-action toc-action-larga" onClick={onEdit}>
              {t('acao.editar')}
            </button>
          )}
        </div>

        {/* O TITULO DO LIVRO DESCE para junto dos outros titulos. Ele ficava
            acima das acoes, logo abaixo de APARENCIA — no meio do menu, longe
            do sumario a que pertence. Titulo e titulo: mora com os seus. */}
        <ul className="toc">
          {titleGroup && renderGroup(titleGroup)}
          {sectionGroups.map(renderGroup)}

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
