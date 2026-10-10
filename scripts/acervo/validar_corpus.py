#!/usr/bin/env python3
"""
validar_corpus.py — o validador do acervo do Pedra Angular (Fase 0.3 do Saneamento).
O portao que o usa em cada commit e no deploy e o portao_acervo.py, ao lado.

So APONTA. Nunca escreve em arquivo do corpus.

    python validar_corpus.py                       # corpus padrao (public/livros deste repo)
    python validar_corpus.py --raiz CAMINHO        # outra pasta, ou um arquivo so
    python validar_corpus.py --saida relatorio     # pasta dos relatorios

Le o esquema em frontmatter.schema.json, ao lado (a unica verdade do YAML), e
confere cada .md em duas partes:

  FRONT MATTER  contra o esquema. Cada problema sai classificado:
                  migravel   -> nome ou valor antigo com equivalente no esquema
                                (x-antes / x-valores-antes); a Fase 5 troca por script
                  vazio      -> null ou "" (a linha deve ser apagada)
                  decisao    -> sem equivalente: precisa de gente
  CORPO         contra a sintaxe fechada do acervo adulto (decisao D2, 2026-09-29):
                  cabecalho #, paragrafo, {{img:id}}, marcador [..], ^id e ^idioma no
                  fim da linha, nota [^n] com definicao, bloco ```interlinear/```verso.
                  Todo o resto e apontado.

Saidas em --saida:
  validacao.csv      uma linha por (arquivo, regra): nivel, ocorrencias, 1o exemplo
  conformidade.md    o resumo: quantos arquivos quebram cada regra
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

AQUI = Path(__file__).resolve().parent
ESQUEMA = AQUI / "frontmatter.schema.json"
RAIZ_PADRAO = AQUI.parent.parent / "public" / "livros"

# N76: a lista fechada da etiqueta de idioma. Tem de ser identica a
# ETIQUETAS_IDIOMA do gerador_rolo.py e CODIGOS do idioma.ts.
ETIQUETAS_IDIOMA = {"por", "eng", "lat", "grc", "heb", "arc", "rus"}

RE_FM = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.S)

# --- regras do corpo ------------------------------------------------------
# (codigo, nivel, descricao, regex por linha). Nivel: erro | aviso.
# C03 (wikilink [[ ]]), C04 (imagem ![]()) e C05 (citação >) saíram em
# 2026-09-30: são sintaxe permitida no acervo — o wikilink é por onde aparecem
# os personagens, o > desenha o risco vertical da citação, da assinatura e do
# interlinear. A proibição vinha da D2 da Fase 0 e estava errada (Διαφορεύς).
# Os códigos não se reaproveitam.
REGRAS_LINHA = [
    # "null[ificamine]" e suplemento de editor em latim, nao vazamento; "null and
    # void" e a expressao inglesa (Plutarco de Perrin, Leis de Bury)
    ("C01-null", "erro", "literal null no texto", re.compile(r"\bnull\b(?!\[)(?!\s+and\s+void)")),
    ("C02-xml", "erro", "tag ou entidade XML/HTML", re.compile(r"<[A-Za-z/!][^>\n]*>|&(?:[a-z]+|#\d+);")),
    ("C06-tabela", "erro", "tabela | (fora da sintaxe do acervo)", re.compile(r"^\s*\|.*\|\s*$")),
    ("C07-realce", "erro", "==realce== (fora da sintaxe do acervo)", re.compile(r"==[^=\n]+==")),
    # [217] [217a] ou o mesmo marcador duas vezes seguidas: o defeito do Sofista de Fowler
    ("C08-marcador-duplo", "erro", "marcador canônico em dobro no mesmo ponto",
     re.compile(r"\[(\d+)\]\s*\[\1[a-e]\]|(\[[^\]\s]{1,12}\])\s*\2")),
    # "verse:Never", "investigation.Parmenides": no colado sem espaco (Proposta §5)
    ("C09-colagem", "aviso", "suspeita de texto colado sem espaço",
     re.compile(r"[a-z\u03b1-\u03c9]{3,}[.:;,][A-Z\u0391-\u03a9][a-z\u03b1-\u03c9]{2,}")),
]
RE_CODIGO = re.compile(r"`[^`\n]+`")
IGNORA_CODIGO = {"C01-null", "C02-xml"}
RE_CERCA = re.compile(r"^\s*```(.*)$")
CERCAS_PERMITIDAS = {"interlinear", "verso"}
RE_NOTA_USO = re.compile(r"\[\^([^\]\s]+)\](?!:)")
RE_NOTA_DEF = re.compile(r"^\[\^([^\]\s]+)\]:")
RE_ANCORAS_FIM = re.compile(r"((?:\s\^[\w-]+)+)\s*$")

DESCRICAO = {r[0]: r[2] for r in REGRAS_LINHA}
DESCRICAO.update({
    "F00-sem-front-matter": "arquivo sem front matter",
    "F01-yaml-invalido": "YAML que não abre",
    "F10-migravel-campo": "campo com nome antigo (migrável)",
    "F11-migravel-valor": "valor antigo com equivalente (migrável)",
    "F12-urn-no-source": "URN escondida no texto do source (migrável para urn)",
    "F13-campo-removido": "campo que o esquema removeu (migrável)",
    "F20-vazio": "campo null ou \"\" (apagar a linha)",
    "F30-campo-desconhecido": "campo fora do esquema",
    "F31-obrigatorio-ausente": "campo obrigatório ausente",
    "F32-valor-invalido": "valor fora do esquema",
    "C10-cerca": "bloco de código que não é ```interlinear nem ```verso",
    "C11-nota-sem-definicao": "nota [^n] usada sem definição",
    "C12-definicao-sem-uso": "definição [^n]: sem uso no texto",
    "C13-ancora-duplicada": "âncora ^id repetida no arquivo",
    "A01-sem-urn": "obra sem URN de edição",
})
NIVEL = {"F00-sem-front-matter": "erro", "F01-yaml-invalido": "erro", "F10-migravel-campo": "erro",
         "F11-migravel-valor": "erro", "F12-urn-no-source": "erro", "F13-campo-removido": "erro",
         "F20-vazio": "erro", "F30-campo-desconhecido": "erro", "F31-obrigatorio-ausente": "erro",
         "F32-valor-invalido": "erro", "C10-cerca": "erro", "C11-nota-sem-definicao": "erro",
         "C12-definicao-sem-uso": "aviso", "C13-ancora-duplicada": "erro", "A01-sem-urn": "aviso"}
NIVEL.update({r[0]: r[1] for r in REGRAS_LINHA})

# O que dizer a quem precisa consertar. Usado pelo conferir.py e, exportado
# em regras.json, pelo conferidor do navegador (/portico/contribuir.html).
COMO_CONSERTAR = {
    "F00-sem-front-matter": "comece o arquivo com --- , os campos, e --- (modelo no frontmatter.schema.json).",
    "F01-yaml-invalido": "o bloco entre os --- não é YAML válido: aspas sem fechar, dois-pontos sobrando, tabulação.",
    "F10-migravel-campo": "renomeie o campo para o nome novo, em inglês.",
    "F11-migravel-valor": "troque o valor pelo equivalente novo.",
    "F12-urn-no-source": "tire a URN de dentro do source e ponha num campo próprio: urn: urn:cts:…",
    "F13-campo-removido": "apague o campo (area e era viram etiquetas em tags).",
    "F20-vazio": "apague a linha inteira. Campo desconhecido fica ausente — nunca null, nunca \"\".",
    "F30-campo-desconhecido": "esse campo não existe na norma: apague, ou peça para ele entrar no esquema.",
    "F31-obrigatorio-ausente": "acrescente o campo; texto precisa de license e source, tradução de translator.",
    "F32-valor-invalido": "use um valor da lista fechada do esquema (idioma: grc, lat, por, eng…; licença: public-domain, CC-BY-SA-4.0…).",
    "C01-null": "a palavra null vazou para o texto: é um campo vazio do conversor. Apague ou preencha.",
    "C02-xml": "sobrou marcação XML/HTML (<…>, &…;, <!-- -->). O acervo é texto puro.",
    "C06-tabela": "tabela não existe no acervo.",
    "C07-realce": "==realce== não existe no acervo.",
    "C08-marcador-duplo": "o mesmo ponto tem dois marcadores ([217] [217a]): deixe só o da seção, [217a].",
    "C09-colagem": "parece texto colado sem espaço (\"verse:Never\"). Confira contra a fonte.",
    "C10-cerca": "bloco de código só pode ser ```interlinear ou ```verso.",
    "C11-nota-sem-definicao": "a nota [^n] é usada mas não tem a linha [^n]: texto no fim do arquivo.",
    "C12-definicao-sem-uso": "há uma definição [^n]: que nenhum trecho usa.",
    "C13-ancora-duplicada": "a mesma âncora ^id aparece duas vezes: cada endereço tem de ser único.",
    "A01-sem-urn": "falta a URN da edição. Se a obra está no catálogo TLG/PHI/Perseus, ponha urn_work e urn.",
}


def exportar_regras() -> dict:
    """As regras do corpo, as descricoes e as dicas, como dados. O conferidor
    do navegador (conferidor.js, no repositorio portico) nao tem regra propria:
    executa estas, com o mesmo esquema. Duas implementacoes, uma regra so."""
    return {
        "_gerado_por": "app-leitura/scripts/acervo/validar_corpus.py — nao editar",
        "regras_linha": [{"codigo": c, "nivel": n, "descricao": d, "regex": rx.pattern}
                         for c, n, d, rx in REGRAS_LINHA],
        "cerca": RE_CERCA.pattern,
        "cercas_permitidas": sorted(CERCAS_PERMITIDAS),
        "nota_uso": RE_NOTA_USO.pattern,
        "nota_def": RE_NOTA_DEF.pattern,
        "ancoras_fim": RE_ANCORAS_FIM.pattern,
        "etiquetas_idioma": sorted(ETIQUETAS_IDIOMA),
        "codigo": RE_CODIGO.pattern,
        "ignora_codigo": sorted(IGNORA_CODIGO),
        "descricao": DESCRICAO,
        "nivel": NIVEL,
        "como_consertar": COMO_CONSERTAR,
    }


# --------------------------------------------------------------------------
# O esquema, e o que ele sabe sobre nomes antigos
# --------------------------------------------------------------------------

def carregar_esquema():
    esquema = json.loads(ESQUEMA.read_text(encoding="utf-8"))
    campo_antigo = {}          # nome antigo -> nome novo
    valor_antigo = {}          # campo novo -> {valor antigo: valor novo}
    for novo, prop in esquema["properties"].items():
        for antigo in prop.get("x-antes", []):
            if antigo != novo:
                campo_antigo[antigo] = novo
        if "x-valores-antes" in prop:
            valor_antigo[novo] = prop["x-valores-antes"]
    removidos = esquema.get("x-removidos", {})
    return esquema, Draft202012Validator(esquema), campo_antigo, valor_antigo, removidos


def para_json(v):
    """YAML entrega datas e afins; o esquema so conhece tipos JSON."""
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    if isinstance(v, list):
        return [para_json(x) for x in v]
    if isinstance(v, dict):
        return {str(k): para_json(x) for k, x in v.items()}
    return v


def vazio(v):
    return v is None or (isinstance(v, str) and not v.strip())


# --------------------------------------------------------------------------
# Uma obra
# --------------------------------------------------------------------------

def validar_arquivo(caminho: Path, ctx) -> dict:
    esquema, validador, campo_antigo, valor_antigo, removidos = ctx
    achados: dict[str, list] = defaultdict(list)   # regra -> [(linha, exemplo)]
    texto = caminho.read_text(encoding="utf-8", errors="replace")

    m = RE_FM.match(texto)
    corpo, desloc = texto, 0
    if not m:
        achados["F00-sem-front-matter"].append((1, ""))
        meta = None
    else:
        corpo = texto[m.end():]
        desloc = texto[:m.end()].count("\n")
        try:
            meta = yaml.safe_load(m.group(1)) or {}
            if not isinstance(meta, dict):
                raise yaml.YAMLError("front matter nao e um mapa")
        except yaml.YAMLError as e:
            achados["F01-yaml-invalido"].append((1, str(e).splitlines()[0][:120]))
            meta = None

    if meta is not None:
        validar_meta(para_json(meta), achados, esquema, validador, campo_antigo, valor_antigo, removidos)

    validar_corpo(corpo, desloc, achados)
    return achados


def validar_meta(meta, achados, esquema, validador, campo_antigo, valor_antigo, removidos):
    props = esquema["properties"]

    # 1. O que se migra por script, olhando o arquivo como ele e.
    for k, v in meta.items():
        if vazio(v):
            achados["F20-vazio"].append((0, f"{k}: {v!r}"))
        if k in campo_antigo:
            achados["F10-migravel-campo"].append((0, f"{k} -> {campo_antigo[k]}"))
        elif k in removidos:
            achados["F13-campo-removido"].append((0, f"{k}: {removidos[k]}"))
        elif k not in props:
            achados["F30-campo-desconhecido"].append((0, k))
    fonte = meta.get("source")
    if isinstance(fonte, str) and re.search(r"URN:\s*urn:cts:", fonte) and "urn" not in meta:
        achados["F12-urn-no-source"].append((0, re.search(r"urn:cts:\S+", fonte).group(0)))

    # 2. O arquivo como ficaria depois da migracao mecanica. O que ainda falhar
    #    aqui e o que precisa de gente.
    migrado = {}
    for k, v in meta.items():
        if vazio(v) or k in removidos:
            continue
        novo = campo_antigo.get(k, k)
        if novo in valor_antigo:
            tabela = valor_antigo[novo]
            chave = v if isinstance(v, str) else None
            if chave is not None and chave in tabela:
                achados["F11-migravel-valor"].append((0, f"{novo}: {v} -> {tabela[chave]}"))
                v = tabela[chave]
        if novo == "translator" and isinstance(v, str):
            v = [v]
        if novo in migrado and isinstance(migrado[novo], list) and isinstance(v, list):
            v = migrado[novo] + [x for x in v if x not in migrado[novo]]
        migrado[novo] = v
    if isinstance(fonte, str) and "urn" not in migrado:
        u = re.search(r"URN:\s*(urn:cts:[^\s\"]+)", fonte)
        if u:
            migrado["urn"] = u.group(1).rstrip(".")

    for erro in validador.iter_errors(migrado):
        if erro.validator == "additionalProperties":
            continue                                    # ja contado em F30
        caminho = ".".join(str(p) for p in erro.absolute_path) or "(raiz)"
        if erro.validator == "required":
            achados["F31-obrigatorio-ausente"].append((0, erro.message.split("'")[1] if "'" in erro.message else erro.message))
        else:
            valor = erro.instance if not isinstance(erro.instance, (dict, list)) else json.dumps(erro.instance, ensure_ascii=False)[:60]
            achados["F32-valor-invalido"].append((0, f"{caminho}: {valor}"))

    if migrado.get("type") in ("primary_text", "translation", "interlinear", "commentary") and "urn" not in migrado \
            and not migrado.get("pa_exclusive"):
        achados["A01-sem-urn"].append((0, ""))


def validar_corpo(corpo: str, desloc: int, achados):
    usos, defs = {}, {}
    ancoras = Counter()
    primeira_ancora = {}
    dentro_cerca = None
    for i, linha in enumerate(corpo.split("\n"), start=desloc + 1):
        c = RE_CERCA.match(linha)
        if c:
            if dentro_cerca is None:
                dentro_cerca = c.group(1).strip()
                if dentro_cerca not in CERCAS_PERMITIDAS:
                    achados["C10-cerca"].append((i, linha.strip()[:80]))
            else:
                dentro_cerca = None
            continue
        # D24 (2026-09-29): o que está entre crases é código citado numa nota
        # editorial (`<sourceDesc>`, `null`), não vazamento. As regras de
        # vazamento olham a linha sem ele; as outras, a linha inteira.
        sem_codigo = RE_CODIGO.sub("", linha)
        for cod, _, _, rx in REGRAS_LINHA:
            alvo = sem_codigo if cod in IGNORA_CODIGO else linha
            mm = rx.search(alvo)
            if mm:
                ini = max(0, mm.start() - 30)
                achados[cod].append((i, alvo[ini:mm.end() + 30].strip()))
        d = RE_NOTA_DEF.match(linha)
        if d:
            defs.setdefault(d.group(1), i)
        for u in RE_NOTA_USO.finditer(linha):
            if not (d and u.start() == 0):
                usos.setdefault(u.group(1), i)
        fim = RE_ANCORAS_FIM.search(linha)
        if fim:
            for a in re.findall(r"\^([\w-]+)", fim.group(1)):
                if a in ETIQUETAS_IDIOMA:
                    continue
                ancoras[a] += 1
                primeira_ancora.setdefault(a, i)
    for n, i in usos.items():
        if n not in defs:
            achados["C11-nota-sem-definicao"].append((i, f"[^{n}]"))
    for n, i in defs.items():
        if n not in usos:
            achados["C12-definicao-sem-uso"].append((i, f"[^{n}]:"))
    for a, k in ancoras.items():
        if k > 1:
            achados["C13-ancora-duplicada"].append((primeira_ancora[a], f"^{a} x{k}"))


# --------------------------------------------------------------------------
# O corpus inteiro
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Valida o acervo do Pedra Angular (so aponta).")
    ap.add_argument("--raiz", default=str(RAIZ_PADRAO))
    ap.add_argument("--saida", default=str(AQUI / "relatorio"))
    args = ap.parse_args()

    raiz = Path(args.raiz)
    arquivos = [raiz] if raiz.is_file() else sorted(raiz.rglob("*.md"))
    if not arquivos:
        print(f"ERRO: nenhum .md em {raiz}", file=sys.stderr)
        sys.exit(2)
    ctx = carregar_esquema()
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)

    por_regra = Counter()          # regra -> arquivos
    ocorr = Counter()              # regra -> ocorrencias
    limpos = 0
    so_migravel = 0
    base = raiz if raiz.is_dir() else raiz.parent
    with open(saida / "validacao.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["arquivo", "regra", "nivel", "ocorrencias", "linha", "exemplo"])
        for p in arquivos:
            achados = validar_arquivo(p, ctx)
            rel = p.relative_to(base).as_posix()
            erros = [r for r in achados if NIVEL[r] == "erro"]
            if not erros:
                limpos += 1
            elif all(r.startswith(("F10", "F11", "F12", "F13", "F20")) for r in erros):
                so_migravel += 1
            for regra in sorted(achados):
                lst = achados[regra]
                por_regra[regra] += 1
                ocorr[regra] += len(lst)
                linha, ex = lst[0]
                w.writerow([rel, regra, NIVEL[regra], len(lst), linha or "", ex])

    total = len(arquivos)
    hoje = dt.date.today().isoformat()
    linhas = [
        "# Conformidade do acervo",
        "",
        f"Gerado por `validar_corpus.py` em {hoje}, contra `frontmatter.schema.json`.",
        f"Raiz: `{raiz}`. Nao editar a mao: rode o validador de novo.",
        "",
        f"- **{total}** arquivos",
        f"- **{limpos}** sem nenhum erro ({limpos * 100 // total}%)",
        f"- **{so_migravel}** so com erros que a migracao mecanica resolve (Fase 5)",
        f"- **{total - limpos - so_migravel}** com pelo menos um erro que precisa de conversor ou de gente",
        "",
        "| Regra | Nivel | O que e | Arquivos | Ocorrencias |",
        "|---|---|---|---:|---:|",
    ]
    for regra in sorted(por_regra):
        linhas.append(f"| {regra} | {NIVEL[regra]} | {DESCRICAO[regra]} | {por_regra[regra]} | {ocorr[regra]} |")
    linhas += ["", "Detalhe por arquivo: `validacao.csv` (uma linha por arquivo e regra, com o primeiro exemplo)."]
    (saida / "conformidade.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")

    print("\n".join(linhas[5:9]))
    print(f"relatorios em {saida}")
    sys.exit(0 if limpos == total else 1)


if __name__ == "__main__":
    main()
