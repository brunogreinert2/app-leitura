import { useEffect, useState } from 'react'
import { Catalog } from './components/Catalog'
import { Reader } from './components/Reader'
import { LibraryDrawer } from './components/LibraryDrawer'
import { ThemeDialog, useTheme } from './components/ThemeDialog'
import type { Catalog as CatalogData, CatalogEntry } from './types'

export function App() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [book, setBook] = useState<CatalogEntry | null>(null)
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
  }, [])

  const openBook = (entry: CatalogEntry) => {
    setBook(entry)
    setLibraryOpen(false)
  }

  return (
    <>
      <LibraryDrawer
        catalog={catalog}
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
          entry={book}
          onBack={() => setBook(null)}
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
