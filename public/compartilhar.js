/* Recebe o que o sistema operacional compartilha COM o app.
 *
 * Este arquivo é importado pelo service worker gerado (workbox.importScripts
 * no vite.config.ts), e não substitui nada dele. A escolha foi deliberada: a
 * alternativa era trocar generateSW por injectManifest e reescrever o worker
 * à mão — precache, rota de navegação, a exclusão do /rolo, o clientsClaim.
 * Tudo isso é a fundação do offline, e reescrevê-la para ganhar UM recurso
 * seria arriscar o que já funciona. Aqui só se acrescenta um ouvinte.
 *
 * POR QUE PRECISA DE SERVICE WORKER: compartilhar ARQUIVO exige
 * `method: POST` no share_target, e um POST não vira parâmetro de URL que a
 * página consiga ler sozinha. Alguém tem que interceptar o POST, tirar os
 * arquivos do corpo e guardá-los. Esse alguém só pode ser o worker.
 *
 * O ouvinte é registrado ANTES dos do workbox (importScripts roda no topo do
 * arquivo gerado), então ele vê o pedido primeiro. Na prática nem disputa:
 * as rotas do workbox só casam com GET, e este é o único POST do app.
 */

const CACHE_COMPARTILHADO = 'compartilhado-v1'
const ROTA = '/compartilhar'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || !url.pathname.endsWith(ROTA)) return

  event.respondWith(
    (async () => {
      // Base do app a partir da própria rota: funciona em / e em /app-leitura/
      const raiz = url.pathname.slice(0, -ROTA.length) + '/'
      try {
        const dados = await event.request.formData()
        const arquivos = dados.getAll('arquivos').filter((f) => f && f.name)

        if (arquivos.length) {
          // Guarda no Cache e NÃO no IndexedDB: o worker precisa devolver a
          // resposta rápido, e o Cache aceita um Response direto, sem esquema
          // nem transação. A página tira de lá e apaga em seguida.
          const cache = await caches.open(CACHE_COMPARTILHADO)
          await cache.delete(new Request(raiz + '__compartilhado'))
          const nomes = arquivos.map((f) => f.name)
          await cache.put(
            new Request(raiz + '__compartilhado'),
            new Response(JSON.stringify(nomes), {
              headers: { 'content-type': 'application/json' },
            }),
          )
          await Promise.all(
            arquivos.map((f, i) =>
              cache.put(new Request(`${raiz}__compartilhado/${i}`), new Response(f)),
            ),
          )
          return Response.redirect(raiz + '?compartilhado=arquivos', 303)
        }

        // Sem arquivo, o compartilhamento é de TEXTO — e aí o POST vira o
        // mesmo GET de sempre. Assim o caminho antigo continua inteiro: quem
        // lê os parâmetros na página não precisa saber que houve um POST.
        const busca = new URLSearchParams()
        for (const campo of ['title', 'text', 'url']) {
          const v = dados.get(campo)
          if (v) busca.set(campo, String(v))
        }
        return Response.redirect(raiz + (busca.toString() ? '?' + busca : ''), 303)
      } catch {
        // Falhar aqui não pode deixar o usuário numa página de erro do
        // navegador: devolve o app, que é onde ele quis chegar.
        return Response.redirect(raiz, 303)
      }
    })(),
  )
})
