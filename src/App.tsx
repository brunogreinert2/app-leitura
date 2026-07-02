import { useState } from 'react'
import { Catalog } from './components/Catalog'
import { Reader } from './components/Reader'
import type { CatalogEntry } from './types'

export function App() {
  const [book, setBook] = useState<CatalogEntry | null>(null)

  return book ? (
    <Reader entry={book} onBack={() => setBook(null)} />
  ) : (
    <Catalog onSelect={setBook} />
  )
}
