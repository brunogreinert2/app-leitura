import { useEffect, useMemo, useRef, useState } from 'react'
import { Catalog } from './components/Catalog'
import { Reader, invalidateBookCache } from './components/Reader'
import { TextEditor } from './components/TextEditor'
import { LibraryDrawer } from './components/LibraryDrawer'
import { ThemeDialog, useTheme } from './components/ThemeDialog'
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
import type { Catalog as CatalogData, CatalogEntry, PersonManifest } from './types'

/** O app abre lendo: guia de boas-vindas como primeiro texto ativo. */
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
  const { theme, setTheme } = useTheme()
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

  // Compartilhado de outro app (ex.: chat de IA): salva como texto
  // próprio e abre direto na leitura — nenhuma rede envolvida.
  useEffect(() => {
    const share = initialShare.current
    if (!share) return
    initialShare.current = null
    const conteudo = [share.text, share.url].filter(Boolean).join('\n\n').trim()
    if (!conteudo) return
    const titulo = share.title?.trim() || `Compartilhado ${new Date().toLocaleString('pt-BR')}`
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
    return { livros: [...catalog.livros, ...personEntries, ...localEntries] }
  }, [catalog, persons, localFiles])

  const handleAddFiles = (files: File[]) => {
    addLocalFiles(files)
      .then(() => listLocalFiles())
      .then(setLocalFiles)
      .catch(() => {})
  }

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
    if (!window.confirm(`Remover “${entry.titulo}” dos seus arquivos?`)) return
    removeLocalFile(entry.id)
      .then(() => listLocalFiles())
      .then(setLocalFiles)
      .catch(() => {})
    // Se estava aberto, sai da leitura dele
    setStack((s) => s.filter((e) => e.id !== entry.id))
  }

  const book = stack.length ? stack[stack.length - 1] : null

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

  const openBook = (entry: CatalogEntry) => {
    setStack([entry])
    setLibraryOpen(false)
  }

  const pushBook = (entry: CatalogEntry) => {
    setStack((s) => [...s, entry])
  }

  const popBook = () => {
    setStack((s) => s.slice(0, -1))
  }

  return (
    <>
      <LibraryDrawer
        catalog={libraryCatalog}
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={openBook}
        onAddFiles={handleAddFiles}
        onRemoveLocal={handleRemoveLocal}
        onNewText={() => {
          setLibraryOpen(false)
          setEditor({ file: null })
        }}
      />
      <TextEditor
        open={editor !== null}
        initialTitle={editor?.file?.titulo ?? ''}
        initialContent={editor?.file?.conteudo ?? ''}
        onSave={handleSaveText}
        onCancel={() => setEditor(null)}
      />
      <ThemeDialog
        open={themeOpen}
        theme={theme}
        onSelect={setTheme}
        onClose={() => setThemeOpen(false)}
      />
      {book ? (
        <Reader
          key={`${book.id}:${stack.length}:${bookVersion}`}
          entry={book}
          initialRef={book.id === stack[0]?.id && stack.length === 1 ? initialRef : undefined}
          trackAsLastBook={book.id !== WELCOME_ENTRY.id}
          onEditLocal={book.local ? handleEditLocal : undefined}
          personRegistry={personRegistry}
          onBack={popBook}
          onOpenPerson={pushBook}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenAppearance={() => setThemeOpen(true)}
        />
      ) : (
        <Catalog
          catalog={libraryCatalog}
          error={error}
          onSelect={openBook}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenAppearance={() => setThemeOpen(true)}
        />
      )}
    </>
  )
}
