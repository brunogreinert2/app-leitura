# -*- coding: utf-8 -*-
"""O ROLO CONHECE O ESCAPE DO COMMONMARK?

A contrabarra antes de qualquer sinal de pontuação ASCII faz dele texto comum
(CommonMark, «Backslash escapes»). O motor do app é remark e sempre soube
disso; o rolo só sabia o `\\[` (2026-10-23, o Diels). Resultado, medido em
2026-10-27: `[FHG III 2\\*]` aparecia «2*» no app e «2\\*» no rolo, e o
`\\<ou capturada pelo amor>` do Elogio de Helena saía com a contrabarra à
vista. Agora o rolo faz o que o app faz (N7).

Exige: a contrabarra some e o sinal fica, em `* < > & _ # ; ) ]`; o sinal
escapado não abre ênfase, nem marcador, nem chamada de nota; `\\\\` é UMA
contrabarra, e o colchete depois dela é marcador (o caso 11b da tortura);
dentro do código tudo fica como está; e nada perigoso passa (o `<` sai como
`&lt;`).

Rodar: python scripts/rolo/teste_escape.py
"""
import importlib.util
import pathlib
import sys

aqui = pathlib.Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('gerador_rolo', aqui / 'gerador_rolo.py')
g = importlib.util.module_from_spec(spec)
sys.argv = [sys.argv[0]]
spec.loader.exec_module(g)

def html(md):
    return g.inline(md, {})

CASOS = [
    ('Diels: o asterisco escapado é asterisco',
     r'Μιλήσιός [FHG III 2\*] φασι', lambda h: '[FHG III 2*]' in h and '\\' not in h),
    ('dois asteriscos escapados não abrem negrito',
     r'[FHG III 27\*\*] εἰς', lambda h: '27**]' in h and '<strong>' not in h and '<em>' not in h),
    ('o < escapado é texto, nunca etiqueta',
     r'palavras, \<ou capturada pelo amor>[^2]. Se',
     lambda h: '&lt;ou capturada pelo amor&gt;' in h and '\\' not in h and 'nota-ref' in h),
    ('o & escapado é texto',
     r'Tom \& Jerry', lambda h: 'Tom &amp; Jerry' in h and '\\' not in h),
    ('o _ e o # escapados ficam', r'snake\_case e \#tag', lambda h: 'snake_case e #tag' in h),
    ('ponto e vírgula e parêntese escapados', r'λέγει \;i e \) fim', lambda h: 'λέγει ;i e ) fim' in h),
    ('colchete escapado continua texto, sem marcador',
     r'Δαμασίου \[582] ἐπὶ', lambda h: '[582]' in h and 'marker-582' not in h and '\\' not in h),
    ('\\\\ é uma contrabarra, e o colchete depois é marcador',
     r'\\[4] A contrabarra', lambda h: h.count('\\') == 1 and 'marker-4' in h),
    ('nota escapada não é chamada', r'texto \[^1] solto', lambda h: '[^1]' in h and 'nota-ref' not in h),
    ('dentro do código nada muda', r'o código `\*x\*` fica', lambda h: '<code>\\*x\\*</code>' in h),
    ('contrabarra antes de letra é contrabarra', r'C:\Claude', lambda h: 'C:\\Claude' in h),
    ('ênfase de verdade continua', r'um *grifo* e **forte**',
     lambda h: '<em>grifo</em>' in h and '<strong>forte</strong>' in h),
]

falhas = 0
for nome, md, ok in CASOS:
    h = html(md)
    passou = ok(h)
    falhas += not passou
    print(('ok   ' if passou else 'FALHA') + '  ' + nome + ('' if passou else '\n       ' + h))
print(f'\n{len(CASOS) - falhas}/{len(CASOS)} passaram')
raise SystemExit(1 if falhas else 0)
