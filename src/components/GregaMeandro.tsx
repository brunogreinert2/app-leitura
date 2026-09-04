/**
 * Grega (meandro) — o friso que abre os painéis laterais.
 *
 * O TRAÇADO É GERADO, e não copiado do SVG do handoff, por dois motivos: o
 * arquivo entregue vinha com 8 KB de metadados de proveniência embutidos para
 * desenhar 628 bytes de linha, e a fórmula deixa a faixa se adaptar a
 * qualquer largura — a célula é a unidade, não a imagem.
 *
 * A fórmula é a do handoff, conferida contra o arquivo original: os dois
 * traçados saem idênticos, caractere por caractere.
 *
 * `preserveAspectRatio="none"` faz a faixa esticar na largura do painel sem
 * engordar o traço, que é o comportamento de um friso.
 *
 * Mesmas cautelas do IconeAlfinete: medida numérica no atributo (o WebKit não
 * resolve `em` ali), tamanho real vindo do CSS, e `currentColor` para a faixa
 * seguir o tema em vez de carregar uma cor gravada.
 */
const CELULA = 14
const CELULAS = 25

function traçado(n: number): string {
  const partes = [`M0,15H${CELULA * n}`]
  for (let i = 0; i < n; i++) {
    const x = CELULA * i
    partes.push(`M${x + 3},15V1H${x + 13}V11H${x + 7}V5H${x + 9}`)
  }
  return partes.join('')
}

export function GregaMeandro({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${CELULA * CELULAS} 16`}
      preserveAspectRatio="none"
      width={CELULA * CELULAS}
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
    >
      <path d={traçado(CELULAS)} />
    </svg>
  )
}
