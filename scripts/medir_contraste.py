#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
medir_contraste.py — Pedra Angular

Mede, por cálculo, o contraste de cada tema do app. Não substitui o olho de
ninguém: substitui o CHUTE. Um tema pode existir por gosto — o que não pode é
tema decorativo passar por acessível sem o número ao lado.

O que mede:
  - razão de contraste WCAG 2.1 de cada par que o leitor realmente encara
    (texto, texto secundário, destaque de busca, destaque da ocorrência atual);
  - a MESMA razão depois de simular protanopia, deuteranopia e tritanopia —
    porque um par que só se distingue pelo matiz colapsa para quem não separa
    aquele matiz, e a razão de luminância sozinha não conta isso.

Limites honestos do método:
  - simulação de daltonismo é modelo (Viénot-Brettel-Mollon 1999), não a visão
    de uma pessoa; serve para reprovar, não para aprovar;
  - contraste não cobre tudo (tamanho, espaçamento, fonte também pesam);
  - dicromacia severa é o caso modelado — tricromacia anômala (a mais comum)
    fica entre este resultado e a visão típica.

USO
  python scripts/medir_contraste.py
  python scripts/medir_contraste.py --html docs/contraste.html

Ὁ Διαφορεύς παρῆν
"""
from __future__ import annotations

import argparse
import datetime
import html as html_mod
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
CSS_PADRAO = AQUI.parent / "src" / "styles.css"

# Limiar do projeto. O CSS declara "contraste >= 7:1 (WCAG reforçado)" — ou
# seja, o alvo é AAA para texto normal, não o AA de 4.5:1.
ALVO_TEXTO = 7.0
MINIMO_AA = 4.5
MINIMO_NAO_TEXTO = 3.0


# ---------------------------------------------------------------- cor
def hex_para_rgb(c: str) -> tuple[float, float, float]:
    c = c.strip().lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return tuple(int(c[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore


def linearizar(v: float) -> float:
    """sRGB -> linear. É aqui que mora a diferença entre "parece claro" e "é
    claro": o olho responde de forma não-linear, e a fórmula do WCAG corrige."""
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def luminancia(rgb: tuple[float, float, float]) -> float:
    r, g, b = (linearizar(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(c1: str, c2: str) -> float:
    l1, l2 = luminancia(hex_para_rgb(c1)), luminancia(hex_para_rgb(c2))
    claro, escuro = max(l1, l2), min(l1, l2)
    return (claro + 0.05) / (escuro + 0.05)


# ---------------------------------------------------------------- daltonismo
# Viénot, Brettel & Mollon (1999), no espaço LMS de Hunt-Pointer-Estevez.
# Dicromacia: um dos três cones ausente. O eixo perdido é projetado sobre o
# plano que sobra — não é "tirar a cor", é confundir duas cores em uma.
RGB_PARA_LMS = (
    (0.31399022, 0.63951294, 0.04649755),
    (0.15537241, 0.75789446, 0.08670142),
    (0.01775239, 0.10944209, 0.87256922),
)
LMS_PARA_RGB = (
    (5.47221206, -4.6419601, 0.16963708),
    (-1.1252419, 2.29317094, -0.1678952),
    (0.02980165, -0.19318073, 1.16364789),
)
MATRIZ_DICROMACIA = {
    "protanopia": ((0.0, 1.05118294, -0.05116099), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)),
    "deuteranopia": ((1.0, 0.0, 0.0), (0.9513092, 0.0, 0.04866992), (0.0, 0.0, 1.0)),
    "tritanopia": ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (-0.86744736, 1.86727089, 0.0)),
}


def _mul(m, v):
    return tuple(sum(m[i][j] * v[j] for j in range(3)) for i in range(3))


def simular(cor: str, tipo: str) -> str:
    """Devolve a cor como ela chega a quem tem aquela dicromacia."""
    rgb = tuple(linearizar(v) for v in hex_para_rgb(cor))
    lms = _mul(RGB_PARA_LMS, rgb)
    lms = _mul(MATRIZ_DICROMACIA[tipo], lms)
    lin = _mul(LMS_PARA_RGB, lms)

    def deslinearizar(v: float) -> int:
        v = max(0.0, min(1.0, v))
        v = 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055
        return round(max(0.0, min(1.0, v)) * 255)

    return "#{:02x}{:02x}{:02x}".format(*(deslinearizar(v) for v in lin))


def distancia_percebida(c1: str, c2: str, tipo: str | None = None) -> float:
    """Distância euclidiana em sRGB (0–441). Grosseira de propósito: serve só
    para responder "estas duas cores ainda são cores diferentes?" — a pergunta
    que o contraste de luminância NÃO responde."""
    a, b = (hex_para_rgb(c1), hex_para_rgb(c2)) if tipo is None else (
        hex_para_rgb(simular(c1, tipo)), hex_para_rgb(simular(c2, tipo))
    )
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5 * 255


# ---------------------------------------------------------------- temas
def ler_temas(css: Path) -> dict[str, dict[str, str]]:
    """Lê as variáveis direto do CSS publicado — medir uma cópia digitada à mão
    seria medir outra coisa."""
    texto = css.read_text(encoding="utf-8")
    temas: dict[str, dict[str, str]] = {}
    for m in re.finditer(r"(:root|\[data-theme='([^']+)'\])\s*\{(.*?)\n\}", texto, re.S):
        nome = "sepia" if m.group(1) == ":root" else m.group(2)
        bloco = m.group(3)
        vars_ = dict(re.findall(r"--([a-z0-9-]+):\s*([^;]+);", bloco))
        if "color-bg" not in vars_:
            continue  # bloco que não define tema (ex.: [data-theme] body)
        temas.setdefault(nome, {}).update({k: v.strip() for k, v in vars_.items()})
    return temas


# Os pares que o leitor de fato encara. Cada um com o piso que lhe cabe:
# texto corrido no alvo do projeto (7:1), elemento de interface no mínimo
# de não-texto do WCAG (3:1).
PARES = [
    ("texto no fundo", "color-text", "color-bg", ALVO_TEXTO),
    ("texto secundário", "color-muted", "color-bg", ALVO_TEXTO),
    ("link//destaque", "color-accent", "color-bg", MINIMO_AA),
    ("erro", "color-error", "color-bg", MINIMO_AA),
    ("busca: achado", "hl-fg", "hl-bg", ALVO_TEXTO),
    ("busca: ocorrência atual", "hl-cur-fg", "hl-cur-bg", ALVO_TEXTO),
    # WCAG 1.4.11 cobra 3:1 do que IDENTIFICA um componente — a borda de um
    # campo de busca ou de um botão. Separador decorativo (--color-border) não
    # entra nessa conta: se entrasse, o piso empurraria todo tema suave para um
    # traço pesado sem ganho de leitura para ninguém.
    ("contorno de componente", "color-borda-ui", "color-bg", MINIMO_NAO_TEXTO),
]

# Medido e RELATADO, sem piso: serve para ninguém confundir a borda decorativa
# com a de componente ao ler a tabela.
PARES_INFORMATIVOS = [("separador decorativo", "color-border", "color-bg")]

# Pares que precisam ser DISTINGUÍVEIS entre si, não apenas legíveis: se o
# fundo do achado e o da ocorrência atual colapsam, a busca perde a noção de
# "onde estou" — e é exatamente o que o daltonismo faz com amarelo/laranja.
PARES_DISTINCAO = [
    ("fundo do achado x da ocorrência atual", "hl-bg", "hl-cur-bg"),
    # O destaque também precisa se separar do FUNDO DA PÁGINA. Se ele encosta,
    # o leitor não vê que achou nada — e é o que o amarelo faz sob tritanopia,
    # onde ele vira quase o branco do papel.
    ("fundo do achado x fundo da página", "hl-bg", "color-bg"),
    ("fundo da ocorrência atual x fundo da página", "hl-cur-bg", "color-bg"),
]

LIMIAR_DISTINCAO = 60.0  # distância sRGB mínima para "ainda são duas cores"


def medir(temas: dict[str, dict[str, str]]) -> list[dict]:
    fora = []
    for nome, v in temas.items():
        linhas = []
        for rotulo, a, b, piso in PARES:
            if a not in v or b not in v:
                continue
            r = contraste(v[a], v[b])
            # QUEM GOVERNA É O PIOR CASO, não a visão tricromática. Medir só
            # o normal deixa passar par que desaba para quem tem dicromacia:
            # o branco sobre #8a4408 do sépia dá 7.21:1 no olho comum e
            # 6.43:1 sob deuteranopia — reprovado na régua do projeto, e o
            # script dizia OK.
            sob = {t: contraste(simular(v[a], t), simular(v[b], t))
                   for t in MATRIZ_DICROMACIA}
            pior = min([r] + list(sob.values()))
            linhas.append(
                {
                    "par": rotulo,
                    "fg": v[a],
                    "bg": v[b],
                    "razao": r,
                    "sob": sob,
                    "pior": pior,
                    "piso": piso,
                    "passa": pior >= piso,
                }
            )
        informativos = []
        for rotulo, a, b in PARES_INFORMATIVOS:
            if a in v and b in v:
                informativos.append(
                    {"par": rotulo, "fg": v[a], "bg": v[b], "razao": contraste(v[a], v[b])}
                )
        distincoes = []
        for rotulo, a, b in PARES_DISTINCAO:
            if a not in v or b not in v:
                continue
            d = {"par": rotulo, "c1": v[a], "c2": v[b], "normal": distancia_percebida(v[a], v[b])}
            for tipo in MATRIZ_DICROMACIA:
                d[tipo] = distancia_percebida(v[a], v[b], tipo)
            d["pior"] = min([d["normal"]] + [d[t] for t in MATRIZ_DICROMACIA])
            d["passa"] = d["pior"] >= LIMIAR_DISTINCAO
            distincoes.append(d)
        # contraste sob daltonismo: a razão de luminância muda pouco, mas
        # muda — e é o número que desmente "é só escolher cores fortes"
        sob_cvd = {}
        for tipo in MATRIZ_DICROMACIA:
            sob_cvd[tipo] = contraste(simular(v["color-text"], tipo), simular(v["color-bg"], tipo))
        fora.append(
            {
                "tema": nome,
                "linhas": linhas,
                "informativos": informativos,
                "distincoes": distincoes,
                "cvd": sob_cvd,
                "reprovas": [l for l in linhas if not l["passa"]]
                + [d for d in distincoes if not d["passa"]],
            }
        )
    return sorted(fora, key=lambda t: t["tema"])


def imprimir(resultados: list[dict]) -> None:
    for t in resultados:
        marca = "OK " if not t["reprovas"] else "!! "
        print(f"\n{marca}{t['tema']}")
        for l in t["linhas"]:
            sinal = "  " if l["passa"] else "<-"
            # Quando o pior caso NÃO é a visão normal, mostrar só o normal
            # faria a linha exibir um número que passa ao lado da marca de
            # reprovação. Nomeia-se então quem mandou.
            culpado = min(l["sob"], key=lambda k: l["sob"][k])
            extra = (
                f"  pior {l['pior']:.2f} sob {culpado}"
                if l["pior"] < l["razao"] - 0.005 else ""
            )
            print(
                f"     {l['par']:26} {l['fg']} sobre {l['bg']}  "
                f"{l['razao']:6.2f}:1  (piso {l['piso']}) {sinal}{extra}"
            )
        for l in t["informativos"]:
            print(
                f"     {l['par']:26} {l['fg']} sobre {l['bg']}  "
                f"{l['razao']:6.2f}:1  (sem piso: decorativo)"
            )
        for d in t["distincoes"]:
            sinal = "  " if d["passa"] else "<-"
            print(
                f"     {d['par']:26} normal {d['normal']:5.0f} · "
                f"prot {d['protanopia']:5.0f} · deut {d['deuteranopia']:5.0f} · "
                f"trit {d['tritanopia']:5.0f}  (piso {LIMIAR_DISTINCAO:.0f}) {sinal}"
            )
        c = t["cvd"]
        print(
            f"     {'texto/fundo sob dicromacia':26} prot {c['protanopia']:6.2f}:1 · "
            f"deut {c['deuteranopia']:6.2f}:1 · trit {c['tritanopia']:6.2f}:1"
        )
    reprovados = [t for t in resultados if t["reprovas"]]
    print(f"\n{'-'*70}")
    print(f"{len(resultados)} temas medidos · {len(reprovados)} com pelo menos uma reprova")
    for t in reprovados:
        print(f"   {t['tema']}: " + "; ".join(
            (r["par"] if "par" in r else "?") for r in t["reprovas"]
        ))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--css", type=Path, default=CSS_PADRAO)
    args = ap.parse_args()
    temas = ler_temas(args.css)
    if not temas:
        print("nenhum tema encontrado no CSS")
        return 1
    resultados = medir(temas)
    print(f"medido em {datetime.date.today().isoformat()} · fonte: {args.css}")
    imprimir(resultados)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
