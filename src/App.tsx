import { useEffect, useMemo, useState } from 'react'
import { Catalog } from './components/Catalog'
import { Reader } from './components/Reader'
import { LibraryDrawer } from './components/LibraryDrawer'
import { ThemeDialog, useTheme } from './components/ThemeDialog'
import { buildPersonRegistry } from './lib/persons'
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
  const { theme, setTheme } = useTheme()

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

  /** Catálogo do drawer inclui os verbetes de personagens (pasta própria). */
  const libraryCatalog = useMemo<CatalogData | null>(() => {
    if (!catalog) return null
    const personEntries: CatalogEntry[] = (persons?.personagens ?? []).map((p) => ({
      id: p.id,
      titulo: p.nome,
      autor: 'Personagem',
      arquivo: p.arquivo,
    }))
    return { livros: [...catalog.livros, ...personEntries] }
  }, [catalog, persons])

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
          catalog={catalog}
          error={error}
          onSelect={openBook}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenAppearance={() => setThemeOpen(true)}
        />
      )}
    </>
  )
}
