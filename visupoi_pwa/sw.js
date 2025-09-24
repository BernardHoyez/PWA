const CACHE_NAME = 'visupoi-shell-v1';
const MEDIA_CACHE = 'visupoi-media-v1';
const OFFLINE_ASSETS = [
  '/',
  '/PWA/visupoi/',
  '/PWA/visupoi/index.html',
  '/PWA/visupoi/styles.css',
  '/PWA/visupoi/app.js',
  '/PWA/visupoi/manifest.json'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(OFFLINE_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (OFFLINE_ASSETS.includes(url.pathname) || url.pathname.startsWith('/PWA/visupoi/')) {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
    return;
  }
  event.respondWith(caches.open(MEDIA_CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (event.request.method === 'GET' && response && response.status === 200) {
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (err) {
      return caches.match('/PWA/visupoi/index.html');
    }
  }));
});