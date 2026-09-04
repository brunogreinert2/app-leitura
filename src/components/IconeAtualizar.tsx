/**
 * Ícone de atualizar — recarrega o app quando o service worker ficou preso
 * numa versão em cache.
 *
 * Mesmo padrão do IconeAlfinete: vetor e `currentColor` (nove temas, zoom
 * sem teto, KB), medida numérica no atributo e tamanho real vindo do CSS
 * (o WebKit não resolve `em` em atributo de SVG de forma confiável), e
 * números separados por espaço no `d`.
 *
 * O desenho é um círculo ABERTO no alto à direita, com a ponta de seta no
 * fim do arco. Se a seta fechar dentro do círculo, o glifo lê como um "G".
 */
export function IconeAtualizar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 26 26"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 20.49 15 a 9 9 0 1 1 -2.12 -9.36 L 23 10" />
      <path d="M 23 4 V 10 H 17" />
    </svg>
  )
}
