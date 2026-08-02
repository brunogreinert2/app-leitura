---
id: estrutura-biblioteca-v2-idioma
type: meta
title: "Estrutura da Biblioteca v2 — idioma como eixo de pasta"
project: pedra_angular
status: aplicado
related:
  - "ESTRUTURA_BIBLIOTECA.md"
---

# Estrutura v2 — idioma dentro de cada seção

**Aplicado em 2026-08-01.** Revisão da v1 (`ESTRUTURA_BIBLIOTECA.md`,
2026-07-04), a partir de uma observação do Bruno: o idioma vivia em dois
lugares diferentes dependendo da seção, e isso era inconsistente.

## O problema com a v1

A v1 tratava os dois eixos (gênero/corrente × idioma) de dois jeitos
diferentes:

- **BIBLIAS**: um eixo só — pasta por edição, todos os idiomas misturados
  na mesma lista (Almeida pt-BR, Vulgata latim, Douay-Rheims inglês, NT
  grego, Hebraica WLC hebraico, todos irmãos dentro de `BIBLIAS/`).
- **FILOSOFIA/GREGO/LATIM**: o idioma virou **seção de topo** — três
  seções (Filosofia = pt-BR/inglês, Grego, Latim) que espelham as mesmas
  correntes (Estoicismo aparecia em Filosofia *e* Grego; Patrística nas
  três).

Resultado: `Estoicismo` existia em 2 lugares do menu, `Patristica` em 3,
"idioma" não tinha um endereço único.

## Estrutura aplicada: idioma sempre como 1º nível dentro da seção

```
BIBLIAS/
├── Portugues/
│   ├── Almeida_1911/
│   ├── Biblia_Livre/
│   └── Traducao_Brasileira_1917/
├── Latim/
│   └── Vulgata_Clementina/
├── Ingles/
│   └── Douay_Rheims/
├── Grego/
│   └── Novo_Testamento_Grego/
├── Hebraico/
│   └── Biblia_Hebraica_WLC/
└── Interlineares_Hebraico/    ← veio de HEBRAICO/Escrituras_Hebraicas/
    └── Eclesiastes_interlinear_cap1.md

FILOSOFIA/
├── Portugues/           ← 12 arquivos: Iluminismo/Voltaire (10) +
│   ├── Iluminismo/         Platonismo/Platao/Sophist (2, ver nota)
│   └── Platonismo/Platao/Sophist/
├── Ingles/               ← 250 arquivos, o resto do que já existia em
│   ├── Aristotelismo/      Filosofia
│   ├── Biografia_e_Doxografia/
│   ├── Estoicismo/
│   ├── Moralistas/
│   ├── Patristica/
│   └── Platonismo/
├── Grego/                ← era a seção "GREGO" inteira (232 arquivos)
│   ├── Estoicismo/
│   ├── Filosofia_Classica/
│   ├── Moralistas/
│   ├── Neoplatonismo_e_Tardia/
│   └── Patristica/
└── Latim/                ← era a seção "LATIM" inteira (113 arquivos)
    ├── Escolastica/
    ├── Espiritualidade/
    ├── Estoicismo_Latino/
    ├── Filosofia_Republicana/
    ├── Moderna/
    ├── Patristica/
    ├── Platonismo_Medio/
    └── Renascimento/

PERSONAGENS/               ← sem mudança
```

**HEBRAICO como seção de topo deixou de existir.** O único conteúdo que
tinha (`Escrituras_Hebraicas/Eclesiastes_interlinear_cap1.md`, o teste do
motor interlinear) virou o molde da convenção de interlineares (ver
abaixo).

## Convenção de interlineares (2026-08-01, 2ª rodada)

Um texto interlinear envolve 2+ idiomas ao mesmo tempo — não pertence a
uma única prateleira de idioma. Decisão do Bruno: **mora dentro de cada
idioma envolvido, independentemente**, numa subpasta `Interlineares_X`
(X = o outro idioma da dupla). Duplicar o arquivo entre as duas pastas é
aceitável — "custa pouco" pra um `.md` de texto.

```
BIBLIAS/
├── Hebraico/
│   ├── Biblia_Hebraica_WLC/
│   └── Interlineares_Hebraico/
│       └── Eclesiastes_interlinear_cap1.md
└── Portugues/
    ├── Almeida_1911/ Biblia_Livre/ Traducao_Brasileira_1917/
    └── Interlineares_Hebraico/
        └── Eclesiastes_interlinear_cap1.md      ← cópia idêntica

FILOSOFIA/
├── Grego/
│   ├── Estoicismo/ Filosofia_Classica/ ...
│   └── Interlineares_Grego/
│       └── Platonismo/Platao/Sophist/platao-sofista_interlinear_pt-grc_Diaphoreus.md
└── Portugues/
    ├── Iluminismo/
    ├── Platonismo/Platao/Sophist/Sofista_por_odialetico.md   ← tradução solta, NÃO é interlinear, fica só aqui
    └── Interlineares_Grego/
        └── Platonismo/Platao/Sophist/platao-sofista_interlinear_pt-grc_Diaphoreus.md   ← cópia idêntica
```

Regra: o nome da subpasta é sempre `Interlineares_{outro idioma}`, igual
nas duas cópias (não muda pra `Interlineares_Portugues` do lado de lá —
o nome identifica a dupla de idiomas do texto, não o idioma da pasta em
que está). `catalogo.json` ganha uma entrada por cópia física (2
entradas por interlinear, mesmo `titulo`, `id` da cópia com sufixo
`-via-portugues`). Não existe mais `BIBLIAS/Interlineares_Hebraico/`
como categoria solta — virou as duas subpastas aninhadas acima.

**Nota sobre `FILOSOFIA/.../Sophist/`**: a pasta tinha 3 arquivos — a
tradução inglesa de Fowler (fica em `Ingles`), a tradução solta em
português (`Sofista_por_odialetico.md`, fica em `Portugues`, não é
interlinear) e o interlinear português/grego (`platao-sofista_
interlinear_pt-grc_Diaphoreus.md`, agora duplicado em `Grego/
Interlineares_Grego` e `Portugues/Interlineares_Grego`, seguindo a regra
acima).

**Ganho colateral**: o menu de topo caiu de 7 seções pra 4 (Bíblias,
Filosofia, Personagens, + o item fixo Bem-vindo). GREGO, LATIM e HEBRAICO
somem como seção — GREGO/LATIM viram subpasta de idioma dentro de
Filosofia; o conteúdo de HEBRAICO foi pra dentro de Bíblias.

**Ganho pra versão internacional**: uma build em inglês só precisa
filtrar `*/Ingles/**` (+ `BIBLIAS/Ingles`, que já é Douay-Rheims) em vez
de decidir seção por seção o que é "gateway" e o que é "estudo". Idioma
vira um filtro único e óbvio em qualquer seção.

## O que a v2 preserva da v1

A lógica de "Filosofia = portão de entrada de leitura corrida,
Grego/Latim = acervo completo pra estudo" continua igual — só mudou de
*seção separada* pra *subpasta dentro da mesma seção*. Um autor que só
existe em latim (quase toda a Patrística/Escolástica) continua não
aparecendo em `FILOSOFIA/Portugues` nem `FILOSOFIA/Ingles`, só em
`FILOSOFIA/Latim` — igual antes.

## O que mudou de fato

| | v1 (até 2026-08-01) | v2 (aplicado) |
|---|---|---|
| Seções de topo | Bíblias, Hebraico, Filosofia, Grego, Latim, Personagens | Bíblias, Filosofia, Personagens |
| Onde mora "Estoicismo" | 2 lugares (Filosofia, Grego) | 1 lugar (`FILOSOFIA/*/Estoicismo`), com 2 subpastas de idioma dentro |
| Onde mora o interlinear hebraico | Seção própria (Hebraico) | `BIBLIAS/Interlineares_Hebraico` |
| Endereço do idioma | Depende da seção (topo em Filosofia/Grego/Latim; pasta em Bíblias) | Sempre 1º nível dentro da seção |
| Profundidade da árvore | 3 níveis (Seção/Corrente/Autor) | 4 níveis (Seção/Idioma/Corrente/Autor) |

## O que foi feito (2026-08-01)

1. Movidos os diretórios físicos em `public/livros/` (todos os `mv`
   acima) — GREGO e LATIM não existem mais como pastas de topo; HEBRAICO
   ficou como diretório vazio (não deu pra apagar por instabilidade de
   permissão no mount montado — cosmético, não afeta o app, que só lê o
   `catalogo.json`).
2. Reescritos os 1019 campos `arquivo` de `catalogo.json` (script
   Python, prefixo por pasta antiga → nova + 2 overrides exatos pro
   Sophist). Conferido: toda entrada aponta pra um arquivo real, nenhum
   arquivo em disco ficou órfão, nenhum `id`/`arquivo` duplicado.
3. `scripts/converte-morphhb.mjs`: `outDir` atualizado pra
   `BIBLIAS/Hebraico/Biblia_Hebraica_WLC`.
4. `ESTRUTURA_BIBLIOTECA.md` (v1) marcada como superada, apontando pra
   este documento.
5. `docs/COMO_EDITAR.md` e `docs/TRADUCAO_MENU_EN.md` atualizados pra
   refletir a árvore nova.

Pendente (não bloqueia o app, só o repo): `git add`/commit — não commitei
nada, fica a seu critério quando revisar.
