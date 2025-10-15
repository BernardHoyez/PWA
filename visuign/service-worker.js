const CACHE_NAME = 'visuign-cache-v1';
const CORE_ASSETS = [
  '/PWA/visuign/index.html',
  '/PWA/visuign/css/style.css',
  '/PWA/visuign/js/app.js',
  '/PWA/visuign/js/wmts.js',
  '/PWA/visuign/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(resp => {
        return caches.open(CACHE_NAME).then(cache => {
          try { cache.put(event.request, resp.clone()); } catch(e) {}
          return resp;
        });
      }).catch(() => response);
    })
  );
});
