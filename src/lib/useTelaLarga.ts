import { useEffect, useState } from 'react'

/**
 * Há espaço para painel fixo ao lado do texto?
 *
 * A pergunta é de ESPAÇO, não de aparelho — mesmo motivo do corpo de letra
 * padrão (ver FontControls). Notebook com a janela em meia tela não tem onde
 * encaixar dois painéis; tablet deitado tem. E muda ao girar, sem recarregar:
 * por isso escuta a mudança em vez de medir uma vez só.
 *
 * 64rem = 1024px. Abaixo disso, painel fixo comeria a coluna de leitura: com
 * os dois abertos sobrariam menos de 25rem para o texto.
 */
const TELA_LARGA = '(min-width: 64rem)'

export function useTelaLarga(): boolean {
  const [larga, setLarga] = useState(() => {
    try {
      return window.matchMedia(TELA_LARGA).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    const mq = window.matchMedia(TELA_LARGA)
    const reavaliar = () => setLarga(mq.matches)
    mq.addEventListener('change', reavaliar)
    // `resize` por garantia: o evento `change` da media query é o certo, mas
    // se ele não chegar (visto acontecer em navegador embutido/emulado), o
    // estado do React fica discordando do CSS — e a discordância aqui não é
    // cosmética: seria painel fixo virando sobreposição sem véu, cobrindo o
    // texto. Reavaliar no resize custa nada e fecha essa porta.
    window.addEventListener('resize', reavaliar)
    reavaliar()
    return () => {
      mq.removeEventListener('change', reavaliar)
      window.removeEventListener('resize', reavaliar)
    }
  }, [])

  return larga
}

const CHAVE = 'paineis-fixos'

interface PaineisFixos {
  biblioteca: boolean
  sumario: boolean
}

function ler(): PaineisFixos {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return { biblioteca: false, sumario: false }
    const v = JSON.parse(bruto) as Partial<PaineisFixos>
    return { biblioteca: !!v.biblioteca, sumario: !!v.sumario }
  } catch {
    return { biblioteca: false, sumario: false }
  }
}

/**
 * Quais painéis o usuário deixou fixos. É preferência de bancada — quem
 * trabalha com o sumário aberto quer encontrá-lo aberto amanhã.
 */
export function usePaineisFixos() {
  const [fixos, setFixos] = useState<PaineisFixos>(ler)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(fixos))
    } catch {
      /* armazenamento indisponível: fixar é conveniência, não requisito */
    }
  }, [fixos])

  return {
    fixos,
    alternar: (qual: keyof PaineisFixos) =>
      setFixos((f) => ({ ...f, [qual]: !f[qual] })),
    soltar: (qual: keyof PaineisFixos) => setFixos((f) => ({ ...f, [qual]: false })),
  }
}
