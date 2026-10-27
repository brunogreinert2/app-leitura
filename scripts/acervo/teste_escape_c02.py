# -*- coding: utf-8 -*-
"""A C02 DO PORTÃO RESPEITA O ESCAPE DO COMMONMARK?

Nasceu do Elogio de Helena (2026-10-27): `\\<ou capturada pelo amor>` é texto
para o motor e para o rolo, e a C02 o barrava como etiqueta HTML.

Exige: `\\<…>` e `\\&amp;` passam; `<b>`, `&amp;` e `\\\\<b>` (contrabarra
escapada + etiqueta de verdade) continuam barrados; a marca de página passa.

Rodar: python scripts/acervo/teste_escape_c02.py
"""
import importlib.util
import pathlib

aqui = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('validar_corpus', aqui / 'validar_corpus.py')
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
c02 = next(r for r in v.REGRAS_LINHA if r[0] == 'C02-xml')[3]

CASOS = [
    ('suplemento escapado passa', r'palavras, \<ou capturada pelo amor>[^2]. Se', False),
    ('entidade escapada passa', r'Tom \&amp; Jerry', False),
    ('marca de página passa', 'pala<!-- pa:pagina 02 -->vra', False),
    ('etiqueta de verdade barra', 'um <b>negrito</b> vazado', True),
    ('entidade de verdade barra', 'Tom &amp; Jerry', True),
    ('contrabarra escapada não salva a etiqueta', r'C:\\<b>x</b>', True),
]
falhas = 0
for nome, linha, barra in CASOS:
    ok = bool(c02.search(linha)) == barra
    falhas += not ok
    print(('ok   ' if ok else 'FALHA') + '  ' + nome)
print(f'\n{len(CASOS) - falhas}/{len(CASOS)} passaram')
raise SystemExit(1 if falhas else 0)
