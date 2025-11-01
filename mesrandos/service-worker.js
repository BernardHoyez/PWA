self.addEventListener('install', e => {
  e.waitUntil(caches.open('mesrandos-v1').then(cache => {
    return cache.addAll(['./','index.html','style.css','app.js','manifest.json']);
  }));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});