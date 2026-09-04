/**
 * Lupa da busca no texto.
 *
 * Substitui o emoji 🔍, que era a última pista da interface desenhada por
 * caractere: emoji muda de desenho e de cor entre Windows, Android e iPhone,
 * e num app cuja marca é uma didone grega ele destoava. É o mesmo caminho
 * que o alfinete já tinha tomado.
 *
 * Mesmas cautelas do IconeAlfinete: medida numérica no atributo, tamanho real
 * pelo CSS, `currentColor` para seguir o tema.
 */
export function IconeBusca({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8.5" cy="8.5" r="6.5" />
      <path d="M 13.2 13.2 L 18 18" />
    </svg>
  )
}
