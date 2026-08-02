# A divisão dos rolos

Estado em 2 de agosto de 2026. Gerado por `scripts/rolo/gerador_rolo.py` no
build; nada disso é escrito à mão nem vive no git.

---

## Três camadas, três propósitos

O `/rolo` não é um formato só. São três, e a confusão entre eles é o que
faz alguém achar que o acervo está incompleto quando não está.

| camada | endereço | serve para |
|---|---|---|
| **obra** | `/rolo/<id>.html` | ler e citar UMA obra; o texto está no `<body>`, sem JS |
| **índice** | `/rolo/`, `/rolo/<ACERVO>/...` | achar a obra sem baixar a lista inteira |
| **coleção** | arquivo único por era, offline | cópia de sobrevivência: pendrive, gaveta, sem servidor |

A camada de obra é a única cujo endereço é **eterno** (ver Regra 0 abaixo).
Índices podem ser reorganizados à vontade; coleções podem ser regeradas.

---

## A árvore de índices, como ficou

```
/rolo/                                    4 KB   acervos + regra de endereço
/rolo/abreviaturas.html                  58 KB   121 abreviaturas → obras

/rolo/BIBLIAS.html                        2 KB   5 ramos
  /rolo/BIBLIAS/Grego.html                8 KB      27 obras
  /rolo/BIBLIAS/Hebraico.html            11 KB      40 obras
  /rolo/BIBLIAS/Ingles.html              18 KB      73 obras
  /rolo/BIBLIAS/Latim.html               20 KB      73 obras
  /rolo/BIBLIAS/Portugues.html           63 KB     199 obras

/rolo/FILOSOFIA.html                      2 KB   4 ramos
  /rolo/FILOSOFIA/Grego.html              2 KB   6 ramos
    …/Grego/Estoicismo.html               4 KB       6 obras
    …/Grego/Filosofia_Classica.html      16 KB      49 obras
    …/Grego/Interlineares_Grego.html      2 KB       1 obra
    …/Grego/Moralistas.html              59 KB     154 obras
    …/Grego/Neoplatonismo_e_Tardia.html   7 KB      14 obras
    …/Grego/Patristica.html               5 KB       9 obras
  /rolo/FILOSOFIA/Ingles.html             2 KB   6 ramos
    …/Ingles/Aristotelismo.html           4 KB       7 obras
    …/Ingles/Biografia_e_Doxografia.html  2 KB       1 obra
    …/Ingles/Estoicismo.html              4 KB       6 obras
    …/Ingles/Moralistas.html             75 KB     195 obras
    …/Ingles/Patristica.html              4 KB       6 obras
    …/Ingles/Platonismo.html             12 KB      36 obras
  /rolo/FILOSOFIA/Latim.html             38 KB     113 obras
  /rolo/FILOSOFIA/Portugues.html          5 KB      12 obras

/rolo/GERAL.html                          2 KB       1 obra
/rolo/PERSONAGENS.html                    5 KB      21 obras
```

25 páginas de índice. Maior: **75 KB**. Antes era uma página só, plana, de
**232 KB** — e era esse tamanho que quebrava tudo (ver abaixo).

---

## Por que o corte é em BYTES, não em número de obras

Em agosto de 2026 uma instância externa leu `FILOSOFIA.html` (232 KB, 609
obras em lista plana), recebeu o conteúdo **truncado** no meio dos Moralistas
em inglês, e concluiu — com confiança — que "Plutarco em grego, nesse site,
aparentemente não existe", que o catálogo estaria defasado e que havia obras
"escondidas", acessíveis só por URL direta.

Nada disso era verdade. `plutarco-alexander-grc-bernadotte-perrin-1919`
sempre esteve publicado e linkado. **O texto acabou antes da leitura chegar
lá.** Uma página de índice que não cabe na leitura mente por omissão.

Por isso a regra é:

> Um nó lista as **obras** enquanto a página couber em ~80 KB.
> Acima disso, lista os **ramos** com suas contagens.
> Nó sem filhos lista as obras de qualquer jeito — melhor página grande que
> página que não leva a lugar nenhum.

Contar itens em vez de bytes erraria: a regra de "~150 obras" forçaria um
nível a mais em `Ingles/Moralistas` (195 obras, mas só 75 KB — cabe bem).
O que trunca é o tamanho, então o critério é o tamanho.

O caminho que falhou, hoje:

```
/rolo/                                   4 KB  →  FILOSOFIA
/rolo/FILOSOFIA.html                     2 KB  →  Grego
/rolo/FILOSOFIA/Grego.html               2 KB  →  Moralistas
/rolo/FILOSOFIA/Grego/Moralistas.html   59 KB  →  Ἀλέξανδρος ✓
```

---

## Regra 0 — nenhum `<id>` muda

A rota de obra é `/rolo/<id>.html`, e o `<id>` é o mesmo do catálogo. Não há
tabela de conversão em lugar nenhum — de propósito: tabela é coisa que
dessincroniza em silêncio. `src/lib/rolo.ts` monta a URL direto do id.

**Reorganizar índice é livre. Renomear id não é.** Links já circulam; um id
que muda quebra "cite esta passagem" sem aviso.

Toda vez que a árvore for mexida, conferir antes de publicar:

- os ids do site no ar continuam existindo no build novo;
- todo id de `catalogo.json` + `personagens.json` tem um arquivo;
- toda obra é alcançável **seguindo apenas links** a partir de `/rolo/`
  (nenhuma órfã);
- nenhum link relativo quebrou — a profundidade muda quando a árvore muda,
  e `../livros/` vira `../../livros/` um nível abaixo.

Na última verificação: 2582 links conferidos, 0 quebrados, 1043 obras
alcançáveis, 0 órfãs, 0 ids perdidos.

---

## A camada de coleção (o arquivo apocalíptico)

Um HTML autocontido por era, fonte embutida, zero rede. É a origem do
projeto — o `rolo.md` que virou `rolo.html` antes de existir site.

O kit standalone (`C:\Claude\Rolo_HTML\`) gera assim hoje:

| coleção | tamanho |
|---|---:|
| GREGO.html | 40,8 MB |
| FILOSOFIA.html | 28,0 MB |
| BIBLIAS.html | 21,9 MB |
| LATIM.html | 16,3 MB |
| HEBRAICO.html | 7,8 MB |

**Por que não um arquivo só para tudo.** O corpus inteiro daria ~186 MB de
HTML. O motor é preguiçoso (só constrói o DOM da seção ao abrir), mas isso
não ajuda no gargalo real: o navegador precisa **carregar e parsear o arquivo
inteiro antes de rodar qualquer linha** — não dá para ser preguiçoso com
bytes que ainda não chegaram. O teto prático de um HTML único fica na casa
dos 50–100 MB, e estoura primeiro na máquina fraca, que é justamente a que
esse formato existe para atender.

GREGO a 40,8 MB já está na borda. Por era funciona; para o universo, não.

O link único que se queria **já existe**: é `/rolo/`. Ele desenrola sob
demanda, por HTTP, em vez de vir como um bloco — que é o que um rolo físico
sempre fez. Ninguém segura quarenta metros de papiro na mão; desenrola-se o
trecho que se está lendo.

---

## Profundidade sem teto — o que estava em jogo

O CommonMark trava headings ATX em 6 `#`. Isso não limitava "subseção
demais": limitava **quão fundo a biblioteca podia ser organizada**, porque no
modo coleção as pastas viram headings e são prefixadas ao texto da obra.

A prova de fogo de 17 níveis deixou o problema visível numa coluna:

```
 6            Autor      ← aqui o CommonMark acaba
 7              Obra     ← e a obra ainda nem começou
```

E não é hipótese. No acervo de hoje, **59% das obras (608 de 1022) já passam
de 6 níveis**:

| profundidade (pastas + heading interno) | obras |
|---:|---:|
| 5 | 412 |
| 7 | 350 |
| 8 | 223 |
| 9 | 32 |
| 10 | 3 |

O mais fundo é real:
`FILOSOFIA/Ingles/Patristica/Padres_Apostolicos/Hermas/The_Shepherd/`
— 6 de pasta + 4 internos = 10.

**Como foi resolvido no app:** `remarkDeepHeadings.ts` capa em 6 `#` só para
o tokenizador do CommonMark, embute a profundidade real, e a devolve na
árvore já parseada. Para acessibilidade, `h7+` não existe como tag válida
(leitor de tela não reconheceria) — a tag fica em `h6` e o nível real vai em
`aria-level`.

---

## Pendência conhecida (outro projeto)

`C:\Claude\Rolo_HTML\montar_rolo.py`, linha 66, ainda tem
`nivel = min(profundidade + 1, 6)`.

O `shift()` do mesmo arquivo já foi liberado ("sem teto: profundidade é
decisão do autor"), mas o emissor de heading **de pasta** não — e pasta é a
parte funda da árvore, então o teto sobreviveu exatamente onde mais dói. O
README do kit se contradiz: a linha 38 diz "trava em 6", a 113 diz "não tem
esse teto".

O `ProvaDeFogo.html` não pega esse bug: seus 17 níveis estão escritos direto
no `CORPUS_MD`, nunca passaram pelo `montar_md()`. O teste provou o **motor**
(que aguenta 17), não o **montador**. Um teste gerado a partir de pastas
reais teria pego.

O `app-leitura/scripts/rolo/gerador_rolo.py` está limpo — sem teto nenhum.

---

*Ὁ Διαφορεύς παρῆν*
