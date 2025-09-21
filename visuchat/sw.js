'use strict';
const CACHE_NAME = 'visuchat-shell-v1';
const RUNTIME = 'visuchat-runtime-v1';
const PRECACHE = [
'./',
'./index.html',
'./style.css',
'./app.js',
'./manifest.json'
];


self.addEventListener('install', evt => {
self.skipWaiting();
evt.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
);
});


self.addEventListener('activate', evt => {
evt.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', evt => {
const req = evt.request;
const url = new URL(req.url);


// Strategy: shell cache-first, media network-first with fallback to cache
if (PRECACHE.includes(url.pathname) || url.pathname.endsWith('/')){
evt.respondWith(caches.match(req).then(res => res || fetch(req).then(resp => { caches.open(RUNTIME).then(c=>c.put(req, resp.clone())); return resp; }).catch(()=>caches.match(req))));
return;
}


if (req.destination === 'image' || req.destination === 'video' || req.destination === 'audio'){
evt.respondWith(fetch(req).then(resp => { // try network
// Optionally cache media responses
caches.open(RUNTIME).then(cache => { cache.put(req, resp.clone()); });
return resp;
}).catch(()=>caches.match(req)));
return;
}


// Default: network-first with cache fallback
evt.respondWith(fetch(req).catch(()=>caches.match(req)));
});

