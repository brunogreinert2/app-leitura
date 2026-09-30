import { useEffect, useRef, useState } from 'react'
import { useDialogoAcessivel } from '../lib/useDialogoAcessivel'
import { useT } from './idiomaContext'
import type { Chave } from '../lib/i18n'

interface Props {
  open: boolean
  /** Quantos textos há em Meus arquivos agora. */
  total: number
  onClose: () => void
  /** O mesmo .json do botão Exportar: volta tudo pelo Importar. */
  onBackup: () => Promise<void>
  /** Apaga só os textos de Meus arquivos; preferências ficam. */
  onApagar: () => Promise<void>
}

/**
 * "Excluir todos os meus textos" em dois passos (2026-09-30).
 *
 * 1. Oferece a cópia antes — no caminho natural, não num menu que ninguém acha.
 * 2. Confirma dizendo exatamente o que acontece, com a contagem: "Apagar os 270
 *    textos". Nunca um "Sim" solto.
 *
 * Os botões NÃO trocam de lugar entre os passos: quem usa zoom grande se guia
 * pela posição e nem sempre vê os dois botões ao mesmo tempo. A proteção é o
 * texto, o foco começar em "Não apagar" (o primeiro da caixa) e o botão de
 * apagar ter outro FORMATO — nada aqui depende só de cor.
 */
export function ExcluirTudoDialog({ open, total, onClose, onBackup, onApagar }: Props) {
  const t = useT()
  const caixaRef = useRef<HTMLDivElement>(null)
  const [passo, setPasso] = useState<1 | 2>(1)
  const [ocupado, setOcupado] = useState(false)
  const fechar = () => {
    setPasso(1)
    setOcupado(false)
    onClose()
  }
  useDialogoAcessivel(open, fechar, caixaRef)
  // ao passar do 1º para o 2º passo, o foco volta ao primeiro botão: "Não apagar"
  useEffect(() => {
    const caixa = caixaRef.current
    if (!open || !caixa) return
    // sem rolar: o texto do passo tem de ficar à vista, não sob o título fixo
    caixa.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    caixa.scrollTop = 0
  }, [passo, open])
  if (!open) return null

  const n = String(total)
  const um = total === 1 ? '_1' : ''
  return (
    <>
      <div className="sidebar-backdrop" onClick={fechar} aria-hidden="true" />
      <div
        className="copy-dialog details-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="excluir-titulo"
        aria-describedby="excluir-texto"
        ref={caixaRef}
      >
        <div className="dialog-topo">
          <h2 id="excluir-titulo">{t('excluir.titulo')}</h2>
        </div>
        {passo === 1 ? (
          <>
            <p id="excluir-texto">{t(`excluir.passo1${um}` as Chave, { n })}</p>
            <button className="copy-dialog-cancel" onClick={fechar}>
              {t('excluir.naoApagar')}
            </button>
            <button
              className="wikilink-box-open"
              disabled={ocupado}
              onClick={() => {
                setOcupado(true)
                onBackup()
                  .then(() => setPasso(2))
                  .finally(() => setOcupado(false))
              }}
            >
              {t('excluir.baixarECont')}
            </button>
            <button className="wikilink-box-open" onClick={() => setPasso(2)}>
              {t('excluir.semCopia')}
            </button>
          </>
        ) : (
          <>
            <p id="excluir-texto">{t(`excluir.passo2${um}` as Chave, { n })}</p>
            <button className="copy-dialog-cancel" onClick={fechar}>
              {t('excluir.naoApagar')}
            </button>
            <button
              className="wikilink-box-open botao-perigo"
              disabled={ocupado}
              onClick={() => {
                setOcupado(true)
                onApagar().finally(fechar)
              }}
            >
              <span aria-hidden="true">⚠ </span>
              {t(`excluir.apagar${um}` as Chave, { n })}
            </button>
          </>
        )}
      </div>
    </>
  )
}
