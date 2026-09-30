# Como editar o app você mesmo

Tudo que o leitor mostra vem de arquivos de texto dentro de
`public/livros/`. Editar o app = mexer nesses arquivos e publicar.

## Onde ficam as coisas

```
public/livros/
├── catalogo.json            ← a lista de livros do app
├── personagens.json         ← gerado automaticamente (não editar à mão)
├── IMPRESSOES_APP.md        ← o texto de boas-vindas
├── BIBLIAS/…                ← Portugues/, Latim/, Ingles/, Grego/,
│                                Hebraico/, Interlineares_Hebraico/
├── FILOSOFIA/…               ← Portugues/, Ingles/, Grego/, Latim/
└── PERSONAGENS/…            ← um .md por personagem
```

**Os nomes dos "menus" da biblioteca são os nomes das pastas.** Dentro
de BIBLIAS e FILOSOFIA, o 1º nível é sempre o idioma da edição
(Portugues/Latim/Ingles/Grego/Hebraico) — ver
`ESTRUTURA_BIBLIOTECA_v2_idioma.md` pra entender por quê antes de criar
pasta nova fora desse padrão.

## Adicionar textos (livros, coleções, personagens)

**O jeito certo é o Guardião:** abra o Claude Code e digite `/guardiao`
(o ofício está em `.claude/skills/guardiao/SKILL.md`). Ele confere o
arquivo, escolhe a pasta, preenche o front matter (URN, licença, tags),
converte do TEI quando há, e publica.

À mão, desde 2026-09-30, são três passos:

1. Confira o arquivo em https://pedraangular.app.br/portico/contribuir.html
   (diz na hora se ele está na norma).
2. Ponha o `.md` na pasta certa dentro de `public/livros/`
   (`ACERVO/Idioma/Corrente/Autor/Obra/`; o nome do arquivo segue
   `Autor_Titulo_lang_Tradutor_Ano.md`).
3. `git add`, `git commit`, `git push` (seção abaixo).

**Não é mais preciso** rodar `npm run gera:catalogo` nem
`npm run gera:personagens`, nem editar o `catalogo.json` à mão: o portão
do acervo, que roda em todo commit, põe a obra nova no catálogo sozinho.

**Personagem:** o nome do arquivo em `public/livros/PERSONAGENS/` é o
alvo do wikilink — `[[Platão]]` acha `Platão.md`. Nomes alternativos vão
no YAML do verbete:

```yaml
aliases:
  - Platão de Atenas
```

## Publicar (site + apps instalados se atualizam sozinhos)

No terminal, dentro da pasta do projeto:

```
git add -A
git commit -m "Descreva o que mudou"
git push
```

Em ~10 minutos o site novo está no ar (o deploy refaz também o rolo e o Pórtico). Quem tem o app instalado recebe a
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
