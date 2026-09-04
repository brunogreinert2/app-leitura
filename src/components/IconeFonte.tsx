/**
 * Os sinais − e + dos botões de tamanho de letra.
 *
 * VETOR, e não os caracteres. O menos era `−` (U+2212, MINUS SIGN), que a
 * tipografia desenha de propósito mais grosso e mais largo que a barra
 * horizontal do `+` — os dois botões saíam com pesos visivelmente diferentes,
 * e nenhum ajuste de corpo resolve isso, porque a diferença está no desenho
 * do glifo. Em traço, os dois têm a MESMA espessura por construção.
 *
 * De quebra, o desenho ocupa a caixa toda: o `+` de fonte reserva espaço de
 * ascendente e descendente que ele não usa, e por isso parecia pequeno mesmo
 * depois de crescer o corpo.
 *
 * Mesmas cautelas do IconeAlfinete: medida numérica no atributo (o WebKit não
 * resolve `em` ali), tamanho real pelo CSS, `currentColor` para seguir o tema.
 */
export function IconeFonte({ sinal, className }: { sinal: 'mais' | 'menos'; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 4 12 H 20" />
      {sinal === 'mais' && <path d="M 12 4 V 20" />}
    </svg>
  )
}
