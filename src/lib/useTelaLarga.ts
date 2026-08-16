import { useEffect, useState } from 'react'

/**
 * Há espaço para painel fixo ao lado do texto?
 *
 * A pergunta é de ESPAÇO, não de aparelho — mesmo motivo do corpo de letra
 * padrão (ver FontControls). Notebook com a janela em meia tela não tem onde
 * encaixar dois painéis; tablet deitado tem. E muda ao girar, sem recarregar:
 * por isso escuta a mudança em vez de medir uma vez só.
 *
 * SÃO DOIS LIMITES, não um. O primeiro corte usava só 64rem, pensando nos dois
 * painéis abertos — e com isso escondia o alfinete inteiro em janela de 900px,
 * onde UM painel caberia folgado. O sintoma: o botão simplesmente não existia
 * no app instalado do desktop, e a busca foi parar (erradamente) na
 * renderização do ícone.
 *
 * A conta é a mesma nos dois casos: painel de 20rem + o piso de 30rem da
 * coluna de leitura (ver .reader-body).
 *   um painel   -> 20 + 30 = 50rem (800px)
 *   dois        -> 40 + 30 = 70rem (1120px)
 * O 64rem antigo era permissivo demais para dois: deixava a coluna abaixo do
 * próprio piso.
 */
const CABE_UM_PAINEL = '(min-width: 50rem)'
const CABEM_DOIS_PAINEIS = '(min-width: 70rem)'

function combina(consulta: string): boolean {
  try {
    return window.matchMedia(consulta).matches
  } catch {
    return false
  }
}

export function useTelaLarga(): boolean {
  const [larga, setLarga] = useState(() => combina(CABE_UM_PAINEL))

  useEffect(() => {
    const mq = window.matchMedia(CABE_UM_PAINEL)
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

/** Cabem os DOIS painéis fixos ao mesmo tempo? */
export function useCabemDoisPaineis(): boolean {
  const [cabem, setCabem] = useState(() => combina(CABEM_DOIS_PAINEIS))

  useEffect(() => {
    const mq = window.matchMedia(CABEM_DOIS_PAINEIS)
    const reavaliar = () => setCabem(mq.matches)
    mq.addEventListener('change', reavaliar)
    window.addEventListener('resize', reavaliar)
    reavaliar()
    return () => {
      mq.removeEventListener('change', reavaliar)
      window.removeEventListener('resize', reavaliar)
    }
  }, [])

  return cabem
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
