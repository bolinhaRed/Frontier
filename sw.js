// FRONTIER — service worker (etapa 10): instalar como aplicação e jogar sem internet depois da 1.ª visita.
// Páginas, código, estilos e dados: rede primeiro (uma versão nova chega logo, sem ficar presa em cache);
// sem rede, usa a cópia guardada. Imagens e fontes: cópia guardada primeiro.
// Uma versão nova nunca interrompe uma partida: só entra quando a página é aberta de novo, e a partida
// está gravada depois de cada acção.
const CACHE = 'frontier-1.2';
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const staticAsset = /\.(webp|png|jpg|svg|woff2?)$/i.test(url.pathname);
  if (staticAsset) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
