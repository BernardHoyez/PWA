const CACHE_NAME = 'editpoi-v1';
const FILES_TO_CACHE = [
'/PWA/editpoi/index.html','/PWA/editpoi/styles.css','/PWA/editpoi/app.js','/PWA/editpoi/manifest.json','/PWA/editpoi/','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
self.addEventListener('install', evt =>{
evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
self.skipWaiting();
});
self.addEventListener('activate', evt =>{
evt.waitUntil(clients.claim());
});
self.addEventListener('fetch', evt =>{
if(evt.request.method !== 'GET') return;
evt.respondWith(caches.match(evt.request).then(resp=>resp || fetch(evt.request).then(res=>{
return caches.open(CACHE_NAME).then(cache=>{ cache.put(evt.request, res.clone()); return res; });
})).catch(()=>caches.match('/PWA/editpoi/index.html')));
});