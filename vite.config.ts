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
        // Pré-cacheia A CASCA DO APP — nunca o acervo.
        //
        // `md` esteve nesta lista, com a intenção de "offline completo". O
        // acervo tem 1097 arquivos e 115 MB: o service worker baixava tudo
        // ANTES de se dar por instalado. Num computador, com o cache já
        // quente, passava despercebido. Num celular que instala do zero, não
        // termina — e enquanto não termina, `registration.update()` não
        // resolve, então a tela "Procurando atualização…" ficava para sempre.
        // O app inteiro travava numa tela da qual não se sai.
        //
        // Agora o acervo é guardado SOB DEMANDA (runtimeCaching abaixo): o
        // livro entra no cache quando é aberto pela primeira vez, e dali em
        // diante lê offline. A instalação cai de 115 MB para a casca do app.
        // Troca-se "todo o acervo offline antes do primeiro uso" — que nunca
        // funcionou no celular — por "offline para o que você já leu".
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        // O rolo da Bíblia (4,4 MB) passa do limite padrão de 2 MiB
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,

        runtimeCaching: [
          {
            // Livro aberto = livro guardado. StaleWhileRevalidate e não
            // CacheFirst: devolve na hora o que está no cache e busca a versão
            // nova por trás, então uma correção no acervo chega sem exigir
            // reinstalação.
            urlPattern: ({ url }) => url.pathname.includes('/livros/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'acervo',
              expiration: {
                // Teto para o cache não crescer sem limite no aparelho.
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 365,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

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
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
