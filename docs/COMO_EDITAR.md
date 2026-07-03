# Como editar o app você mesmo

Tudo que o leitor mostra vem de arquivos de texto dentro de
`public/livros/`. Editar o app = mexer nesses arquivos e publicar.

## Onde ficam as coisas

```
public/livros/
├── catalogo.json            ← a lista de livros do app
├── personagens.json         ← gerado automaticamente (não editar à mão)
├── IMPRESSOES_APP.md        ← o texto de boas-vindas
├── FILOSOFIA/…              ← pastas espelhando o vault
├── ROLOS/…
└── PERSONAGENS/…            ← um .md por personagem
```

**Os nomes dos "menus" da biblioteca são os nomes das pastas.**
Quer que ROLOS vire "Bíblias"? Renomeie a pasta `ROLOS` para `Bíblias`
e ajuste o campo `arquivo` dos livros dela no `catalogo.json`
(ex.: `"ROLOS/ROLO_Biblia_TB_1917.md"` → `"Bíblias/ROLO_Biblia_TB_1917.md"`).

## Adicionar um livro novo

1. Copie o `.md` (cópia de leitura do vault) para a pasta desejada
   dentro de `public/livros/` — pode criar pastas novas à vontade.
2. Abra `public/livros/catalogo.json` e acrescente um bloco na lista,
   copiando o formato dos existentes:

```json
{
  "id": "um-id-unico-sem-espacos",
  "titulo": "Título que aparece no app",
  "autor": "Autor",
  "arquivo": "PASTA/Sub-pasta/Nome_do_arquivo.md",
  "sistema_referencia": "versiculo"
}
```

- `arquivo` é o caminho dentro de `public/livros/`, com `/` (nunca `\`).
- `sistema_referencia` é opcional: `"versiculo"` (âncoras `^gn-1-1`),
  `"capitulo-secao"` (marcadores `[1.1]`), ou omitir.
- Cuidado com a vírgula entre os blocos `{ } , { }` — é o erro mais comum.

## Adicionar um personagem

1. Copie o `.md` para `public/livros/PERSONAGENS/`.
   O NOME DO ARQUIVO é o alvo do wikilink: `[[Platão]]` acha `Platão.md`.
2. Para nomes alternativos, acrescente no YAML do verbete:

```yaml
aliases:
  - David - O rei
  - Davi - O rei
```

3. Rode no terminal, dentro da pasta do projeto:

```
npm run gera:personagens
```

## Publicar (site + apps instalados se atualizam sozinhos)

No terminal, dentro da pasta do projeto:

```
git add -A
git commit -m "Descreva o que mudou"
git push
```

Em ~1 minuto o site novo está no ar. Quem tem o app instalado recebe a
atualização na próxima vez que abrir com internet.

## Testar no computador antes de publicar

```
npm run dev
```

e abra http://localhost:5173 no navegador. (Ctrl+C no terminal encerra.)

## Regras de ouro

- Nunca edite o TEXTO dos livros aqui: corrija no acervo/vault e copie
  de novo para cá (o app é só um espelho de leitura).
- Se algo quebrar depois de editar o `catalogo.json`, é quase sempre
  vírgula faltando ou sobrando — confira o formato.
- Na dúvida, peça ao Claude: "adiciona o livro X do caminho Y" faz
  tudo isso por você.
