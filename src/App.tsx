import { useEffect, useMemo, useState } from 'react'
import { Catalog } from './components/Catalog'
import { Reader } from './components/Reader'
import { LibraryDrawer } from './components/LibraryDrawer'
import { ThemeDialog, useTheme } from './components/ThemeDialog'
import { buildPersonRegistry } from './lib/persons'
import { addLocalFiles, listLocalFiles, removeLocalFile, type LocalFile } from './lib/localFiles'
import type { Catalog as CatalogData, CatalogEntry, PersonManifest } from './types'

/** O app abre lendo: guia de boas-vindas como primeiro texto ativo. */
const WELCOME_ENTRY: CatalogEntry = {
  id: 'impressoes-app',
  titulo: 'Bem-vindo ao Leitor',
  autor: 'Pedra Angular',
  arquivo: 'IMPRESSOES_APP.md',
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
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    listLocalFiles().then(setLocalFiles).catch(() => {})
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
      />
      <ThemeDialog
        open={themeOpen}
        theme={theme}
        onSelect={setTheme}
        onClose={() => setThemeOpen(false)}
      />
      {book ? (
        <Reader
          key={`${book.id}:${stack.length}`}
          entry={book}
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
