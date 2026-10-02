# src/motor — NÃO EDITE AQUI

Estes arquivos são o **motor de leitura do ecossistema**, copiados de
`C:\Claude\parser\motor\`, que é a fonte. Cada um traz um carimbo com o
sha256 do conteúdo.

- Para mudar o motor: edite em `C:\Claude\parser\motor\` e rode
  `npm run espalhar` em `C:\Claude\parser`. Depois `npm run tortura`.
- Uma cópia editada aqui à mão é barrada pelo `scripts/conferir-motor.mjs`
  (no pre-commit e no deploy).

Por quê: os mesmos arquivos moram em cada app (o deploy não depende de nada
de fora), mas a fonte é uma só. Ver `C:\Claude\parser\proposta.md`, passo 4.
