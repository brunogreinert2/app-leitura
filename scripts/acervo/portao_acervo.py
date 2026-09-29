#!/usr/bin/env python3
"""
portao_acervo.py — o portão do acervo (Fases 0.4 e 0.5 do Saneamento, 2026-09-29).

Duas guardas, e as duas só deixam passar o que NÃO PIORA:

  LEI 6  Todo id publicado — obra, âncora (`anchor-…`) e marcador (`marker-…`) —
         continua existindo. Os ids vêm das MESMAS funções do gerador do rolo
         (scripts/rolo/gerador_rolo.py), então são exatamente os do site no ar.
         Id novo entra no registro sozinho; id que some barra o commit.
         Obra renomeada só passa com redirecionamento em catalogo.json, e as
         âncoras da antiga têm de existir na nova.

  NORMA  O validar_corpus.py, ao lado, contra o frontmatter.schema.json. O
         acervo de hoje tem erros (é o ponto de partida do Saneamento), então o
         portão compara com a base registrada: arquivo que já existia não pode
         ganhar erro de nenhuma regra; arquivo NOVO entra sem erro nenhum. Quando
         um arquivo melhora, a base desce junto — a catraca só anda para baixo.

Uso:
    python scripts/acervo/portao_acervo.py --pre-commit   # o gancho .githooks/pre-commit chama este
    python scripts/acervo/portao_acervo.py --completo     # o deploy chama este: corpus inteiro, não escreve nada
    python scripts/acervo/portao_acervo.py --registrar    # cria a base do zero (uma vez, com o acervo publicado)

No --pre-commit os arquivos são lidos da árvore de trabalho, não do índice:
quem commita metade das mudanças de um arquivo com `git add -p` é conferido
pelo arquivo inteiro. Mais rigoroso, nunca menos.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parent.parent
LIVROS = REPO / "public" / "livros"
PUBLICADOS = AQUI / "publicados"            # um .txt de ids por obra + _obras.txt
BASE_NORMA = AQUI / "base_validacao.tsv"    # id-da-obra  regra  ocorrências

sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(REPO / "scripts" / "rolo"))
import validar_corpus as vc          # noqa: E402
import gerador_rolo as gr            # noqa: E402

RE_ID_PUBLICADO = re.compile(r'\sid="((?:anchor|marker)-[^"]+)"')


# --------------------------------------------------------------------------
# Catálogo: o id de uma obra é o do catalogo.json (N3), não o do front matter
# --------------------------------------------------------------------------

def ler_catalogo():
    cat = json.loads((LIVROS / "catalogo.json").read_text(encoding="utf-8"))
    pers = json.loads((LIVROS / "personagens.json").read_text(encoding="utf-8"))
    por_arquivo = {}
    for e in cat["livros"] + pers["personagens"]:
        por_arquivo[e["arquivo"]] = e["id"]
    return por_arquivo, dict(cat.get("redirecionamentos", {}))


def chave(rel: str, por_arquivo: dict) -> str:
    """Chave da base de normas: o id da obra, que sobrevive a mover o arquivo.
    Arquivo fora do catálogo fica pelo caminho."""
    return por_arquivo.get(rel, "arquivo:" + rel)


def ids_da_obra(rel: str) -> set[str]:
    _, md = gr.separar_yaml((LIVROS / rel).read_text(encoding="utf-8"))
    corpo, _ = gr.corpo_html(md)
    return set(RE_ID_PUBLICADO.findall(corpo))


# --------------------------------------------------------------------------
# Registro dos ids publicados (LEI 6)
# --------------------------------------------------------------------------

def arquivo_de_ids(obra: str) -> Path:
    return PUBLICADOS / f"{obra}.txt"


def ler_ids(obra: str) -> set[str]:
    p = arquivo_de_ids(obra)
    return set(p.read_text(encoding="utf-8").split()) if p.exists() else set()


def gravar_ids(obra: str, ids: set[str]) -> bool:
    p = arquivo_de_ids(obra)
    novo = "\n".join(sorted(ids)) + "\n" if ids else ""
    if p.exists() and p.read_text(encoding="utf-8") == novo:
        return False
    if not ids and not p.exists():
        return False
    p.write_text(novo, encoding="utf-8")
    return True


def ler_obras() -> set[str]:
    p = PUBLICADOS / "_obras.txt"
    return set(p.read_text(encoding="utf-8").split()) if p.exists() else set()


def conferir_lei6(obras_a_conferir, por_arquivo, redirec) -> list[str]:
    """Devolve a lista de violações. obras_a_conferir=None confere tudo."""
    falhas = []
    atual = {v: k for k, v in por_arquivo.items()}          # id -> arquivo
    for obra in sorted(ler_obras()):
        if obra in atual or obra in redirec:
            continue
        falhas.append(f"obra publicada sumiu do catálogo: {obra} "
                      f"(renomear exige entrada em catalogo.json → redirecionamentos)")
    alvo = ler_obras() if obras_a_conferir is None else set(obras_a_conferir)
    for obra in sorted(alvo):
        antigos = ler_ids(obra)
        if not antigos:
            continue
        destino = obra if obra in atual else redirec.get(obra)
        if destino not in atual:
            continue                                    # já relatado acima
        faltam = antigos - ids_da_obra(atual[destino])
        if faltam:
            ex = ", ".join(sorted(faltam)[:5])
            falhas.append(f"{obra}: {len(faltam)} âncora(s) publicada(s) sumiram — ex.: {ex}")
    return falhas


# --------------------------------------------------------------------------
# Catraca da norma
# --------------------------------------------------------------------------

def ler_base_norma() -> dict[str, dict[str, int]]:
    base: dict[str, dict[str, int]] = {}
    if BASE_NORMA.exists():
        for linha in BASE_NORMA.read_text(encoding="utf-8").splitlines()[1:]:
            k, regra, n = linha.split("\t")
            base.setdefault(k, {})[regra] = int(n)
    return base


def gravar_base_norma(base: dict[str, dict[str, int]]):
    linhas = ["obra\tregra\tocorrencias"]
    for k in sorted(base):
        for regra in sorted(base[k]):
            if base[k][regra] > 0:
                linhas.append(f"{k}\t{regra}\t{base[k][regra]}")
    BASE_NORMA.write_text("\n".join(linhas) + "\n", encoding="utf-8")


def erros_do_arquivo(rel: str, ctx) -> tuple[dict[str, int], dict]:
    achados = vc.validar_arquivo(LIVROS / rel, ctx)
    contagem = {r: len(v) for r, v in achados.items() if vc.NIVEL[r] == "erro"}
    return contagem, achados


def conferir_norma(rels, por_arquivo, base, ctx):
    """Devolve (falhas, base_atualizada)."""
    falhas = []
    nova = {k: dict(v) for k, v in base.items()}
    for rel in rels:
        k = chave(rel, por_arquivo)
        agora, achados = erros_do_arquivo(rel, ctx)
        antes = base.get(k, {})
        novo_arquivo = k not in base
        for regra, n in sorted(agora.items()):
            if n > antes.get(regra, 0):
                linha, ex = achados[regra][0]
                onde = f" linha {linha}" if linha else ""
                if novo_arquivo:
                    msg = f"{rel}: arquivo novo tem de entrar sem erro — {regra} ({vc.DESCRICAO[regra]}), {n}x{onde}: {ex}"
                else:
                    msg = f"{rel}: piorou em {regra} ({vc.DESCRICAO[regra]}): {antes.get(regra, 0)} → {n}{onde}: {ex}"
                falhas.append(msg)
        if not novo_arquivo:
            nova[k] = {r: min(antes.get(r, 0), agora.get(r, 0)) for r in antes}
    return falhas, nova


# --------------------------------------------------------------------------
# Modos
# --------------------------------------------------------------------------

def todos_os_md() -> list[str]:
    return sorted(p.relative_to(LIVROS).as_posix() for p in LIVROS.rglob("*.md"))


def registrar():
    por_arquivo, redirec = ler_catalogo()
    PUBLICADOS.mkdir(exist_ok=True)
    obras = set(por_arquivo.values()) | set(redirec)
    (PUBLICADOS / "_obras.txt").write_text("\n".join(sorted(obras)) + "\n", encoding="utf-8")
    total = 0
    for rel, obra in por_arquivo.items():
        if (LIVROS / rel).exists():
            ids = ids_da_obra(rel)
            gravar_ids(obra, ids)
            total += len(ids)
    ctx = vc.carregar_esquema()
    base = {}
    for rel in todos_os_md():
        contagem, _ = erros_do_arquivo(rel, ctx)
        if contagem:
            base[chave(rel, por_arquivo)] = contagem
    gravar_base_norma(base)
    print(f"registrado: {len(obras)} obras, {total} âncoras/marcadores, "
          f"{len(base)} arquivos com erro na base da norma")


def git(*args) -> str:
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True,
                          encoding="utf-8", check=True).stdout


def pre_commit() -> int:
    prefixo = "public/livros/"
    mudados = []
    catalogo_mexeu = False
    for linha in git("diff", "--cached", "--name-status", "-M").splitlines():
        partes = linha.split("\t")
        estado, caminho = partes[0], partes[-1]
        if not caminho.startswith(prefixo):
            continue
        rel = caminho[len(prefixo):]
        if rel in ("catalogo.json", "personagens.json"):
            catalogo_mexeu = True
        if estado[0] in "ACMR" and rel.endswith(".md"):
            mudados.append(rel)
        if estado[0] in "DR":
            catalogo_mexeu = True                      # arquivo saiu ou mudou de lugar
    if not mudados and not catalogo_mexeu:
        return 0

    por_arquivo, redirec = ler_catalogo()
    ctx = vc.carregar_esquema()
    obras_tocadas = {por_arquivo[r] for r in mudados if r in por_arquivo}
    falhas = conferir_lei6(obras_tocadas, por_arquivo, redirec)
    falhas_norma, nova_base = conferir_norma(mudados, por_arquivo, ler_base_norma(), ctx)
    falhas += falhas_norma

    if falhas:
        print("\nPORTÃO DO ACERVO: commit barrado.\n", file=sys.stderr)
        for f in falhas:
            print("  ✗ " + f, file=sys.stderr)
        print("\nA norma é scripts/acervo/frontmatter.schema.json; o relatório completo sai de\n"
              "  python scripts/acervo/validar_corpus.py --raiz <arquivo>\n", file=sys.stderr)
        return 1

    # Passou: a catraca desce e os ids novos entram no registro.
    tocados = []
    gravar_base_norma(nova_base)
    tocados.append(BASE_NORMA)
    obras = ler_obras()
    novas = (set(por_arquivo.values()) | set(redirec)) - obras
    if novas:
        (PUBLICADOS / "_obras.txt").write_text("\n".join(sorted(obras | novas)) + "\n", encoding="utf-8")
        tocados.append(PUBLICADOS / "_obras.txt")
    for rel in mudados:
        obra = por_arquivo.get(rel)
        if obra:
            ids = ler_ids(obra) | ids_da_obra(rel)     # só cresce: LEI 6
            if gravar_ids(obra, ids):
                tocados.append(arquivo_de_ids(obra))
    git("add", "--", *[str(p.relative_to(REPO)) for p in tocados if p.exists()])
    print(f"portão do acervo: {len(mudados)} arquivo(s) conferido(s), nada piorou.")
    return 0


def completo() -> int:
    por_arquivo, redirec = ler_catalogo()
    ctx = vc.carregar_esquema()
    falhas = conferir_lei6(None, por_arquivo, redirec)
    falhas_norma, _ = conferir_norma(todos_os_md(), por_arquivo, ler_base_norma(), ctx)
    falhas += falhas_norma
    for f in falhas:
        print("✗ " + f)
    print(f"portão do acervo (completo): {len(falhas)} falha(s)")
    return 1 if falhas else 0


def main():
    ap = argparse.ArgumentParser(description="Portão do acervo: LEI 6 + norma, só o que não piora.")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--pre-commit", action="store_true")
    g.add_argument("--completo", action="store_true")
    g.add_argument("--registrar", action="store_true")
    a = ap.parse_args()
    if a.registrar:
        registrar()
        sys.exit(0)
    sys.exit(pre_commit() if a.pre_commit else completo())


if __name__ == "__main__":
    main()
