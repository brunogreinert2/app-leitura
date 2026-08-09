#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gerador_rolo.py — Pedra Angular

Lê o corpus .md que já alimenta o app (public/livros/ + catalogo.json) e gera
rolos estáticos: um arquivo .html por obra, com o TEXTO ESCRITO NO <body> como
caracteres reais — não dentro de uma string JavaScript.

Por que isso importa: um leitor de URL que não executa JS (curl, crawler, e a
maior parte dos agentes de IA que "leem um link") descarta o conteúdo de
<script>. Texto que só existe dentro de `const CORPUS_MD = \\`...\\`` chega tão
vazio quanto a SPA. Escrito no <body>, chega inteiro.

O JavaScript continua lá, mas só como melhoria: ele LÊ os elementos já
presentes, monta a árvore recolhível e reaproveita os mesmos <p> — o texto
existe uma única vez nos bytes do arquivo.

    legível por humanos, por máquinas e por IA — as três lendo a mesma fonte,
    sem tradução nem duplicação de conteúdo entre elas.

USO
  python gerador_rolo.py --piloto
  python gerador_rolo.py --tudo
  python gerador_rolo.py --colecoes
  python gerador_rolo.py --obra platao-a-republica-grc-john-burnet-1905

Ὁ Διαφορεύς παρῆν
"""
from __future__ import annotations
import argparse, base64, html, json, os, re, shutil, sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CORPUS_PADRAO = Path(r"C:\Users\bruno\Claude\Projects\Projeto Pedra Angular\app-leitura\public\livros")
TEMPLATE_PADRAO = AQUI / "rolo_template.html"
SAIDA_PADRAO = AQUI / "rolo"
FONTES_PADRAO = AQUI / "fontes"

# ---------------------------------------------------------------- detecção de escrita
RX_HEBRAICO = re.compile(r"[\u0590-\u05FF]")
RX_GREGO = re.compile(r"[\u0370-\u03FF\u1F00-\u1FFF]")
RX_CIRILICO = re.compile(r"[\u0400-\u04FF]")

def idioma_da_linha(t: str) -> tuple[str, str]:
    """(lang, dir) — mesma heurística do motor, para o HTML já nascer certo."""
    if RX_HEBRAICO.search(t):
        return "he", "rtl"
    if RX_GREGO.search(t):
        return "grc", "ltr"
    if RX_CIRILICO.search(t):
        return "ru", "ltr"
    return "", "ltr"

# ---------------------------------------------------------------- idioma da página
# O front matter usa ISO 639-2/B ("eng", "grc"); o atributo lang do HTML precisa
# de BCP 47 ("en", "grc"). Sem esta tabela o código cai num padrão e a página
# MENTE: um leitor de tela lê inglês com fonética portuguesa. Era o caso de 326
# páginas — inglês é o maior idioma do acervo e não estava no mapa.
#
# O corpus tem grafias mistas para o mesmo idioma ("por" e "pt-BR", "lat" e
# "la"): as duas entram aqui de propósito, porque normalizar 1043 arquivos é
# outro trabalho e a página não pode esperar por ele.
IDIOMAS_BCP47 = {
    "por": "pt-BR", "pt": "pt-BR", "pt-br": "pt-BR",
    "eng": "en", "en": "en",
    "grc": "grc",  # grego ANTIGO — "el" é o moderno, outra fonética
    "ell": "el", "el": "el",
    "lat": "la", "la": "la",
    "heb": "he", "he": "he",
    "ara": "ar", "ar": "ar",
    "rus": "ru", "ru": "ru",
    "fra": "fr", "fre": "fr", "fr": "fr",
    "deu": "de", "ger": "de", "de": "de",
    "spa": "es", "es": "es",
    "ita": "it", "it": "it",
}

# Código que o mapa não conhece não pode sumir em silêncio: some daqui e
# reaparece como página mentindo o idioma. Relatado no fim da execução.
IDIOMAS_DESCONHECIDOS: dict[str, int] = {}


def idioma_bcp47(bruto: str | None) -> str:
    """`language:` do front matter -> atributo lang válido.

    Edição bilíngue ("pt-BR/grc") vale pelo idioma primário: os trechos na outra
    escrita já recebem lang próprio por linha, em corpo_html()."""
    if not bruto or not bruto.strip():
        IDIOMAS_DESCONHECIDOS["(sem campo language)"] = (
            IDIOMAS_DESCONHECIDOS.get("(sem campo language)", 0) + 1
        )
        return "pt-BR"
    chave = bruto.strip().split("/")[0].strip().lower()
    if chave in IDIOMAS_BCP47:
        return IDIOMAS_BCP47[chave]
    IDIOMAS_DESCONHECIDOS[bruto] = IDIOMAS_DESCONHECIDOS.get(bruto, 0) + 1
    return "pt-BR"

# ---------------------------------------------------------------- front matter
def separar_yaml(texto: str) -> tuple[dict, str]:
    """YAML simples (chave: valor). Não usa PyYAML: o front matter do corpus é raso
    e a dependência não se paga."""
    if not texto.startswith("---"):
        return {}, texto
    fim = texto.find("\n---", 3)
    if fim == -1:
        return {}, texto
    bruto = texto[3:fim]
    corpo = texto[fim + 4 :].lstrip("\n")
    meta: dict[str, str] = {}
    for linha in bruto.splitlines():
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", linha)
        if not m:
            continue
        chave, valor = m.group(1), m.group(2).strip()
        if valor in ("", "null", "~", "[]", "{}"):
            continue
        if len(valor) > 1 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        meta[chave] = valor
    return meta, corpo

# ---------------------------------------------------------------- markdown inline
# Mesmíssimo padrão de src/lib/remarkBlockAnchors.ts no app. Não é coincidência
# que sejam iguais: é o que garante que o id que o app calcula para um versículo
# seja exatamente o id que existe no rolo. Se um dia divergirem, os links do app
# passam a apontar para o nada — silenciosamente.
RX_ANCORA = re.compile(r"\s*\^([A-Za-z0-9][A-Za-z0-9-]*)\s*$")
RX_WIKILINK = re.compile(r"\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]")
RX_VERSICULO = re.compile(r"\*\*(\d+[a-z]?)\*\*")
RX_ROTULO = re.compile(r"\*\*([A-Za-zÀ-ÿ]{2,12}(?: \([^)]{1,24}\))?)\*\*")
RX_NEGRITO = re.compile(r"\*\*(.+?)\*\*")
RX_ITALICO = re.compile(r"(?<![\*\w])\*([^*\n]+?)\*(?!\*)")
RX_CODIGO = re.compile(r"`([^`\n]+?)`")
# Marcador canônico literal: [1.1], [327a], [5.a], [48.b2]. NUNCA reformatado —
# vira endereço navegável preservando o literal exato. Idêntico ao MARKER_RE de
# src/lib/remarkMarkers.ts, pelo mesmo motivo da âncora acima.
RX_MARCADOR = re.compile(r"\[(\d+(?:[a-z]\d*)?(?:\.[0-9a-z]+)?)\]")
RX_NOTA_REF = re.compile(r"\[\^([A-Za-z0-9\-_]+)\]")
# Quebra dura do CommonMark: dois ou mais espaços no fim da linha. O remark do
# app já a respeita — o versículo continua UM parágrafo e a âncora fica no lugar.
# Aqui ela precisa ser lida antes de qualquer rstrip(), senão o sinal se perde e
# cada linha do poema vira um <p> solto, com o id caindo na última em vez da
# primeira. É o caso da Vulgata (28.858 quebras) e de qualquer texto em verso.
RX_QUEBRA_DURA = re.compile(r"\S {2,}$")

def inline(txt: str, marcadores: dict[str, int] | None = None) -> str:
    """Converte uma linha de markdown em HTML. O texto é escapado ANTES de
    qualquer substituição, então nada do corpus pode injetar marcação.

    `marcadores` é o contador compartilhado do arquivo: edições bilíngues
    repetem o mesmo endereço (original e tradução), e a primeira ocorrência
    fica com o id canônico — a mesma regra do app."""

    def marcador(m: "re.Match[str]") -> str:
        literal = m.group(1)
        if marcadores is None:
            return f'<span class="marcador">[{literal}]</span>'
        n = marcadores.get(literal, 0)
        marcadores[literal] = n + 1
        ident = f"marker-{literal}" if n == 0 else f"marker-{literal}-{n + 1}"
        return f'<span class="marcador" id="{atributo(ident)}">[{literal}]</span>'

    s = html.escape(txt, quote=False)
    s = RX_CODIGO.sub(lambda m: f"<code>{m.group(1)}</code>", s)
    s = RX_WIKILINK.sub(
        lambda m: '<a class="wikilink" href="#">{}</a>'.format(m.group(2) or m.group(1)), s
    )
    s = RX_NOTA_REF.sub(lambda m: f'<sup class="nota-ref">[{m.group(1)}]</sup>', s)
    s = RX_VERSICULO.sub(lambda m: f'<span class="versiculo">{m.group(1)}</span>', s)
    s = RX_ROTULO.sub(lambda m: f'<span class="idioma-tag">{m.group(1)}</span>', s)
    s = RX_NEGRITO.sub(lambda m: f"<strong>{m.group(1)}</strong>", s)
    s = RX_ITALICO.sub(lambda m: f"<em>{m.group(1)}</em>", s)
    s = RX_MARCADOR.sub(marcador, s)
    return s

def atributo(valor: str) -> str:
    return html.escape(valor, quote=True)

# ---------------------------------------------------------------- markdown -> corpo HTML
def blocos_logicos(md: str) -> list[list[str]]:
    """Agrupa as linhas físicas em blocos lógicos.

    Linha terminada em quebra dura (dois espaços) continua na seguinte; linha em
    branco sempre fecha o bloco. Quase todo bloco tem um segmento só — nesse caso
    o caminho de renderização é exatamente o de antes."""
    blocos: list[list[str]] = []
    atual: list[str] = []
    for linha in md.splitlines():
        if not linha.strip():
            if atual:
                blocos.append(atual)
                atual = []
            continue
        atual.append(linha)
        if not RX_QUEBRA_DURA.search(linha):
            blocos.append(atual)
            atual = []
    if atual:
        blocos.append(atual)
    return blocos


def corpo_html(md: str, prefixo_id: str = "") -> tuple[str, int]:
    """Emite uma sequência PLANA de elementos. A hierarquia fica em data-n —
    o motor a reconstrói. Plano no HTML significa que qualquer leitor ingênuo
    (incluindo uma IA) lê o texto na ordem certa, do começo ao fim."""
    saida: list[str] = []
    usados: set[str] = set()
    marcadores: dict[str, int] = {}
    n_headings = 0

    def id_unico(bruto: str) -> str:
        # prefixo "anchor-" igual ao do app: o id que o app calcula para um
        # versículo é o id que o rolo tem, sem tradução no meio
        base = "anchor-" + ((prefixo_id + bruto) if prefixo_id else bruto)
        cand, i = base, 2
        while cand in usados:
            cand, i = f"{base}-{i}", i + 1
        usados.add(cand)
        return cand

    for bloco in blocos_logicos(md):
        segmentos = [l.rstrip() for l in bloco]
        crua = segmentos[0]

        # A âncora fecha o bloco, então vive no último segmento.
        ancora = ""
        m = RX_ANCORA.search(segmentos[-1])
        if m:
            ancora = id_unico(m.group(1))
            segmentos[-1] = segmentos[-1][: m.start()].rstrip()
            if len(segmentos) == 1:
                crua = segmentos[0]

        attr_id = f' id="{atributo(ancora)}"' if ancora else ""

        # comentário HTML na fonte é bilhete do extrator, não texto da obra
        if re.fullmatch(r"<!--.*?-->", crua.strip(), re.S):
            continue

        if re.fullmatch(r"-{3,}|\*{3,}|_{3,}", crua.strip()):
            saida.append('<hr class="regua">')
            continue

        mh = re.match(r"^(#{1,})\s+(.*)$", crua)
        if mh:
            n = len(mh.group(1))
            texto = mh.group(2).strip()
            n_headings += 1
            conteudo = inline(texto, marcadores)
            if n <= 6:
                saida.append(f'<h{n} data-n="{n}" style="--n:{n}"{attr_id}>{conteudo}</h{n}>')
            else:
                saida.append(
                    f'<div role="heading" aria-level="{n}" data-n="{n}" style="--n:{n}"{attr_id}>{conteudo}</div>'
                )
            continue

        classes = ["paragrafo"]
        corpo = crua
        if corpo.lstrip().startswith(">"):
            classes.append("citacao")
            corpo = corpo.lstrip()[1:].lstrip()
        elif re.match(r"^\s*[-*+]\s+", corpo):
            classes.append("item")
            corpo = re.sub(r"^\s*[-*+]\s+", "", corpo)
        elif re.match(r"^\s*\d+[.)]\s+", corpo):
            classes.append("item")

        if len(segmentos) > 1:
            # Bloco ligado por quebra dura: UM parágrafo, <br> entre as linhas.
            # O primeiro segmento já perdeu o prefixo de citação/lista acima.
            partes = [corpo] + segmentos[1:]
            lang, direcao = idioma_da_linha(" ".join(partes))
            attr_lang = f' lang="{lang}"' if lang else ""
            attr_dir = ' dir="rtl"' if direcao == "rtl" else ""
            miolo = "<br>".join(inline(p, marcadores) for p in partes if p)
            saida.append(
                f'<p class="{" ".join(classes)}"{attr_lang}{attr_dir}{attr_id}>{miolo}</p>'
            )
            continue

        lang, direcao = idioma_da_linha(corpo)
        attr_lang = f' lang="{lang}"' if lang else ""
        attr_dir = ' dir="rtl"' if direcao == "rtl" else ""
        saida.append(
            f'<p class="{" ".join(classes)}"{attr_lang}{attr_dir}{attr_id}>{inline(corpo, marcadores)}</p>'
        )

    return "\n".join(saida), n_headings

# ---------------------------------------------------------------- ficha e meta tags
ROTULOS = [
    ("author", "Autor"),
    ("translator", "Tradutor"),
    ("editor", "Editor"),
    ("language", "Idioma"),
    ("year_original", "Ano do original"),
    ("publisher", "Editora"),
    ("sistema_referencia", "Sistema de referência"),
    ("abrev", "Abreviatura"),
    ("license", "Licença"),
    ("source", "Fonte"),
]

def ficha_html(meta: dict, slug: str, md_href: str) -> str:
    itens = []
    for chave, rotulo in ROTULOS:
        v = meta.get(chave)
        if not v:
            continue
        itens.append(f"        <dt>{rotulo}</dt><dd>{html.escape(str(v))}</dd>")
    itens.append(f"        <dt>Identificador</dt><dd>{html.escape(slug)}</dd>")
    itens.append(
        f'        <dt>Markdown</dt><dd><a href="{atributo(md_href)}">{html.escape(md_href)}</a></dd>'
    )
    return "\n".join(itens)

def meta_tags(meta: dict) -> str:
    saida = []
    mapa = {
        "author": "author",
        "translator": "tradutor",
        "editor": "editor",
        "language": "idioma",
        "license": "licenca",
        "source": "fonte",
        "publisher": "editora",
        "year_original": "ano_original",
        "sistema_referencia": "sistema_referencia",
    }
    for chave, nome in mapa.items():
        v = meta.get(chave)
        if v:
            saida.append(f'<meta name="{nome}" content="{atributo(str(v))}">')
    saida.append('<meta name="generator" content="gerador_rolo.py — Pedra Angular">')
    return "\n".join(saida)

# ---------------------------------------------------------------- montagem do arquivo
def css_fonte_local(rel: str = "fontes") -> str:
    return (
        f"  @font-face{{font-family:'Atkinson Hyperlegible';font-weight:400;font-style:normal;font-display:swap;\n"
        f"    src:url({rel}/Atkinson-Regular.woff2) format('woff2');}}\n"
        f"  @font-face{{font-family:'Atkinson Hyperlegible';font-weight:700;font-style:normal;font-display:swap;\n"
        f"    src:url({rel}/Atkinson-Bold.woff2) format('woff2');}}"
    )

def css_fonte_embutida(dir_fontes: Path) -> str:
    def b64(nome: str) -> str:
        return base64.b64encode((dir_fontes / nome).read_bytes()).decode("ascii")
    return (
        f"  @font-face{{font-family:'Atkinson Hyperlegible';font-weight:400;font-style:normal;font-display:swap;\n"
        f"    src:url(data:font/woff2;base64,{b64('Atkinson-Regular.woff2')}) format('woff2');}}\n"
        f"  @font-face{{font-family:'Atkinson Hyperlegible';font-weight:700;font-style:normal;font-display:swap;\n"
        f"    src:url(data:font/woff2;base64,{b64('Atkinson-Bold.woff2')}) format('woff2');}}"
    )

def preencher(template: str, campos: dict) -> str:
    fora = template
    for chave, valor in campos.items():
        fora = fora.replace("{{" + chave + "}}", valor)
    return fora

def gerar_obra(entrada: dict, raiz_corpus: Path, template: str, saida: Path, css_fonte: str,
               gemeo_md: bool = True) -> dict | None:
    caminho = raiz_corpus / entrada["arquivo"]
    if not caminho.exists():
        print(f"  ! ausente: {entrada['arquivo']}", file=sys.stderr)
        return None
    bruto = caminho.read_text(encoding="utf-8")
    meta, md = separar_yaml(bruto)
    slug = entrada.get("id") or caminho.stem
    titulo = meta.get("title") or entrada.get("titulo") or slug
    autor = meta.get("author") or entrada.get("autor") or ""
    if autor in ("—", "-", "null"):
        autor = meta.get("translator", "")
    corpo, n_head = corpo_html(md)
    lang_html = idioma_bcp47(meta.get("language"))
    descricao = " · ".join(
        [p for p in [titulo, autor, meta.get("source", "")[:120]] if p]
    )
    # Publicado ao lado do app, o .md já está servido em /livros/ — copiá-lo para
    # /rolo/ seria duplicar o corpus inteiro no site sem ganhar nada. Solto (num
    # pendrive, numa pasta), o gêmeo é a única forma de ter a fonte por perto.
    md_href = f"{slug}.md" if gemeo_md else f"../livros/{entrada['arquivo']}"

    doc = preencher(
        template,
        {
            "HTML_LANG": lang_html,
            "TITULO": html.escape(titulo),
            "AUTOR": html.escape(autor),
            "DESCRICAO": atributo(descricao),
            "META_TAGS": meta_tags(meta),
            "SLUG": atributo(slug),
            "MD_HREF": atributo(md_href),
            "FICHA": ficha_html(meta, slug, md_href),
            "CORPO": corpo,
            "FONTE_CSS": css_fonte,
        },
    )
    saida.mkdir(parents=True, exist_ok=True)
    destino = saida / f"{slug}.html"
    destino.write_text(doc, encoding="utf-8")
    if gemeo_md:
        # o .md ao lado: rota de leitura mais crua possível, para qualquer máquina
        (saida / f"{slug}.md").write_text(bruto, encoding="utf-8")
    return {
        "slug": slug,
        "titulo": titulo,
        "autor": autor,
        "colecao": entrada["arquivo"].split("/")[0],
        "sub": "/".join(entrada["arquivo"].split("/")[1:-1]),
        "idioma": lang_html,
        # a abreviatura é por OBRA, não global: cada tradução tem a sua
        # ("1Cor" na Almeida, "1Co" alhures) e é ela que forma a âncora
        "abrev": meta.get("abrev", ""),
        # estantes extras onde a obra também deve ser encontrada — ver
        # gerar_indice(). O arquivo continua morando num lugar só.
        "tambem_em": entrada.get("tambem_em") or [],
        "bytes": destino.stat().st_size,
        "headings": n_head,
        "md_href": md_href,
    }

# ---------------------------------------------------------------- coleção (era)
def nome_bonito(bruto: str) -> str:
    s = re.sub(r"^\d+[_\-.\s]+", "", bruto)
    return s.replace("_", " ").replace("-", " ").strip() or bruto

def achatar(s: str) -> str:
    """Só para COMPARAR nomes de pasta com títulos de obra: sem acento, sem
    pontuação, minúsculo. Nunca usado para exibir nada."""
    import unicodedata
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())

def shift(md: str, delta: int) -> str:
    if delta <= 0:
        return md
    return re.sub(r"^(#{1,})(\s)", lambda m: "#" * (len(m.group(1)) + delta) + m.group(2), md, flags=re.M)

def gerar_colecao(nome: str, entradas: list[dict], raiz_corpus: Path, template: str,
                  saida: Path, css_fonte: str) -> dict:
    """Um arquivo por era, autocontido, fonte embutida: a cópia de sobrevivência.
    Pastas viram headings (isomorfismo pasta<->heading); o arquivo é rebaixado."""
    from collections import Counter
    # quantos arquivos moram em cada pasta: uma pasta com um arquivo só costuma
    # ser mero invólucro da obra, e repetiria o título dela
    conta = Counter("/".join(e["arquivo"].split("/")[:-1]) for e in entradas)

    pedacos = [f"# {nome_bonito(nome)}"]
    anterior: list[str] = []
    for e in sorted(entradas, key=lambda x: x["arquivo"]):
        caminho = raiz_corpus / e["arquivo"]
        if not caminho.exists():
            continue
        partes = e["arquivo"].split("/")
        pastas = partes[1:-1]
        _, md = separar_yaml(caminho.read_text(encoding="utf-8"))
        md = md.strip()

        # pasta que só embrulha um arquivo homônimo não vira heading: seria dizer
        # "Economics / Economics" e gastar um nível de profundidade à toa
        m = re.search(r"^#\s+(.*)$", md, re.M)
        titulo_arquivo = m.group(1).strip() if m else ""
        if (
            pastas
            and conta["/".join(partes[:-1])] == 1
            and achatar(nome_bonito(pastas[-1])) == achatar(titulo_arquivo)
        ):
            pastas = pastas[:-1]

        # emite APENAS os níveis que mudaram em relação à obra anterior — senão
        # "Moralistas" reaparece uma vez por obra, 142 vezes seguidas
        comum = 0
        while comum < len(pastas) and comum < len(anterior) and pastas[comum] == anterior[comum]:
            comum += 1
        for i in range(comum, len(pastas)):
            pedacos.append(f"{'#' * (i + 2)} {nome_bonito(pastas[i])}")
        anterior = pastas

        pedacos.append(shift(md, len(pastas) + 1))
    md_total = "\n\n".join(pedacos)
    corpo, n_head = corpo_html(md_total)
    doc = preencher(
        template,
        {
            "HTML_LANG": "pt-BR",
            "TITULO": html.escape(nome_bonito(nome)),
            "AUTOR": f"{len(entradas)} obras",
            "DESCRICAO": atributo(f"{nome_bonito(nome)} — {len(entradas)} obras · Pedra Angular"),
            "META_TAGS": '<meta name="generator" content="gerador_rolo.py — Pedra Angular">',
            "SLUG": atributo(nome.lower()),
            "MD_HREF": atributo(f"{nome_bonito(nome)}.md"),
            "FICHA": f"        <dt>Obras</dt><dd>{len(entradas)}</dd>\n"
                     f"        <dt>Formato</dt><dd>rolo-coleção autocontido (fonte embutida, zero rede)</dd>",
            "CORPO": corpo,
            "FONTE_CSS": css_fonte,
        },
    )
    saida.mkdir(parents=True, exist_ok=True)
    destino = saida / f"{nome_bonito(nome)}.html"
    destino.write_text(doc, encoding="utf-8")
    (saida / f"{nome_bonito(nome)}.md").write_text(md_total, encoding="utf-8")
    return {"nome": nome_bonito(nome), "obras": len(entradas), "bytes": destino.stat().st_size,
            "headings": n_head, "arquivo": destino.name}

# ---------------------------------------------------------------- índice
# A CASCA das páginas de índice. Antes daqui elas eram texto sobre fundo fixo:
# sem troca de tema, sem A−/A+, sem sumário, sem foco de teclado — enquanto a
# página de uma obra tinha tudo isso. Quem chegava por /rolo/BIBLIAS/Grego.html
# não tinha os controles que tinha em /rolo/<obra>.html, e a diferença não se
# explicava por nada: as duas são páginas do mesmo rolo.
#
# Agora as duas usam os mesmos tokens, os mesmos três temas e a mesma Barra
# Angular (Φ · A− · A+ · Ξ). As chaves de localStorage são as MESMAS do motor
# das obras (`pa:tema`, `pa:fonte`), então o tema e o corpo de letra escolhidos
# no índice seguem a pessoa para dentro da obra, e vice-versa.
#
# Corpo de letra é MULTIPLICADOR (--ui-escala-fonte), nunca pixel fixo: quem
# aumentou a letra no aparelho não é ignorado.
CASCA_CSS = """<style>
:root{
  --ui-fundo:#0A1220;--ui-texto:#EAE3D3;--ui-acento:#C9A227;
  --ui-superficie:rgba(255,255,255,.05);--ui-linha:rgba(255,255,255,.16);
  --ui-escala-fonte:1;
  --ui-mono:ui-monospace,Consolas,'Courier New',monospace;
}
/* Acento próprio do pergaminho: o #C9A227 dos outros dois dá 1,89:1 sobre
   este fundo claro — abaixo até do piso de 3:1 para elemento não textual, e
   é a cor do anel de foco. #5c4710 é o mesmo ouro escurecido até 6,95:1. */
[data-theme=pergaminho]{--ui-fundo:#EAE3D3;--ui-texto:#241E14;--ui-acento:#5c4710;
  --ui-superficie:rgba(0,0,0,.045);--ui-linha:rgba(0,0,0,.16);}
[data-theme=petroleo]{--ui-fundo:#0E2E33;--ui-texto:#DCEEEF;
  --ui-superficie:rgba(255,255,255,.05);--ui-linha:rgba(255,255,255,.14);}
*{box-sizing:border-box;}
body{background:var(--ui-fundo);color:var(--ui-texto);font-family:Georgia,serif;
  margin:0;padding:0 0 5rem;font-size:calc(1rem*var(--ui-escala-fonte));}
.w{max-width:760px;margin:0 auto;padding:0 1rem;}
h1{color:var(--ui-acento);font-size:calc(1.6rem*var(--ui-escala-fonte));}
h2{font-size:calc(1.1rem*var(--ui-escala-fonte));border-bottom:1px dashed var(--ui-linha);
  padding-bottom:.3rem;margin-top:2.2rem;scroll-margin-top:5rem;}
ul{list-style:none;padding:0;}
li{padding:.45rem 0;border-bottom:1px dotted var(--ui-linha);}
a{color:var(--ui-texto);}
a:hover{color:var(--ui-acento);}
pre{font-family:var(--ui-mono);font-size:calc(.78rem*var(--ui-escala-fonte));line-height:1.6;
  white-space:pre-wrap;background:var(--ui-superficie);border-left:2px solid var(--ui-acento);
  padding:.9rem 1rem;overflow-wrap:anywhere;}
.md{font-family:var(--ui-mono);font-size:calc(.68rem*var(--ui-escala-fonte));opacity:.6;margin-left:.5rem;}
.n{font-family:var(--ui-mono);font-size:calc(.7rem*var(--ui-escala-fonte));opacity:.65;}

/* ---- Barra Angular: Φ · A− · A+ · (temas) · Ξ ---- */
.barra-angular{position:sticky;top:0;z-index:20;background:var(--ui-fundo);
  border-bottom:1px solid var(--ui-linha);}
.barra-angular>div{max-width:760px;margin:0 auto;display:flex;align-items:center;
  gap:.4rem;flex-wrap:wrap;padding:.5rem 1rem;}
.ui-botao-barra{min-width:2.75rem;min-height:2.75rem;padding:.4rem .6rem;
  border:2px solid currentColor;border-radius:.5rem;background:none;color:var(--ui-acento);
  font-family:Georgia,serif;font-size:calc(1.25rem*var(--ui-escala-fonte));font-weight:700;
  line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;
  text-decoration:none;-webkit-tap-highlight-color:transparent;}
.ui-botao-barra--tema{font-family:var(--ui-mono);font-weight:400;
  font-size:calc(.78rem*var(--ui-escala-fonte));}
.ui-botao-barra[aria-pressed=true]{background:var(--ui-superficie);}
.barra-espaco{flex:1 1 0;}
:focus-visible{outline:2px solid var(--ui-acento);outline-offset:2px;}
.pular{position:absolute;left:-9999px;}
.pular:focus{left:0;top:0;z-index:50;padding:.6rem 1rem;background:var(--ui-acento);
  color:var(--ui-fundo);border-radius:0 0 .5rem 0;}
.sumario{max-width:760px;margin:.75rem auto 0;padding:.6rem 1rem;background:var(--ui-superficie);
  border:1px solid var(--ui-linha);border-radius:.5rem;}
.sumario[hidden]{display:none;}
.sumario ul{margin:0;}
.sumario li{border:none;padding:.3rem 0;}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important;scroll-behavior:auto!important;}
}
</style>"""

CASCA_JS = """<script>
(function(){
  var R=document.documentElement;
  function ler(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function guardar(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  /* tema e corpo aplicados ANTES do primeiro desenho: sem piscar */
  var t=ler('pa:tema'); if(t) R.setAttribute('data-theme',t);
  var f=parseFloat(ler('pa:fonte')); if(f) R.style.setProperty('--ui-escala-fonte',f);

  document.addEventListener('DOMContentLoaded',function(){
    function aplicarTema(nome){
      R.setAttribute('data-theme',nome); guardar('pa:tema',nome);
      document.querySelectorAll('[data-tema]').forEach(function(b){
        b.setAttribute('aria-pressed', b.dataset.tema===nome?'true':'false');
      });
    }
    document.querySelectorAll('[data-tema]').forEach(function(b){
      b.addEventListener('click',function(){aplicarTema(b.dataset.tema);});
    });
    aplicarTema(R.getAttribute('data-theme')||'noite');

    /* A− / A+ : multiplicador entre 0,8 e 2,6 — nunca pixel fixo */
    function ajustar(d){
      var a=parseFloat(getComputedStyle(R).getPropertyValue('--ui-escala-fonte'))||1;
      var n=Math.min(2.6,Math.max(.8,+(a+d).toFixed(2)));
      R.style.setProperty('--ui-escala-fonte',n); guardar('pa:fonte',n);
    }
    var bm=document.getElementById('ui-menos'); if(bm) bm.addEventListener('click',function(){ajustar(-.1);});
    var bM=document.getElementById('ui-mais');  if(bM) bM.addEventListener('click',function(){ajustar(.1);});

    /* Ξ = a estrutura desta página, montada a partir dos <h2> que já existem.
       Sem <h2> na página, o botão se retira em vez de abrir um painel vazio. */
    var painel=document.getElementById('ui-sumario'), botao=document.getElementById('ui-xi');
    if(painel&&botao){
      var hs=[].slice.call(document.querySelectorAll('.w h2'));
      if(!hs.length){ botao.hidden=true; return; }
      var ul=document.createElement('ul');
      hs.forEach(function(h,i){
        if(!h.id) h.id='secao-'+i;
        var li=document.createElement('li'), a=document.createElement('a');
        a.href='#'+h.id; a.textContent=h.textContent;
        li.appendChild(a); ul.appendChild(li);
      });
      painel.appendChild(ul);
      botao.addEventListener('click',function(){
        var abrir=painel.hidden;
        painel.hidden=!abrir;
        botao.setAttribute('aria-expanded',abrir?'true':'false');
      });
    }
  });
})();
</script>"""

def agrupar_por_pasta(obras: list[dict], colecao: str) -> dict[str, list[dict]]:
    """Agrupa as obras por pasta, subindo enquanto a pasta embrulhar uma só.

    470 das 547 pastas do corpus (86%) guardam um arquivo único. Agrupando pelo
    caminho literal, cada uma vira um título de seção que só repete — logo
    abaixo, sozinho — o título da própria obra: "Epicteto/Diatribes (1)",
    "Epicteto/Encheiridion (1)", cinco vezes seguidas.

    Pior quando o nome da pasta perdeu o título no slug: a pasta
    "Grego/Moralistas/Plutarco/The" é Περὶ τοῦ Ε τοῦ ἐν Δελφοῖς, e o índice
    anunciava "Plutarco/The". Subindo um nível, a pasta-invólucro desaparece do
    índice e a obra aparece pelo título que está no seu YAML.

    Sobe em cadeia, contando as obras AO NÍVEL OU ABAIXO de cada prefixo — por
    isso não pára num avô que também embrulha um só."""
    from collections import Counter

    ao_nivel_ou_abaixo: Counter[str] = Counter()
    for o in obras:
        sub = o.get("sub") or ""
        partes = sub.split("/") if sub else []
        for i in range(len(partes) + 1):
            ao_nivel_ou_abaixo["/".join(partes[:i])] += 1

    grupos: dict[str, list[dict]] = {}
    for o in obras:
        chave = o.get("sub") or ""
        while "/" in chave and ao_nivel_ou_abaixo[chave] <= 1:
            chave = chave.rsplit("/", 1)[0]
        # último nível que ainda embrulha uma obra só: cai na raiz do acervo
        if chave and "/" not in chave and ao_nivel_ou_abaixo[chave] <= 1:
            chave = ""
        grupos.setdefault(chave or colecao, []).append(o)
    return grupos


def rotulo_grupo(chave: str) -> str:
    """"Grego/Estoicismo/Epicteto" -> "Grego / Estoicismo / Epicteto".

    Barra colada lê como uma palavra só; com espaço, o leitor de tela faz a
    pausa e o olho separa os níveis."""
    return " / ".join(nome_bonito(p) for p in chave.split("/"))


# Nome em português do código BCP 47, só para exibir. A raiz declarava
# "português, grego, latim e hebraico" à mão — e por isso não citava o inglês,
# que é o MAIOR idioma do acervo. Agora a frase é montada a partir do que os
# arquivos dizem, e um idioma novo aparece sozinho.
NOMES_IDIOMA = {
    "pt-BR": "português", "en": "inglês", "grc": "grego antigo", "el": "grego moderno",
    "la": "latim", "he": "hebraico", "ar": "árabe", "ru": "russo",
    "fr": "francês", "de": "alemão", "es": "espanhol", "it": "italiano",
}

# Famílias de <id> observadas no catálogo. A regra vale mais que a lista: quem
# conhece a família monta o endereço sem baixar 1043 linhas. Cada família traz a
# contagem e um exemplo REAL, tirado do próprio catálogo — se uma família mudar
# de tamanho ou sumir, a página conta isso sozinha.
FAMILIAS_ID = [
    (re.compile(r"^biblia-\d\d-"), "biblia-<NN>-<livro>-<idioma>-<versão>-<ano>"),
    (re.compile(r"^biblia-hebraica-wlc-"), "biblia-hebraica-wlc-<NN>-<livro>"),
    (re.compile(r"^vulgata-clementina-"), "vulgata-clementina-<abrev>-lat-<editor>-<ano>"),
    (re.compile(r"^douay-rheims-"), "douay-rheims-<abrev>-eng-<editor>-<ano>"),
    (re.compile(r"^personagem-"), "personagem-<nome>"),
    # o ano pode ser intervalo (1935-37) ou "sd" (sine data, sem data na fonte):
    # exigir \d{4} no fim jogaria 57 obras latinas para fora sem motivo
    (re.compile(r"-(eng|grc|lat|por|heb|ara|la)-"),
     "<autor>-<obra>-<idioma>-<editor ou tradutor>-<ano ou sd>"),
]


def familias_de_id(fichas: list[dict]) -> list[tuple[str, int, str]]:
    """(padrão, quantas, exemplo real) — na ordem do mais comum ao menos."""
    achados: dict[str, list[str]] = {}
    for f in fichas:
        for rx, padrao in FAMILIAS_ID:
            if rx.search(f["slug"]):
                achados.setdefault(padrao, []).append(f["slug"])
                break
        else:
            # Dizer a verdade vale mais que forçar todo id numa família: estes
            # entraram antes da convenção e não têm segmento de idioma. Quem
            # monta endereço por padrão precisa saber que a exceção existe.
            achados.setdefault(
                "(anteriores à convenção — sem segmento de idioma)", []
            ).append(f["slug"])
    return sorted(
        ((p, len(ids), sorted(ids)[0]) for p, ids in achados.items()),
        key=lambda x: -x[1],
    )


def carimbo_da_geracao() -> str:
    """Data e commit. Sem isso não há como distinguir a página recém-gerada de
    uma resposta de cache antigo — e a contagem de obras deixa de ser auditável."""
    import datetime, subprocess

    data = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    commit = os.environ.get("GITHUB_SHA", "")
    if not commit:
        try:
            commit = subprocess.run(
                ["git", "rev-parse", "HEAD"], capture_output=True, text=True, timeout=5
            ).stdout.strip()
        except Exception:
            commit = ""
    return f"{data}, commit {commit[:8]}" if commit else data


def gerar_redirecionamentos(mapa: dict[str, str], fichas: list[dict], saida: Path) -> int:
    """Páginas de id aposentado.

    A Regra 0 diz que id publicado não muda — e não muda mesmo: ele continua
    respondendo. O que muda é o que ele responde. Um id que nasceu por engano
    (a mesma obra catalogada duas vezes, uma por estante) não pode simplesmente
    sumir, porque links já podem estar circulando; mas também não deve seguir
    fingindo ser uma obra à parte e inflando a contagem do acervo.

    A página diz em TEXTO para onde ir, antes de redirecionar: quem lê sem
    executar nada — que é o leitor-alvo do /rolo — precisa da resposta no
    corpo, não num cabeçalho que não vai seguir."""
    por_slug = {f["slug"]: f for f in fichas}
    escritas = 0
    for velho, canonico in mapa.items():
        destino = por_slug.get(canonico)
        if not destino:
            print(f"  ! redirecionamento sem destino: {velho} -> {canonico}", file=sys.stderr)
            continue
        linhas = [
            "<!DOCTYPE html><html lang=pt-BR><head><meta charset=UTF-8>",
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            f'<link rel="canonical" href="{atributo(canonico)}.html">',
            f'<meta http-equiv="refresh" content="3; url={atributo(canonico)}.html">',
            '<meta name="robots" content="noindex">',
            f"<title>{html.escape(destino['titulo'])} · Pedra Angular</title>",
            ESTILO_INDICE,
            "</head><body><div class=w>",
            "<h1>Φ Endereço antigo</h1>",
            f"<p>Esta obra tem um endereço canônico: "
            f'<a href="{atributo(canonico)}.html">{html.escape(destino["titulo"])}</a> '
            f"(<code>{html.escape(canonico)}</code>).</p>",
            f"<p class=n>O identificador <code>{html.escape(velho)}</code> apontava para o "
            "mesmo texto, catalogado duas vezes por aparecer em duas estantes. Continua "
            "respondendo para não quebrar links já feitos, mas não conta como obra à parte "
            "no acervo.</p>",
            f'<p><a href="{atributo(canonico)}.html">Ir para a obra →</a></p>',
            "<p class=n style='margin-top:3rem'>Ὁ Διαφορεύς παρῆν</p></div></body></html>",
        ]
        (saida / f"{velho}.html").write_text("\n".join(linhas), encoding="utf-8")
        escritas += 1
    return escritas


def gerar_pagina_abreviaturas(fichas: list[dict], saida: Path) -> int:
    """A âncora de versículo nasce da abreviatura, e a abreviatura varia POR
    TRADUÇÃO — a Almeida escreve "1Cor" onde outra escreve "1Co". Uma lista
    global dos 66 livros seria simples e estaria errada: o que endereça a
    passagem é a abreviatura daquela obra. Por isso a tabela é abreviatura ->
    obras que a usam."""
    por_abrev: dict[str, list[dict]] = {}
    for f in fichas:
        if f.get("abrev"):
            por_abrev.setdefault(f["abrev"], []).append(f)
    if not por_abrev:
        return 0

    linhas = cabeca("Abreviaturas")
    linhas.append("<h1>Φ Abreviaturas de âncora</h1>")
    linhas.append(
        f'<p>{len(por_abrev)} abreviaturas em {sum(len(v) for v in por_abrev.values())} obras. '
        '<a href="index.html">← raiz</a></p>'
    )
    linhas.append(
        "<pre>"
        + html.escape(
            "A âncora de uma passagem é   #anchor-<abrev em minúsculas>-<capítulo>-<versículo>\n"
            "  ex.: abrev Gn  ->  /rolo/biblia-01-genesis-por-alm1911-1911.html#anchor-gn-1-1\n\n"
            "A abreviatura é da OBRA, não do livro bíblico: traduções diferentes\n"
            "abreviam diferente (1Cor / 1Co / 1Ep.Cor). A de cada obra está na\n"
            "ficha da sua própria página e no campo abrev: do seu .md."
        )
        + "</pre>"
    )
    for abrev in sorted(por_abrev, key=str.lower):
        obras = sorted(por_abrev[abrev], key=lambda x: x["titulo"])
        linhas.append(f"<h2>{html.escape(abrev)}</h2>")
        linhas.append(f"<p class=n>âncora <code>#anchor-{html.escape(abrev.lower())}-&lt;cap&gt;-&lt;v&gt;</code> · {len(obras)} obra(s)</p>")
        linhas.append("<ul>")
        for o in obras:
            lang_obra = f' lang="{atributo(o["idioma"])}"' if o.get("idioma") else ""
            linhas.append(
                f'<li><a href="{atributo(o["slug"])}.html"{lang_obra}>{html.escape(o["titulo"])}</a></li>'
            )
        linhas.append("</ul>")
    linhas.append("<p class=n style='margin-top:3rem'>Ὁ Διαφορεύς παρῆν</p></div></body></html>")
    (saida / "abreviaturas.html").write_text("\n".join(linhas), encoding="utf-8")
    return len(por_abrev)


def barra_angular(prefixo: str = "") -> str:
    """A Barra Angular — Φ · A− · A+ · (temas) · Ξ.

    Ordem fixa e não negociável (NORMAS.md, LEI 8 e N61): Φ na extremidade
    esquerda, Ξ na direita, o corpo do texto no meio, e o que for específico
    desta superfície (os três temas) entre A+ e Ξ.

    Φ é a coleção: leva ao índice-raiz dos rolos, de qualquer profundidade.
    Ξ é a estrutura desta página: o sumário montado pelo script da casca.
    Os dois são LETRAS, não ícones — acompanham tema e corpo de graça."""
    return (
        '<nav class="barra-angular" aria-label="Controles de leitura"><div>'
        f'<a class="ui-botao-barra" href="{atributo(prefixo)}index.html"'
        ' aria-label="Abrir o índice dos rolos">Φ</a>'
        '<button class="ui-botao-barra" id="ui-menos" type="button"'
        ' aria-label="Diminuir letra">A−</button>'
        '<button class="ui-botao-barra" id="ui-mais" type="button"'
        ' aria-label="Aumentar letra">A+</button>'
        '<span class="barra-espaco"></span>'
        '<button class="ui-botao-barra ui-botao-barra--tema" type="button"'
        ' data-tema="noite" aria-pressed="false">Noite</button>'
        '<button class="ui-botao-barra ui-botao-barra--tema" type="button"'
        ' data-tema="pergaminho" aria-pressed="false">Pergaminho</button>'
        '<button class="ui-botao-barra ui-botao-barra--tema" type="button"'
        ' data-tema="petroleo" aria-pressed="false">Petróleo</button>'
        '<button class="ui-botao-barra" id="ui-xi" type="button" aria-label="Abrir sumário"'
        ' aria-expanded="false" aria-controls="ui-sumario">Ξ</button>'
        "</div></nav>"
    )


def cabeca(titulo: str, prefixo: str = "") -> list[str]:
    """Abre a página de índice já com a casca inteira. Fecha com
    `</div></body></html>` — um `</div>` só, o do `.w`, como antes."""
    return [
        "<!DOCTYPE html><html lang=pt-BR data-theme=noite><head><meta charset=UTF-8>",
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"<title>{html.escape(titulo)} · Pedra Angular</title>",
        CASCA_CSS,
        CASCA_JS,
        "</head><body>",
        '<a class=pular href="#conteudo">Pular para o conteúdo</a>',
        barra_angular(prefixo),
        '<nav id="ui-sumario" class="sumario" hidden aria-label="Sumário desta página"></nav>',
        '<div class=w id=conteudo>',
    ]

def gerar_indice(fichas: list[dict], saida: Path, colecoes: list[dict],
                 catalogo_path: Path | None = None) -> None:
    """Índice em dois andares, e o mapa antes da lista.

    Listar 893 obras custa ~66 mil caracteres mesmo no formato mais enxuto —
    o tamanho É a quantidade de obras, e não há compressão que resolva. Quem lê
    a página com orçamento limitado (um modelo de linguagem, tipicamente) corta
    no meio e sai com uma lista parcial achando que viu tudo.

    A saída é não depender da lista: os primeiros parágrafos ensinam o PADRÃO
    dos endereços. Quem lê só o começo já sabe montar a URL de qualquer obra e
    de qualquer passagem — e sabe em qual sub-índice procurar o resto."""
    por_colecao: dict[str, list[dict]] = {}
    for f in fichas:
        # obra solta na raiz de livros/ não é um acervo: seu "acervo" seria o
        # próprio nome do arquivo, e viraria um IMPRESSOES_APP.md.html
        chave = "GERAL" if f["colecao"].endswith(".md") else f["colecao"]
        por_colecao.setdefault(chave, []).append(f)

        # FICHA DE REMISSÃO. Um interlinear hebraico-português pertence às duas
        # estantes: quem chega pelo hebraico e quem chega pelo português têm que
        # achá-lo. Antes isso era feito catalogando a obra duas vezes — dois ids
        # para um arquivo, e o acervo relatando uma obra a mais do que tem.
        #
        # Aqui a obra continua sendo UMA (um id, um arquivo, uma contagem) e
        # ganha uma entrada extra no índice da outra estante, apontando para o
        # mesmo endereço. É o que uma biblioteca faz com um cartão de remissão:
        # o livro está numa prateleira só, a ficha está em duas.
        for extra in f.get("tambem_em") or []:
            partes = [p for p in extra.split("/") if p]
            if not partes:
                continue
            copia = dict(f)
            copia["colecao"] = partes[0]
            copia["sub"] = "/".join(partes[1:])
            copia["remissao"] = True
            # onde o arquivo realmente mora, para a ficha poder dizer de onde veio
            copia["colecao_real"] = "/".join(x for x in (f["colecao"], f["sub"]) if x)
            por_colecao.setdefault(partes[0], []).append(copia)

    total = len(fichas)
    exemplo = next((f for f in fichas if f["slug"].startswith("biblia-")), fichas[0] if fichas else None)
    slug_ex = exemplo["slug"] if exemplo else "id-da-obra"

    # ---------------- fatos, todos derivados ----------------
    from collections import Counter

    idiomas = Counter(f["idioma"] for f in fichas)
    frase_idiomas = ", ".join(
        f"{NOMES_IDIOMA.get(cod, cod)} ({n})" for cod, n in idiomas.most_common()
    )
    n_abrev = len({f["abrev"] for f in fichas if f.get("abrev")})
    if catalogo_path and catalogo_path.exists():
        kb = catalogo_path.stat().st_size / 1024
        n_entradas = len(json.loads(catalogo_path.read_text(encoding="utf-8"))["livros"])
        preco_catalogo = f"({kb:.0f} KB, {n_entradas} entradas)"
    else:
        preco_catalogo = ""
    carimbo = carimbo_da_geracao()

    # ---------------- índice-raiz: mapa + sete linhas ----------------
    linhas = cabeca("Rolos")
    linhas.append("<h1>Rolos — Pedra Angular</h1>")
    linhas.append(
        f"<p>{total} obras em {frase_idiomas}. Cada obra é um arquivo "
        "estático com o texto escrito no corpo da página: legível sem JavaScript, por "
        "humano, por navegador e por qualquer ferramenta que só busque a URL.</p>"
    )
    # Quem pergunta "o que é este site?" quase nunca lê a página: pergunta a
    # uma IA, que busca a URL e resume o que achar. Se o começo do arquivo só
    # explica sintaxe de endereço, o resumo sai correto e inútil — fala de
    # rotas, não do que a pessoa ganha abrindo. Estes dois parágrafos vêm
    # ANTES do mapa técnico de propósito: são a parte que sobrevive a um
    # resumo curto, e a que responde a pergunta que foi realmente feita.
    linhas.append(
        "<h2>O que é isto</h2>\n"
        "<p><strong>Pedra Angular</strong> (<a href=\"https://pedraangular.app.br\">"
        "pedraangular.app.br</a>) é uma biblioteca de textos-fonte de filosofia e "
        "das escrituras, de graça, sem cadastro, sem anúncio e sem rastreamento. "
        "Reúne edições em domínio público — Perseus Digital Library, Loeb, "
        "Almeida, Vulgata, Westminster Leningrad Codex, SBLGNT — com a fonte de "
        "cada uma declarada na ficha da própria obra.</p>\n"
        "<p>O endereço abre duas coisas no mesmo domínio. Em "
        "<strong>pedraangular.app.br</strong> roda o leitor: instalável pelo "
        "navegador (sem loja de aplicativos), <strong>funciona sem internet depois "
        "da primeira visita</strong>, guarda onde você parou, e foi feito com "
        "acessibilidade como requisito e não como acabamento — nove temas de alto "
        "contraste medidos por cálculo, três fontes de leitura embutidas no próprio "
        "app (incluindo Atkinson Hyperlegible, para baixa visão, e OpenDyslexic), "
        "tamanho de letra sem teto prático, leitura em voz alta e navegação por "
        "leitor de tela. Em <strong>pedraangular.app.br/rolo</strong> — esta página "
        "— fica a mesma biblioteca em HTML puro, sem JavaScript: é a via de leitura "
        "para máquina, para citação com link permanente e para arquivamento.</p>\n"
        "<p class=n>Projeto de curadoria de uma pessoa só. O texto é de domínio "
        "público; o trabalho é reunir, normalizar e endereçar.</p>"
    )
    mapa = [
        "COMO MONTAR UM ENDEREÇO (sem precisar ler a lista inteira)",
        "",
        f"  obra .............. /rolo/<id>.html          ex.: /rolo/{slug_ex}.html",
        "  passagem .......... /rolo/<id>.html#anchor-<referência>",
        "                      ex.: #anchor-gn-1-1 (Gênesis 1:1), #anchor-ec-3-1 (Eclesiastes 3:1)",
        "  marcador canônico . /rolo/<id>.html#marker-<endereço>",
        "                      ex.: #marker-327a (Stephanus), #marker-1094a1 (Bekker)",
        "  índice de acervo .. /rolo/<ACERVO>.html       ex.: /rolo/FILOSOFIA.html",
        "  markdown de origem  /livros/<caminho>.md",
        f"  catálogo em JSON .. /livros/catalogo.json    {preco_catalogo}",
    ]
    if n_abrev:
        mapa.append(f"  abreviaturas ...... /rolo/abreviaturas.html  ({n_abrev} abreviaturas)")
    mapa += [
        "",
        "O <id> é o mesmo do catálogo e nunca muda depois de publicado.",
        "",
        "GRAMÁTICA DO <id> (famílias observadas no catálogo, com contagem e exemplo real)",
        "",
    ]
    for padrao, n, ex in familias_de_id(fichas):
        mapa.append(f"  {n:>5}  {padrao}")
        mapa.append(f"         ex.: {ex}")
    mapa += [
        "",
        f"Gerado em {carimbo}.",
    ]
    linhas.append("<pre>" + html.escape("\n".join(mapa)) + "</pre>")

    if colecoes:
        linhas.append("<h2>Coleções (arquivo único, offline, fonte embutida)</h2><ul>")
        for c in colecoes:
            linhas.append(
                f'<li><a href="colecoes/{html.escape(c["arquivo"])}">{html.escape(c["nome"])}</a>'
                f' <span class=n>{c["obras"]} obras · {c["bytes"]/1e6:.1f} MB</span></li>'
            )
        linhas.append("</ul>")

    linhas.append("<h2>Acervos</h2><ul>")
    for colecao in sorted(por_colecao):
        obras = por_colecao[colecao]
        # só o primeiro nível: "Aristotelismo", não
        # "Aristotelismo/Aristoteles/Etica_a_Nicomaco" — aqui a função é dar a
        # feição do acervo em uma linha, não enumerar a estante
        subs = sorted({(o.get("sub") or "").split("/")[0] for o in obras} - {""})
        subs = [nome_bonito(s) for s in subs]
        detalhe = (
            f" <span class=n>— {', '.join(subs[:7])}{'…' if len(subs) > 7 else ''}</span>"
            if subs else ""
        )
        linhas.append(
            f'<li><a href="{atributo(colecao)}.html">{html.escape(colecao)}</a>'
            f' <span class=n>{contagem(obras)}</span>{detalhe}</li>'
        )
    linhas.append("</ul>")
    if n_abrev:
        linhas.append(
            f'<h2>Referência</h2>\n<ul>\n'
            f'<li><a href="abreviaturas.html">Abreviaturas de âncora</a>'
            f' <span class=n>{n_abrev} abreviaturas</span></li>\n</ul>'
        )
    # O colofão marca CURADORIA, não tradução: fecha tanto a obra que Bruno
    # traduziu quanto a que apenas reuniu. Quem quer a distinção real lê o campo
    # "Tradutor" na ficha de cada obra.
    linhas.append(
        f"<p class=n style='margin-top:3rem'>Gerado em {html.escape(carimbo)}</p>\n"
        "<p class=n>Ὁ Διαφορεύς παρῆν — marca de curadoria; a tradução, quando há, "
        "está no campo Tradutor da ficha de cada obra.</p>\n</div></body></html>"
    )
    (saida / "index.html").write_text("\n".join(linhas), encoding="utf-8")

    # ---------------- a árvore de índices por acervo ----------------
    paginas = 0
    for colecao in sorted(por_colecao):
        paginas += gerar_no_indice(por_colecao[colecao], colecao, (), saida, carimbo)
    print(f"  índices: {paginas} páginas (raiz + árvore de acervos)")


# Uma página de índice que não cabe na leitura é uma página que mente por
# omissão: em agosto de 2026 uma instância externa leu FILOSOFIA.html (232 KB,
# 609 obras em lista plana), recebeu o conteúdo truncado no meio dos Moralistas
# em inglês e concluiu, com confiança, que "Plutarco em grego, nesse site,
# aparentemente não existe" — e que o catálogo estaria defasado, com obras
# "escondidas". Nenhuma das duas coisas era verdade: o texto acabou antes da
# leitura chegar lá.
#
# Orçamento em BYTES, não em número de obras: o que trunca é o tamanho. ~350 B
# por obra listada, então 80 KB comportam ~200 obras — e o corte cai onde o
# acervo realmente se ramifica, sem inventar um nível a mais só para obedecer a
# uma contagem redonda.
ORCAMENTO_INDICE = 80_000


def contagem(itens: list[dict]) -> str:
    """"154 obras" ou "154 obras · 1 remissão".

    Remissão não é obra: se entrasse na mesma soma, a contagem dos ramos
    passaria a somar mais que o acervo, e não haveria como saber qual dos dois
    números está errado."""
    n = sum(1 for o in itens if not o.get("remissao"))
    r = len(itens) - n
    fora = f"{n} {'obra' if n == 1 else 'obras'}"
    if r:
        fora += f" · {r} {'remissão' if r == 1 else 'remissões'}"
    return fora


def gerar_no_indice(obras: list[dict], colecao: str, caminho: tuple[str, ...],
                    saida: Path, carimbo: str) -> int:
    """Escreve a página deste nó e, se ele delegar, a dos filhos. Devolve
    quantas páginas escreveu.

    Lista as OBRAS quando a página resultante cabe no orçamento; senão lista os
    FILHOS com suas contagens — é o comportamento de `listar_filhos` do MCP
    virando arquivo estático. Um nó sem filhos sempre lista as obras, custe o
    que custar: melhor uma página grande que uma página que não leva a lugar
    nenhum."""
    profundidade = len(caminho)
    prefixo = "../" * profundidade  # de volta à raiz /rolo/
    titulo = " / ".join([colecao] + [nome_bonito(p) for p in caminho])

    # filhos = próximo segmento de `sub` depois de `caminho`
    filhos: dict[str, list[dict]] = {}
    proprias: list[dict] = []  # obras que moram exatamente aqui
    for o in obras:
        partes = [p for p in (o.get("sub") or "").split("/") if p]
        if len(partes) > profundidade:
            filhos.setdefault(partes[profundidade], []).append(o)
        else:
            proprias.append(o)

    linhas = cabeca(titulo, prefixo)
    # O Φ saiu do <h1> e virou botão na barra: aqui ele era enfeite mudo, lá
    # ele abre a coleção. Um Φ por página, e ele faz alguma coisa.
    linhas.append(f"<h1>{html.escape(titulo)}</h1>")

    # trilha: cada nível clicável, para subir sem adivinhar a URL
    trilha = [f'<a href="{prefixo}index.html">Rolos</a>']
    for i in range(profundidade + 1):
        alvo = "../" * (profundidade - i) + ((colecao + ".html") if i == 0 else caminho[i - 1] + ".html")
        rotulo = colecao if i == 0 else nome_bonito(caminho[i - 1])
        trilha.append(f'<a href="{atributo(alvo)}">{html.escape(rotulo)}</a>'
                      if i < profundidade else html.escape(rotulo))
    linhas.append(f"<p>{contagem(obras)} · " + " / ".join(trilha) + "</p>")
    linhas.append(
        "<pre>" + html.escape(
            "obra ....... /rolo/<id>.html\n"
            "passagem ... /rolo/<id>.html#anchor-<referência>\n"
            "marcador ... /rolo/<id>.html#marker-<endereço>\n"
            f"\nGerado em {carimbo}."
        ) + "</pre>"
    )

    def linhas_das_obras() -> list[str]:
        fora: list[str] = []
        for sub, itens in sorted(agrupar_por_pasta(obras, colecao).items()):
            itens = sorted(itens, key=lambda x: x["titulo"])
            # o rótulo do grupo é relativo a este nó: repetir "Grego /
            # Moralistas" em toda seção de uma página que já se chama assim
            # gasta linha e não informa nada
            relativo = "/".join(sub.split("/")[profundidade:]) if sub != colecao else ""
            if relativo:
                fora.append(f"<h2>{html.escape(rotulo_grupo(relativo))}</h2>")
                fora.append(f"<p class=n>{contagem(itens)}</p>")
            fora.append("<ul>")
            for o in itens:
                autor = f' <span class=n>— {html.escape(o["autor"])}</span>' if o["autor"] else ""
                # separador antes do link .md: sem ele o texto extraído da
                # página fecha "— Epictetusmd", nome e rótulo grudados
                md = (
                    f' <span class=n>·</span> '
                    f'<a class=md href="{atributo(prefixo + o["md_href"])}">md</a>'
                    if o.get("md_href") else ""
                )
                lang_obra = f' lang="{atributo(o["idioma"])}"' if o.get("idioma") else ""
                # a remissao se declara: e a mesma obra da outra estante, nao
                # uma segunda edicao. Sem isso, quem le a lista conta duas.
                marca = (
                    ' <span class=n>· também em '
                    + html.escape(rotulo_grupo(o["colecao_real"]))
                    + "</span>"
                ) if o.get("remissao") else ""
                fora.append(
                    f'<li><a href="{atributo(prefixo + o["slug"])}.html"{lang_obra}>'
                    f'{html.escape(o["titulo"])}</a>{autor}{marca}{md}</li>'
                )
            fora.append("</ul>")
        return fora

    corpo_obras = linhas_das_obras()
    tamanho = len("\n".join(linhas + corpo_obras).encode("utf-8"))
    delega = bool(filhos) and tamanho > ORCAMENTO_INDICE

    escritas = 1
    if not delega:
        linhas += corpo_obras
    else:
        # pasta do nó atual, onde as páginas-filhas vão morar
        pasta = colecao if profundidade == 0 else caminho[-1]
        linhas.append("<h2>Ramos</h2>")
        linhas.append(
            f"<p class=n>Esta página lista os ramos, não as obras: em lista plana "
            f"seriam {len(obras)} itens ({tamanho/1024:.0f} KB), e leitura por "
            f"ferramenta costuma truncar antes do fim.</p>"
        )
        linhas.append("<ul>")
        for nome in sorted(filhos):
            linhas.append(
                f'<li><a href="{atributo(pasta)}/{atributo(nome)}.html">'
                f'{html.escape(nome_bonito(nome))}</a> '
                f'<span class=n>{contagem(filhos[nome])}</span></li>'
            )
        linhas.append("</ul>")
        if proprias:
            # obra que mora no próprio nó não tem ramo para onde ir
            linhas.append("<h2>Nesta pasta</h2>")
            linhas.append("<ul>")
            for o in sorted(proprias, key=lambda x: x["titulo"]):
                lang_obra = f' lang="{atributo(o["idioma"])}"' if o.get("idioma") else ""
                autor = f' <span class=n>— {html.escape(o["autor"])}</span>' if o["autor"] else ""
                linhas.append(
                    f'<li><a href="{atributo(prefixo + o["slug"])}.html"{lang_obra}>'
                    f'{html.escape(o["titulo"])}</a>{autor}</li>'
                )
            linhas.append("</ul>")

    linhas.append(f"<p class=n style='margin-top:3rem'>Gerado em {html.escape(carimbo)}</p>")
    linhas.append("<p class=n>Ὁ Διαφορεύς παρῆν</p></div></body></html>")

    destino = saida / (f"{colecao}.html" if profundidade == 0
                       else Path(colecao, *caminho[:-1], f"{caminho[-1]}.html"))
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text("\n".join(linhas), encoding="utf-8")

    if delega:
        for nome, filhas in filhos.items():
            escritas += gerar_no_indice(filhas, colecao, caminho + (nome,), saida, carimbo)
    return escritas

# ---------------------------------------------------------------- piloto
PILOTO = [
    # Bíblia — três traduções portuguesas, grego, hebraico
    "biblia-01-genesis-por-alm1911-1911",
    "biblia-19-salmos-por-alm1911-1911",
    "biblia-40-mateus-por-alm1911-1911",
    "biblia-43-joao-por-alm1911-1911",
    "biblia-45-romanos-por-alm1911-1911",
    "biblia-01-genesis-por-blivre-2018",
    "biblia-19-salmos-por-tb1917-1917",
    # Filosofia grega
    "platao-a-republica-grc-john-burnet-1905",
    "platao-apologia-de-socrates-grc-john-burnet-1903",
    "platao-fedon-grc-john-burnet-1903",
    "epicteto-encheiridion-grc-heinrich-schenkl-1916",
    # Latim
    "agostinho-de-civitate-dei-lat-latinlibrary-sd",
    "tomas-de-aquino-summa-theologica-prima-pars-lat-latinlibrary-sd",
    # Personagem: índice à parte, formato diferente das obras — precisa ser
    # testado junto, não depois
    "personagem-aristoteles-estagira",
]

def escolher_piloto(livros: list[dict]) -> list[dict]:
    """Pega os ids listados; completa com uma amostra representativa por coleção,
    incluindo de propósito a obra mais pesada do corpus (teste de peso)."""
    por_id = {l["id"]: l for l in livros}
    escolhidos: list[dict] = [por_id[i] for i in PILOTO if i in por_id]
    vistos = {l["id"] for l in escolhidos}

    def add(l):
        if l and l["id"] not in vistos:
            escolhidos.append(l)
            vistos.add(l["id"])

    # amostra por sub-coleção ainda não representada
    por_sub: dict[str, list[dict]] = {}
    for l in livros:
        partes = l["arquivo"].split("/")
        if len(partes) > 1:
            por_sub.setdefault("/".join(partes[:2]), []).append(l)
    for sub in sorted(por_sub):
        if not any(x["arquivo"].startswith(sub + "/") for x in escolhidos):
            add(sorted(por_sub[sub], key=lambda x: x["arquivo"])[0])
    return escolhidos

# ---------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description="Gera rolos estáticos legíveis sem JavaScript.")
    ap.add_argument("--corpus", type=Path, default=CORPUS_PADRAO)
    ap.add_argument("--template", type=Path, default=TEMPLATE_PADRAO)
    ap.add_argument("--saida", type=Path, default=SAIDA_PADRAO)
    ap.add_argument("--fontes", type=Path, default=FONTES_PADRAO)
    ap.add_argument("--piloto", action="store_true", help="amostra dura de ~30 obras")
    ap.add_argument("--tudo", action="store_true", help="todas as obras do catálogo")
    ap.add_argument("--obra", action="append", default=[], help="id específico (repetível)")
    ap.add_argument("--colecoes", action="store_true", help="também gera os rolos-era autocontidos")
    ap.add_argument(
        "--sem-gemeo-md",
        action="store_true",
        help="não copia o .md ao lado de cada rolo; aponta para /livros/ (uso no site, "
        "onde o corpus já está publicado — evita duplicar 98 MB à toa)",
    )
    args = ap.parse_args()

    catalogo = args.corpus / "catalogo.json"
    if not catalogo.exists():
        print(f"catálogo não encontrado: {catalogo}", file=sys.stderr)
        return 1
    livros = json.loads(catalogo.read_text(encoding="utf-8"))["livros"]

    # Personagens vivem num índice à parte (personagens.json), mas são obras do
    # corpus como as outras e têm id publicado — logo, merecem rolo. Ficariam de
    # fora se o gerador olhasse só o catálogo.
    pessoas = args.corpus / "personagens.json"
    if pessoas.exists():
        dados = json.loads(pessoas.read_text(encoding="utf-8"))
        lista = dados if isinstance(dados, list) else next(iter(dados.values()))
        ja = {l["id"] for l in livros}
        for p in lista:
            if p.get("id") and p.get("arquivo") and p["id"] not in ja:
                livros.append(
                    {
                        "id": p["id"],
                        "titulo": p.get("titulo") or p.get("nome") or p["id"],
                        "autor": "",
                        "arquivo": p["arquivo"],
                    }
                )

    template = args.template.read_text(encoding="utf-8")

    if args.obra:
        alvo = [l for l in livros if l["id"] in set(args.obra)]
    elif args.tudo:
        alvo = livros
    else:
        alvo = escolher_piloto(livros)

    args.saida.mkdir(parents=True, exist_ok=True)
    dir_fontes_saida = args.saida / "fontes"
    dir_fontes_saida.mkdir(exist_ok=True)
    for nome in ("Atkinson-Regular.woff2", "Atkinson-Bold.woff2"):
        origem = args.fontes / nome
        if origem.exists():
            shutil.copy2(origem, dir_fontes_saida / nome)

    css_local = css_fonte_local("fontes")
    print(f"→ {len(alvo)} obras")
    fichas = []
    for i, e in enumerate(alvo, 1):
        f = gerar_obra(e, args.corpus, template, args.saida, css_local, gemeo_md=not args.sem_gemeo_md)
        if f:
            fichas.append(f)
            if i % 50 == 0 or len(alvo) < 60:
                print(f"  [{i:4}/{len(alvo)}] {f['slug']}  {f['bytes']/1024:.0f} KB")

    colecoes = []
    if args.colecoes:
        css_emb = css_fonte_embutida(args.fontes)
        por_era: dict[str, list[dict]] = {}
        for l in livros:
            era = l["arquivo"].split("/")[0]
            if era.endswith(".md"):
                continue
            por_era.setdefault(era, []).append(l)
        dir_col = args.saida / "colecoes"
        css_emb_col = css_emb
        for era in sorted(por_era):
            print(f"→ coleção {era} ({len(por_era[era])} obras)…")
            c = gerar_colecao(era, por_era[era], args.corpus, template, dir_col, css_emb_col)
            colecoes.append(c)
            print(f"  {c['arquivo']}  {c['bytes']/1e6:.1f} MB  {c['headings']} headings")

    redirs = json.loads(catalogo.read_text(encoding="utf-8")).get("redirecionamentos") or {}
    if redirs:
        n_red = gerar_redirecionamentos(redirs, fichas, args.saida)
        print(f"  redirecionamentos: {n_red} id(s) aposentado(s) continuam respondendo")
    n_abrev = gerar_pagina_abreviaturas(fichas, args.saida)
    gerar_indice(fichas, args.saida, colecoes, catalogo_path=catalogo)
    if n_abrev:
        print(f"  abreviaturas: {n_abrev} → {args.saida/'abreviaturas.html'}")
    total = sum(f["bytes"] for f in fichas)
    print(f"\n✓ {len(fichas)} rolos · {total/1e6:.1f} MB · índice em {args.saida/'index.html'}")

    from collections import Counter
    idiomas = Counter(f["idioma"] for f in fichas)
    print("  idiomas: " + ", ".join(f"{k} {v}" for k, v in idiomas.most_common()))
    if IDIOMAS_DESCONHECIDOS:
        # Não interrompe a publicação — mas a página desses arquivos herdou
        # pt-BR sem ser português, e isso precisa aparecer em algum lugar.
        print("\n  ! idioma não reconhecido (página ficou com lang=pt-BR):", file=sys.stderr)
        for codigo, n in sorted(IDIOMAS_DESCONHECIDOS.items(), key=lambda x: -x[1]):
            print(f"      {codigo!r}: {n} obra(s)", file=sys.stderr)
        print("    → acrescente o código a IDIOMAS_BCP47 ou corrija o front matter.",
              file=sys.stderr)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
