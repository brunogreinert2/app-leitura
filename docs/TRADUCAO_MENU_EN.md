---
id: rascunho-traducao-menu-en
type: rascunho
title: "Tradução do menu do app para inglês"
project: pedra_angular
status: rascunho
---

# Tradução do menu para inglês

Rascunho pra revisão — nada foi mexido no código ou nos arquivos. Projeto separado da reorganização de BIBLIAS/HEBRAICO.

## 1. Categorias de topo

| PT (atual) | EN proposto | Nota |
|---|---|---|
| BIBLIAS | BIBLES | |
| HEBRAICO | HEBREW | |
| FILOSOFIA | PHILOSOPHY | |
| GREGO | GREEK | |
| LATIM | LATIN | |
| PERSONAGENS | FIGURES | "Characters" soa ficção; "Figures" cobre pessoa histórica/filosófica |
| Meus arquivos | My Files | pasta virtual dos uploads locais |

## 2. Subpastas de BIBLIAS

| PT (atual, nome da pasta) | EN proposto | Nota |
|---|---|---|
| Almeida_1911 | Almeida 1911 | nome próprio da tradução — não traduz |
| Biblia_Livre | Bíblia Livre (Free Bible) | nome próprio; glosa em inglês entre parênteses |
| Traducao_Brasileira_1917 | Tradução Brasileira 1917 (Brazilian Translation) | idem |
| Vulgata_Clementina | Clementine Vulgate | termo padrão em inglês, não é "nome próprio" no mesmo sentido |
| Douay_Rheims | Douay-Rheims | já em inglês |
| Novo_Testamento_Grego | Greek New Testament (SBLGNT) | |
| Biblia_Hebraica_WLC | Hebrew Bible (WLC) | |

## 3. Subpastas de HEBRAICO

| PT (atual) | EN proposto |
|---|---|
| Escrituras_Hebraicas | Hebrew Scriptures |

## 4. Subpastas de FILOSOFIA

| PT (atual) | EN proposto |
|---|---|
| Aristotelismo | Aristotelianism |
| Biografia_e_Doxografia | Biography and Doxography |
| Estoicismo | Stoicism |
| Iluminismo | Enlightenment |
| Moralistas | Moralists |
| Patristica | Patristics |
| Platonismo | Platonism |

## 5. Subpastas de GREGO

| PT (atual) | EN proposto |
|---|---|
| Estoicismo | Stoicism |
| Filosofia_Classica | Classical Philosophy |
| Moralistas | Moralists |
| Neoplatonismo_e_Tardia | Neoplatonism and Late Antiquity |
| Patristica | Patristics |

## 6. Subpastas de LATIM

| PT (atual) | EN proposto |
|---|---|
| Escolastica | Scholasticism |
| Espiritualidade | Spirituality |
| Estoicismo_Latino | Latin Stoicism |
| Filosofia_Republicana | Republican Philosophy |
| Moderna | Modern |
| Patristica | Patristics |
| Platonismo_Medio | Middle Platonism |
| Renascimento | Renaissance |

## 7. Textos fixos da interface (chrome)

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
