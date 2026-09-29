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

COMO_CONSERTAR = vc.COMO_CONSERTAR


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
