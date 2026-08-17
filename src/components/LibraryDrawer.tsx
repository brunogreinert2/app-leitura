import { useRef, useState } from 'react'
import { useDialogoAcessivel } from '../lib/useDialogoAcessivel'
import type { Catalog as CatalogData, CatalogEntry } from '../types'
import { LibraryTree } from './LibraryTree'
import { IconeAlfinete } from './IconeAlfinete'
import { useT } from './idiomaContext'

interface Props {
  catalog: CatalogData | null
  open: boolean
  onClose: () => void
  onSelect: (entry: CatalogEntry) => void
  /** Importa .md/.txt do aparelho para o IndexedDB. */
  onAddFiles: (files: File[]) => void
  onRemoveLocal: (entry: CatalogEntry) => void
  /** Abre o editor para digitar/colar um texto novo. */
  onNewText: () => void
  /** Baixa tema, fontes, memória de leitura e textos próprios num .json. */
  onExportData: () => void
  /** Restaura um .json exportado anteriormente (deste ou de outro aparelho). */
  onImportData: (file: File) => void
  /** Força checar se há versão nova do app agora, sem esperar a checagem automática. */
  onCheckUpdate: () => void
  /** Fixar na bancada: só oferecido onde há espaço (ver useTelaLarga). */
  fixo?: boolean
  onAlternarFixo?: () => void
}

export function LibraryDrawer({
  catalog,
  open,
  onClose,
  onSelect,
  onAddFiles,
  onRemoveLocal,
  onNewText,
  onExportData,
  onImportData,
  onCheckUpdate,
  fixo,
  onAlternarFixo,
}: Props) {
  /* Painel SOBREPOSTO se comporta como dialogo: o foco entra ao abrir, Esc
     fecha e o foco volta ao botao. Painel FIXADO nao: ali ele faz parte do
     layout, e prender o foco dentro impediria de sair para o texto. */
  const caixaRef = useRef<HTMLElement>(null)
  useDialogoAcessivel(open && !fixo, onClose, caixaRef)
  const t = useT()
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)

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
      <nav
        className={`library-drawer${open ? ' library-drawer-open' : ''}${fixo ? ' painel-fixo' : ''}`}
        aria-label={t('biblioteca')}
        aria-hidden={!open}
        inert={!open}
        ref={caixaRef}
      >
        <div className="sidebar-header">
          <h2>{t('biblioteca')}</h2>
          {onAlternarFixo && (
            <button
              className="painel-alfinete"
              onClick={onAlternarFixo}
              aria-pressed={!!fixo}
              aria-label={t(fixo ? 'painel.soltarBiblioteca' : 'painel.fixarBiblioteca')}
              title={t(fixo ? 'painel.soltarBiblioteca' : 'painel.fixar')}
            >
              <IconeAlfinete />
            </button>
          )}
          <button className="sidebar-close" onClick={onClose} aria-label={t('biblioteca.fechar')}>
            ✕
          </button>
        </div>
        <div className="lib-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('biblioteca.pesquisarDica')}
            aria-label={t('biblioteca.pesquisar')}
          />
        </div>
        <div className="lib-import">
          <button className="toc-action" onClick={() => fileInputRef.current?.click()}>
            {t('biblioteca.adicionar')}
          </button>
          <button className="toc-action" onClick={onNewText}>
            {t('biblioteca.novoTexto')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            multiple
            hidden
            onChange={(e) => {
              // FileList é "viva": copia ANTES de limpar o campo,
              // senão a leitura assíncrona encontra a lista vazia
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) onAddFiles(files)
            }}
          />
        </div>
        <div className="lib-import">
          <button className="toc-action" onClick={onExportData}>
            {t('biblioteca.exportar')}
          </button>
          <button className="toc-action" onClick={() => backupInputRef.current?.click()}>
            {t('biblioteca.importar')}
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onImportData(file)
            }}
          />
        </div>
        <div className="lib-import">
          <button className="toc-action" onClick={onCheckUpdate}>
            {t('biblioteca.verificarAtualizacao')}
          </button>
        </div>
        {!catalog && <p className="lib-empty">{t('biblioteca.carregando')}</p>}
        {catalog && (
          <LibraryTree
            entries={catalog.livros}
            onSelect={onSelect}
            onRemove={onRemoveLocal}
            query={query}
          />
        )}
      </nav>
    </>
  )
}
