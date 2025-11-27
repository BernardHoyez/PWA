const CACHE = 'traceX-v1';
const urls = ['/PWA/traceX/','/PWA/traceX/index.html','/PWA/traceX/app.js','/PWA/traceX/manifest.json'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(urls))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));