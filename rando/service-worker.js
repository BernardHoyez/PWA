self.addEventListener('install', e => {
  e.waitUntil(caches.open('rando-cache').then(cache => cache.addAll(['.', 'index.html', 'style.css', 'app.js', 'manifest.json'])));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});
