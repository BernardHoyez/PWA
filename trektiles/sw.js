const CACHE = 'trektiles-v8';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
    const url = e.request.url;
    if (url.includes('/PWA/trektiles/') || url.includes('cdnjs.cloudflare.com') || url.includes('cdn.jsdelivr.net')) {
        e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
                if (resp && resp.status === 200) {
                    const clone = resp.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, clone));
                }
                return resp;
            }))
        );
    }
});