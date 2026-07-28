/**
 * Endereço do rolo estático — a mesma obra numa porta diferente.
 *
 * O app é uma SPA: a rota #/livro/<id> só ganha texto depois que o JavaScript
 * roda. Uma ferramenta que apenas busca a URL (curl, crawler, agente de IA com
 * leitura de link) recebe a casca vazia. Por isso existe, no mesmo domínio, uma
 * cópia estática de cada obra em /rolo/<id>.html, com o texto escrito no <body>
 * como caracteres de verdade.
 *
 * O <id> é o MESMO do catálogo — o gerador nomeia os arquivos por ele. Não há
 * tabela de conversão a manter, e é de propósito: uma tabela é uma coisa que
 * dessincroniza em silêncio.
 *
 * O mesmo vale para o id do elemento. As âncoras de versículo (^gn-1-1 →
 * anchor-gn-1-1) e os marcadores canônicos ([327a] → marker-327a) recebem no
 * rolo exatamente o id que remarkBlockAnchors.ts e remarkMarkers.ts calculam
 * aqui. Passar `elementId` transforma "cite esta obra" em "cite esta passagem".
 */
export function roloUrl(bookId: string, elementId?: string): string {
  const base = `${window.location.origin}/rolo/${encodeURIComponent(bookId)}.html`
  return elementId ? `${base}#${elementId}` : base
}
