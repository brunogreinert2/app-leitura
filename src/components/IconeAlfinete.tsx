/**
 * Alfinete grego — o fixador dos painéis laterais.
 *
 * Desenho do Bruno (gerado como imagem e redesenhado aqui em vetor): cabeça
 * de capitel em faixas, corpo com meandro, saia flarada e agulha, a 45º.
 *
 * VETOR E `currentColor`, não a imagem original, por quatro motivos medidos
 * neste app:
 *   - o PNG traz o fundo azul-noite gravado, e o botão vive sobre
 *     --color-surface, que é branco no sépia e preto no escuro: o quadrado
 *     azul viraria adesivo em oito dos nove temas;
 *   - o ouro fixo não passaria no contraste dos temas claros, e todo o resto
 *     da paleta foi medido (scripts/medir_contraste.py);
 *   - o zoom aqui não tem teto prático — raster borra, vetor não;
 *   - 1 MB de PNG num app que pré-carrega tudo para uso offline.
 *
 * O MEANDRO É VAZADO, não desenhado por cima: `fill-rule="evenodd"` abre
 * buracos de verdade no corpo do alfinete, então o padrão aparece na cor do
 * fundo, seja ele qual for. Traço por cima exigiria saber a cor do fundo —
 * que muda com o tema.
 *
 * A silhueta é o que precisa ler a 18px; o meandro é o prêmio de quem amplia
 * (e aqui se amplia bastante).
 */
export function IconeAlfinete({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(45 12 12)">
        {/* capitel: faixa grossa e faixa fina */}
        <rect x="5.2" y="1.1" width="13.6" height="2.4" rx="1.2" />
        <rect x="6.9" y="4.1" width="10.2" height="1.6" rx="0.8" />

        {/* corpo, com o meandro aberto como buraco (evenodd) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.2 6.3h7.6v5.4H8.2V6.3zm1.4 1.3v2.8h1.2V8.9h1.9v1.9h1.7V7.6H9.6z"
        />

        {/* saia flarada */}
        <path d="M8.2 11.5h7.6l3.5 2.9q.2.2 0 .4c-4.6 1.9-10 1.9-14.6 0q-.2-.2 0-.4z" />

        {/* agulha */}
        <path d="M11.1 15.4h1.8l-.9 8.1z" />
      </g>
    </svg>
  )
}
