// Cuisine PWA — Service Worker
const CACHE = 'cuisine-v1';
const ASSETS = ['/PWA/cuisine/', '/PWA/cuisine/index.html', '/PWA/cuisine/style.css', '/PWA/cuisine/app.js', '/PWA/cuisine/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for xlsx lib (CDN), cache-first for app assets
  if (e.request.url.includes('cdnjs')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
