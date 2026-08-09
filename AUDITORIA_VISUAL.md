# Auditoria do sistema visual — app-leitura

Levantamento somente-leitura do estado atual. Nenhum arquivo do projeto foi
alterado; este documento é o único produto da sessão.

Data: 2026-08-08
Raiz auditada: `C:\Users\bruno\Claude\Projects\Projeto Pedra Angular\app-leitura`
(alcançada por `C:\Claude\app-leitura`, que é um link simbólico)

## 0. Onde o sistema visual vive

O projeto tem **duas superfícies visuais independentes**, e essa é a
descoberta estrutural mais importante da auditoria. Elas não compartilham
nenhum valor.

| Superfície | Arquivo | Linhas de estilo | Temas | Prefixo de token |
| --- | --- | --- | --- | --- |
| SPA (o app React) | `src/styles.css` | 1611 | 9 | `--color-*`, `--reading-*`, `--hl-*` |
| Rolo estático (`/rolo/<id>.html`) | `scripts/rolo/rolo_template.html` | 24–169 | 3 | `--bg`, `--ink`, `--accent`, `--font-scale` |
| Índice dos rolos | `scripts/rolo/gerador_rolo.py` linhas 513–523 | 10 | nenhum (cores fixas) | — |
| Impressão de trecho (aba nova) | `src/lib/printSection.ts` linhas 38–49 | 12 | nenhum (cinzas fixos) | — |

Arquivos de estilo no repositório inteiro (fora de `node_modules/`, `dist/` e
`public/livros/`): três. `index.html`, `src/styles.css`,
`scripts/rolo/rolo_template.html`. Não há pré-processador, framework CSS nem
etapa de build de estilo.

---

## 1. Cor

### 1.1 Identidade dos nove temas

O tema é aplicado por `data-theme` no elemento `html`, escrito por
`useTheme()` em `src/components/ThemeDialog.tsx` linhas 51–59. O tema `sepia`
é o padrão e **não tem seletor próprio**: ao escolhê-lo o código faz
`delete document.documentElement.dataset.theme` (linha 53), e o tema volta a
ser o `:root`. Persistência em `localStorage`, chave `app-theme`.

| Ordem na UI | Nome interno | Rótulo na UI | Seletor CSS | Linha do seletor | `color-scheme` | Grupo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `claro` | Preto sobre branco | `[data-theme='claro']` | 104 | light | baixa visão |
| 2 | `escuro` | Branco sobre preto | `[data-theme='escuro']` | 121 | dark | baixa visão |
| 3 | `amarelo` | Amarelo sobre preto | `[data-theme='amarelo']` | 138 | dark | baixa visão |
| 4 | `verde` | Verde sobre preto | `[data-theme='verde']` | 155 | dark | baixa visão |
| 5 | `amarelo-azul` | Amarelo sobre azul | `[data-theme='amarelo-azul']` | 241 | dark | baixa visão |
| 6 | `sepia` | Sépia | `:root` (ausência de `data-theme`) | 74 | light | conforto |
| 7 | `azul-noite` | Azul-noite | `[data-theme='azul-noite']` | 176 | dark | conforto |
| 8 | `azul-petroleo` | Azul-petróleo | `[data-theme='azul-petroleo']` | 193 | dark | conforto |
| 9 | `pergaminho` | Pergaminho | `[data-theme='pergaminho']` | 210 | light | decorativo |

A ordem da lista é significativa e está documentada em `ThemeDialog.tsx`
linhas 10–25: primeiro os pares clássicos de baixa visão, depois conforto,
depois decoração. `pergaminho` tem ainda um segundo bloco, `[data-theme='pergaminho'] body`
(linhas 228–239), que pinta oito gradientes radiais no fundo — é o único tema
com regra de estilo além das variáveis.

### 1.2 Valores por tema

Todos em `src/styles.css`. Dentro de cada bloco `[data-theme=...]` os tokens
aparecem sempre na mesma ordem, então a linha de cada valor é
`linha do seletor + deslocamento`:

| Token | Deslocamento |
| --- | --- |
| `--color-bg` | +1 |
| `--color-text` | +2 |
| `--color-muted` | +3 |
| `--color-accent` | +4 |
| `--color-surface` | +5 |
| `--color-border` | +6 |
| `--color-borda-ui` | +7 |
| `--shadow-color` | +8 |
| `--hl-bg` | +9 |
| `--hl-fg` | +10 |
| `--hl-cur-bg` | +11 |
| `--hl-cur-fg` | +12 |
| `--color-error` | +13 |
| `color-scheme` | +14 |

Duas exceções: em `verde`, um comentário de quatro linhas (166–169) empurra
`--hl-cur-bg` e os seguintes em +4; em `:root` (sépia) `--color-error` vem
antes dos `--hl-*` (linha 89) e há três tokens de leitura no topo (76–78).

| Token | sepia | claro | escuro | amarelo | verde | amarelo-azul | azul-noite | azul-petroleo | pergaminho |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--color-bg` | `#faf7f2` | `#ffffff` | `#000000` | `#000000` | `#000000` | `#001862` | `#0a1128` | `#062a30` | `#ccbc9d` |
| `--color-text` | `#2b2620` | `#000000` | `#ffffff` | `#ffe600` | `#33ff33` | `#ffe600` | `#f2e8d5` | `#e8f4f1` | `#241a08` |
| `--color-muted` | `#585049` | `#2e2e2e` | `#d6d6d6` | `#e6d24a` | `#4ada4a` | `#f0dc6e` | `#cfc4ae` | `#c0dcd6` | `#392b13` |
| `--color-accent` | `#6b3e15` | `#0000b4` | `#8ecbff` | `#ffffff` | `#ffffff` | `#ffffff` | `#ffd75e` | `#7fe0d0` | `#4a2a0c` |
| `--color-surface` | `#ffffff` | `#ffffff` | `#0d0d0d` | `#0d0c00` | `#001200` | `#001048` | `#0d1633` | `#08343c` | `#d5c7aa` |
| `--color-border` | `#e0d8cc` | `#5a5a5a` | `#8a8a8a` | `#a89b00` | `#1f9e1f` | `#5a6cb4` | `#3a4a7a` | `#2a6b74` | `#a08d66` |
| `--color-borda-ui` | `#8a8377` | `#5a5a5a` | `#8a8a8a` | `#a89b00` | `#1f9e1f` | `#8c9ad6` | `#7789b8` | `#66aab4` | `#63542f` |
| `--shadow-color` | `rgba(43,38,32,.25)` | `rgba(0,0,0,.4)` | `rgba(255,255,255,.15)` | `rgba(255,230,0,.2)` | `rgba(51,255,51,.2)` | `rgba(0,0,0,.5)` | `rgba(0,0,0,.6)` | `rgba(0,0,0,.55)` | `rgba(58,42,16,.35)` |
| `--hl-bg` | `#f5d76e` | `#ffe600` | `#ffe600` | `#ffffff` | `#ffffff` | `#ffffff` | `#ffd75e` | `#ffe600` | `#f5e08a` |
| `--hl-fg` | `#2b2620` | `#000000` | `#000000` | `#000000` | `#000000` | `#001862` | `#0a1128` | `#062a30` | `#241a08` |
| `--hl-cur-bg` | `#8a4408` | `#0000b4` | `#ff8c00` | `#ff8c00` | `#ff8c00` | `#ff8c00` | `#ff8c00` | `#ff8c00` | `#4a2a0c` |
| `--hl-cur-fg` | `#ffffff` | `#ffffff` | `#000000` | `#000000` | `#000000` | `#000000` | `#000000` | `#000000` | `#f5ecd8` |
| `--color-error` | `#8b2500` | `#b40000` | `#ffffff` | `#ffffff` | `#ffffff` | `#ffffff` | `#ffb4a2` | `#ffb4a2` | `#7a1f00` |

Treze tokens de cor por tema, nove temas: 117 valores, todos em hexadecimal
exceto `--shadow-color`, que é `rgba()` em todos os nove.

### 1.3 Cores fora do sistema de tokens

Cores literais que **não** passam por variável e portanto não mudam com o tema.

| Arquivo | Linha | Valor | Onde entra | Observação |
| --- | --- | --- | --- | --- |
| `src/styles.css` | 736 | `rgba(43,38,32,.4)` | `.sidebar-backdrop` | é o `--color-text` do sépia; o fundo escurecido do drawer é sempre sépia, em todos os nove temas |
| `src/styles.css` | 230 | `rgba(255,248,224,.55)` | `pergaminho body`, halo central | |
| `src/styles.css` | 231 | `rgba(104,70,22,.4)` | mancha superior esquerda | |
| `src/styles.css` | 232 | `rgba(96,62,20,.32)` | mancha superior direita | |
| `src/styles.css` | 233 | `rgba(92,60,18,.38)` | mancha inferior esquerda | |
| `src/styles.css` | 234 | `rgba(122,88,36,.22)` | mancha central direita | |
| `src/styles.css` | 235 | `rgba(130,96,44,.16)` | mancha central | |
| `src/styles.css` | 236 | `rgba(118,84,34,.18)` | mancha superior central | |
| `src/styles.css` | 237 | `rgba(78,50,14,.42)` | vinheta de borda | |
| `src/components/ThemeDialog.tsx` | 28–38 | 18 hexadecimais | preview dos botões de tema | cópia manual de `--color-bg` e `--color-text` dos nove temas |
| `src/components/ThemeDialog.tsx` | 58 | `#2b2620` | fallback do `meta[name=theme-color]` | |
| `index.html` | 7 | `#2b2620` | `meta theme-color` inicial | |
| `vite.config.ts` | 31 | `#2b2620` | `manifest.theme_color` | |
| `vite.config.ts` | 32 | `#faf7f2` | `manifest.background_color` | |
| `src/lib/printSection.ts` | 40 | `#1a1a1a` | corpo da folha impressa | |
| `src/lib/printSection.ts` | 43 | `#444` | `.marker` | |
| `src/lib/printSection.ts` | 45 | `#ccc`, `#333` | `blockquote` | |
| `src/lib/printSection.ts` | 47 | `#ccc` | `.footnotes` | |

### 1.4 Cores do rolo estático

Paleta completamente separada, em `scripts/rolo/rolo_template.html`.

| Token | Valor | Linha | Tema |
| --- | --- | --- | --- |
| `--bg-noite` | `#0A1220` | 29 | noite (padrão, `body[data-theme=noite]`) |
| `--ink-noite` | `#EAE3D3` | 29 | noite |
| `--bg-pergaminho` | `#EAE3D3` | 29 | pergaminho |
| `--ink-pergaminho` | `#241E14` | 29 | pergaminho |
| `--bg-petroleo` | `#0E2E33` | 30 | petróleo |
| `--ink-petroleo` | `#DCEEEF` | 30 | petróleo |
| `--accent` | `#C9A227` | 30 | todos |
| `--accent-soft` | `#8a7527` | 30 | todos |
| `--surface` | `rgba(255,255,255,.04)` | 31 | noite; redefinido em 36 e 37 |
| `--line` | `rgba(255,255,255,.14)` | 31 | noite; redefinido em 36 e 37 |

Seletores: `[data-theme="pergaminho"]` (linha 36) e `[data-theme="petroleo"]`
(linha 37), **no `body`**, não no `html` — divergem do app nesse ponto
também. Além dos tokens há dez ocorrências de `rgba(201,162,39,...)` (o
`--accent` reescrito à mão com opacidade) nas linhas 50, 52, 102, 107, 131,
134 e 137, mais `rgba(0,0,0,.35)` na 124 e `#fff`/`#000`/`#ccc` fixos no
bloco `@media print` da linha 167.

O índice dos rolos (`gerador_rolo.py` 513–522) repete `#0A1220`, `#EAE3D3`,
`#C9A227` e `#8a7527` como literais em uma string Python, sem variável
nenhuma.

---

## 2. Tipografia

### 2.1 Famílias e origem

Nenhuma fonte vem de CDN. Todas são arquivos locais, o que é coerente com o
requisito de funcionamento offline completo.

| Família | Origem | Arquivos | Pesos e estilos | Declaração |
| --- | --- | --- | --- | --- |
| Atkinson Hyperlegible | local, `public/fonts/` | `atkinson-hyperlegible-400.woff2`, `-700`, `-400i`, `-700i` | 400 normal, 700 normal, 400 italic, 700 italic | `src/styles.css` 7–34 |
| OpenDyslexic | local, `public/fonts/` | `opendyslexic-400.woff2`, `-700`, `-400i`, `-700i` | 400 normal, 700 normal, 400 italic, 700 italic | `src/styles.css` 43–69 |
| Georgia | fonte do sistema | — | — | pilha padrão, `src/styles.css` 78 |
| Atkinson Hyperlegible (rolo) | local, `scripts/rolo/fontes/` | `Atkinson-Regular.woff2`, `Atkinson-Bold.woff2` | 400, 700 (sem itálico) | gerada por `gerador_rolo.py` 344–357 |

As oito faces do app usam `font-display: swap`. As duas do rolo também. O
rolo tem dois modos de embutir: por URL relativa (linhas 344–347) ou por
`data:font/woff2;base64` inline (linhas 352–357), este último para o arquivo
único autossuficiente.

Licenças presentes: `public/fonts/Atkinson-OFL.txt` e
`public/fonts/OpenDyslexic-OFL.txt`. Não há licença ao lado das cópias em
`scripts/rolo/fontes/`.

**Não existe família dedicada a grego nem a hebraico.** O comentário de
`styles.css` linha 5 reconhece isso: "Grego/hebraico caem no fallback". Na
prática o grego e o hebraico são renderizados por Georgia ou pela fonte de
sistema, e o hebraico recebe apenas um ajuste de corpo (`.hebrew`, linhas
1093–1097: `font-size: 1.3em`, `line-height: 1.9`).

### 2.2 Pilhas de fonte

| Identificador | Pilha | Onde |
| --- | --- | --- |
| `georgia` (padrão) | `Georgia, 'Times New Roman', serif` | `ThemeDialog.tsx` 70; também `styles.css` 78 |
| `atkinson` | `'Atkinson Hyperlegible', Georgia, 'Times New Roman', serif` | `ThemeDialog.tsx` 74 |
| `opendyslexic` | `'OpenDyslexic', Georgia, 'Times New Roman', serif` | `ThemeDialog.tsx` 79 |
| decorativa Φ | `Georgia, serif` | `styles.css` 318 (`.phi-button`), 1374 (`.theme-option-sample`) |
| impressão | `Georgia, 'Times New Roman', serif` | `printSection.ts` 39 |
| rolo, leitura | `'Atkinson Hyperlegible', Georgia, serif` | `rolo_template.html` 34 |
| rolo, monoespaçada | `ui-monospace, Consolas, 'Courier New', monospace` | `rolo_template.html` 33 |

A escolha persiste em `localStorage`, chave `app-font-family`, e é escrita em
`--reading-font-family` no elemento `html` (`ThemeDialog.tsx` 93–97).

### 2.3 Tamanhos

Não existe escala tipográfica nomeada. Os tamanhos são calculados a partir de
`--reading-font-size` (em `em`, dentro do texto) ou escritos em `rem` (na
moldura da interface). Inventário completo:

| Contexto | Valor | Linha | Unidade |
| --- | --- | --- | --- |
| `--reading-font-size` (padrão no CSS) | `1.125rem` | 76 | rem |
| `--reading-line-height` | `1.7` | 77 | sem unidade |
| `.reader-body` | `var(--reading-font-size)` | 879 | herdada |
| `.reader-body h1` | `1.6em` / entrelinha `1.3` | 911–912 | em |
| `.reader-body h2` | `1.35em` / `1.3` | 916–917 | em |
| `.reader-body h3` | `1.15em` / `1.35` | 922–923 | em |
| heading em seção recolhível | `calc(var(--reading-font-size) * (1.28 - min(--nivel - 1, 10) * 0.045))` | 1142 | calculada |
| `.hebrew` | `1.3em` / `1.9` | 1095–1096 | em |
| `.catalog-header h1` | `1.4em` | 303 | em |
| `.catalog-item-title` | `1.1em` | 358 | em |
| `.sidebar-header h2` | `1.15em` | 771 | em |
| `.toc-item` (entrelinha) | `1.4` | 843 | sem unidade |
| `.toc-action`, `.lib-book-author`, `.toc-name-count`, `.copy-dialog-hint`, `.lib-folder-count` | `0.85em` | 810, 726, 1101, 1337, 661 | em |
| `.heading-menu-list button` | `0.9em` | 1221 | em |
| `.wikilink-box-content` | `0.9em` / `1.55` | 1062–1063 | em |
| `.wikilink-box-note`, `.footnote-box-content` | `0.95em` | 1055, 1551 | em |
| `.text-search` | `calc(var(--reading-font-size) * 0.9)` | 447 | calculada |
| `.library-drawer`, `.sidebar`, `.copy-dialog` | `calc(var(--reading-font-size) * 0.95)` | 514, 740, 1292 | calculada |
| `.tts` | `calc(var(--reading-font-size) * 0.85)` | 1443 | calculada |
| `.phi-button` | `1.5rem` | 320 | rem |
| `.font-button` | `1.5rem`; variante grande `1.7rem` | 418, 426 | rem |
| `.library-button` | `1.25rem` | 310 | rem |
| `.toc-button` | `1.3rem` | 432 | rem |
| `.editor-cancel`, `.sidebar-close` | `1.2rem` | 588, 790 | rem |
| `.search-button`, `.appearance-button` | `1.1rem` | 440, 784 | rem |
| `.back-button` | `1rem` | 394 | rem |
| `.tts-fab` | `1.4rem` | 1453 | rem |

Nenhum `font-size` em `px` no CSS. Todos os `px` do arquivo são bordas
(`1px`, `2px`, `3px`) e deslocamentos de sombra — uso legítimo.

### 2.4 O controle de tamanho pelo usuário

Implementado em `src/components/FontControls.tsx`. Três entradas para o mesmo
estado:

1. Botões `−` e `+` no cabeçalho de leitura (linhas 124–135), rotulados
   "Diminuir letra" / "Aumentar letra" via `aria-label`.
2. Pinça de dois dedos sobre o texto (`usePinchFontSize`, linhas 62–117), com
   `e.preventDefault()` no `touchmove` para o navegador não fazer zoom visual —
   o texto reflui em vez de rolar lateralmente.
3. `Ctrl` + roda do mouse ou pinça de trackpad, no `window` inteiro
   (linhas 98–102), fator 1,06 por passo.

Parâmetros:

| Constante | Valor | Linha |
| --- | --- | --- |
| chave de persistência | `reading-font-px` | 4 |
| padrão | `18` | 5 |
| mínimo | `12` | 6 |
| máximo | `256` | 8 |
| passo dos botões | `× 1.125` / `÷ 1.125` | 9 |
| passo da roda | `× 1.06` | 101 |

O valor é gravado como **pixels absolutos** em `--reading-font-size`
(linha 46: `` `${px}px` ``). Ver o item 5 abaixo — é o achado principal
sobre unidades.

Há um cuidado incomum e que vale registrar no sistema: `withReadingAnchor`
(linhas 18–35) mede a posição de um elemento visível antes da mudança, aplica
o novo tamanho com `flushSync` e rola a janela de volta para a mesma posição.
Mudar o corpo do texto não perde o ponto de leitura.

No rolo estático o mecanismo é outro: `--font-scale` (multiplicador entre
0,8 e 2,6, passo 0,1), aplicado em `calc(...)` sobre valores em `rem`
(`rolo_template.html` 286–291). É a solução relativa que falta no app.

---

## 3. Espaço, raio, sombra e transição

### 3.1 Espaçamentos

Não há grade nomeada. Contagem em `padding`, `gap` e `margin` de
`src/styles.css`, por frequência:

| Valor | Ocorrências | Papel típico |
| --- | --- | --- |
| `0.5rem` | 26 | padding vertical de botão, gap curto |
| `1rem` | 25 | padding lateral de painel |
| `0.75rem` | 24 | padding de linha de lista, gap médio |
| `0.6rem` | 16 | padding de campo de texto |
| `0.25rem` | 9 | gap mínimo, margem de ajuste |
| `0.9rem` | 8 | padding de botão grande |
| `0.4rem` | 8 | gap de barra de ações |
| `4rem` | 7 | folga inferior e `scroll-margin-top` |
| `2rem` | 5 | margem entre blocos |
| `1.5rem`, `1.1rem`, `0.85rem` | 3 cada | avulsos |
| `1.25rem`, `0.65rem` | 2 cada | avulsos |
| `3rem`, `1.75rem`, `0.7rem`, `0.35rem`, `0.32rem`, `0.2rem`, `0.15rem` | 1 cada | avulsos |

Onze valores distintos abaixo de `1rem` cobrem a mesma faixa de espaço curto.
É a maior fonte de ruído do arquivo.

Larguras e alturas de referência:

| Valor | Onde | Linha |
| --- | --- | --- |
| `40rem` | `.catalog` largura máxima | 287 |
| `42rem` | `.reader-body` largura máxima (a medida de linha real do app) | 876 |
| `min(20rem, 85vw)` | largura dos dois drawers | 520, 746 |
| `min(24rem, calc(100vw - 2rem))` | `.copy-dialog` | 1298 |
| `min(19rem, calc(100vw - 2rem))` | `.tts-panel` | 1466 |
| `2.75rem` | alvo de toque mínimo (44 px em raiz padrão) | 21 em `min-height`, 5 em `min-width` |
| `3rem`, `3.25rem`, `3.5rem` | alvos maiores (fechar nota, opção de tema, toggle do sumário) | 1324, 1365, 871 |
| `4rem` | `scroll-margin-top` sob o cabeçalho fixo | 932, 997, 1021, 1172, 1582, 1588 |
| `3.5rem` | `top` da barra de busca fixa | 449 |

`42rem` é a única declaração de medida de linha, e é dada em largura de
caixa, não em `ch`. Com Georgia a 18 px isso dá algo entre 70 e 80
caracteres por linha; com a fonte a 60 px, cerca de 20.

### 3.2 Raios de borda

| Valor | Ocorrências | Papel |
| --- | --- | --- |
| `0.375rem` | 13 | botão pequeno, campo de texto |
| `0.5rem` | 13 | cartão, botão grande, painel |
| `0.75rem` | 2 | diálogo, painel do TTS |
| `0.4em` | 2 | chip da seta de seção, menu de heading |
| `0.25em` | 1 | alvo do número de versículo |
| `0.2em` | 1 | `mark` |
| `2rem` | 1 | toast (pílula) |
| `50%` | 1 | botão flutuante do TTS |

Oito valores, três unidades diferentes (`rem`, `em`, `%`), para o que é
essencialmente uma escala de três degraus.

### 3.3 Sombras

Sempre `0 Ypx Bpx var(--shadow-color)`, exceto as dos drawers, que são
laterais. Cinco combinações distintas:

| Sombra | Onde | Linha |
| --- | --- | --- |
| `4px 0 16px` | `.library-drawer` (para a direita) | 523 |
| `-4px 0 16px` | `.sidebar` (para a esquerda) | 749 |
| `0 4px 16px` | `.heading-menu-list`, `.toast`, `.tts-panel`, `.footnote-box` | 1211, 1401, 1471, 1547 |
| `0 8px 32px` | `.copy-dialog` | 1303 |
| `0 2px 10px` | `.update-banner`, `.tts-fab` | 1420, 1455 |

No rolo há uma sexta, com cor própria: `0 6px 20px rgba(0,0,0,.35)`
(`rolo_template.html` 124).

### 3.4 Transições e animação

O app inteiro tem **duas** transições e **uma** animação:

| Efeito | Valor | Linha |
| --- | --- | --- |
| `.library-drawer` | `transform 0.2s ease` | 525 |
| `.sidebar` | `transform 0.2s ease` | 751 |
| `.ref-flash` | `animation: ref-flash 1.6s ease-out` (keyframes 490–499) | 487 |

O rolo tem três: `background .5s, color .5s` no `body` (linha 41),
`transform .25s` no caret (86) e `opacity .25s, transform .25s` no flash (139).

---

## 4. Valores repetidos ou quase iguais

Ordenados por gravidade.

### 4.1 A paleta dos nove temas existe duas vezes

`src/styles.css` linhas 81–255 e `src/components/ThemeDialog.tsx` linhas
28–38. O array `THEMES` copia à mão o `--color-bg` e o `--color-text` de cada
tema para desenhar o preview do botão. Hoje os dezoito valores batem
exatamente; nada no código garante que continuem batendo. Mudar um tema no
CSS e esquecer o TSX produz um botão de preview que mente sobre o tema que
ele aplica — e é justamente o botão que quem tem baixa visão usa para
escolher.

### 4.2 `#2b2620` em quatro lugares, três deles fora do sistema

| Arquivo | Linha | Papel |
| --- | --- | --- |
| `src/styles.css` | 82 | `--color-text` do sépia (a fonte legítima) |
| `src/styles.css` | 88 | dentro de `rgba(43,38,32,.25)` — o mesmo valor em decimal |
| `src/styles.css` | 736 | dentro de `rgba(43,38,32,.4)` — idem, em `.sidebar-backdrop` |
| `src/components/ThemeDialog.tsx` | 58 | fallback do `theme-color` |
| `index.html` | 7 | `meta theme-color` |
| `vite.config.ts` | 31 | `manifest.theme_color` |

Seis ocorrências da mesma cor, em duas notações (`#2b2620` e `43,38,32`),
em quatro arquivos. O `rgba` de `.sidebar-backdrop` é o pior caso: como não
é variável, o fundo escurecido do drawer permanece sépia mesmo nos temas
preto-sobre-branco e amarelo-sobre-preto.

### 4.3 `#faf7f2` em dois lugares

`src/styles.css` 81 (`--color-bg` do sépia) e `vite.config.ts` 32
(`manifest.background_color`). Mesma cor, sem ligação.

### 4.4 `--color-border` e `--color-borda-ui` coincidem em quatro temas

| Tema | `--color-border` | `--color-borda-ui` | Iguais? |
| --- | --- | --- | --- |
| claro | `#5a5a5a` | `#5a5a5a` | sim |
| escuro | `#8a8a8a` | `#8a8a8a` | sim |
| amarelo | `#a89b00` | `#a89b00` | sim |
| verde | `#1f9e1f` | `#1f9e1f` | sim |
| sepia | `#e0d8cc` | `#8a8377` | não |
| azul-noite | `#3a4a7a` | `#7789b8` | não |
| azul-petroleo | `#2a6b74` | `#66aab4` | não |
| amarelo-azul | `#5a6cb4` | `#8c9ad6` | não |
| pergaminho | `#a08d66` | `#63542f` | não |

A distinção é semanticamente correta e está justificada em
`scripts/medir_contraste.py` linhas 149–153 (separador decorativo versus
contorno de componente, que responde a WCAG 1.4.11). Nos quatro temas de
contraste máximo os dois colapsam no mesmo valor — o que é aceitável, mas
merece ser decisão explícita do sistema e não coincidência.

### 4.5 `#ff8c00` como cor da ocorrência atual em seis temas

Linhas 132, 149, 170, 187, 204, 252. É o mesmo laranja repetido seis vezes,
com o motivo documentado apenas uma (comentário nas linhas 166–169, no tema
verde). Candidato claro a um token de nível acima do tema.

### 4.6 `#ffe600` e `#ffffff` atravessando papéis

`#ffe600` aparece como `--color-text` (amarelo, amarelo-azul) e como `--hl-bg`
(claro, escuro, azul-petroleo): linhas 140, 243, 113, 130, 202. `#ffffff`
aparece como `--color-bg`, `--color-surface`, `--color-accent`, `--hl-bg`,
`--hl-cur-fg` e `--color-error` conforme o tema. Isso é esperado num sistema
de nomes semânticos e não é defeito — está listado aqui só para que a extração
de tokens não confunda repetição de valor com repetição de papel.

### 4.7 Duas paletas para o mesmo projeto

O rolo (`#0A1220`, `#EAE3D3`, `#C9A227`) não compartilha um único valor com o
app. Os nomes de tema até se repetem — "pergaminho" e "petróleo" existem nos
dois — mas com cores diferentes:

| Nome | App | Rolo |
| --- | --- | --- |
| pergaminho (fundo) | `#ccbc9d` | `#EAE3D3` |
| pergaminho (texto) | `#241a08` | `#241E14` |
| azul-petróleo / petroleo (fundo) | `#062a30` | `#0E2E33` |
| azul-petróleo / petroleo (texto) | `#e8f4f1` | `#DCEEEF` |
| azul-noite / noite (fundo) | `#0a1128` | `#0A1220` |
| azul-noite / noite (texto) | `#f2e8d5` | `#EAE3D3` |

Três pares de valores quase iguais com nomes iguais. É exatamente o caso
"`#0F2038` em três arquivos e `#0F2039` num quarto" — aqui a diferença é
maior, mas a natureza do problema é a mesma.

Há ainda divergência de notação: o app escreve hexadecimal em minúsculas, o
rolo em maiúsculas (`#0A1220`) misturado com minúsculas (`#8a7527`, na mesma
linha 30).

### 4.8 Repetições estruturais menores

- `2.75rem` escrito 26 vezes (21 em `min-height`, 5 em `min-width`).
- `border-radius: 0.375rem` treze vezes, `0.5rem` treze vezes.
- `border: 1px solid var(--color-borda-ui)` doze vezes.
- `scroll-margin-top: 4rem` seis vezes, sempre pelo mesmo motivo (altura do
  cabeçalho fixo), sem nenhuma ligação com o valor real do cabeçalho.
- `box-shadow: 0 4px 16px var(--shadow-color)` quatro vezes.
- O bloco de quatro `@font-face` é escrito duas vezes com a mesma forma
  (linhas 7–34 e 43–69), variando apenas família e caminho.

---

## 5. Valores fixos em px que deveriam ser relativos

### 5.1 O tamanho de leitura é gravado em px absolutos

`src/components/FontControls.tsx` linha 46:

```js
document.documentElement.style.setProperty('--reading-font-size', `${px}px`)
```

O CSS declara o padrão corretamente em `rem` (`styles.css` linha 76:
`--reading-font-size: 1.125rem`), mas esse valor vive apenas até o primeiro
`useEffect`, que o substitui por `18px` mesmo quando o usuário não mexeu em
nada — o `useEffect` roda na montagem.

Consequência: **o app ignora o tamanho de fonte configurado no navegador ou
no sistema.** Quem já aumentou a fonte padrão do Android, do iOS ou do
Chrome para 24 px continua recebendo texto a 18 px na primeira abertura e
precisa aumentar de novo, dentro do app. Para um leitor com baixa visão essa
é a configuração que ele mais provavelmente já fez.

A moldura da interface não sofre disso: `2.75rem`, `1.5rem` e companhia
continuam relativos à raiz, que o app não toca. O efeito colateral é que os
dois eixos (texto e moldura) deixam de andar juntos.

Correção natural: guardar o valor em `rem` (ou converter na escrita,
dividindo pela `font-size` computada da raiz). O rolo já faz o certo com
`--font-scale`.

### 5.2 Alvos de toque abaixo de 44 px no rolo

`scripts/rolo/rolo_template.html`:

| Seletor | Valor | Linha |
| --- | --- | --- |
| `.coordenada .copiar` | `min-height: 38px` | 106 |
| `.ouvir-secao` | `min-height: 38px` | 109 |
| `.menu-secao` | `min-width: 38px; min-height: 38px` | 117 |
| `.item-acao` | `min-height: 40px` | 127 |

Todos abaixo do piso de 44×44 px, e em `px` fixo — não crescem quando o
leitor aumenta a fonte pelo `A+`. A barra do topo (`.barra-topo button`,
linha 48) e o toggle de título (linha 72) respeitam os 44 px, também em `px`
fixo. O app usa `2.75rem` no lugar, que é o valor certo na unidade certa.

### 5.3 `min-width: 180px` no painel de ações do rolo

`rolo_template.html` linha 123. Painel de menu com largura mínima fixa: com
`--font-scale` em 2,6 o texto dos itens transborda ou quebra.

### 5.4 Casos que estão certos e não devem ser mexidos

Registro explícito para a refatoração não "consertar" o que funciona:

- Bordas de `1px`, `2px` e `3px` em ambos os arquivos. Borda de traço fino é
  um dos poucos lugares onde o pixel é a unidade correta; em `rem` ela
  engorda junto com a fonte sem ganho de legibilidade.
- Deslocamentos e desfoques de `box-shadow` em `px`.
- `border-radius: 50%` no botão circular do TTS.
- `1px`/`2px` de `outline-offset` no rolo.

---

## 6. Acessibilidade

### 6.1 Contraste

O projeto tem um verificador próprio, `scripts/medir_contraste.py`, que lê os
temas **direto do CSS publicado** (linhas 124–136) e mede sete pares por tema
mais a distância perceptual entre o realce da busca e o da ocorrência atual,
com simulação de protanopia, deuteranopia e tritanopia (Viénot, Brettel e
Mollon, 1999). Isso é bem acima do estado da arte típico e deve subir para o
sistema compartilhado como está.

Execução em 2026-08-08: **9 temas medidos, 0 com qualquer reprova.**

| Tema | Texto/fundo | Texto secundário | Acento/fundo | Erro/fundo | Busca | Ocorrência atual | Contorno de componente |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claro | 21,00 | 13,58 | 12,66 | 7,14 | 16,57 | 12,66 | 6,90 |
| escuro | 21,00 | 14,45 | 12,14 | 21,00 | 16,57 | 9,00 | 6,08 |
| amarelo | 16,57 | 13,68 | 21,00 | 21,00 | 21,00 | 9,00 | 7,35 |
| verde | 15,49 | 11,42 | 21,00 | 21,00 | 21,00 | 9,00 | 5,97 |
| amarelo-azul | 12,68 | 11,60 | 16,07 | 16,07 | 16,07 | 9,00 | 5,90 |
| sepia | 14,03 | 7,39 | 8,45 | 8,32 | 10,59 | 7,21 | 3,51 |
| azul-noite | 15,38 | 10,82 | 13,47 | 10,95 | 13,47 | 9,00 | 5,39 |
| azul-petroleo | 13,49 | 10,46 | 9,75 | 8,90 | 11,99 | 9,00 | 5,77 |
| pergaminho | 9,17 | 7,36 | 6,91 | 5,56 | 12,98 | 10,98 | 3,96 |

Pisos aplicados pelo script: 7,0 para texto corrido e realce de busca; 4,5
para acento e erro; 3,0 para contorno de componente. Separador decorativo
(`--color-border`) é medido e relatado sem piso — vai de 1,32 (sépia) a
7,35 (amarelo).

Três observações que o script não cobre:

**a) A opacidade decrescente dos títulos derruba o contraste.** Duas regras
multiplicam a opacidade do texto: `styles.css` 1143
(`opacity: calc(1 - min(--nivel - 1, 14) * 0.035)`) e 1286
(`.text-section-collapsed .section-heading { opacity: 0.85 }`). Elas se
combinam. Como o corpus embarcado não passa do nível 4 de heading (1035
arquivos com `##`, 256 com `###`, 26 com `####`, nenhum com `#####` ou mais),
o pior caso real hoje é nível 4 com a seção recolhida:

| Tema | Nível 1 aberto | Nível 1 recolhido | Nível 4 aberto | Nível 4 recolhido |
| --- | --- | --- | --- | --- |
| claro | 21,00 | 15,13 | 17,22 | 10,86 |
| escuro | 21,00 | 14,88 | 16,52 | 11,79 |
| amarelo | 16,57 | 11,76 | 13,13 | 9,43 |
| verde | 15,49 | 11,06 | 12,25 | 8,83 |
| amarelo-azul | 12,68 | 9,28 | 10,20 | 7,59 |
| sepia | 14,03 | 8,87 | 10,21 | 6,59 |
| azul-noite | 15,38 | 11,24 | 12,36 | 9,16 |
| azul-petroleo | 13,49 | 10,11 | 11,06 | 8,38 |
| pergaminho | 9,17 | 6,72 | 7,42 | 5,36 |

Dois temas caem abaixo de 7:1 no título de uma seção recolhida: pergaminho
já no nível 1 (6,72) e sépia no nível 4 (6,59); pergaminho no nível 4 chega
a 5,36. Nenhum cai abaixo de 4,5. Como um livro importado pelo usuário pode
ter headings mais profundos (o parser não tem teto, por decisão de projeto —
`remarkDeepHeadings.ts`), o valor pode cair mais: no nível 15 a opacidade
chega a 0,51 e o pergaminho chega a 2,88.

**b) Nada é medido contra `--color-surface`.** Cartões, diálogos, drawers e
o menu de heading usam `--color-surface` como fundo, e o script mede tudo
contra `--color-bg`. Medido agora, o pior caso é o acento sobre superfície no
pergaminho: 7,73 — todos passam com folga. Vale acrescentar o par ao script
para que continue verdade.

**c) O rolo estático não é medido por script nenhum.** Medido agora:

| Tema do rolo | Texto/fundo | `--accent` sobre fundo | `--accent-soft` sobre fundo |
| --- | --- | --- | --- |
| noite | 14,66 | 7,75 | 4,15 |
| pergaminho | 12,93 | **1,89** | 3,53 |
| petroleo | 12,02 | 5,96 | 3,19 |

O texto corrido passa nos três. Mas `--accent` (`#C9A227`) sobre o fundo
pergaminho (`#EAE3D3`) dá **1,89:1** — abaixo até do piso de 3:1 para
elementos não textuais. E `--accent` é usado no rolo para o número de
versículo, o marcador canônico, a etiqueta de idioma, o caret e o anel de
foco. No tema pergaminho do rolo, o anel de foco de teclado é praticamente
invisível. Este é o achado de contraste mais grave da auditoria.

`--accent-soft` (`#8a7527`) fica abaixo de 3:1 no petróleo (3,19 passa por
pouco) e no pergaminho (3,53), mas é usado só como borda decorativa.

### 6.2 Foco de teclado

Aqui as duas superfícies divergem por completo.

**O rolo está correto.** Nove regras `:focus-visible` com
`outline: 2px solid var(--accent); outline-offset: 2px` (linhas 51, 73, 108,
112, 121, 128, 132) e um link "Pular para o texto" com `a.pular:focus`
(linhas 43–44) que traz o link de fora da tela para dentro. Ressalva: o anel
usa `--accent`, que no tema pergaminho tem 1,89:1 de contraste — ver 6.1c.

**O app não tem indicador de foco.** Em 1611 linhas de `src/styles.css` há
exatamente duas ocorrências de `outline` ou `:focus`:

| Linha | Regra | Efeito |
| --- | --- | --- |
| 633 | `.editor-area { outline: none }` | **remove** o anel de foco do campo de escrita e não põe nada no lugar |
| 1225 | `.heading-menu-list button:hover, :focus-visible { background: var(--color-bg) }` | única resposta a foco no app inteiro, e é uma troca de fundo, não um anel |

Não há `:focus-visible` global, não há regra de anel, não há link "pular para
o conteúdo". O app depende inteiramente do anel padrão do navegador — que o
Chrome desenha em preto e branco, sem relação com o tema, e que fica
invisível ou quase sobre `#000000` (temas escuro, amarelo, verde) e sobre
`#ffffff` (temas claro, sépia). Em `.editor-area` nem isso existe.

Isto é o desvio mais claro entre o que o projeto declara e o que o código faz:
`CLAUDE.md` linha 61–62 fala em contraste mínimo por tema, e a especificação
do sistema visual coloca "foco de teclado sempre visível" na Camada 0.

Um dado que atenua: `styles.css` linhas 1000–1004 explicam por que o marcador
canônico e o número de versículo **não** são `<button>` — um livro tem
milhares deles e milhares de paradas de tabulação atrapalhariam a navegação
por teclado. A decisão é deliberada e correta; o que falta é o anel nos
elementos que de fato recebem foco.

### 6.3 `prefers-reduced-motion`

| Superfície | Suporte |
| --- | --- |
| Rolo (`rolo_template.html` linha 42) | sim — `@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;}}` |
| App (`src/styles.css`) | **não** — zero ocorrências |

O app tem pouca coisa a suprimir (duas transições de `transform 0.2s` e a
animação `ref-flash` de 1,6 s), mas `ref-flash` é justamente um pulso de cor
de fundo disparado ao saltar para uma referência canônica — o tipo de efeito
que a preferência existe para desligar. A regra do rolo pode ser copiada tal
como está.

Nenhuma das duas superfícies usa `prefers-contrast` ou
`prefers-color-scheme`. No caso deste app isso é decisão coerente: o tema é
escolha explícita do leitor, não do sistema operacional. Vale registrar como
decisão no documento do sistema, para ninguém "consertar" depois.

### 6.4 Atributo `lang` — o achado mais sério da auditoria

A situação é oposta entre as duas superfícies.

**No rolo, correto e cuidadoso.** `gerador_rolo.py`:

- `idioma_da_linha()` (linhas 45–53) detecta a escrita por faixa Unicode e
  devolve o par `(lang, dir)`: hebraico `U+0590–U+05FF` → `he`/`rtl`; grego
  `U+0370–U+03FF` e `U+1F00–U+1FFF` → `grc`/`ltr`; cirílico → `ru`/`ltr`.
- Cada `<p>` recebe `lang` e, quando é o caso, `dir="rtl"` (linhas 276–289).
- `idioma_bcp47()` (linhas 84–98) converte o `language:` do front matter
  (ISO 639-2/B) para BCP 47, e alimenta o `lang` do elemento `html`.
- A escolha de `grc` em vez de `el` é explicada em comentário (linha 67):
  grego antigo e moderno têm fonética diferente, e o leitor de tela precisa
  saber qual.
- Códigos desconhecidos não somem em silêncio: vão para
  `IDIOMAS_DESCONHECIDOS` e são relatados ao fim da execução (linhas 79–98).
- Os links do índice também recebem `lang` da obra (linhas 714, 1002, 1046).

**No app, quase ausente.** Busca por `lang=` em `src/`: um único resultado,
`printSection.ts` linha 61, que fixa `lang="pt-BR"` na aba de impressão —
inclusive quando o trecho impresso é grego ou hebraico. Além dele:

| Onde | Estado |
| --- | --- |
| `index.html` linha 2 | `lang="pt-BR"` no `html` — correto para a casca |
| `vite.config.ts` linha 24 | `manifest.lang: 'pt-BR'` — correto |
| Trechos em grego no corpo do texto | **nenhum `lang`** — não há detecção de grego em `src/` |
| Trechos em hebraico | `dir="rtl"` sim (`remarkHebrew.ts` linha 31), `lang="he"` **não** |
| Livro inteiro em grego ou hebraico | nenhum `lang` no contêiner — o catálogo tem o campo, mas ele não chega ao DOM |

O `remarkHebrew` monta `hProperties: { className: ['hebrew'], dir: 'rtl' }`.
Falta `lang: 'he'` na mesma linha, e não existe plugin equivalente para grego.

A consequência é direta e está no requisito de projeto: **o TTS do app lê
grego e hebraico com fonética portuguesa.** `TtsControl.tsx` escolhe a voz
uma vez, por preferência global (linhas 129–141: melhor voz local em pt-BR,
depois pt, depois qualquer uma) e a aplica a todos os parágrafos. O rolo, no
mesmo repositório, faz o certo: `idiomaDoTexto()` (`rolo_template.html`
304–308) devolve `he-IL`, `el-GR` ou `pt-BR` e a atribui a cada
`SpeechSynthesisUtterance` (linha 527).

A lógica necessária já existe no projeto, escrita duas vezes em Python e uma
em JavaScript. Só não está no app.

### 6.5 O que já está bem e deve virar regra do sistema

- Área de toque: `2.75rem` (44 px na raiz padrão) em 26 declarações,
  com alvos maiores onde o erro motor custa mais caro — `.footnote-box-close`
  e `.wikilink-box-open` em `3rem`, `.theme-option` em `3.25rem`,
  `.toc-toggle` em `3.5rem` de largura. Comentários no CSS explicam cada um.
- `index.html` linha 5–6: viewport sem `user-scalable=no` e sem
  `maximum-scale`, com o motivo escrito ao lado. O pinch nativo é requisito.
- `-webkit-text-size-adjust: 100%` no `body` (linha 272).
- `overflow-wrap: break-word` e `hyphens: auto` em `.reader-body` (882–883),
  para que a palavra não estoure a tela em corpo 60.
- Ampliação de alvo por `padding` negativo compensado por `margin`
  (`.verse-number`, `.marker`, linhas 1005–1012; chamada de nota, 1525–1535):
  o alvo cresce e o texto não dança.
- `aria-label` nos botões de ícone (`FontControls.tsx` 127/130,
  `ThemeDialog.tsx` 124), `aria-pressed` nas opções de tema e fonte,
  `aria-hidden` nos ornamentos (`Φ`, `Aa`).
- `.hebrew` com `unicode-bidi: isolate` (linha 1094): o hebraico corre à
  direita dentro do run sem inverter o parágrafo — requisito do interlinear.
- No rolo: `sr-only`, `aria-live="polite"` no flash, `aria-live="assertive"`
  no anúncio, `aria-expanded`/`aria-controls` nos toggles, `role="group"`
  nos grupos da barra, e a rede de segurança que devolve o texto se o motor
  cair (linhas 569–580).

---

## 7. Resumo dos achados, por prioridade

| # | Achado | Onde | Gravidade |
| --- | --- | --- | --- |
| 1 | Sem `lang` em grego e hebraico no app; TTS lê tudo com voz pt-BR | `src/lib/remarkHebrew.ts`, ausência de plugin grego, `TtsControl.tsx` | alta |
| 2 | Sem indicador de foco de teclado no app; `outline: none` no editor | `src/styles.css` 633, e ausência geral | alta |
| 3 | `--accent` do rolo a 1,89:1 no tema pergaminho, inclusive no anel de foco | `rolo_template.html` 30, 36 | alta |
| 4 | Tamanho de leitura gravado em `px` absolutos; ignora a fonte do sistema | `FontControls.tsx` 46 | alta |
| 5 | Sem `prefers-reduced-motion` no app | `src/styles.css` | média |
| 6 | Paleta dos nove temas duplicada em CSS e TSX, sem garantia de sincronia | `styles.css` 81–255 e `ThemeDialog.tsx` 28–38 | média |
| 7 | `.sidebar-backdrop` com `rgba` fixo, sempre sépia em todos os temas | `src/styles.css` 736 | média |
| 8 | Duas paletas para o mesmo projeto, com nomes de tema iguais e valores diferentes | app versus rolo | média |
| 9 | Alvos de toque de 38 e 40 px no rolo, em `px` fixo | `rolo_template.html` 106, 109, 117, 127 | média |
| 10 | Opacidade dos títulos derruba pergaminho e sépia abaixo de 7:1 quando recolhidos | `src/styles.css` 1143, 1286 | média |
| 11 | `min-width: 180px` fixo no painel de ações do rolo | `rolo_template.html` 123 | baixa |
| 12 | Sem escala de espaço, raio ou sombra: 8 raios, ~12 espaços curtos, 5 sombras | `src/styles.css` | baixa |
| 13 | `#2b2620` e `#faf7f2` repetidos fora do CSS (manifest, meta, fallback) | `index.html`, `vite.config.ts`, `ThemeDialog.tsx` | baixa |
| 14 | Impressão com cinzas fixos, alheia ao tema | `src/lib/printSection.ts` 38–49 | baixa |
| 15 | Medida de linha declarada em `rem` de largura (`42rem`), não em `ch` | `src/styles.css` 876 | baixa |
| 16 | Sem licença ao lado das fontes do rolo | `scripts/rolo/fontes/` | baixa |
| 17 | Notação hexadecimal inconsistente entre app (minúsculas) e rolo (mista) | ambos | baixa |

## 8. O que o sistema compartilhado deveria herdar daqui

Além dos valores, três coisas deste projeto merecem subir para o repositório
canônico como parte do sistema, não como código específico do app:

1. `scripts/medir_contraste.py` inteiro. Ler os temas do CSS publicado em vez
   de uma cópia digitada é a decisão que faz o número continuar verdadeiro.
   Falta acrescentar os pares contra `--color-surface` e uma passagem pelo
   arquivo do rolo.
2. A tabela `idioma_da_linha` / `IDIOMAS_BCP47` de `gerador_rolo.py`, incluindo
   a distinção `grc` versus `el` e o relatório de códigos desconhecidos.
3. A convenção de ampliar alvo de toque com `padding` compensado por `margin`
   negativa, em vez de aumentar o corpo da fonte. Está resolvida aqui e é
   exatamente o tipo de coisa que uma primitiva de botão deve carregar pronta.
