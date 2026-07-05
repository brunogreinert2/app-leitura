# Estrutura da Biblioteca — Proposta de Organização da Sidebar

> Como dividir o menu lateral (Φ) do app para caber tudo o que já temos e o
> que vem por aí, sem virar uma lista ilegível. Baseado no que existe hoje
> no ACERVO (826 arquivos, contagem de 2026-07-04) e no pedido do Bruno:
> poucas seções de topo (~10 no máximo), Bíblias e Filosofia como porta de
> entrada fácil (pt-BR/inglês, sem grego pesado logo de cara), e Grego/Latim
> como acervo completo no idioma original, cada um subdividido.

## Princípio geral

Dois eixos, não um só:

- **Gênero/tradição** (Estoicismo, Platonismo, Patrística, Escolástica...) —
  é o eixo que o leitor pensa primeiro ("quero ler os estoicos").
- **Idioma da edição** (pt-BR/inglês vs. grego/latim original) — é o eixo
  que decide se o texto é convidativo para leitura corrida ou é peça de
  estudo/cotejo.

A saída: a mesma obra pode aparecer em **duas seções diferentes**, porque
são arquivos diferentes de qualquer forma (edição em inglês e edição em
grego do Encheirídion já são dois `.md` separados no ACERVO). Isso não é
duplicação de dado — é a mesma lógica que já existe hoje quando um livro
bilíngue mostra grego e português lado a lado, só que em vez de lado a
lado, em seções separadas:

- **Filosofia** — só as edições em pt-BR e inglês que existirem. É o andar
  térreo: quem abre o app pela primeira vez lê aqui, sem grego antigo na
  cara.
- **Grego** e **Latim** — o acervo completo no idioma original, incluindo
  autores que ainda não têm nenhuma tradução (hoje é a maioria). Aqui é
  para quem já sabe o que está procurando ou quer cotejar com o original.

Isso também resolve sozinho o pedido de "Filosofia com pt-BR/inglês
primeiro": como cada seção só lista o que existe naquele idioma, um autor
que só tem edição em latim (caso de quase toda a Patrística e Escolástica
hoje) simplesmente não aparece em Filosofia ainda — aparece só em Latim,
até o dia em que uma tradução for adicionada.

## As seções de topo (6, dentro do limite de ~10)

| # | Seção | Conteúdo | Por quê |
|---|-------|----------|---------|
| — | *(fixo, fora da lista de seções)* **Bem-vindo ao Leitor** | `IMPRESSOES_APP.md` | Item único fixado no topo, não é uma seção com filhos. |
| 1 | **Bíblias** | 3 versões pt-BR completas + Novo Testamento grego | Pedido explícito: uso primário, principalmente para idosos com presbiopia. Fica em primeiro lugar na lista, acima até de Filosofia. |
| 2 | **Hebraico** | Material interlinear hebraico/português | Corpus e idioma próprios — não é "bíblia pt-BR de leitura corrida" nem cabe em Grego/Latim. Seção separada, como o Bruno pediu. |
| 3 | **Filosofia** | Só edições pt-BR/inglês, por corrente | Porta de entrada de leitura corrida. |
| 4 | **Grego** | Acervo grego completo, por corrente/período | Estudo/cotejo com o original. |
| 5 | **Latim** | Acervo latino completo, por corrente/período | Estudo/cotejo com o original. |
| 6 | **Personagens** | Índice de nomes (já existente) | Recurso transversal, não é texto corrido. |

Seis seções reais + 1 item fixo. Sobra folga até 10 — dá para abrir mais
seções de idioma no futuro (Sânscrito, Árabe...) sem reapertar nada, ou
quebrar Filosofia/Grego em dois se um dia crescerem demais.

---

## 1. Bíblias

Renomeia `ROLOS/` → `BIBLIAS/`. Ordem interna: as 3 traduções pt-BR
primeiro (uso primário), depois o grego, depois material de estudo.

```
BIBLIAS/
├── Almeida_1911/              ← ACERVO/Biblia/Almeida_1911 (66 livros)
├── Traducao_Brasileira_1917/  ← ACERVO/Biblia/Traducao_Brasileira (66 livros)
├── Biblia_Livre/              ← ACERVO/Biblia/Biblia_Livre (66 livros)
└── Novo_Testamento_Grego/     ← ACERVO/Biblia/Novo_Testamento_Grego_SBLGNT (27 livros)
```

As 3 pt-BR ficam nessa ordem (Almeida primeiro por ser o nome mais
reconhecido por leitor brasileiro; Bruno pode reordenar à vontade, é só
gosto). Cada uma continua sendo 66 arquivos de livro — o catálogo lista
livro por livro dentro da pasta da tradução, não como ROLO único; "rolo"
vira conceito só de bastidor (concatenar pra gerar um arquivo grande), não
aparece mais como nome de seção pro usuário.

A Septuaginta grega (Antigo Testamento) ainda não existe no acervo — cai
aqui dentro quando for convertida.

## 2. Hebraico

Seção própria, puxada para fora de "Bíblias" porque é outro alfabeto,
outro idioma e outro tipo de leitura (estudo/cotejo, não leitura corrida):

```
HEBRAICO/
└── Escrituras_Hebraicas/
    └── Eclesiastes_interlinear_cap1.md   ← hoje é só isso; vem de
                                              00-referencias/Escrituras Hebraicas
```

Pequena por enquanto (1 arquivo, 1 capítulo), mas separada desde já para
não precisar reorganizar depois quando crescer.

## 3. Filosofia (pt-BR / inglês)

Mantém as subpastas por corrente que já existem, mas cada uma só lista o
que **já tem edição em pt-BR ou inglês agora**. Hoje isso é bem mais magro
que o acervo em grego/latim — é exatamente o efeito que o Bruno pediu.

```
FILOSOFIA/
├── Estoicismo/
│   └── Epicteto/  (Encheirídion, Diatribes — inglês; Marco Aurélio ainda
│                    não tem edição pt/inglês, só grego → fica de fora daqui)
├── Platonismo/
│   └── Platão/  (36 diálogos em inglês)
├── Aristotelismo/
│   └── Aristóteles/  (7 obras em inglês)
├── Biografia_e_Doxografia/
│   └── Diógenes_Laércio/  (inglês)
├── Moralistas/
│   └── Plutarco/  (195 textos em inglês — é grande, mas é uma seção só
│                    dele, não precisa subdividir mais)
├── Patristica/
│   └── Padres_Apostólicos/  (Barnabé, Clemente de Roma, Hermas, Inácio,
│                              Policarpo — inglês)
```

**Vazio por enquanto** (existe no acervo só em latim, sem pt/inglês ainda):
Cícero, Sêneca (só uma sátira tem inglês, as obras filosóficas não),
Apuleio, Agostinho, toda a Patrística latina, toda a Escolástica
(Aquino, Abelardo, Boécio da Dácia, Kempis), Pico della Mirandola,
Descartes. Não crio pasta vazia pra eles em Filosofia — só aparecem
quando a primeira tradução existir. Até lá, quem quiser esses autores
encontra em Latim.

## 4. Grego

Acervo grego completo, por corrente/período (mesmo vocabulário de
Filosofia, pra não obrigar o leitor a aprender duas taxonomias):

```
GREGO/
├── Filosofia_Classica/
│   ├── Platão/          (36 obras, grc)
│   ├── Aristóteles/     (10 obras, grc — + 1 edição árabe medieval,
│   │                     ver nota abaixo)
│   ├── Diógenes_Laércio/
│   └── Teofrasto/
├── Estoicismo/
│   ├── Epicteto/
│   └── Marco_Aurélio/
├── Neoplatonismo_e_Tardia/
│   └── Juliano/         (o Imperador)
│   [Proclo: ver nota de limpeza no fim deste documento antes de publicar]
├── Patristica/
│   ├── Padres_Apostólicos/  (Barnabé, Clemente de Roma, Hermas, Inácio,
│   │                          Policarpo)
│   └── Padres_Gregos/       (Clemente de Alexandria, Basílio de Cesareia,
│                              Eusébio de Cesareia, João Damasceno)
└── Moralistas/
    └── Plutarco/         (154 obras, grc)
```

Nota: a edição árabe de Aristóteles (1 arquivo, tradução medieval) não
tem um lugar natural em "Grego" nem em "Latim" — por ora deixo dentro de
Grego/Filosofia_Classica/Aristóteles junto com o original, já que é uma
edição *daquela* obra, não abro seção "Árabe" para 1 arquivo só.

## 5. Latim

Mesma lógica, subdividido por corrente:

```
LATIM/
├── Filosofia_Republicana/
│   └── Cícero/           (13 obras)
├── Estoicismo_Latino/
│   └── Sêneca/           (16 obras — tragédias ficam de fora, ver SPEC)
├── Platonismo_Medio/
│   └── Apuleio/          (5 obras)
├── Patristica/
│   ├── Agostinho/        (10 arquivos — Cidade de Deus, Confissões,
│   │                       De Trinitate, Sermões, avulsos)
│   ├── Ambrósio/
│   ├── Arnóbio/
│   ├── Lactâncio/
│   ├── Jerônimo/
│   ├── Martinho_de_Braga/
│   ├── Minúcio_Félix/
│   └── Tertuliano/       (31 obras)
├── Escolastica/
│   ├── Boécio/           (De Consolatione, séc. VI)
│   ├── Boécio_da_Dácia/  (séc. XIII — pessoa diferente do Boécio acima,
│   │                       não confundir apesar do nome igual)
│   ├── Abelardo/
│   └── Tomás_de_Aquino/
├── Espiritualidade/
│   └── Tomás_de_Kempis/  (De Imitatione Christi)
├── Renascimento/
│   └── Pico_della_Mirandola/
└── Moderna/
    └── Descartes/        (Meditationes, em latim — versão em francês/pt
                            não faz parte deste acervo ainda)
```

## 6. Personagens

Sem mudança — continua como está, é um recurso à parte (índice de nomes
citados, não texto corrido).

---

## Antes de publicar: pendências (não são deste reorg, mas travam ele)

1. **Pasta `Proclo`** no ACERVO (`Proclo/Chrestomathy/...`) — já sinalizado
   antes: não é Proclo Diadoco, o neoplatônico, é uma obra menor de um
   Proclo gramático homônimo. Precisa sair antes de espelhar Grego, ou ele
   entra sem querer em Neoplatonismo. Ver troubleshooting do `git rm` na
   conversa — o índice do git nesse repositório deu sinal de problema.
2. **Licença/domínio público como filtro de publicação** — Bruno confirmou
   que a tradução do Sofista em pt-BR (Paleikat-Cruz-Costa) e a do
   Encheirídion em pt-BR (Dinucci-Julien, 2012) **não são domínio
   público** e vão ser removidas do app. Isso muda o estado real da seção
   Filosofia: por enquanto ela fica **só com as traduções inglesas do
   Perseus** (Long, Fowler, Rackham, Bury etc. — todas de antes de 1930,
   seguramente em domínio público) — nenhum texto em pt-BR ainda. As
   Bíblias pt-BR (Almeida 1911, Tradução Brasileira 1917, Bíblia Livre) e
   o Latin Library/SBLGNT (fontes já checadas como domínio público/licença
   aberta na conversão) não são afetados. Regra geral daqui pra frente:
   **antes de espelhar qualquer texto pt-BR ou de tradutor moderno para o
   app público, confirmar o status de domínio público/licença primeiro**
   — Perseus, Latin Library e SBLGNT já vêm pré-filtrados por isso, mas
   qualquer coisa digitada/colada manualmente por fora desse pipeline não.

## Como aplicar (quando você confirmar esta estrutura)

Isso é só o desenho — nenhuma pasta foi criada ou movida ainda. Quando
você validar, o próximo passo é rodar, para cada autor, o mesmo comando
já documentado em `COMO_PUBLICAR_NO_APP.md`:

```powershell
python "C:\Projetos\OFICINA\oficina.py" espelhar --de Epicteto --para FILOSOFIA/Estoicismo/Epicteto --langs eng
python "C:\Projetos\OFICINA\oficina.py" espelhar --de Epicteto --para GREGO/Estoicismo/Epicteto --langs grc
```

O `oficina.py` já suporta `--langs` (filtro por idioma, aceita lista
separada por vírgula, ex. `--langs grc,eng`) — não precisa de nenhum ajuste
nele para isso funcionar. Quando você confirmar a estrutura, posso montar
a lista completa de comandos `espelhar` (um por autor/seção) para você
rodar de uma vez, do mesmo jeito que fiz com o guia de `git rm`.
