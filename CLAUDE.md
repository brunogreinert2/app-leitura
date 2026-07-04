# App Leitura — Pedra Angular

PWA de leitura, **somente leitura**, para o corpus em Markdown/YAML dos projetos Pedra Angular e Sapiencial. Leveza cognitiva e técnica; acessibilidade (baixa visão) é prioridade de primeira classe, não polish.

## Stack

- Vite + React + TypeScript
- PWA via `vite-plugin-pwa` (service worker, offline completo)
- Markdown: `unified`/`remark` com plugins customizados (wikilinks, notas de rodapé, marcadores `[n.n]`, YAML front matter via `gray-matter`)
- Armazenamento de livros importados: IndexedDB (via `idb`)
- Livros embarcados: arquivos `.md` estáticos em `public/livros/` + `catalogo.json`
- Deploy alvo: GitHub Pages (atualização do corpus = git push)
- **Sem** framework de UI pesado. CSS próprio ou Tailwind, nada além.

## Regras do domínio (inegociáveis)

1. Existem duas camadas do mesmo corpus:
   - **ACERVO** — fonte canônica, CommonMark puro (notas `[^n]` nos escopos `[^intro1]`, `[^ap1]`, `[^pa1]`; marcadores `[n.n]`; YAML obrigatório; SEM wikilinks). Intocável, feito para durar e para imprimir. O app NUNCA lê nem toca o acervo diretamente.
   - **CÓPIAS DE LEITURA** — espelho flexível dos mesmos livros (hoje no Obsidian). Podem conter wikilinks `[[ ]]`, inclusive criados pelo usuário. **É esta camada que o app consome.**
2. O app nunca edita, nunca grava de volta, nunca altera o arquivo de origem — nem cópia, nem acervo.
3. Wikilinks são recurso opcional por arquivo: presença habilita preview/índice de nomes, ausência não quebra nada.
4. Marcadores canônicos (`[1.1]`, Bekker `1094a1`, Stephanus `514a`, versículo `Jo 1:1`, SVF, PG/PL) nunca são reformatados. São endereços, não texto.
5. O campo YAML `sistema_referencia` (bekker | stephanus | versiculo | capitulo-secao | svf | ...) informa a busca canônica. Se ausente, só busca livre.
6. Copiar devolve texto limpo — sem artefatos de renderização, sem marcação interna do app.
7. `.txt` é fallback degradado (sem YAML, sem estrutura): mostrar o que der, não forçar.

## Comportamentos-chave da UI

- Wikilink: tap → preview inline flutuante (fecha no X); long press → navegação real.
- Nota de rodapé: tap → caixa inline; long press → lista completa de notas. Botão "voltar ao texto" com alvo de toque GRANDE.
- Sidebar/sumário: recolhe/expande por capítulo; inclui um "capítulo" auto-gerado: índice de nomes a partir dos wikilinks do texto.
- Colapso de seção no corpo do texto; copiar respeita (ou não, escolha do usuário) o estado de colapso — inclusive "recolher tudo e copiar o livro inteiro".
- Pinch-to-zoom nativo desde o primeiro protótipo, sem limite superior tímido (uma letra na tela inteira é caso de uso válido — baixa visão).
- Alto contraste e tamanho de fonte ajustável.
- Busca: livre (Ctrl+F) + por referência canônica quando `sistema_referencia` presente.

## Performance

Textos longos (capítulos bíblicos inteiros, verbetes extensos) precisam rolar liso em celular fraco. Virtualizar a renderização se necessário. Medir antes de adicionar qualquer dependência.

## Convenções de código

- Português nos textos de UI; código e identificadores em inglês.
- Commits pequenos e frequentes, mensagens em português.
- Antes de concluir qualquer fase: rodar build, testar offline, testar num viewport mobile.

## Operação (como mexer no site publicado)

- **Site**: https://pedraangular.app.br (GitHub Pages, repo
  `brunogreinert2/app-leitura`, domínio via registro.br). Deploy é
  automático: `git push` na master → GitHub Actions builda e publica
  em ~1 min. Se o passo "deploy" falhar com "try again later", é
  soluço do Pages: `gh run rerun <id> --failed`.
- **Adicionar livros**: copiar `.md`/`.txt` para `public/livros/<PASTA>/`
  (pasta = menu da biblioteca) e rodar `npm run gera:catalogo` (lê
  título/autor/sistema_referencia do YAML; não toca entradas já
  ajustadas). Personagens: `.md` em `public/livros/PERSONAGENS/` +
  `npm run gera:personagens`. Guia completo: `docs/COMO_EDITAR.md`.
- **Cores/temas**: variáveis CSS por `[data-theme]` no topo de
  `src/styles.css`; lista de temas (com preview) em
  `src/components/ThemeDialog.tsx`. Contraste mínimo 7:1 (WCAG
  reforçado) — nunca "cinza escuro sobre preto".
- **Links permanentes**: `#/livro/<id>` e `#/livro/<id>/<ref>` (ref
  canônica, ex. `Sl 23:1`, `5.4`). O `id` do catálogo é eterno: nunca
  renomear ids publicados.
- **Ícones gregos da toolbar**: Φ abre a biblioteca (marca do app),
  Ξ abre o sumário — manter a identidade grega.
- **Testar local**: `npm run dev` (localhost:5173). Antes de publicar:
  `npm run build` precisa passar limpo.

## Documentos

- `docs/SPEC.md` — especificação consolidada (fonte: briefs do vault + decisões de 2026-07-02)
- `docs/COMO_EDITAR.md` — guia de edição para o dono do corpus
- Manual do corpus: `_META/CONVENCOES.md` no vault Segundo Cérebro (formato dos arquivos que o app consome)
