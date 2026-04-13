/* litto2mbtiles — Service Worker : cache app shell uniquement */
const CACHE = 'litto2mbtiles-v1';
const SHELL = [
  '/PWA/litto2mbtiles/',
  '/PWA/litto2mbtiles/index.html',
  '/PWA/litto2mbtiles/app.js',
  '/PWA/litto2mbtiles/style.css',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.allSettled(SHELL.map(u => c.add(u)))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/PWA/litto2mbtiles/') || e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request).then(r => {
      if (r?.status === 200) caches.open(CACHE).then(cache => cache.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match('/PWA/litto2mbtiles/index.html')))
  );
});
