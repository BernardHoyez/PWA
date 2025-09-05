self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('editeur-cache-v1').then(cache=>cache.addAll(['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png']))
  );
});

self.addEventListener('fetch', e=>{
  const url = e.request.url;
  if(url.includes('tile.openstreetmap.org')) return e.respondWith(fetch(e.request));
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
