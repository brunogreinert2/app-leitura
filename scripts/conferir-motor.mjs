// Guarda do motor: src/motor/ é cópia do motor do ecossistema, e cópia não se
// edita à mão. Cada arquivo traz o sha256 do próprio conteúdo no carimbo; se o
// conteúdo mudou e o carimbo não, alguém editou aqui em vez de na fonte
// (C:\Claude\parser\motor\) — e a próxima vez que o motor for espalhado, a
// mudança sumiria sem aviso.
//
// Roda no pre-commit (.githooks/pre-commit) e no deploy. Não precisa do
// parser por perto: confere a cópia contra o próprio carimbo. Se a cópia está
// ATUALIZADA em relação à fonte quem confere é `npm run conferir` no parser.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'motor')
const RX_CARIMBO = /^\/\/ MOTOR DO ECOSSISTEMA[\s\S]*?\/\/ sha256: ([0-9a-f]{64})\n/

const ruins = []
for (const arquivo of readdirSync(PASTA).filter((a) => a.endsWith('.ts'))) {
  const texto = readFileSync(join(PASTA, arquivo), 'utf8').replace(/\r\n/g, '\n')
  const m = RX_CARIMBO.exec(texto)
  const corpo = m ? texto.slice(m[0].length) : ''
  if (!m || createHash('sha256').update(corpo).digest('hex') !== m[1]) ruins.push(arquivo)
}

if (ruins.length) {
  console.error('src/motor/ foi editado à mão — a fonte é C:\\Claude\\parser\\motor\\:')
  for (const r of ruins) console.error('  ✗ ' + r)
  console.error('Edite lá e rode `npm run espalhar` em C:\\Claude\\parser (ver src/motor/LEIA.md).')
  process.exit(1)
}
