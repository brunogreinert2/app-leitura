import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
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
        navigateFallbackDenylist: [/^\/rolo(\/|$)/, /^\/livros(\/|$)/],
      },
      manifest: {
        name: 'Leitura — Pedra Angular',
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
        // Aparece no menu nativo de compartilhar (iOS/Android/Windows):
        // o SO abre o app com o texto já nos parâmetros da URL — sem
        // service worker, sem POST, sem rede.
        share_target: {
          action: '.',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    }),
  ],
})
