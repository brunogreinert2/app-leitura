import type { HTMLAttributes, ReactNode } from 'react'
import { useT } from './idiomaContext'
import type { Chave } from '../lib/i18n'

/**
 * O título padrão de uma caixa de nota (callout) — a que veio sem título
 * escrito, `> [!warning]`. O motor (src/motor/remarkCallout.ts) escreve o
 * nome em português e marca o tipo em data-callout-padrao; aqui ele sai na
 * língua da interface, e trocar de idioma muda o título sem reler o livro.
 * Tipo que o app não conhece fica com o que o motor escreveu.
 */
const TIPOS = new Set([
  'note', 'abstract', 'info', 'todo', 'tip', 'success', 'question',
  'warning', 'failure', 'danger', 'bug', 'example', 'quote',
])

interface Props extends HTMLAttributes<HTMLElement> {
  'data-callout-padrao'?: string
  como?: 'div' | 'summary'
  children?: ReactNode
}

export function CalloutTitulo({ como = 'div', children, ...props }: Props) {
  const t = useT()
  const tipo = String(props['data-callout-padrao'] ?? '')
  const texto = TIPOS.has(tipo) ? t(`callout.${tipo}` as Chave) : children
  const Tag = como
  return <Tag {...props}>{texto}</Tag>
}
