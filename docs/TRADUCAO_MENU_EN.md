---
id: rascunho-traducao-menu-en
type: rascunho
title: "Tradução do menu do app para inglês"
project: pedra_angular
status: rascunho
---

# Tradução do menu para inglês

Rascunho pra revisão — nada foi mexido no código ou nos arquivos. Projeto separado. Atualizado em 2026-08-01 pra refletir a estrutura v2 (`ESTRUTURA_BIBLIOTECA_v2_idioma.md`) — idioma como 1º nível dentro de BIBLIAS e FILOSOFIA; HEBRAICO, GREGO e LATIM deixaram de ser categorias de topo.

## 1. Categorias de topo

| PT (atual) | EN proposto | Nota |
|---|---|---|
| BIBLIAS | BIBLES | |
| FILOSOFIA | PHILOSOPHY | |
| PERSONAGENS | FIGURES | "Characters" soa ficção; "Figures" cobre pessoa histórica/filosófica |
| Meus arquivos | My Files | pasta virtual dos uploads locais |

## 2. Idiomas (1º nível dentro de BIBLIAS e FILOSOFIA)

| PT (atual, nome da pasta) | EN proposto |
|---|---|
| Portugues | Portuguese |
| Latim | Latin |
| Ingles | English |
| Grego | Greek |
| Hebraico | Hebrew |

## 3. Subpastas de BIBLIAS/{Idioma}

| PT (atual, nome da pasta) | EN proposto | Nota |
|---|---|---|
| Portugues/Almeida_1911 | Almeida 1911 | nome próprio da tradução — não traduz |
| Portugues/Biblia_Livre | Bíblia Livre (Free Bible) | nome próprio; glosa em inglês entre parênteses |
| Portugues/Traducao_Brasileira_1917 | Tradução Brasileira 1917 (Brazilian Translation) | idem |
| Latim/Vulgata_Clementina | Clementine Vulgate | termo padrão em inglês, não é "nome próprio" no mesmo sentido |
| Ingles/Douay_Rheims | Douay-Rheims | já em inglês |
| Grego/Novo_Testamento_Grego | Greek New Testament (SBLGNT) | |
| Hebraico/Biblia_Hebraica_WLC | Hebrew Bible (WLC) | |
| Interlineares_Hebraico | Hebrew Interlinear Texts | categoria própria, fora do eixo de idioma (mistura hebraico+português) |

## 4. Subpastas de FILOSOFIA/{Idioma}

| PT (atual) | EN proposto | Em qual idioma hoje |
|---|---|---|
| Aristotelismo | Aristotelianism | Ingles |
| Biografia_e_Doxografia | Biography and Doxography | Ingles |
| Estoicismo | Stoicism | Ingles + Grego + Latim (Estoicismo_Latino) |
| Iluminismo | Enlightenment | Portugues |
| Moralistas | Moralists | Ingles + Grego |
| Patristica | Patristics | Ingles + Grego + Latim |
| Platonismo | Platonism | Ingles (+ 2 arquivos em Portugues, ver nota) |
| Filosofia_Classica | Classical Philosophy | Grego |
| Neoplatonismo_e_Tardia | Neoplatonism and Late Antiquity | Grego |
| Escolastica | Scholasticism | Latim |
| Espiritualidade | Spirituality | Latim |
| Filosofia_Republicana | Republican Philosophy | Latim |
| Moderna | Modern | Latim |
| Platonismo_Medio | Middle Platonism | Latim |
| Renascimento | Renaissance | Latim |

Nota: `FILOSOFIA/Portugues/Platonismo/Platao/Sophist/` tem a tradução e o interlinear português/grego do Sofista — puxados pra fora de `Ingles/Platonismo` mesmo esse ainda existindo lá (edição Fowler, inglês).

## 5. Textos fixos da interface (chrome)

### Página Biblioteca (Catalog)

| PT (atual) | EN proposto |
|---|---|
| Biblioteca | Library |
| Pedra Angular (subtítulo) | Pedra Angular *(nome do projeto — não traduz)* |
| Bem-vindo ao Leitor | Welcome to the Reader |
| Carregando catálogo… | Loading catalog… |
| Não foi possível carregar o catálogo: … | Couldn't load the catalog: … |
| "Abrir biblioteca (pastas e pesquisa)" (aria) | "Open library (folders and search)" |
| "Aparência (esquemas de cor)" (aria) | "Appearance (color schemes)" |

### Gaveta da Biblioteca (LibraryDrawer)

| PT (atual) | EN proposto |
|---|---|
| Biblioteca | Library |
| Pesquisar livro, autor, pasta… | Search book, author, folder… |
| + Adicionar arquivos | + Add files |
| ✏ Novo texto | ✏ New text |
| ⇩ Exportar meus dados | ⇩ Export my data |
| ⇧ Importar dados | ⇧ Import data |
| ⟳ Verificar atualização | ⟳ Check for updates |
| Fechar biblioteca (aria) | Close library |

### Sumário do livro (Sidebar / TOC)

| PT (atual) | EN proposto |
|---|---|
| Aparência | Appearance |
| Recolher tudo | Collapse all |
| Expandir tudo | Expand all |
| Copiar livro | Copy book |
| Detalhes | Details |
| ✏ Editar | Edit |
| Índice de nomes | Name index |
| Fechar sumário (aria) | Close table of contents |

## Pendências pra próxima rodada

- Não cobri os diálogos ThemeDialog, DetailsDialog e TextEditor (telas menores, dá pra levantar depois).
- Não decidi se o app vira bilíngue (toggle PT/EN) ou se seria uma build separada em inglês — isso muda a arquitetura, não é só troca de string.
