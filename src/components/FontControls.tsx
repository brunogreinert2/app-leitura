import { useEffect, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'

const STORAGE_KEY = 'reading-font-px'
const DEFAULT_PX = 18
/**
 * Padrao maior quando ha tela para isso.
 *
 * NAO se detecta o sistema operacional para decidir isso, e nao seria melhor:
 * a pergunta util nao e "Windows ou Android?", e "quanto espaco existe agora?".
 * Um notebook com a janela em meia tela tem espaco de celular; um tablet
 * deitado tem espaco de desktop; e o mesmo aparelho muda ao girar. Alem disso,
 * detectar SO significa ler o user agent, que mente por padrao — iPad se
 * declara Mac desde 2019. A largura responde a pergunta certa e acompanha o
 * giro do aparelho sem recarregar.
 *
 * Letra maior no desktop nao e so conforto: com a coluna em `ch` (ver
 * .reader-body), corpo maior alarga a coluna na mesma proporcao. Ganha-se tela
 * SEM alongar a linha — medido, 21px da 75 caracteres onde 18px dava 85.
 */
const DEFAULT_PX_TELA_LARGA = 21
const TELA_LARGA = '(min-width: 64rem)'

function padraoParaEstaTela(): number {
  try {
    return window.matchMedia(TELA_LARGA).matches ? DEFAULT_PX_TELA_LARGA : DEFAULT_PX
  } catch {
    return DEFAULT_PX
  }
}
const MIN_PX = 12
// Sem teto tímido: baixa visão pode querer pouquíssimas palavras por tela
const MAX_PX = 256
const STEP = 1.125

const clamp = (v: number) => Math.min(MAX_PX, Math.max(MIN_PX, Math.round(v)))

/**
 * Mudar a fonte refui o texto e deslocaria o ponto de leitura.
 * Ancora o elemento visível no alto da tela e o devolve à mesma
 * posição depois do reflow: o leitor continua exatamente onde estava.
 */
function withReadingAnchor(update: () => void) {
  const probeY = Math.min(160, window.innerHeight / 3)
  let anchor: Element | null = null
  for (const el of document.elementsFromPoint(window.innerWidth / 2, probeY)) {
    if (el !== document.body && el.closest('.reader-body')) {
      anchor = el
      break
    }
  }
  if (!anchor) {
    update()
    return
  }
  const before = anchor.getBoundingClientRect().top
  flushSync(update)
  const after = anchor.getBoundingClientRect().top
  window.scrollBy({ top: after - before })
}

/** Entrelinha desejada, em múltiplos do corpo da letra (era o valor do CSS). */
const ENTRELINHA = 1.7

/**
 * Encaixa a entrelinha na grade de pixels do aparelho.
 *
 * O PROBLEMA. `line-height: 1.7` num corpo de 18px dá 30,6px — fracionário. A
 * primeira linha do parágrafo cai numa posição da grade, a segunda 0,6px
 * adiante, a terceira 0,2px, e assim por diante, num ciclo que só fecha a cada
 * cinco linhas. Cada linha, portanto, é desenhada num ponto DIFERENTE da grade
 * de pixels.
 *
 * Enquanto o texto é só preenchimento isso não aparece. Mas o contorno do peso
 * "média" tem 0,342px — menos de um pixel. Um traço de meio pixel desenhado em
 * posições diferentes da grade cobre quantidades diferentes de pixel: algumas
 * linhas saem mais grossas, outras mais finas, em faixas que parecem aleatórias
 * e SE REEMBARALHAM a cada mudança de corpo da letra, porque a entrelinha muda
 * junto e o ciclo vira outro.
 *
 * Aparecia mais no iPhone: três pixels físicos por ponto e traço mais nítido.
 * E mais nos textos do próprio leitor do que no acervo, porque nota colada de
 * conversa é prosa corrida — muitas linhas seguidas, que é onde a faixa se vê.
 *
 * A CORREÇÃO. Arredondar a entrelinha para um número inteiro de pixels DO
 * APARELHO. Aí todas as linhas caem na mesma posição da grade, o contorno é
 * desenhado igual em todas, e a faixa desaparece. O preço é a entrelinha mudar
 * no máximo meio pixel do pedido — invisível.
 *
 * VAI NUMA VARIÁVEL SEPARADA, e o CSS a usa só nos blocos de prosa. Entrelinha
 * em `px` herda como valor FIXO: se substituísse o multiplicador `1.7` em
 * `.reader-body`, todo descendente de corpo diferente — nota de rodapé, título
 * de verbete, célula de tabela — herdaria a entrelinha do texto normal em vez
 * da sua própria. Os blocos de prosa têm o mesmo corpo do `.reader-body`, então
 * para eles o valor em pixels é exato.
 *
 * O CORPO DA LETRA TAMBÉM ENTRA NA GRADE, e por isso a faixa sobreviveu à
 * primeira correção. Encaixar a entrelinha alinha as linhas DENTRO de um
 * parágrafo, mas cada parágrafo ainda COMEÇAVA num ponto diferente da grade:
 * medido, seis a oito posições distintas entre os parágrafos de uma tela. O
 * bloco inteiro saía mais grosso ou mais fino que o vizinho — a faixa que
 * restou.
 *
 * A causa é a margem. O `<p>` usa a margem padrão do navegador, `1em`, que é o
 * próprio corpo da letra; e o A+ multiplica o corpo por 1,125, então 18px vira
 * 20,25px e depois 22,78px. Corpo fracionário, margem fracionária, cada
 * parágrafo empurrado para uma fase diferente.
 *
 * Encaixando o CORPO num número inteiro de pixels do aparelho, a margem `1em`
 * vira inteira de graça, e com ela todo o ritmo vertical. O valor guardado
 * continua sendo o fracionário — senão o A+ emperraria, arredondando sempre
 * para o mesmo número —; só o que vai para a tela é encaixado.
 */
function encaixarNaGradeDePixels(px: number): void {
  const dpr = window.devicePixelRatio || 1
  const naGrade = (v: number) => Math.round(v * dpr) / dpr
  document.documentElement.style.setProperty('--reading-font-size', `${naGrade(px)}px`)
  document.documentElement.style.setProperty(
    '--reading-entrelinha-px',
    `${naGrade(px * ENTRELINHA)}px`,
  )
}

export function useFontSize() {
  const [px, setPx] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    // Escolha do usuario manda sempre: o padrao por tela so vale em aparelho
    // onde ele ainda nao ajustou nada.
    return saved >= MIN_PX && saved <= MAX_PX ? saved : padraoParaEstaTela()
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(px))
    // Global: sumário, biblioteca, diálogos e caixas acompanham o zoom
    encaixarNaGradeDePixels(px)
  }, [px])

  // A grade de pixels muda quando a janela vai para um monitor de outra
  // densidade, ou quando o navegador troca de zoom.
  useEffect(() => {
    const refazer = () => encaixarNaGradeDePixels(px)
    window.addEventListener('resize', refazer)
    return () => window.removeEventListener('resize', refazer)
  }, [px])

  return {
    px,
    setPx: (v: number) => withReadingAnchor(() => setPx(clamp(v))),
    decrease: () => withReadingAnchor(() => setPx((v) => clamp(v / STEP))),
    increase: () => withReadingAnchor(() => setPx((v) => clamp(v * STEP))),
  }
}

/**
 * Pinch sobre o texto = mesmo efeito de A−/A+: muda o tamanho da fonte
 * e o texto REFLUI para caber na largura da tela (nada de zoom visual
 * com rolagem lateral).
 */
export function usePinchFontSize(
  ref: RefObject<HTMLElement | null>,
  px: number,
  setPx: (v: number) => void,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startDist = 0
    let startPx = 0

    const distance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = distance(e.touches)
        startPx = px
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault() // bloqueia o zoom visual do navegador no texto
        setPx(startPx * (distance(e.touches) / startDist))
      }
    }

    const onTouchEnd = () => {
      startDist = 0
    }

    // Desktop: ctrl+roda / pinch de trackpad vira ajuste de fonte com
    // reflow. No window inteiro da tela de leitura, para o navegador
    // não capturar o gesto como zoom global (Chrome é insistente).
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setPx(px * (e.deltaY < 0 ? 1.06 : 1 / 1.06))
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('wheel', onWheel)
    }
  }, [ref, px, setPx])
}

interface Props {
  decrease: () => void
  increase: () => void
}

export function FontControls({ decrease, increase }: Props) {
  return (
    <div className="font-controls">
      <button className="font-button" onClick={decrease} aria-label="Diminuir letra">
        −
      </button>
      <button className="font-button font-button-big" onClick={increase} aria-label="Aumentar letra">
        +
      </button>
    </div>
  )
}
