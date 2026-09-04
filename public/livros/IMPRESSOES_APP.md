---
id: impressoes-app
type: guia
title: Bem-vindo ao Leitor
project: pedra_angular
status: vivo
---

Este é um leitor de textos clássicos que funciona **inteiro no seu aparelho**: depois da primeira visita, não precisa de internet para nada. Toque nos títulos abaixo para abrir cada assunto — no corpo do texto, todo título começa fechado e abre com um toque.

# Instalar o app no seu aparelho

Este site É o app: instalar significa ganhar um ícone próprio (a letra grega Φ) e abrir em tela cheia, sem cara de navegador. Depois de instalado, funciona sem internet.

## No iPhone e iPad

Só o **Safari** instala apps deste tipo (regra da Apple — o Chrome de iPhone não consegue).

1. Abra este endereço no **Safari**
2. Toque no botão **Compartilhar** (o quadrado com a seta para cima, no rodapé)
3. Role a lista e toque em **"Adicionar à Tela de Início"**
4. Confirme o nome e toque em **Adicionar**

## No Android

1. Abra este endereço no **Chrome**
2. Toque no menu **⋮** (três pontinhos, no canto de cima)
3. Toque em **"Instalar app"** ou **"Adicionar à tela inicial"**
4. Confirme

Em alguns aparelhos o próprio Chrome oferece a instalação numa faixa no rodapé — é só aceitar.

## No computador

1. Abra este endereço no **Chrome** ou **Edge**
2. Na barra de endereço, à direita, aparece um ícone de **instalar** (um monitor com uma seta, ou "⊕")
3. Clique nele e confirme

O app vira uma janela própria, com atalho no menu iniciar / área de trabalho.

# Como usar o leitor

## Ler

Toque em qualquer título para abrir ou fechar a seção. Os títulos mais à esquerda são os capítulos maiores; quanto mais à direita, mais fundo na estrutura do texto.

As chamadas de nota (números pequenos no texto) abrem a nota ali mesmo, numa caixa — toque nela e depois em "Voltar ao texto". Segurar o dedo na chamada leva à lista completa de notas.

Nomes sublinhados com pontilhado são **personagens**: um toque abre um cartão com o verbete (como na Wikipédia); segurar o dedo abre o verbete como página inteira — a seta ← volta para onde você estava.

## Tamanho da letra

Use os botões **+** e **−** no alto da tela, ou o gesto de pinça com dois dedos sobre o texto. O texto cresce e se reajusta à largura da tela, sem sair do ponto em que você estava lendo. Não há limite tímido: uma palavra por tela é um tamanho válido.

## Cores e contraste

No sumário (Ξ) toque em **APARÊNCIA** e escolha o esquema que descansar seus olhos: sépia, pergaminho, preto no branco, branco no preto, amarelo no preto, verde no preto ou tons de azul. A escolha fica gravada no aparelho.

## Buscar

Toque na lupa e digite:

- **uma palavra** — o app varre o livro inteiro, mesmo com as seções fechadas, sem diferenciar acentos ("misericordia" acha "misericórdia");
- **uma referência** — `Gn 1:1`, `Sl 23:1`, `1Co 13:4` na Bíblia; `5.1` no Encheirídion. Enter salta direto ao endereço.

## Sumário e biblioteca

O botão **Ξ** (xi grega) abre o **sumário** do livro, com os capítulos e as ações do livro. O botão **Φ** (phi grega, a marca do app) abre a **biblioteca**, com a estrutura de pastas e uma pesquisa por título, autor ou pasta.

## A bancada: deixar os painéis abertos

Numa tela larga — computador, ou tablet deitado — os dois painéis param de
cobrir o texto e passam a ficar **ao lado** dele, como uma bancada de trabalho.

Abra o painel e toque no **alfinete**, no alto dele. Ele fica fixo: você lê e
navega ao mesmo tempo, sem abrir e fechar a cada salto. Tocar de novo no
alfinete solta o painel.

O alfinete só aparece quando há espaço de verdade. A partir de mais ou menos
800 pixels de largura cabe **um** painel ao lado do texto; a partir de 1120
cabem **os dois**, biblioteca de um lado e sumário do outro. Entre um número e
outro, fixar um solta o outro sozinho — dois painéis numa janela apertada
deixariam a coluna de leitura estreita demais para servir.

Se você diminuir a janela, os painéis voltam a ser sobreposição comum, com
toque fora para fechar. Nada fica preso fora da tela.

## Navegar pelo teclado

Quem não usa mouse tem dois movimentos, e a diferença entre eles é o que torna a tela navegável:

- **Tab** anda **dentro** de uma região, de um controle para o próximo. **Shift+Tab** volta.
- **F6** troca **de** região: barra do topo, texto, biblioteca, sumário. **Shift+F6** vai na ordem inversa.

Sem o F6, ir do texto até um ajuste significaria atravessar tudo o que existe entre os dois. Com ele, é uma tecla.

Na primeira tabulação da página aparece **Pular para o texto**, que salta a barra inteira. **Esc** fecha qualquer painel ou diálogo e devolve o foco ao botão que o abriu.

## Ouvir o texto

O botão 🔊 no canto de baixo abre o leitor de voz: **Ouvir** lê em voz alta o que está aberto na tela, a partir do ponto em que você parou, destacando o parágrafo falado. Dá para pausar, retomar, parar, escolher a voz (as do seu aparelho) e ajustar a velocidade. Tudo acontece no aparelho — funciona offline com as vozes instaladas.

A voz muda sozinha conforme a língua de cada trecho: grego é lido com voz grega, hebraico com voz hebraica, inglês com voz inglesa. Quando falta a voz certa no aparelho, o app avisa e usa a mais próxima — latim, que nenhum sistema tem, sai em italiano.

## Marcar a língua de uma linha

Às vezes o app não tem como adivinhar: uma linha de duas palavras, um verso solto, um interlinear que alterna português e inglês a cada linha. Nesses casos você escreve a língua no fim da linha, com o mesmo `^` das âncoras — `In the beginning was the Word. ^eng` faz aquela linha sair em voz inglesa.

Os códigos são `^por`, `^eng`, `^lat`, `^grc`, `^heb` e `^rus`. A marca não aparece na leitura, e o que está escrito sempre vence o que o app adivinharia. Uma linha pode ter as duas coisas — endereço e língua, nesta ordem: `Texto. ^gn-1-1 ^eng`. Qualquer outra âncora continua sendo só endereço, como sempre.

## Seus próprios textos

Na biblioteca (Φ) há dois botões:

- **ADICIONAR** — traz arquivos `.md` ou `.txt` do seu aparelho para dentro do app.
- **NOVO** — abre uma folha em branco para **digitar ou colar** qualquer coisa: uma conversa, um artigo, uma anotação. Salvou, virou leitura com tudo que o app oferece — zoom, temas, títulos recolhíveis, busca.

E há três caminhos que dispensam o botão:

- **Arraste o arquivo** para cima da janela do app, em qualquer ponto.
- No computador, **clique com o botão direito no arquivo → Abrir com → Pedra Angular**, ou arraste-o para cima do ícone do app.
- **Compartilhe** o arquivo com o app pelo menu do sistema (no Android e no Windows; o iPhone não oferece isso a nenhum app instalado pelo navegador).

Um arquivo solto sozinho já **abre na tela** para leitura. Vários de uma vez entram calados na pasta, para não escolherem por você qual abrir.

Seus textos ficam na pasta "Meus arquivos", **só no seu aparelho** (não sobem para lugar nenhum), funcionam sem internet e podem ser editados depois: abra o texto, toque em Ξ e em **EDITAR**. Os livros da biblioteca não podem ser editados — o acervo é intocável.

### Localizar e substituir

Com o editor aberto, **Ctrl+F** abre o localizar e **Ctrl+H** abre o localizar
e substituir. Enquanto você digita, o app mostra quantas ocorrências existem e
em qual delas você está.

**Enter** vai para a próxima, **Shift+Enter** para a anterior, **Esc** fecha e
devolve o cursor ao texto. A busca ignora maiúsculas e minúsculas: procurar
`inclusão` acha `Inclusão` e `INCLUSÃO`.

Duas coisas que valem saber. O campo de substituição aceita o texto **literal**
— digitar `R$ 10` põe `R$ 10`, sem que o cifrão vire outra coisa. E o
**Substituir tudo** entra como uma edição só: um **Ctrl+Z** desfaz todas as
substituições de uma vez.

## Copiar

No sumário (Ξ), **COPIAR** copia o arquivo inteiro, byte a byte — com front matter, âncoras e tudo. É a cópia fiel, feita para você colar num editor, mexer e devolver o arquivo à pasta.

No menu **⋯** há a cópia de trecho, com duas opções: **só o visível**, que ignora as seções fechadas e sai limpo de marcação, e **tudo**, que sai como está no arquivo.

# Sobre este projeto

Este leitor faz parte do projeto **Pedra Angular**: um corpus de textos clássicos — filosofia antiga e moderna, Escrituras — preservado em texto puro, feito para durar e para ser lido por qualquer pessoa, em qualquer aparelho, com qualquer visão.

Os livros embarcados são de domínio público ou de tradução própria do projeto. O app não coleta nada, não pede conta, não mostra anúncio: é só você e o texto.

> Ὁ Διαφορεύς παρῆν.
