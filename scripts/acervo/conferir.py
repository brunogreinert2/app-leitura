#!/usr/bin/env python3
"""
conferir.py — confira um texto ANTES de ele chegar ao portão.

    python scripts/acervo/conferir.py arquivo.md [outro.md pasta/ ...]

Ou arraste arquivos e pastas sobre o conferir_texto.bat. Mesma norma do
portão (validar_corpus.py + frontmatter.schema.json), mas fala com gente:
diz o que está errado, onde, e como consertar. Não escreve em nada.

Um texto que sai daqui com ✓ entra pelo portão sem ser barrado pela norma.
(A LEI 6 o portão confere na hora do commit: texto novo não tem id publicado
para perder.)
"""
from __future__ import annotations

import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import validar_corpus as vc  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

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
    "C03-wikilink": "tire os [[ ]]: wikilink é da cópia do Obsidian, não do acervo.",
    "C04-imagem": "imagem entra por {{img:id}} sozinha na linha, nunca ![]().",
    "C05-citacao": "o > não existe no acervo. Verso e interlinear vão num bloco ```verso ou ```interlinear.",
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


def main(args: list[str]) -> int:
    if not args:
        print(__doc__)
        return 2
    arquivos: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            arquivos += sorted(p.rglob("*.md"))
        elif p.suffix.lower() == ".md" and p.exists():
            arquivos.append(p)
        else:
            print(f"  (ignorado, não é .md nem pasta: {a})")
    if not arquivos:
        print("Nenhum .md para conferir.")
        return 2

    ctx = vc.carregar_esquema()
    aprovados = 0
    for p in arquivos:
        achados = vc.validar_arquivo(p, ctx)
        erros = [r for r in achados if vc.NIVEL[r] == "erro"]
        avisos = [r for r in achados if vc.NIVEL[r] == "aviso"]
        if not erros:
            aprovados += 1
            extra = f"  ({len(avisos)} aviso(s))" if avisos else ""
            print(f"\n✓ {p.name}{extra}")
        else:
            print(f"\n✗ {p.name} — {len(erros)} problema(s) que o portão barra")
        for regra in erros + avisos:
            lst = achados[regra]
            marca = "  ✗" if regra in erros else "  !"
            print(f"{marca} {vc.DESCRICAO[regra]} — {len(lst)}x")
            for linha, ex in lst[:3]:
                onde = f"linha {linha}: " if linha else ""
                if ex or onde:
                    print(f"      {onde}{ex}")
            if len(lst) > 3:
                print(f"      … e mais {len(lst) - 3}")
            print(f"      → {COMO_CONSERTAR.get(regra, '')}")

    print(f"\n{aprovados} de {len(arquivos)} arquivo(s) prontos para o portão.")
    return 0 if aprovados == len(arquivos) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
