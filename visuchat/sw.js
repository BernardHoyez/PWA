 === Service worker (save as /sw.js) ===

    // sw.js (Example content) - save this file at your site root.

    const CACHE_NAME = 'pwa-field-guide-v1';
    const PRECACHE_URLS = [ '/', '/index.html' ];

    self.addEventListener('install', event => {
      self.skipWaiting();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)));
    });

    self.addEventListener('activate', event => {
      event.waitUntil(self.clients.claim());
    });

    // Cache-first for navigation and media. Network-first for visit.json when online.
    self.addEventListener('fetch', event => {
      const req = event.request;
      if(req.method !== 'GET') return;
      // try cache first for media and static assets
      if(req.destination === 'image' || req.destination === 'video' || req.destination === 'audio' || req.mode === 'navigate' || req.url.endsWith('.js') || req.url.endsWith('.css') ){
        event.respondWith(caches.match(req).then(resp=>resp || fetch(req).then(r=>{ const resClone=r.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,resClone)); return r;})).catch(()=>caches.match('/offline.html')));
      }else{
        // default to network
        event.respondWith(fetch(req).catch(()=>caches.match(req)));
      }
    });
