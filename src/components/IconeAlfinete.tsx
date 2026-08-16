/**
 * Alfinete grego — o fixador dos painéis laterais.
 *
 * Desenho do Bruno (gerado como imagem e como traço), redesenhado em vetor:
 * capitel em duas faixas, corpo com meandro, saia flarada e agulha, a 45º.
 *
 * VETOR E `currentColor`, não a imagem original, por quatro motivos medidos
 * neste app:
 *   - o PNG traz o fundo azul-noite gravado, e o botão vive sobre
 *     --color-surface — branco no sépia, preto no escuro: o quadrado azul
 *     viraria adesivo em oito dos nove temas;
 *   - o ouro fixo não passaria no contraste dos temas claros, e o resto da
 *     paleta foi medido (scripts/medir_contraste.py);
 *   - o zoom aqui não tem teto prático: raster borra, vetor não;
 *   - 1 MB de PNG num app que pré-carrega tudo para uso offline.
 *
 * O MEANDRO É BURACO (`fill-rule="evenodd"`), não traço por cima: assim ele
 * aparece na cor do fundo, seja qual for o tema. Traço exigiria saber a cor
 * do fundo, que muda.
 *
 * ESCRITO PARA O WEBKIT, e não só para o Chromium. A primeira versão sumia
 * por completo no iPhone — inclusive no navegador, o que descartou cache — e
 * aparecia no Windows. Três armadilhas conhecidas do Safari, todas evitadas
 * aqui:
 *   1. `width="1em"` em atributo de SVG: o WebKit não resolve `em` ali de
 *      forma confiável e o elemento colapsa para zero. Agora a medida é
 *      numérica no atributo e o tamanho real vem do CSS.
 *   2. SVG sem dimensão explícita dentro de contêiner flex encolhe a zero.
 *      O CSS do botão fixa largura, altura e `flex-shrink: 0`.
 *   3. Números grudados no `d` (`q.3.25 0 .45`) e o atalho `q`: válidos na
 *      especificação, historicamente frágeis no WebKit. Aqui todo número tem
 *      espaço e a curva usa `C`, que é o comando mais bem suportado.
 */
export function IconeAlfinete({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(45 12 12)">
        {/* capitel: faixa grossa e faixa fina */}
        <rect x="4.3" y="0.6" width="15.4" height="3.1" rx="1.55" />
        <rect x="6.2" y="4.4" width="11.6" height="2.2" rx="1.1" />

        {/* corpo, com o meandro aberto como buraco */}
        <path
          fillRule="evenodd"
          d="M 7.2 7.3 L 16.8 7.3 L 16.8 13.4 L 7.2 13.4 Z M 9.2 9.3 L 9.2 11.4 L 10.8 11.4 L 10.8 9.9 L 13.2 9.9 L 13.2 12 L 14.8 12 L 14.8 9.3 Z"
        />

        {/* saia flarada */}
        <path d="M 7.2 13.2 L 16.8 13.2 L 20.7 16.3 C 20.7 16.5 20.7 16.6 20.7 16.75 C 15.3 18.95 8.7 18.95 3.3 16.75 C 3.3 16.6 3.3 16.5 3.3 16.3 Z" />

        {/* agulha */}
        <path d="M 10.7 17.6 L 13.3 17.6 L 12 23.7 Z" />
      </g>
    </svg>
  )
}
