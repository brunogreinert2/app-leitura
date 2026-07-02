# Como começar no Claude Code

## Passo 1 — Abrir o projeto

No Claude Code (agora funcionando), abra esta pasta (`app-leitura`).
Se preferir movê-la antes para outro lugar (ex. `C:\Projetos\app-leitura`), mova a pasta inteira — o CLAUDE.md e docs/ vão junto.

## Passo 2 — Colar este prompt

```
Leia CLAUDE.md e docs/SPEC.md. Vamos implementar a Fase 1 do app de leitura.

1. Faça o scaffold: Vite + React + TypeScript + vite-plugin-pwa, nesta pasta.
2. Crie public/livros/ com um catalogo.json e UM livro de exemplo: copie
   um arquivo real do corpus (me pergunte o caminho quando chegar lá).
3. Implemente, nesta ordem, validando cada passo comigo:
   a. Tela de catálogo (lista os livros do catalogo.json)
   b. Tela de leitura: renderização CommonMark + YAML front matter +
      notas de rodapé [^n] como caixa inline (tap) + marcadores [n.n]
      preservados como âncoras
   c. Sumário lateral recolhível por capítulo
   d. Tamanho de fonte ajustável + pinch-to-zoom
   e. Service worker / offline
4. Antes de concluir: npm run build sem erros, teste em viewport mobile.

Restrições: sem framework de UI pesado, sem dependências além do
necessário. O corpus segue as convenções descritas no CLAUDE.md —
nunca reformatar marcadores canônicos.
```

## Passo 3 — Livro de teste

Quando o Claude Code pedir um livro real, um bom candidato:
`C:\Markdown\Segundo Cérebro\...\Encheiridion_pt_Dinucci-Julien_2012.md`
(53 capítulos, bilíngue, notas em 3 escopos, marcadores [n.n] — se o app
renderizar esse, renderiza qualquer um do corpus).

## Dicas para as primeiras sessões

- Um objetivo por sessão. "Implemente a", valide no navegador, depois "b".
- `/init` NÃO é necessário — o CLAUDE.md já existe e já descreve o projeto.
- Peça sempre "rode npm run dev e me diga a URL" para ver ao vivo.
- Se algo sair do trilho: pare, descreva o que viu na tela, cole o erro.
- Commits: peça "commite o que está funcionando" ao fim de cada etapa boa.
