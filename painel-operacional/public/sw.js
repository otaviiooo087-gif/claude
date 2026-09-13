const CACHE_NAME = 'painel-operacional-v2';

function scopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

const APP_SHELL = ['', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'].map(scopeUrl);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // HTML sempre busca a versão mais nova primeiro: o build muda os nomes dos
    // arquivos JS/CSS a cada deploy, então um HTML antigo em cache aponta para
    // arquivos que já não existem. Só cai para o cache quando não há rede.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(scopeUrl(''))))
    );
    return;
  }

  // Arquivos estáticos (JS/CSS com hash, ícones, manifest) podem usar
  // cache-first com atualização em segundo plano: o nome já muda quando o
  // conteúdo muda, então servir do cache primeiro é seguro e rápido.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
