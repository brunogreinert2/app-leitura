# App Leitura — Especificação Consolidada

> Consolida: `APP_LEITURA_BRIEF_v1_brainstorm.md` + decisões de 2026-07-02
> (plataforma PWA; justificativa anti-EPUB). Status: pronto para implementação.

## Por que não EPUB (registro da decisão)

EPUB foi considerado e descartado porque não resolve quatro requisitos centrais:

1. **Wikilinks dinâmicos** — na conversão virariam hyperlinks fixos; o índice de nomes auto-gerado deixaria de ser dinâmico.
2. **Busca por referência canônica** (Bekker, Stephanus, versículo) — dependeria do leitor EPUB de cada pessoa; quase todos só fazem busca textual livre.
3. **Colapso de seção no corpo do texto + copiar respeitando (ou não) o recolhimento** — não existe no formato; o sumário EPUB recolhe na navegação, não no corpo. "Recolher tudo e copiar o livro inteiro numa passada" é requisito.
4. **YAML** — não existe no formato; viraria Dublin Core (mais pobre) ou seria descartado.

## Princípio de formato: CommonMark é base, não teto

O corpus usa CommonMark como fundação — não como limite. Onde a
especificação já resolve bem, ela é preservada: notas de rodapé sempre
em `[^n]`, nunca asterisco, letra, ou reinício por capítulo — um padrão
universal em vez de convenção idiossincrática de cada autor/digitador.
Onde uma convenção herdada atrapalha o texto real, ela é derrubada, uma
de cada vez, e registrada aqui:

- **Teto de 6 níveis de heading** (`#` até `######`) — herdado do HTML
  de 1991 (`<h1>`–`<h6>`), não do Markdown como ideia. CommonMark trava
  a sintaxe ATX em 6 `#` por especificação (não é bug de parser: é a
  gramática). Derrubado via pré-processamento (`remarkDeepHeadings.ts`):
  capa em 6 `#` só para o tokenizador, embute a profundidade real, e
  corrige depois na árvore já parseada. `aria-level` cobre a
  acessibilidade que a tag HTML sozinha não daria além de h6 (h7+ não é
  tag válida; leitor de tela não reconheceria como heading).
- **Bloco interlinear** (```` ```interlinear ````) — CommonMark funde
  linhas soltas (sem linha em branco entre elas) num único parágrafo,
  o que atrapalha texto empilhado por idioma (hebraico/transliteração/
  grego/latim/tradução por versículo): colar direto de um chat de IA
  gruda tudo numa linha só. Dentro dessa cerca opcional, cada linha do
  arquivo vira seu próprio parágrafo — aditivo, não substitui nada: fora
  do bloco, o resto do arquivo continua CommonMark estrito.

Além disso, o app já usa GFM (`remark-gfm`) por cima do CommonMark
puro — tabela (`| a | b |`), checklist (`- [ ] tarefa`), tachado
(`~~texto~~`) e nota de rodapé (`[^n]`) já funcionam, sem precisar
derrubar nada (GFM já resolve). O único recurso popular que faltava e
não é nem CommonMark nem GFM — realce de texto (`==marca-texto==`,
convenção do Obsidian/MultiMarkdown) — foi adicionado via plugin
próprio (`remarkHighlight.ts`), critério igual ao de cima: não
atrapalha leitura crua (nem no Notepad) e resolve um caso real.

## Decisões de plataforma

- **PWA** (web app instalável): sem loja, funciona em qualquer aparelho, instala pelo navegador.
- Distribuição e atualização do corpus via **Git/GitHub Pages**: publicar atualização = push. O usuário também pode importar arquivos próprios (file picker → IndexedDB).
- Offline completo via service worker: depois da primeira visita, o app e os livros embarcados funcionam sem rede.
- Limitação aceita: acesso direto ao filesystem do celular é restrito no navegador; a importação é via seletor de arquivos (e File System Access API onde existir, ex. Chrome desktop).

## Arquitetura de duas camadas do corpus

O corpus existe em duas camadas com papéis distintos:

- **ACERVO** — a fonte canônica: CommonMark puro, sem wikilinks, YAML completo, formato de preservação de longo prazo e de impressão. Intocável. Não é insumo direto do app.
- **CÓPIAS DE LEITURA** — espelho dos mesmos livros (mantido no Obsidian), com flexibilidade: wikilinks `[[ ]]` permitidos e incentiváveis, inclusive criados pelo próprio usuário. **O app consome esta camada.** Correções de texto nunca são feitas na cópia — corrige-se o acervo e re-espelha.

## Fonte de dados

- Livros embarcados: cópias de leitura em `public/livros/**/*.md` + `catalogo.json` (id, título, autor, arquivo, sistema_referencia).
- Livros do usuário: importados por file picker, guardados em IndexedDB. Mesmo pipeline de parsing.
- `.txt`: fallback degradado — renderiza texto corrido, sem YAML/notas/capítulos.
- Formato dos `.md`: ver `_META/CONVENCOES.md` do vault. As convenções descrevem o ACERVO (YAML obrigatório, notas `[^n]` por escopo, marcadores `[n.n]`, sem sintaxe Obsidian); as cópias de leitura herdam tudo isso e ADICIONAM wikilinks opcionais.

## Funcionalidades

### F1 — Renderização
- CommonMark estrito + notas de rodapé + YAML front matter.
- Marcadores `[n.n]` preservados literalmente e indexados como âncoras endereçáveis.
- Edições bilíngues: blocos original/tradução como estão no arquivo, sem rótulos extras.
- Profundidade de heading sem teto de 6 (ver "CommonMark é base, não teto" acima).
- Bloco interlinear opt-in (```` ```interlinear ````): cada linha vira parágrafo próprio, sem fundir (ver "CommonMark é base, não teto" acima).
- GFM (tabela, checklist, tachado, nota de rodapé) + realce de texto (`==marca-texto==`) — ver seção acima.

### F2 — Wikilinks (quando presentes)
- Tap → preview inline flutuante sobre o texto, fecha no X, sem trocar de página.
- Long press → navegação real.
- Pendente (decidir com o primeiro verbete longo real): preview com scroll interno vs. trecho + botão "abrir completo".

### F3 — Notas de rodapé (mecanismo separado de wikilinks)
- Tap → caixa inline. Long press → lista completa de notas.
- Botão "voltar ao texto" com alvo de toque ampliado (acessibilidade).
- Respeitar escopos de nota (`[^1]`, `[^intro1]`, `[^ap1]`, `[^pa1]`).

### F4 — Sidebar / sumário
- Recolhe/expande por capítulo.
- Capítulo auto-gerado pelo app: **índice de nomes** — varre wikilinks do texto e monta lista navegável (Aristóteles, Spinoza...).

### F5 — Colapso de seção no corpo
- Toda seção (`##`/`###`) pode recolher/expandir no próprio texto.
- "Recolher tudo" / "Expandir tudo" globais.
- Copiar: opção explícita de respeitar o colapso (copia só o visível) ou ignorar (copia tudo). Recolher tudo + copiar = livro inteiro limpo numa ação.

### F6 — Busca
- Livre, tipo Ctrl+F.
- Canônica: se o YAML tem `sistema_referencia`, aceitar endereços (ex. `1094a1`, `514a`, `Jo 1:1`, `5.4`) e saltar direto. A marcação vem da origem (decisão do brief: marcar na conversão/digitação, nunca inferir no app).

### F7 — Acessibilidade (prioridade de primeira classe)
- Pinch-to-zoom nativo desde o primeiro protótipo; zoom sem teto prático (uma letra por tela é caso de uso válido — baixa visão).
- Alto contraste; tamanho de fonte ajustável.
- Semântica HTML correta para leitores de tela (TalkBack/VoiceOver de graça numa PWA bem feita); leitor de áudio próprio (Web Speech API) como fase futura.

### F8 — Copiar/colar limpo
- Seleção devolve texto puro utilizável em script, IA ou outro `.md` — sem artefatos.

### F9 — Performance
- Rolagem lisa em hardware fraco com capítulos longos. Virtualização de renderização se necessário. Zero dependência pesada.

## Fases de implementação

**Fase 1 — Ler um livro (MVP)**
Shell PWA offline; catálogo com livros embarcados; renderização F1; sumário F4 (sem índice de nomes); notas F3; fonte ajustável + pinch-zoom F7; copiar limpo F8.

**Fase 2 — Navegar e buscar**
Colapso de seção F5; busca livre e canônica F6; wikilinks F2 + índice de nomes; alto contraste.

**Fase 3 — Corpus vivo**
Importação de arquivos do usuário (IndexedDB); atualização do catálogo via rede (git/Pages); `.txt` fallback; polish de leitor de tela; avaliar Web Speech API.

## Relação com o Conversor MD → PDF/TXT

Projetos irmãos, mesma fonte única, propósitos opostos (papel barato vs. tela acessível). Reaproveitamento previsto: parser YAML, resolução de wikilinks, padrão `sistema_referencia`. O conversor (Python, já parcialmente implementado) segue em projeto separado — briefs `CLAUDE_CODE_BRIEF.md` e `CLAUDE_CODE_BRIEF_v2_rascunho.md` no vault.
