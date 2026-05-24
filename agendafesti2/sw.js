const CACHE_NAME = 'agendafesti2-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes(self.location.origin)) {
    e.respondWith(fetch(new Request(e.request, { cache: 'reload' })));
  } else {
    e.respondWith(fetch(e.request));
  }
});