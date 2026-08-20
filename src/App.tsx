import { useEffect, useMemo, useRef, useState } from 'react'
import { Catalog } from './components/Catalog'
import { Reader, invalidateBookCache } from './components/Reader'
import {
  useSoltarArquivos,
  useArquivosDoSistema,
  useArquivosCompartilhados,
} from './lib/useSoltarArquivos'
import { TextEditor } from './components/TextEditor'
import { LibraryDrawer } from './components/LibraryDrawer'
import {
  ThemeDialog,
  useTheme,
  useFontFamily,
  usePesoTraco,
  useEspacamento,
  useEntrelinha,
} from './components/ThemeDialog'
import { Sidebar } from './components/Sidebar'
import { DetailsDialog } from './components/DetailsDialog'
import { useFontSize } from './components/FontControls'
import { buildPersonRegistry } from './lib/persons'
import {
  addLocalFiles,
  getLocalFile,
  listLocalFiles,
  removeLocalFile,
  saveLocalText,
  type LocalFile,
} from './lib/localFiles'
import { loadLastBook } from './lib/bookState'
import { useAppUpdate } from './lib/useAppUpdate'
import { exportBackup, importBackup } from './lib/backup'
import { useTelaLarga, useCabemDoisPaineis, usePaineisFixos } from './lib/useTelaLarga'
import { useIdioma } from './lib/i18n'
import { usePersistencia } from './lib/usePersistencia'
import { useCicloDeRegioes } from './lib/useCicloDeRegioes'
import { IdiomaContext } from './components/idiomaContext'
import type { Catalog as CatalogData, CatalogEntry, PersonManifest } from './types'

/** O app abre lendo: guia de boas-vindas como primeiro texto ativo. */
/**
 * O guia é documentação do APP entregue como arquivo de corpus. Por isso ele
 * traduz — mas mantendo o id `impressoes-app`, que é publicado e citável: o
 * endereço não muda, só o arquivo servido. Tradução de OBRA continua sendo
 * obra nova com id próprio; isto aqui é interface em forma de texto.
 */
function guiaDoIdioma(idioma: string, t: (c: 'guia.titulo' | 'guia.autor') => string): CatalogEntry {
  return {
    id: 'impressoes-app',
    titulo: t('guia.titulo'),
    autor: t('guia.autor'),
    arquivo: idioma === 'en' ? 'IMPRESSOES_APP.en.md' : 'IMPRESSOES_APP.md',
  }
}

/**
 * "Sobre este projeto" segue a mesma regra do guia: e documentacao do APP
 * entregue como arquivo de corpus, entao traduz — mantendo o id, que e
 * publicado e citavel. E o texto vive no acervo, e nao numa tela propria, por
 * um motivo pratico: quem chega nele para descobrir qual ajuste lhe serve
 * consegue TESTAR os ajustes ali mesmo, lendo a pagina que os explica.
 */
export const SOBRE_ID = 'sobre-o-projeto'

export function sobreDoIdioma(idioma: string): CatalogEntry {
  return {
    id: SOBRE_ID,
    titulo: idioma === 'en' ? 'About this project' : 'Sobre este projeto',
    autor: 'Pedra Angular',
    arquivo: idioma === 'en' ? 'SOBRE_O_PROJETO.en.md' : 'SOBRE_O_PROJETO.md',
  }
}

const WELCOME_ENTRY: CatalogEntry = {
  id: 'impressoes-app',
  titulo: 'Bem-vindo ao Leitor',
  autor: 'Pedra Angular',
  arquivo: 'IMPRESSOES_APP.md',
}

/**
 * Links permanentes (citação acadêmica): #/livro/<id> abre a obra;
 * #/livro/<id>/<ref> salta à passagem canônica (ex.: Sl 23:1, 5.4).
 */
function parseHash(): { bookId: string; ref?: string } | null {
  const m = /^#\/livro\/([^/]+)(?:\/(.+))?$/.exec(window.location.hash)
  if (!m) return null
  return { bookId: decodeURIComponent(m[1]), ref: m[2] ? decodeURIComponent(m[2]) : undefined }
}

/**
 * Compartilhamento nativo (share_target do manifest): o app aparece no
 * menu "Compartilhar" do sistema. O SO abre esta URL com o texto nos
 * parâmetros de busca — sem rede, sem servidor, só o próprio navegador.
 */
function parseShareTarget(): { title?: string; text?: string; url?: string } | null {
  const params = new URLSearchParams(window.location.search)
  const title = params.get('title') ?? undefined
  const text = params.get('text') ?? undefined
  const url = params.get('url') ?? undefined
  if (!title && !text && !url) return null
  return { title, text, url }
}

export function App() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [persons, setPersons] = useState<PersonManifest | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Pilha de leitura: long press num wikilink empilha o verbete;
  // ← volta ao texto anterior (topo vazio = catálogo)
  const [stack, setStack] = useState<CatalogEntry[]>([WELCOME_ENTRY])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([])
  // Editor de textos próprios: null | novo | edição de um LocalFile
  const [editor, setEditor] = useState<{ file: LocalFile | null } | null>(null)
  // Muda a key do Reader após salvar edição (re-parseia o conteúdo)
  const [bookVersion, setBookVersion] = useState(0)
  const { idioma, setIdioma, t } = useIdioma()
  // Pede armazenamento durável logo na abertura: sem isso o navegador pode
  // descartar textos e tema de uma vez só. Ver usePersistencia.
  const persistencia = usePersistencia()
  // F6 troca de regiao; o Tab anda dentro dela. Ver useCicloDeRegioes.
  useCicloDeRegioes()
  const { theme, setTheme } = useTheme()
  const { fontFamily, setFontFamily } = useFontFamily()
  const { peso, setPeso } = usePesoTraco()
  const { espacamento, setEspacamento } = useEspacamento()
  const { needRefresh, applyUpdate, checkResult, checkNow } = useAppUpdate()
  // Barra do topo constante: a tela da biblioteca tem o mesmo Ξ e o mesmo
  // ajuste de letra da leitura, com o estado guardado no mesmo lugar.
  const { px: corpoDaLetra, decrease: decreaseFont, increase: increaseFont } = useFontSize()
  // Depende do corpo: a entrelinha e um multiplo dele, e o encaixe na grade
  // de pixels precisa refazer a conta a cada A+/A-.
  const { entrelinha, setEntrelinha } = useEntrelinha(corpoDaLetra)
  const [menuOpen, setMenuOpen] = useState(false)
  // Painel fixo so faz sentido onde ha espaco: abaixo de 64rem, os dois
  // abertos deixariam menos de 25rem para a coluna de leitura.
  const telaLarga = useTelaLarga()
  const cabemDois = useCabemDoisPaineis()
  const { fixos, alternar: alternarFixo, soltar: soltarPainel } = usePaineisFixos()
  // Onde so cabe UM painel, fixar um solta o outro. Sem isso, os dois
  // fixados numa janela de 900px deixariam a coluna com menos de 20rem —
  // abaixo do proprio piso de leitura.
  const fixar = (qual: 'biblioteca' | 'sumario') => {
    if (!cabemDois) {
      const outro = qual === 'biblioteca' ? 'sumario' : 'biblioteca'
      if (fixos[outro]) soltarPainel(outro)
    }
    alternarFixo(qual)
  }
  const bibliotecaFixa = telaLarga && fixos.biblioteca
  const sumarioFixo = telaLarga && fixos.sumario
  const [acervoDetailsOpen, setAcervoDetailsOpen] = useState(false)
  // Alvo do link permanente com que o app foi aberto (consumido 1x)
  const initialTarget = useRef(parseHash())
  const [initialRef, setInitialRef] = useState<string | undefined>(undefined)
  // Texto recebido via "Compartilhar" do sistema (consumido 1x)
  const initialShare = useRef(parseShareTarget())
  // Link permanente ou compartilhamento têm prioridade sobre a memória
  // do último livro — capturado uma única vez, antes de qualquer um dos
  // dois efeitos abaixo consumir (zerar) sua própria referência.
  const skipLastBookRestore = useRef(
    initialTarget.current !== null || initialShare.current !== null,
  ).current
  const lastBookRestored = useRef(false)

  useEffect(() => {
    listLocalFiles().then(setLocalFiles).catch(() => {})
  }, [])

  // O CSS e quem empurra o conteudo (padding no body). Aqui so se declara o
  // estado: assim, se a janela encolher, a media query desliga o padding
  // sozinha e o painel volta a ser sobreposto, sem nada preso fora da tela.
  useEffect(() => {
    const b = document.body
    if (bibliotecaFixa) b.dataset.fixoEsq = '1'
    else delete b.dataset.fixoEsq
    if (sumarioFixo) b.dataset.fixoDir = '1'
    else delete b.dataset.fixoDir
  }, [bibliotecaFixa, sumarioFixo])

  // Painel fixo esta sempre visivel: fixar sem abrir seria reservar espaco
  // para o vazio.
  useEffect(() => {
    if (bibliotecaFixa) setLibraryOpen(true)
  }, [bibliotecaFixa])

  // Compartilhado de outro app (ex.: chat de IA): salva como texto
  // próprio e abre direto na leitura — nenhuma rede envolvida.
  useEffect(() => {
    const share = initialShare.current
    if (!share) return
    initialShare.current = null
    const conteudo = [share.text, share.url].filter(Boolean).join('\n\n').trim()
    if (!conteudo) return
    const titulo = share.title?.trim() || t('arquivos.compartilhado', { data: new Date().toLocaleString() })
    saveLocalText(titulo, conteudo)
      .then((file) => {
        setStack([
          { id: file.id, titulo: file.titulo, autor: file.autor, arquivo: `Meus arquivos/${file.nome}`, local: true },
        ])
        return listLocalFiles()
      })
      .then(setLocalFiles)
      .catch(() => {})
    // Limpa os parâmetros da URL: um F5 não reimporta o mesmo texto
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}livros/catalogo.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setCatalog)
      .catch((e: unknown) => setError(String(e)))
    fetch(`${import.meta.env.BASE_URL}livros/personagens.json`)
      .then((r) => (r.ok ? r.json() : { personagens: [] }))
      .then(setPersons)
      .catch(() => setPersons({ personagens: [] }))
  }, [])

  const personRegistry = useMemo(
    () => buildPersonRegistry(persons?.personagens ?? []),
    [persons],
  )

  /** Biblioteca completa: embarcados + personagens + arquivos do usuário. */
  const libraryCatalog = useMemo<CatalogData | null>(() => {
    if (!catalog) return null
    const personEntries: CatalogEntry[] = (persons?.personagens ?? []).map((p) => ({
      id: p.id,
      titulo: p.nome,
      autor: 'Personagem',
      arquivo: p.arquivo,
    }))
    const localEntries: CatalogEntry[] = localFiles.map((f) => ({
      id: f.id,
      titulo: f.titulo,
      autor: f.autor,
      arquivo: `Meus arquivos/${f.nome}`,
      local: true,
    }))
    // O guia de boas-vindas é a única obra do catálogo que fala pelo APP, e
    // não pelo acervo: ele existe em dois arquivos sob o mesmo id. O
    // catalogo.json guarda a versão portuguesa, então aqui ele é substituído
    // pela do idioma corrente — senão a lista da biblioteca diria
    // "Bem-vindo ao Leitor" enquanto a barra de cima diz "Welcome to the
    // Reader", para o mesmo texto aberto. Toda outra obra passa intacta.
    const embarcados = catalog.livros.map((l) =>
      l.id === WELCOME_ENTRY.id ? guiaDoIdioma(idioma, t) : l,
    )
    return { livros: [...embarcados, ...personEntries, ...localEntries] }
  }, [catalog, persons, localFiles, idioma, t])

  /**
   * UM arquivo abre; VÁRIOS não.
   *
   * Quem arrasta um arquivo sozinho quer lê-lo — o gesto está incompleto se
   * ele só some numa pasta. Quem arrasta um punhado está importando acervo, e
   * aí abrir um deles ao acaso é errado duas vezes: escolhe por você e ainda
   * te tira de onde estava lendo. Nesse caso o app só avisa quantos entraram.
   */
  const handleAddFiles = (files: File[]) => {
    addLocalFiles(files)
      .then((ids) =>
        listLocalFiles().then((lista) => {
          setLocalFiles(lista)
          if (ids.length === 1) {
            const novo = lista.find((f) => f.id === ids[0])
            if (novo) {
              setLibraryOpen(false)
              setStack([
                {
                  id: novo.id,
                  titulo: novo.titulo,
                  autor: novo.autor,
                  arquivo: `Meus arquivos/${novo.nome}`,
                  local: true,
                },
              ])
            }
          } else if (ids.length > 1) {
            setAvisoSoltura(t('soltar.varios', { n: ids.length }))
            window.setTimeout(() => setAvisoSoltura(null), 4000)
          }
        }),
      )
      .catch(() => {})
  }

  // Arrastar e soltar em qualquer lugar da janela: mesma porta do botão
  // "+ Adicionar arquivos", só que sem procurar o botão.
  const [avisoSoltura, setAvisoSoltura] = useState<string | null>(null)
  // Arquivo aberto pelo sistema entra pela mesma porta, com a mesma regra
  // de abrir quando é um só.
  useArquivosDoSistema(handleAddFiles)
  // Arquivo vindo do "Compartilhar" do sistema entra pela mesma porta.
  useArquivosCompartilhados(handleAddFiles)
  const { pairando } = useSoltarArquivos(handleAddFiles, (quantidade) => {
    setAvisoSoltura(
      t(quantidade === 1 ? 'soltar.recusados' : 'soltar.recusadosPlural', { n: quantidade }),
    )
    window.setTimeout(() => setAvisoSoltura(null), 4000)
  })

  const handleSaveText = (titulo: string, conteudo: string) => {
    const existingId = editor?.file?.id
    saveLocalText(titulo, conteudo, existingId)
      .then((file) => {
        if (existingId) invalidateBookCache(existingId)
        setEditor(null)
        setBookVersion((v) => v + 1)
        // Abre o texto salvo para leitura imediata
        setStack([
          { id: file.id, titulo: file.titulo, autor: file.autor, arquivo: `Meus arquivos/${file.nome}`, local: true },
        ])
        return listLocalFiles()
      })
      .then(setLocalFiles)
      .catch(() => {})
  }

  const handleEditLocal = () => {
    if (!book?.local) return
    getLocalFile(book.id).then((file) => {
      if (file) setEditor({ file })
    })
  }

  const handleRemoveLocal = (entry: CatalogEntry) => {
    if (!window.confirm(t('arquivos.remover', { titulo: entry.titulo }))) return
    removeLocalFile(entry.id)
      .then(() => listLocalFiles())
      .then(setLocalFiles)
      .catch(() => {})
    // Se estava aberto, sai da leitura dele
    setStack((s) => s.filter((e) => e.id !== entry.id))
  }

  const handleExportData = () => {
    exportBackup().catch(() => window.alert(t('arquivos.exportarFalhou')))
  }

  const handleImportData = (file: File) => {
    if (
      !window.confirm(
        t('arquivos.importarAviso'),
      )
    )
      return
    importBackup(file)
      .then(() => window.location.reload())
      .catch(() => window.alert(t('arquivos.importarFalhou')))
  }

  const noTopo = stack.length ? stack[stack.length - 1] : null
  // O guia é o único texto que troca de arquivo com o idioma. O id não muda,
  // então memória de leitura, link permanente e comparações seguem valendo.
  const book =
    noTopo?.id === WELCOME_ENTRY.id
      ? guiaDoIdioma(idioma, t)
      : noTopo?.id === SOBRE_ID
        ? sobreDoIdioma(idioma)
        : noTopo

  // Aberto por link permanente: troca o guia pela obra citada
  useEffect(() => {
    const target = initialTarget.current
    if (!target || !libraryCatalog) return
    const entry = libraryCatalog.livros.find((l) => l.id === target.bookId)
    if (entry) {
      setInitialRef(target.ref)
      setStack([entry])
    }
    initialTarget.current = null
  }, [libraryCatalog])

  // Livro de cabeceira: sem link permanente nem compartilhamento, reabre
  // exatamente a última obra lida — o guia de boas-vindas só aparece
  // mesmo na primeiríssima visita.
  useEffect(() => {
    if (skipLastBookRestore || lastBookRestored.current || !libraryCatalog) return
    lastBookRestored.current = true
    const lastId = loadLastBook()
    if (!lastId || lastId === WELCOME_ENTRY.id) return
    const entry = libraryCatalog.livros.find((l) => l.id === lastId)
    if (entry) setStack([entry])
  }, [skipLastBookRestore, libraryCatalog])

  // A barra de endereço acompanha a obra aberta (link citável sempre à mão).
  // O guia de boas-vindas nunca vira link permanente: senão, ao reabrir o
  // app com esse hash residual (comum no modo standalone do iOS, que
  // reaproveita a última URL), o app pensaria que é um link explícito e
  // deixaria de restaurar o último livro de verdade.
  useEffect(() => {
    const hash = book && book.id !== WELCOME_ENTRY.id ? `#/livro/${encodeURIComponent(book.id)}` : '#/biblioteca'
    window.history.replaceState(null, '', hash)
  }, [book])

  /**
   * Quando se cola um arquivo do corpus no editor, o título não deveria ser
   * "Texto de 11/08/2026": o arquivo já se apresenta no próprio cabeçalho.
   *
   * Preferimos o NOME DO ARQUIVO original (achado pelo `id` do YAML no
   * catálogo) e não o título da obra, porque é ele que faz o "⇩ Baixar .md"
   * sair pronto para substituir o original na pasta — sem renomear nada. Se o
   * id não estiver no catálogo, cai no `title:` do YAML.
   */
  const sugerirTitulo = (conteudo: string): string | null => {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(conteudo)
    if (!fm) {
      // Sem front matter — é o caso de colar UM capítulo, que vem pelo menu
      // "⋯" e por decisão nossa não carrega YAML. O primeiro cabeçalho é o
      // nome que o próprio trecho se dá; melhor que a data de hoje.
      const h = /^#{1,6}\s+(.+?)\s*$/m.exec(conteudo)
      return h ? h[1].trim() : null
    }
    const campo = (nome: string) => {
      const m = new RegExp(`^${nome}:\\s*["']?(.+?)["']?\\s*$`, 'm').exec(fm[1])
      return m ? m[1].trim() : null
    }
    const id = campo('id')
    if (id) {
      const doCatalogo = libraryCatalog?.livros.find((l) => l.id === id)
      const arquivo = doCatalogo?.arquivo
      if (arquivo) return arquivo.split('/').pop()!.replace(/\.md$/i, '')
    }
    return campo('title') ?? campo('titulo')
  }

  const openBook = (entry: CatalogEntry) => {
    setStack([entry])
    /* Alfinete fincado = painel fica. Fechar aqui contrariava o proprio
       alfinete: o usuario fixou justamente para escolher um livro atras do
       outro sem reabrir o painel toda vez. Sem alfinete, fecha como antes —
       ali o painel esta por cima do texto e precisa sair da frente. */
    if (!bibliotecaFixa) setLibraryOpen(false)
    // O foco vai para o texto quando ele fica pronto — ver Reader.
  }

  const pushBook = (entry: CatalogEntry) => {
    setStack((s) => [...s, entry])
  }

  const popBook = () => {
    setStack((s) => s.slice(0, -1))
  }

  return (
    <IdiomaContext.Provider value={{ idioma, setIdioma, t }}>
      {/* Primeira parada do Tab: pular a barra e cair no texto.
          Sem isto, quem navega por teclado atravessa a barra do topo INTEIRA
          a cada troca de livro para chegar na primeira palavra. Fica escondido
          ate receber o foco — e ai aparece, como manda a norma (WCAG 2.4.1). */}
      <a className="pular-para-o-texto" href="#texto-da-leitura">
        {t('pularParaOTexto')}
      </a>
      {needRefresh && (
        <div className="update-banner" role="status">
          <span>{t('atualizacao.disponivel')}</span>
          <button className="update-banner-button" onClick={applyUpdate}>
            {t('atualizacao.agora')}
          </button>
        </div>
      )}
      {pairando && (
        // aria-hidden: quem usa leitor de tela não arrasta arquivo, e o
        // aviso apareceria do nada no meio da leitura
        <div className="alvo-de-soltura" aria-hidden="true">
          <div className="alvo-de-soltura-caixa">
            <strong>{t('soltar.titulo')}</strong>
            <span>{t('soltar.formatos')}</span>
          </div>
        </div>
      )}
      {avisoSoltura && (
        <div className="toast" role="status">
          {avisoSoltura}
        </div>
      )}
      {checkResult !== 'idle' && (
        <div className="toast" role="status">
          {checkResult === 'checking'
            ? t('atualizacao.procurando')
            : checkResult === 'demorando'
              ? 'A verificação está demorando. O app pode estar guardando livros para leitura offline — dá para continuar lendo normalmente.'
              : t('atualizacao.emDia')}
        </div>
      )}
      <LibraryDrawer
        catalog={libraryCatalog}
        open={libraryOpen}
        // Fechar tambem solta o alfinete: senao o painel reabriria sozinho no
        // efeito acima, e o X pareceria nao funcionar.
        onClose={() => {
          soltarPainel('biblioteca')
          setLibraryOpen(false)
        }}
        fixo={bibliotecaFixa}
        onAlternarFixo={telaLarga ? () => fixar('biblioteca') : undefined}
        onSelect={openBook}
        onAddFiles={handleAddFiles}
        onRemoveLocal={handleRemoveLocal}
        onNewText={() => {
          setLibraryOpen(false)
          setEditor({ file: null })
        }}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onCheckUpdate={checkNow}
      />
      <TextEditor
        sugerirTitulo={sugerirTitulo}
        open={editor !== null}
        fileId={editor?.file?.id ?? null}
        initialTitle={editor?.file?.titulo ?? ''}
        initialContent={editor?.file?.conteudo ?? ''}
        onSave={handleSaveText}
        onCancel={() => setEditor(null)}
      />
      <ThemeDialog
        open={themeOpen}
        theme={theme}
        onSelect={setTheme}
        fontFamily={fontFamily}
        onSelectFontFamily={setFontFamily}
        peso={peso}
        onSelectPeso={setPeso}
        espacamento={espacamento}
        onSelectEspacamento={setEspacamento}
        entrelinha={entrelinha}
        onSelectEntrelinha={setEntrelinha}
        onAbrirSobre={() => {
          setThemeOpen(false)
          setStack([sobreDoIdioma(idioma)])
        }}
        onClose={() => setThemeOpen(false)}
      />
      {book ? (
        <Reader
          key={`${book.id}:${book.arquivo}:${stack.length}:${bookVersion}`}
          entry={book}
          initialRef={book.id === stack[0]?.id && stack.length === 1 ? initialRef : undefined}
          trackAsLastBook={book.id !== WELCOME_ENTRY.id}
          onEditLocal={book.local ? handleEditLocal : undefined}
          personRegistry={personRegistry}
          onBack={popBook}
          onOpenPerson={pushBook}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenAppearance={() => setThemeOpen(true)}
          sumarioFixo={sumarioFixo}
          onAlternarSumarioFixo={telaLarga ? () => fixar('sumario') : undefined}
        />
      ) : (
        <>
          <Catalog
            catalog={libraryCatalog}
            error={error}
            onSelect={openBook}
            onOpenLibrary={() => setLibraryOpen(true)}
            onOpenMenu={() => setMenuOpen(true)}
            decreaseFont={decreaseFont}
            increaseFont={increaseFont}
          />
          {/* O mesmo Ξ da leitura. Sem livro aberto ele não tem sumário para
              mostrar, então abriga o que continua fazendo sentido: aparência e
              a ficha do acervo. */}
          <Sidebar
            headings={[]}
            names={[]}
            open={menuOpen || sumarioFixo}
            fixo={sumarioFixo}
            onAlternarFixo={telaLarga ? () => fixar('sumario') : undefined}
            onClose={() => {
              soltarPainel('sumario')
              setMenuOpen(false)
            }}
            onAppearance={() => {
              setMenuOpen(false)
              setThemeOpen(true)
            }}
            onDetails={() => {
              setMenuOpen(false)
              setAcervoDetailsOpen(true)
            }}
          />
          <DetailsDialog
            open={acervoDetailsOpen}
            onClose={() => setAcervoDetailsOpen(false)}
            entry={null}
            parsed={null}
            catalog={libraryCatalog}
            persistencia={persistencia}
          />
        </>
      )}
    </IdiomaContext.Provider>
  )
}
