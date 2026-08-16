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
        <rect x="4.3" y="0.6" width="15.4" height="3.1" rx="1.55" />
        <rect x="6.2" y="4.4" width="11.6" height="2.2" rx="1.1" />

        {/* corpo, com o meandro aberto como buraco (evenodd) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.2 7.3h9.6v6.1H7.2V7.3zm2 2v2.1h1.6v-1.5h2.4v2.1h1.6V9.3H9.2z"
        />

        {/* saia flarada */}
        <path d="M7.2 13.2h9.6l3.9 3.1q.3.25 0 .45c-5.4 2.2-12 2.2-17.4 0q-.3-.2 0-.45z" />

        {/* agulha */}
        <path d="M10.7 17.6h2.6l-1.3 6.1z" />
      </g>
    </svg>
  )
}
