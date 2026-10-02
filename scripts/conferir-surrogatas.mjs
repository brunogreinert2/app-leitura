// Guarda do build: nenhum "�d800" no JavaScript publicado.
//
// Um empacotador que escreve uma surrogata solta do Unicode (\uD800–\uDFFF)
// como caractere não consegue gravá-la em UTF-8: sai U+FFFD seguido do resto
// do escape ("�d800"). A expressão regular que dependia dela quebra sem erro
// nenhum — foi o que aconteceu com o temml em 2026-10-02 (ver vite.config.ts).
// Esta guarda olha o build pronto e para o deploy se achar o estrago, em
// qualquer biblioteca, não só no temml.
//
//   node scripts/conferir-surrogatas.mjs [pasta]   (padrão: dist)

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const pasta = process.argv[2] ?? 'dist'
const ESTRAGO = /�[dD][89abAB][0-9a-fA-F]{2}/g

const achados = []
const andar = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) andar(p)
    else if (n.endsWith('.js')) {
      const texto = readFileSync(p, 'utf8')
      for (const m of texto.matchAll(ESTRAGO)) achados.push(`${p}: …${texto.slice(Math.max(0, m.index - 40), m.index + 10)}…`)
    }
  }
}
andar(pasta)

if (achados.length) {
  console.error('Surrogata solta estragada pelo empacotador (ver vite.config.ts, temmlSemSurrogataSolta):')
  for (const a of achados) console.error('  ✗ ' + a)
  process.exit(1)
}
console.log('✓ nenhuma surrogata estragada no build')
