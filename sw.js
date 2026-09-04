// Service worker de "Sarmiento en Vivo".
// Objetivo único: hacer que la app sea instalable y abra rápido / algo
// funcional sin señal. NUNCA cachea datos de trenes (arribos, estaciones):
// esos siempre tienen que pedirse en vivo a la API.

const CACHE_NAME = 'sarmiento-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo intervenimos pedidos GET a nuestro propio origen (el "cascarón" de
  // la app). Todo lo demás (la API de trenes, los proxies CORS, fuentes
  // externas) pasa directo a la red, sin cachear, para que el dato sea
  // siempre en vivo.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
