import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * O temml (matemática do motor, src/motor/matematica.ts) monta a expressão
 * que lê o TeX com faixas de "surrogatas soltas" do Unicode — \uD800-\uDBFF.
 * O empacotador do Vite 8 (Rolldown) junta os pedaços num texto só e escreve
 * essas faixas como "�d800": a expressão quebra, e \sum, \frac, \sqrt saem em
 * vermelho, como comandos desconhecidos. Visto no app em 2026-10-02 (no dev e
 * no build de produção; no Node, sem empacotador, funcionava).
 *
 * É a lição de sempre das faixas Unicode (NORMAS, \u nunca literal): aqui o
 * literal é criado pelo empacotador. O conserto troca, só nesses dois
 * trechos, \uD800 por \\uD800: o texto passa a levar a barra, a expressão
 * regular lê o mesmo escape, e o empacotador não tem mais o que estragar.
 * Se o temml mudar esses trechos, o build PARA aqui em vez de quebrar calado.
 * Guarda irmã: scripts/conferir-surrogatas.mjs, no deploy.
 */
function temmlSemSurrogataSolta(): Plugin {
  const trocas: [string, string][] = [
    [String.raw`"|[\uD800-\uDBFF][\uDC00-\uDFFF]"`, String.raw`"|[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]"`],
    [String.raw`[^\uD800-\uDFFF]"`, String.raw`[^\\uD800-\\uDFFF]"`],
  ]
  return {
    name: 'temml-sem-surrogata-solta',
    enforce: 'pre',
    transform(codigo, id) {
      if (!/[\\/]temml[\\/]dist[\\/]temml\.mjs$/.test(id)) return
      let novo = codigo
      for (const [de, para] of trocas) {
        if (!novo.includes(de)) throw new Error(`temml mudou: não achei ${de} — rever vite.config.ts`)
        novo = novo.replaceAll(de, para)
      }
      return novo
    },
  }
}

export default defineConfig({
  // No dev, o pré-empacotamento de dependências não passa pelos plugins:
  // o temml fica de fora dele para receber o conserto acima.
  optimizeDeps: { exclude: ['temml'] },
  // O WORKER TEM LINHA DE MONTAGEM PRÓPRIA, e ela não herda `plugins`. O de
  // títulos (src/lib/titulos.worker.ts) carrega o motor inteiro, temml junto:
  // sem repetir o conserto aqui, o pacote do worker sairia com a surrogata
  // estragada — o sumário do editor leria fórmula em título diferente do
  // leitor, e a guarda do deploy (conferir-surrogatas) barraria a publicação.
  worker: { plugins: () => [temmlSemSurrogataSolta()] },
  // E O WORKER NÃO TEM `document`. A biblioteca que traduz entidades HTML
  // (&amp;, &nbsp;…), usada pelo leitor de Markdown, tem duas versões: a "de
  // navegador" cria um elemento na página para o navegador traduzir por ela, e
  // quebrava o worker no carregamento ("document is not defined"); a outra é
  // uma tabela pura. Aponta-se para a tabela em todo lugar — é a mesma que
  // roda no Node, ou seja, a que a tortura do parser já testa.
  resolve: {
    alias: {
      'decode-named-character-reference': fileURLToPath(
        new URL('./node_modules/decode-named-character-reference/index.js', import.meta.url),
      ),
    },
  },
  // No dev, a pasta do projeto pode ser alcançada por um atalho (aqui,
  // C:\Claude\app-leitura aponta para a pasta real). O Vite resolve os módulos
  // pelo caminho REAL e só serve o que está sob a raiz por onde foi aberto: o
  // arquivo do worker, pedido direto pelo navegador, voltava 403 e a conta
  // dos títulos caía para a linha principal. Liberar também o caminho real
  // conserta — e não muda nada para quem abre o projeto sem atalho.
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), realpathSync(process.cwd())] },
  },
  plugins: [
    temmlSemSurrogataSolta(),
    react(),
    VitePWA({
      // 'prompt' (não 'autoUpdate'): o app avisa quando há versão nova
      // em vez de trocar o código por baixo do usuário em silêncio —
      // sem isso, quem já tinha a aba aberta ficava preso em JS velho
      // achando que um bug corrigido ainda existia.
      registerType: 'prompt',
      workbox: {
        // O service worker novo assume as janelas JÁ ABERTAS assim que ativa.
        // Sem isto, o app instalado continuava servido pelo worker antigo
        // mesmo depois de "Atualizar agora": a página recarregava, o worker
        // velho respondia, e voltava o mesmo pacote de sempre — sintoma
        // visto ao vivo (ícone novo aparecia em aba anônima, que não tem
        // worker, e não aparecia no app instalado).
        //
        // Anda junto com registerType: 'prompt', que mantém skipWaiting
        // desligado: quem decide a hora da troca continua sendo o usuário,
        // pelo aviso. O clientsClaim só garante que, decidida a troca, ela
        // valha de fato para a janela que está na frente.
        clientsClaim: true,

        // Compartilhar ARQUIVO com o app exige POST no share_target, e um POST
        // precisa de alguém que o intercepte — só o service worker pode. Em vez
        // de trocar generateSW por injectManifest e reescrever o worker inteiro
        // (precache, rota de navegação, exclusão do /rolo, clientsClaim), só se
        // acrescenta um ouvinte. A fundação do offline fica intocada.
        importScripts: ['compartilhar.js'],

        // Pré-cacheia o app e os livros embarcados (offline completo)
        globPatterns: ['**/*.{js,css,html,svg,png,md,json,woff2}'],
        // O rolo da Bíblia (4,4 MB) passa do limite padrão de 2 MiB
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,

        // SEM ISTO O /rolo FICA INALCANÇÁVEL PARA GENTE. O generateSW registra
        // uma NavigationRoute que devolve index.html para TODA navegação; como
        // os rolos nascem depois do `vite build` (ver deploy.yml), eles não
        // estão no manifesto de precache, então nada os intercepta antes — e a
        // navegação cai na casca da SPA. Quem já visitou o site uma vez tem o
        // service worker instalado e nunca mais chega em /rolo: o navegador
        // devolve o app. Uma IA com fetch simples passava, porque fetch não
        // tem service worker — o que escondeu o bug, já que o rolo existe
        // justamente para ela.
        //
        // A lista abaixo tira essas rotas da NavigationRoute e as devolve à
        // rede. /livros entra por precaução: hoje o precache o cobre, mas um
        // livro que passe de 8 MB ficaria de fora e cairia no mesmo buraco.
        // /portico (2026-09-29) é o site da norma, montado no deploy a partir
        // do repositório portico: páginas estáticas que uma IA recebe por
        // link, e que não podem virar a casca da SPA.
        navigateFallbackDenylist: [/^\/rolo(\/|$)/, /^\/livros(\/|$)/, /^\/portico(\/|$)/],
      },
      manifest: {
        // "Leitura —" nao acrescentava nada e aparecia DUAS vezes na barra
        // do app instalado, que poe o nome do manifest antes do titulo da
        // pagina. O nome do projeto ja diz o que ele e.
        name: 'Pedra Angular',
        short_name: 'Leitura',
        description: 'Leitor offline do corpus Pedra Angular e Sapiencial',
        lang: 'pt-BR',
        // Relativos ao manifest: funcionam em / (dev) e /app-leitura/ (Pages).
        // Sem start_url o Chrome não oferece a instalação.
        id: '.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#2b2620',
        background_color: '#faf7f2',
        // Φ branco sobre preto, na Cardo — a mesma fonte com que o app
        // escreve o texto, então o ícone é o mesmo Φ que se lê dentro.
        //
        // O MASCARÁVEL É UM ARQUIVO À PARTE, e precisa ser. O Android recorta
        // o ícone num círculo de 80% do lado, e o que estoura esse limite não
        // é a largura do glifo, é a DIAGONAL dele: o Φ cheio dá 82% e teria as
        // pontas do haste cortadas. O mascarável usa o mesmo desenho com o
        // glifo menor (69% de diagonal), que cabe inteiro no recorte.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // "Abrir com > Pedra Angular" no Explorador/Finder, e arrastar o
        // arquivo para cima do ÍCONE do app. O SO entrega os arquivos pela
        // launchQueue; ver o consumidor em App.tsx.
        //
        // Só Chromium de mesa (Chrome/Edge). Safari e iOS ignoram, sem erro:
        // quem estiver lá continua com o botão e com o arrastar-para-dentro.
        file_handlers: [
          {
            action: '.',
            accept: {
              'text/markdown': ['.md'],
              'text/plain': ['.txt'],
            },
          },
        ],
        // Aparece no menu nativo de compartilhar. POST porque só ele carrega
        // ARQUIVO; o texto vem junto, e o worker o converte de volta num GET
        // com os mesmos parâmetros de antes, para o caminho que já existia na
        // página continuar valendo sem saber que houve um POST.
        //
        // Android e ChromeOS atendem; Edge no Windows também. O iOS NÃO
        // implementa a Web Share Target — lá o app nunca aparece na folha de
        // compartilhamento, e isso é decisão da Apple, não falta nossa.
        share_target: {
          action: 'compartilhar',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'arquivos',
                accept: ['text/markdown', 'text/plain', '.md', '.txt'],
              },
            ],
          },
        },
      },
    }),
  ],
})
