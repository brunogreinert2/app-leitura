import { listLocalFiles, restoreLocalFile, type LocalFile } from './localFiles'

/**
 * Sem conta, sem nuvem: tudo mora só no aparelho (localStorage +
 * IndexedDB). Isso é ótimo para privacidade, mas significa que trocar
 * de aparelho ou limpar o cache apaga posição de leitura, preferências
 * e textos próprios. Este backup é a válvula de escape — um .json que
 * o próprio usuário guarda onde quiser, sem servidor nenhum envolvido.
 */
const MARKER = 'pedra-angular-leitura'
const VERSION = 1

interface Backup {
  app: typeof MARKER
  version: typeof VERSION
  exportedAt: string
  localStorage: Record<string, string>
  files: LocalFile[]
}

function snapshotLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) out[key] = localStorage.getItem(key) ?? ''
  }
  return out
}

export async function exportBackup(): Promise<void> {
  const backup: Backup = {
    app: MARKER,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: snapshotLocalStorage(),
    files: await listLocalFiles(),
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = backup.exportedAt.slice(0, 10)
  a.href = url
  a.download = `pedra-angular-backup-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Restaura tema, fontes, memória de leitura e textos próprios de um backup anterior. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Backup).app !== MARKER ||
    typeof (parsed as Backup).localStorage !== 'object'
  ) {
    throw new Error('Arquivo não é um backup do Pedra Angular')
  }
  const backup = parsed as Backup
  for (const [key, value] of Object.entries(backup.localStorage)) {
    localStorage.setItem(key, value)
  }
  for (const f of backup.files ?? []) {
    await restoreLocalFile(f)
  }
}
