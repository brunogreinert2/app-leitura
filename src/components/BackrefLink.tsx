import { useContext } from 'react'
import { FootnoteContext } from './footnoteContext'

/**
 * Flecha ↩ no fim de cada nota: volta à chamada no texto. A chamada
 * pode estar dentro de seção recolhida — o Reader expande a cadeia
 * antes de rolar.
 */
export function BackrefLink(props: Record<string, unknown>) {
  const { backToRef } = useContext(FootnoteContext)
  const targetId = decodeURIComponent(String(props.href ?? '').replace(/^#/, ''))

  return (
    <a
      {...props}
      onClick={(e) => {
        e.preventDefault()
        backToRef(targetId)
      }}
    />
  )
}
