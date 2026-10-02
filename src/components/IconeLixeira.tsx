/**
 * Ícone de lixeira — acompanha o "Excluir todos os meus textos".
 *
 * Mesmo padrão do IconeAtualizar: vetor e `currentColor`, medida numérica no
 * atributo e tamanho real vindo do CSS (.toc-action-larga svg).
 *
 * O ícone é o que distingue o botão PELA FORMA: lê-se antes da palavra e
 * não depende de cor nenhuma — vale nos nove temas e em qualquer dicromacia.
 */
export function IconeLixeira({ className }: { className?: string }) {
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
      <path d="M 4 7 H 22" />
      <path d="M 10 7 V 4 H 16 V 7" />
      <path d="M 6 7 L 7.5 22 H 18.5 L 20 7" />
      <path d="M 11 11 V 18" />
      <path d="M 15 11 V 18" />
    </svg>
  )
}
