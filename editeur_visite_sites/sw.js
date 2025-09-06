self.addEventListener('install', e => {
  e.waitUntil(caches.open('editeur-cache').then(cache => cache.addAll(['./','./index.htm'])));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request)));
});